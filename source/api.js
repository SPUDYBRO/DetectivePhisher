export async function checkUrl(url) {
  const response = await fetch('/api/check-url', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({url}),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Could not check this URL.')
  return data
}
