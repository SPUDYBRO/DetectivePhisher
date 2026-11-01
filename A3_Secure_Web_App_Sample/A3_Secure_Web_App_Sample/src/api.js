export async function getTopics() {
  const response = await fetch('/api/topics')
  if (!response.ok) throw new Error('Could not load topic metadata.')
  return response.json()
}

export async function predict(topic, userInput) {
  const response = await fetch(`/api/predict/${topic}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_input: userInput}),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Prediction failed.')
  return data
}

export async function runRateLimitDemo(topic, userInput) {
  const response = await fetch('/api/security/rate-limit-demo', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({topic, user_input: userInput, attempts: 10}),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Rate-limit demo failed.')
  return data
}

export async function runModelLoadingDemo(topic) {
  const response = await fetch(`/api/security/model-loading-demo/${topic}`, {
    method: 'POST',
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Model-loading demo failed.')
  return data
}

export async function runAdvancedDemo() {
  const response = await fetch('/api/security/advanced-demo', {method: 'POST'})
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Advanced-security demo failed.')
  return data
}
