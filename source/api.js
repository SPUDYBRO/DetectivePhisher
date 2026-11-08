export async function checkUrl(url) {
  const response = await fetch('/api/check-url', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({url}),
  })
  const data = await response.json()
  if (!response.ok) {
    let message = 'Could not check this URL.'
    if (data.error && data.error.message) {
      message = data.error.message
    } else if (typeof data.detail === 'string') {
      message = data.detail
    }
    throw new Error(message)
  }
  return data
}