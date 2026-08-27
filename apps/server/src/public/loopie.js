;(function () {
  var script = document.currentScript
  if (!script) return
  var businessId = script.getAttribute('data-business')
  if (!businessId) return
  var api = script.getAttribute('data-api') || script.src.replace(/\/loopie\.js(?:\?.*)?$/, '')
  var storageKey = 'loopie.session.' + businessId

  function params() {
    var q = new URLSearchParams(location.search)
    return {
      adRunId: q.get('adRunId') || q.get('ad_run') || '',
      gclid: q.get('gclid') || '',
      fbclid: q.get('fbclid') || '',
      ttclid: q.get('ttclid') || '',
      click_id: q.get('click_id') || '',
      utm_source: q.get('utm_source') || '',
      utm_medium: q.get('utm_medium') || '',
      utm_campaign: q.get('utm_campaign') || '',
      utm_content: q.get('utm_content') || '',
      utm_term: q.get('utm_term') || '',
    }
  }

  function storedSid() {
    try {
      var raw = localStorage.getItem(storageKey)
      if (!raw) return ''
      return JSON.parse(raw).token || ''
    } catch {
      return ''
    }
  }

  function persist(session) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(session))
    } catch {
      /* storage may be blocked */
    }
    document.cookie =
      'loopie_sid=' + encodeURIComponent(session.token) + ';path=/;max-age=604800;SameSite=Lax'
    window.Loopie = window.Loopie || {}
    window.Loopie.session = session
  }

  function queryString(obj) {
    return Object.keys(obj)
      .filter(function (k) {
        return obj[k]
      })
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])
      })
      .join('&')
  }

  function boot() {
    var p = params()
    var qs = queryString({
      businessId: businessId,
      sid: storedSid(),
      adRunId: p.adRunId,
      gclid: p.gclid,
      fbclid: p.fbclid,
      ttclid: p.ttclid,
      click_id: p.click_id,
      utm_source: p.utm_source,
      utm_medium: p.utm_medium,
      utm_campaign: p.utm_campaign,
      utm_content: p.utm_content,
      utm_term: p.utm_term,
    })
    fetch(api + '/t/session?' + qs, { credentials: 'omit' })
      .then(function (res) {
        return res.json()
      })
      .then(function (body) {
        persist(body.data)
        track('PAGE_VIEW')
        bindForms()
      })
      .catch(function () {})
  }

  function track(type, extra) {
    var session = window.Loopie && window.Loopie.session
    if (!session) return
    extra = extra || {}
    fetch(api + '/t/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: businessId,
        sessionId: session.token,
        type: type,
        pageUrl: location.href,
        adRunId: extra.adRunId || undefined,
        clickId: extra.clickId || undefined,
      }),
    }).catch(function () {})
  }

  function bindForms() {
    var session = window.Loopie && window.Loopie.session
    if (!session) return
    var forms = document.querySelectorAll('form[data-loopie-form], form')
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i]
      if (form.getAttribute('data-loopie-bound')) continue
      form.setAttribute('data-loopie-bound', '1')
      if (!form.querySelector('input[name="sessionId"]')) {
        var hidden = document.createElement('input')
        hidden.type = 'hidden'
        hidden.name = 'sessionId'
        hidden.value = session.token
        form.appendChild(hidden)
      }
      form.addEventListener('submit', function () {
        track('FORM_SUBMIT')
      })
      form.addEventListener('focusin', function onStart() {
        track('FORM_START')
        form.removeEventListener('focusin', onStart)
      })
    }
  }

  window.Loopie = { track: track, session: null }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
