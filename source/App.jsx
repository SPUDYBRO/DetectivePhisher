import {checkURL} from './api.js'
import { useEffect,useState } from 'react'
import HelpPage from './HelpPage.jsx'
import ReportsPage from './ReportsPage.jsx'

const VERDICT_LABELS = {
  legitimate: "Looks safe",
  phishing: "Likely phishing"
}

// Maps the AI model's semantic state ("Ready"/"Loading"/"Failed") to its
// own ready/loading/failed CSS classes, distinct from the server status
// badge's online/loading/offline classes, though both share the same colors.
const MODEL_STATE_CLASS = {
  Ready: "ready",
  Loading: "loading",
  Failed: "failed"
}

const MAX_HISTORY_ENTRIES = 10

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
  const [notice, setNotice] = useState ('') //Holds the message telling the user we assumed http://
  const [status, setStatus] = useState("Loading")
  const [model_state, setModelState] = useState("Loading")
  const [page, setPage] = useState('home') // Remembers which page is showing: 'home', 'reports' or 'help'

  // Clamp in case the backend ever returns something outside 0-1.
  let safeFraction = 0
  if (result) {
    safeFraction = Math.min(Math.max(1 - result.phishing_probability, 0), 1)
  }
  const safeArcLength = safeFraction * DONUT_CIRCUMFERENCE
  const remainderArcLength = DONUT_CIRCUMFERENCE - safeArcLength

  useEffect(() => {
    fetch("/api/health")
    .then(response => response.json())
    .then(data => setStatus(data.status))
    .catch(() => setStatus('offline'))
  }, []);

  useEffect(() => {
    fetch("/api/health")
    .then(response => response.json())
    .then(data => setModelState(data.model_state))
    .catch(() => setModelState('Failed'))
  }, []);

  // Changes the page and stops the link from reloading the browser
  function showPage(event, pageName) {
    event.preventDefault()
    setPage(pageName)
  }

  // Marks the link for the page being shown so screenreaders can say "current page"
  function currentFor(pageName) {
    if (page === pageName) {
      return 'page'
    }
    return undefined
  }

  async function handleSubmit(event) {
    event.preventDefault()

    // Stop here and show the proble if the url fails the browser checks.
    const problem = validateURL(url)
    if (problem !== '') {
      setError(problem)
      setNotice('')
      return
    }

    //Tell the user when no http:// or https:// was entered, and we assumed http://
    if (hasScheme(url.trim())) {
      setNotice('')
    } else {
      setNotice('No protocol specified. This will be submitted as http:// unless you add https://')  
    }

    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await checkURL(url)
      setResult(data)
      setHistory(prev => [
        {
          url,
          verdict: data.verdict,
          confidence: data.confidence,
          phishingProbability: data.phishing_probability,
          features: data.features,
          checkedAt: new Date().toLocaleString()
        },
        ...prev
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
        {/* nav tells screen readers this is the main menu */}
        <nav id="extra" aria-label="Main">
          <a href="#" aria-current={currentFor('home')} onClick={event => showPage(event, 'home')}>Home</a>
          <a href="#" aria-current={currentFor('reports')} onClick={event => showPage(event, 'reports')}>Reports</a>
          <a href="#" aria-current={currentFor('help')} onClick={event => showPage(event, 'help')}>Help</a>
        </nav>
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
          <form id="urlForm" onSubmit={handleSubmit} noValidate> {/* noValidate turns off the browser's built-in validation so our own validation messages show instead */}
            <label htmlFor="url">Enter URL:</label>
            <input
              type="text"
              id="url"
              name="url"
              placeholder="Enter URL"
              value={url}
              onChange={event => {
                setUrl(event.target.value) 
                setNotice('')
              }}
              aria-invalid={error !== ''}
              aria-describedby="url-message"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Check Link'}
            </button>
          </form>
          {/* Messages sit under the input and are linked to it for screen readers */}
          <div id="url-message">
            {error && <p className="error-message" role="alert">{error}</p>}
            {notice && <p className="notice-message">{notice}</p>}
          </div>
        </section>






        <section id="results">
          {result && (
            <div id="verdict" className={`verdict-${result.verdict}`}>
              <p className="verdict-headline">{VERDICT_LABELS[result.verdict] ?? result.verdict}</p>
              <p className="verdict-confidence">{Math.round(result.confidence * 100)}% confident</p>
            </div>
          )}

          <div id="report">
            <h3>Report</h3>
            {result ? (
              <ul>
                {/* CHANGED (7): the backend sends "reasons", not "report". React prints these as plain text. */}
                {result.reasons.map((reason, index) => (
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
              <div className="donut-chart">
                {/* role and label let screen readers read the score, since they cannot see the drawing */}
                <svg 
                  viewBox="0 0 100 100" 
                  className="chart-svg"
                  role="img"
                  aria-label={`Safety score ${Math.round(safeFraction * 100)} percent`}
                >
                    <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" stroke="#4d8b47" strokeWidth="20" strokeDasharray={`${safeArcLength} ${DONUT_CIRCUMFERENCE}`}/>
                    <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" stroke="#1f699e" strokeWidth="20" strokeDasharray={`${remainderArcLength} ${DONUT_CIRCUMFERENCE}`} strokeDashoffset={-safeArcLength}/>
                </svg>
                <div className="chart-label">{Math.round(safeFraction * 100)}%</div>
              </div>
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
        <div id="statusBoxes">
          <output className={`server-status-box ${status}`} title='The connection to the server'>
            <p>
              <svg className="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="1" width="20" height="6" rx="1.5" ry="1.5"></rect>
                <rect x="2" y="9" width="20" height="6" rx="1.5" ry="1.5"></rect>
                <rect x="2" y="17" width="20" height="6" rx="1.5" ry="1.5"></rect>
                <line x1="6" y1="4" x2="6.01" y2="4"></line>
                <line x1="6" y1="12" x2="6.01" y2="12"></line>
                <line x1="6" y1="20" x2="6.01" y2="20"></line>
              </svg>
              {status}
            </p>
          </output>
          <output className={`model-status-box ${MODEL_STATE_CLASS[model_state] ?? 'loading'}`} title='The loading status of the AI Model'>
            <p>
              <svg className="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
                <line x1="9" y1="20" x2="9" y2="23"></line>
                <line x1="15" y1="20" x2="15" y2="23"></line>
                <line x1="20" y1="9" x2="23" y2="9"></line>
                <line x1="20" y1="14" x2="23" y2="14"></line>
                <line x1="1" y1="9" x2="4" y2="9"></line>
                <line x1="1" y1="14" x2="4" y2="14"></line>
              </svg>
              {model_state}
            </p>
          </output>
        </div>
        
      </footer>
    </>
  )
}
