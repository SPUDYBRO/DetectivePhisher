import {checkUrl} from './api.js'
import { useEffect,useState } from 'react'

const VERDICT_LABELS = {
  benign: 'Looks Safe',
  caution: 'Use Caution',
  malicious: 'Likely Phishing',
}

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState("Loading")

  useEffect(() => {
    fetch("/api/health")
    .then(response => response.json())
    .then(data => setStatus(data.status))
    .catch(() => setStatus('offline'))
  }, []);


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
            <button type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Check URL'}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </section>






        <section id="results">
          <div id="report">
            <h3>Report</h3>
            {result ? (
              <ul>
                {result.report.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p>Submit a URL above to see the phishing report.</p>
            )}
          </div>

          <div id="trustFactor">
            <h3>Trust Factor</h3>
            {result ? (
              <>
                <div className="donut-chart">
                  <svg viewBox="0 0 100 100" className="chart-svg">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#8B6F47" strokeWidth="20" strokeDasharray="102.3 157.08"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#5a6b77" strokeWidth="20" strokeDasharray="54.78 157.08" strokeDashoffset="-102.3"/>
                  </svg>
                  <div className="chart-label">{Math.round((result.trustScore ?? 0) * 100)}%</div>
                </div>
                <p className={`verdict-label verdict-${result.verdict}`}>
                  {VERDICT_LABELS[result.verdict] ?? result.verdict}
                </p>
              </>
            ) : (
              <p>Trust score will appear here after a check.</p>
            )}
          </div>

          <div id="safetyHistory">
            <h3>History</h3>
            {history.length === 0 ? (
              <p>No URLs checked yet this session.</p>
            ) : (
              <div className="history-list">
                {history.map((entry, index) => (
                  <div key={index} className="history-item">
                    <span>Past URL entry</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer>
        <div id="footerContent">
        <p>&copy; 2026 DetectivePhisher</p>
        </div>

        <output class={`status-box ${status}`} title='The connection to the server'>
          <p>{status}</p>
        </output>
      </footer>
    </>
  )
}
