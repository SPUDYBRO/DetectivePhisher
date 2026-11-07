import {checkUrl} from './api.js'
import { useEffect,useState } from 'react'
import HelpPage from './HelpPage.jsx'
import ReportsPage from './ReportsPage.jsx'

const VERDICT_LABELS = {
  benign: 'Looks Safe',
  caution: 'Use Caution',
  malicious: 'Likely Phishing',
}

const MAX_HISTORY_ENTRIES = 5

// Radius is kept small enough (r + strokeWidth / 2 <= 50) that the ring stays inside the 100x100 viewBox.
const DONUT_RADIUS = 35
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

// Checks if the text starts with http:// or https://, ignoring captial letters.
function hasScheme(text) {
  const lower =text.toLowerCase()
  if (lower.startsWith('http://')) {
    return true
  }
  if (lower.startsWith('https://')) {
    return true
  }
  return false
}

//Checks the url in the browser before it is sent. Gives back an error message, or an empty string if it is fine.
// The backend checks it again, because frontend checks can be bypassed.
function validateURL(text) {
  const trimmed = text.trim()

  if (trimmed === '') {
    return 'Enter a URL.'
  }
  if (trimmed.length > 2048) {
    return 'That URL is too long (2048 characters max).'
  }
  if (trimmed.includes(' ')) {
    return 'A URL cannot contain spaces.'
  }

  return ''
}


export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState("Loading")
  const [page, setPage] = useState('home') // Remembers which page is showing: 'home', 'reports' or 'help'

  // Clamp in case the backend ever returns something outside 0-1.
  const trustFraction = Math.min(Math.max(result?.trustScore ?? 0, 0), 1)
  const trustArcLength = trustFraction * DONUT_CIRCUMFERENCE
  const remainderArcLength = DONUT_CIRCUMFERENCE - trustArcLength

  useEffect(() => {
    fetch("/api/health")
    .then(response => response.json())
    .then(data => setStatus(data.status))
    .catch(() => setStatus('offline'))
  }, []);

  // Changes the page and stops the link from reloading the browser
  function showPage(event, pageName) {
    event.preventDefault()
    setPage(pageName)
  }

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
      ].slice(0, MAX_HISTORY_ENTRIES))
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
          <a href="#" onClick={event => showPage(event, 'home')}>Home</a>
          <a href="#" onClick={event => showPage(event, 'reports')}>Reports</a>
          <a href="#" onClick={event => showPage(event, 'help')}>Help</a>
        </div>
      </header>

      <main>
        {/* Home content only shows when the home page is chosen */}
        {page === 'help' && <HelpPage />}     
        {page === 'reports' && <ReportsPage history={history} />}          
        {page === 'home' && (
        <>
        <section id="URLInput">
          <h2>Check the link before you open it</h2>
          <p>Paste any URL. We check it so you don't have to worry about phishing.</p>
          <form id="urlForm" onSubmit={handleSubmit}>
            <label htmlFor="url">Enter URL:</label>
            <input
              type="text"
              id="url"
              name="url"
              placeholder="Enter URL"
              value={url}
              onChange={event => setUrl(event.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Check Link'}
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
                    <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" stroke="#4d8b47" strokeWidth="20" strokeDasharray={`${trustArcLength} ${DONUT_CIRCUMFERENCE}`}/>
                    <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" stroke="#1f699e" strokeWidth="20" strokeDasharray={`${remainderArcLength} ${DONUT_CIRCUMFERENCE}`} strokeDashoffset={-trustArcLength}/>
                  </svg>
                  <div className="chart-label">{Math.round(trustFraction * 100)}%</div>
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
                    <span>{entry.url}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        </>
        )}
      </main>

      <footer>
        <div id="footerContent">
        <p>&copy; 2026 DetectivePhisher</p>
        </div>
        {/*class is reserved word in React, so we use className instead*/}
        <output className={`status-box ${status}`} title='The connection to the server'>
          <p>{status}</p>
        </output>
      </footer>
    </>
  )
}
