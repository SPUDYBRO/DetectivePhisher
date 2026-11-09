export async function checkURL(url) {
  let response
  let data

  try {
    response = await fetch('/api/predict', {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({url})
    })
    data = await response.json()
  }
  catch (error) {
    throw new Error("Could not reach the server. Check server status in bottom right")
  }

  if (!response.ok) {
    if (typeof data.detail === "string") {
      throw new Error(data.detail)
    }
    throw new Error("That input was not accepted. Check the URL and try again")
  }

  return data
}

// Fetched once on load: the average value of each feature for legitimate and phishing
// URLs, used to draw the "Feature average" comparison graph alongside a checked URL.
export async function getFeatureAverages() {
  let response

  try {
    response = await fetch('/api/feature-averages')
  }
  catch (error) {
    throw new Error("Could not reach the server. Check server status in bottom right")
  }

  if (!response.ok) {
    throw new Error("Could not load the feature averages")
  }

  const data = await response.json()
  return data.features
}