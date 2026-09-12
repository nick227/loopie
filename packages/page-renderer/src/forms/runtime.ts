// The client-side submit handler baked into every published page's form — posts to the real
// submissions endpoint, serializes checkboxes as real booleans (FormData's own "on"/absent string
// convention isn't good enough), carries UTM params, and swaps in the success message on a 200.
export function buildFormSubmitScript(input: {
  submitActionUrl: string
  checkboxKeys: string[]
  successHtml: string
  sessionToken?: string
  publishedVersionId?: string
}): string {
  const issuedSid = input.sessionToken ? JSON.stringify(input.sessionToken) : 'null'
  const pvid = input.publishedVersionId ? JSON.stringify(input.publishedVersionId) : 'null'
  const checkboxKeysJson = JSON.stringify(input.checkboxKeys)

  return `<script>
(function () {
  var formEl = document.currentScript.previousElementSibling;
  var errorEl = formEl.querySelector('.lp-error');
  var checkboxKeys = ${checkboxKeysJson};
  var submitUrl = formEl.getAttribute('data-submit-url') || '';
  // /landing-pages/{id}/submissions → /landing-pages/{id}/form-start — same origin as the
  // submit action so formStartCount tracks real visitor focus (see LandingPage.formStartCount).
  var formStartUrl = submitUrl.replace(/\\/submissions\\/?$/, '/form-start');
  // Generated once per page load (not per submit attempt) so a retry after a transient failure
  // reuses the same key and dedupes server-side instead of creating a second submission — see
  // SubmitLandingPageFormInput's required idempotencyKey.
  function uuidFallback() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  var idempotencyKey =
    window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : uuidFallback();
  formEl.addEventListener('focusin', function onFormStart() {
    formEl.removeEventListener('focusin', onFormStart);
    if (!formStartUrl || formStartUrl === submitUrl) return;
    fetch(formStartUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(function () {});
  });
  formEl.addEventListener('submit', function (event) {
    event.preventDefault();
    errorEl.hidden = true;
    var data = {};
    new FormData(formEl).forEach(function (value, key) {
      if (checkboxKeys.indexOf(key) === -1) data[key] = value;
    });
    // Checkboxes: read .checked directly rather than FormData's "on"/absent string convention, so
    // the server always receives a real boolean for these fields (present or not, checked or not).
    checkboxKeys.forEach(function (key) {
      var input = formEl.querySelector('[name="' + key + '"]');
      data[key] = !!(input && input.checked);
    });
    var params = new URLSearchParams(window.location.search);
    fetch(formEl.getAttribute('data-submit-url'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: (window.Loopie && window.Loopie.session && window.Loopie.session.token) || params.get('sid') || ${issuedSid},
        idempotencyKey: idempotencyKey,
        publishedVersionId: ${pvid},
        data: data,
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        utmContent: params.get('utm_content') || undefined,
        utmTerm: params.get('utm_term') || undefined,
      }),
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || body.message || 'Could not submit');
        formEl.outerHTML = ${input.successHtml};
      });
    }).catch(function (err) {
      errorEl.textContent = err.message || 'Could not submit';
      errorEl.hidden = false;
    });
  });
})();
</script>`
}
