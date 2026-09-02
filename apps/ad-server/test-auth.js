fetch('http://127.0.0.1:3002/v1/embeds/fake/authorize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'http://external-site.test/' }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error)
