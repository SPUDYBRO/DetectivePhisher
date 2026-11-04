import {useState} from 'react'
import {checkUrl} from './api.js'

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')
    try {
      const data = await checkUrl(url)
      setResult(data)
      setHistory(prev => [
        {url, verdict: data.verdict, trustScore: data.trustScore, checkedAt: new Date().toLocaleString()},
        ...prev,
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header>
        <div id="logo">
          <h1>DetectivePhisher</h1>
        </div>
        <div id="extra">
          <a href="#">Reports</a>
          <a href="#">Help</a>
        </div>
      </header>

      <main>
        <section id="URLInput">
          <h2>Check the link before you open it</h2>
          <p>Paste any URL. We check it so you don't have to worry about phishing.</p>
          <form id="urlForm" onSubmit={handleSubmit}>
            <label htmlFor="url">Enter URL:</label>
            <input
              type="text"
              id="url"
              name="url"
              value={url}
              onChange={event => setUrl(event.target.value)}
              required
            />
            <br />
            <button type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Check URL'}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </section>






      {/* Going to be moved to main.py soon. */}
        <section>
          <div id="report">
            {result ? (
              <>
                <h3>Report</h3>
                <p><strong>Verdict:</strong> {result.verdict}</p>
                <p>{result.explanation}</p>
              </>
            ) : (
              <p>Submit a URL above to see the phishing report.</p>
            )}
          </div>

          <div id="trustFactor">
            {result ? (
              <>
                <h3>Trust factor</h3>
                <p>{Math.round((result.trustScore ?? 0) * 100)}% trusted</p>
              </>
            ) : (
              <p>Trust score will appear here after a check.</p>
            )}
          </div>

          <div id="safetyHistory">
            <h3>Safety history</h3>
            {history.length === 0 ? (
              <p>No URLs checked yet this session.</p>
            ) : (
              <ul>
                {history.map((entry, index) => (
                  <li key={index}>
                    <strong>{entry.url}</strong> — {entry.verdict} ({entry.checkedAt})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; 2026 DetectivePhisher</p>
      </footer>
    </>
  )
}
