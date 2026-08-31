import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const hostPort = Number(process.env.EMBED_PHASE0_HOST_PORT ?? 4177)
const runtimePort = Number(process.env.EMBED_PHASE0_RUNTIME_PORT ?? 4178)
const allowedHostOrigin = `http://127.0.0.1:${hostPort}`
const runtimeOrigin = `http://127.0.0.1:${runtimePort}`

type TokenState = { authorizedOrigin: string; consumed: boolean }
const tokens = new Map<string, TokenState>()
const authorizationOrigins: string[] = []

function html(reply: ServerResponse, body: string) {
  reply.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  reply.end(body)
}

function json(reply: ServerResponse, status: number, body: unknown, origin?: string) {
  reply.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
  })
  reply.end(JSON.stringify(body))
}

async function readJson(request: IncomingMessage) {
  let body = ''
  for await (const chunk of request) body += chunk
  return body ? (JSON.parse(body) as Record<string, unknown>) : {}
}

function originFixture(replay: boolean) {
  return `<!doctype html>
<html><body data-status="starting" data-redeemed="0" data-rejected="0">
<script>
  const runtimeOrigin = ${JSON.stringify(runtimeOrigin)};
  const replay = ${JSON.stringify(replay)};
  const frames = [];
  fetch(runtimeOrigin + '/authorize', { method: 'POST' })
    .then(async (response) => {
      if (!response.ok) throw new Error('authorization denied');
      const { token } = await response.json();
      document.body.dataset.status = 'authorized';
      const count = replay ? 2 : 1;
      for (let index = 0; index < count; index += 1) {
        const frame = document.createElement('iframe');
        frame.title = 'Phase 0 token frame ' + index;
        frame.src = runtimeOrigin + '/token-frame';
        frame.sandbox = 'allow-scripts allow-same-origin';
        frames.push(frame);
        document.body.append(frame);
      }
      window.addEventListener('message', (event) => {
        if (event.origin !== runtimeOrigin || !frames.some((frame) => frame.contentWindow === event.source)) return;
        if (event.data?.type === 'phase0:ready') {
          event.source.postMessage({ type: 'phase0:init', token }, runtimeOrigin);
        }
        if (event.data?.type === 'phase0:redeemed') {
          const key = event.data.ok ? 'redeemed' : 'rejected';
          document.body.dataset[key] = String(Number(document.body.dataset[key]) + 1);
        }
      });
    })
    .catch(() => { document.body.dataset.status = 'denied'; });
</script>
</body></html>`
}

function visibilityFixture(kind: 'page' | 'ad') {
  const isPage = kind === 'page'
  const width = isPage ? 600 : 300
  const height = isPage ? 400 : 250
  return `<!doctype html>
<html><head><style>
  body { margin: 0; font-family: sans-serif; }
  #spacer { height: 1300px; }
  iframe { display: block; width: ${width}px; height: ${height}px; border: 0; }
  #after { height: 1300px; }
</style></head>
<body data-events="" data-visibility-state="">
  <div id="spacer"></div>
  <iframe id="target" title="Phase 0 visibility target" src="${runtimeOrigin}/empty-frame"></iframe>
  <div id="after"></div>
<script>
  const target = document.querySelector('#target');
  const kind = ${JSON.stringify(kind)};
  let timer = null;
  let emitted = false;
  let qualified = false;

  function record(name) {
    const events = document.body.dataset.events ? document.body.dataset.events.split(',') : [];
    events.push(name);
    document.body.dataset.events = events.join(',');
  }

  function cancelQualification() {
    qualified = false;
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  }

  const observer = new IntersectionObserver(([entry]) => {
    const pageQualified = entry.intersectionRect.width >= entry.boundingClientRect.width * 0.5 &&
      entry.intersectionRect.height >= Math.min(250, entry.boundingClientRect.height);
    const adQualified = entry.intersectionRatio >= 0.5;
    const nextQualified = document.visibilityState === 'visible' && (kind === 'page' ? pageQualified : adQualified);
    if (!nextQualified) {
      cancelQualification();
      return;
    }
    if (emitted || qualified) return;
    qualified = true;
    timer = window.setTimeout(() => {
      timer = null;
      if (!qualified || emitted || document.visibilityState !== 'visible') return;
      emitted = true;
      record(kind === 'page' ? 'page_viewed' : 'ad_impression');
    }, 1000);
  }, { threshold: [0, 0.49, 0.5, 0.99, 1] });

  document.addEventListener('visibilitychange', () => {
    document.body.dataset.visibilityState = document.visibilityState;
    if (document.visibilityState !== 'visible') cancelQualification();
  });
  document.body.dataset.visibilityState = document.visibilityState;
  observer.observe(target);
</script>
</body></html>`
}

function adNavigationFixture() {
  return `<!doctype html>
<html><body>
  <iframe id="ad" title="Phase 0 advertisement" src="${runtimeOrigin}/ad-frame"
    sandbox="allow-scripts allow-top-navigation-by-user-activation"></iframe>
</body></html>`
}

function formNavigationFixture() {
  return `<!doctype html>
<html><body data-rejected-messages="0">
  <iframe id="form" title="Phase 0 form" src="${runtimeOrigin}/form-frame" sandbox="allow-scripts allow-same-origin"></iframe>
<script>
  const runtimeOrigin = ${JSON.stringify(runtimeOrigin)};
  const frame = document.querySelector('#form');
  window.addEventListener('message', (event) => {
    if (event.origin !== runtimeOrigin || event.source !== frame.contentWindow || event.data?.type !== 'phase0:success-navigate') {
      document.body.dataset.rejectedMessages = String(Number(document.body.dataset.rejectedMessages) + 1);
      return;
    }
    if (event.data.path !== '/navigated?via=form-success') return;
    window.location.assign(event.data.path);
  });
</script>
</body></html>`
}

const hostServer = createServer((request, reply) => {
  const url = new URL(request.url ?? '/', allowedHostOrigin)
  if (url.pathname === '/health') return json(reply, 200, { ok: true })
  if (url.pathname === '/origin')
    return html(reply, originFixture(url.searchParams.get('replay') === '1'))
  if (url.pathname === '/visibility') {
    return html(reply, visibilityFixture(url.searchParams.get('kind') === 'ad' ? 'ad' : 'page'))
  }
  if (url.pathname === '/ad-navigation') return html(reply, adNavigationFixture())
  if (url.pathname === '/form-navigation') return html(reply, formNavigationFixture())
  if (url.pathname === '/navigated') {
    return html(
      reply,
      `<!doctype html><html><body data-via="${url.searchParams.get('via') ?? ''}">navigated</body></html>`,
    )
  }
  reply.writeHead(404).end()
})

const runtimeServer = createServer(async (request, reply) => {
  const url = new URL(request.url ?? '/', runtimeOrigin)
  const origin = request.headers.origin

  if (url.pathname === '/health') return json(reply, 200, { ok: true })
  if (url.pathname === '/state') {
    return json(reply, 200, {
      authorizationOrigins,
      issued: tokens.size,
      consumed: [...tokens.values()].filter((token) => token.consumed).length,
    })
  }
  if (request.method === 'OPTIONS' && url.pathname === '/authorize') {
    if (origin === allowedHostOrigin) {
      reply
        .writeHead(204, {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST',
          Vary: 'Origin',
        })
        .end()
      return
    }
    reply.writeHead(403).end()
    return
  }
  if (request.method === 'POST' && url.pathname === '/authorize') {
    authorizationOrigins.push(origin ?? '')
    if (origin !== allowedHostOrigin) return json(reply, 403, { error: 'origin_denied' })
    const token = randomUUID()
    tokens.set(token, { authorizedOrigin: origin, consumed: false })
    return json(reply, 200, { token }, origin)
  }
  if (request.method === 'POST' && url.pathname === '/redeem') {
    const input = await readJson(request)
    const token = typeof input.token === 'string' ? tokens.get(input.token) : undefined
    if (!token || token.consumed) return json(reply, 409, { error: 'token_rejected' })
    token.consumed = true
    return json(reply, 200, { ok: true, authorizedOrigin: token.authorizedOrigin })
  }
  if (url.pathname === '/token-frame') {
    return html(
      reply,
      `<!doctype html><html><body><script>
      parent.postMessage({ type: 'phase0:ready' }, ${JSON.stringify(allowedHostOrigin)});
      window.addEventListener('message', async (event) => {
        if (event.origin !== ${JSON.stringify(allowedHostOrigin)} || event.source !== parent || event.data?.type !== 'phase0:init') return;
        const response = await fetch('/redeem', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: event.data.token })
        });
        parent.postMessage({ type: 'phase0:redeemed', ok: response.ok }, event.origin);
      });
    </script></body></html>`,
    )
  }
  if (url.pathname === '/empty-frame')
    return html(reply, '<!doctype html><html><body>embed</body></html>')
  if (url.pathname === '/ad-frame') {
    return html(
      reply,
      `<!doctype html><html><body>
      <a id="tracked-ad-link" target="_top" href="${allowedHostOrigin}/navigated?via=ad">Open destination</a>
      <script>
        document.querySelector('#tracked-ad-link').addEventListener('click', (event) => {
          if (!event.isTrusted) event.preventDefault();
        });
      </script>
    </body></html>`,
    )
  }
  if (url.pathname === '/form-frame') {
    return html(
      reply,
      `<!doctype html><html><body>
      <button id="submit">Submit</button>
      <script>
        document.querySelector('#submit').addEventListener('click', () => {
          window.setTimeout(() => parent.postMessage({ type: 'phase0:success-navigate', path: '/navigated?via=form-success' }, ${JSON.stringify(allowedHostOrigin)}), 100);
        });
      </script>
    </body></html>`,
    )
  }
  reply.writeHead(404).end()
})

async function main() {
  await Promise.all([
    new Promise<void>((resolve) => hostServer.listen(hostPort, '0.0.0.0', resolve)),
    new Promise<void>((resolve) => runtimeServer.listen(runtimePort, '0.0.0.0', resolve)),
  ])
}

async function shutdown() {
  await Promise.all([
    new Promise<void>((resolve, reject) =>
      hostServer.close((error) => (error ? reject(error) : resolve())),
    ),
    new Promise<void>((resolve, reject) =>
      runtimeServer.close((error) => (error ? reject(error) : resolve())),
    ),
  ])
  process.exit(0)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
