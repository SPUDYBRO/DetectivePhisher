import {checkURL} from './api.js'
import { useEffect,useState } from 'react'
import HelpPage from './HelpPage.jsx'
import ReportsPage from './ReportsPage.jsx'
// ?raw imports the SVG file's markup as a plain string (built into Vite), so the
// icon's currentColor stroke still picks up the status badge's text color.
import serverStatusIcon from './icons/server-status-icon.svg?raw'
import aiModelStatusIcon from './icons/ai-model-status-icon.svg?raw'

const VERDICT_LABELS = {
  legitimate: "Looks Safe",
  phishing: "Most Likely Phishing"
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

// The confidence gauge only draws the top half of a ring, so its viewBox is wider than it is tall (100x60).
// Path is a single semicircle arc, reused for the background track and both of the coloured overlays.
const GAUGE_RADIUS = 36
const GAUGE_CENTER_X = 50
const GAUGE_CENTER_Y = 50
const GAUGE_HALF_CIRCUMFERENCE = Math.PI * GAUGE_RADIUS
const GAUGE_ARC_PATH = `M ${GAUGE_CENTER_X - GAUGE_RADIUS} ${GAUGE_CENTER_Y} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_CENTER_X + GAUGE_RADIUS} ${GAUGE_CENTER_Y}`

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
  // \s covers spaces, tabs and newlines; \x00-\x1F and \x7F are non-printable control characters.
  if (/[\s\x00-\x1F\x7F]/.test(trimmed)) {
    return 'That URL is invalid: it cannot contain spaces or control characters.'
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
  const [model_state, setModelState] = useState("Loading")
  const [page, setPage] = useState('home') // Remembers which page is showing: 'home', 'reports' or 'help'

  // Clamp in case the backend ever returns something outside 0-1.
  let safeFraction = 0
  let safeConfidenceFraction = 0
  if (result) {
    safeFraction = Math.min(Math.max(1 - result.phishing_probability, 0), 1)
    safeConfidenceFraction = Math.min(Math.max(result.confidence, 0), 1)
  }
  const safeArcLength = safeFraction * DONUT_CIRCUMFERENCE
  const remainderArcLength = DONUT_CIRCUMFERENCE - safeArcLength
  const confidenceArcLength = safeConfidenceFraction * GAUGE_HALF_CIRCUMFERENCE
  const confidenceRemainderArcLength = GAUGE_HALF_CIRCUMFERENCE - confidenceArcLength

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
      return
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
              onChange={event => setUrl(event.target.value)}
              aria-invalid={error !== ''}
              aria-describedby="url-message"
            />
            <p className="url-hint">We'll check the URL with http:// by default unless https:// is stated.</p>
            <button type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Check Link'}
            </button>
          </form>
          {/* Messages sit under the input and are linked to it for screen readers */}
          <div id="url-message">
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
        </section>






        <section id="results">
          {result ? (
            <div id="verdictBanner" className={`verdict-banner verdict-banner-${result.verdict}`}>
              <h3 className="verdict-banner-headline">{VERDICT_LABELS[result.verdict] ?? result.verdict}</h3>

              <div className="verdict-banner-grid">
                <div className="result-card" id="probabilityCard">
                  <h4>Phishing Probability</h4>
                  <div className="donut-chart">
                    {/* role and label let screen readers read the score, since they cannot see the drawing */}
                    <svg
                      viewBox="0 0 100 100"
                      className="chart-svg"
                      role="img"
                      aria-label={`Legitimate probability ${Math.round(safeFraction * 100)} percent`}
                    >
                        <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" className="donut-arc-legitimate" strokeWidth="20" strokeDasharray={`${safeArcLength} ${DONUT_CIRCUMFERENCE}`}/>
                        <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" className="donut-arc-phishing" strokeWidth="20" strokeDasharray={`${remainderArcLength} ${DONUT_CIRCUMFERENCE}`} strokeDashoffset={-safeArcLength}/>
                    </svg>
                    <div className="chart-label">{Math.round(safeFraction * 100)}%</div>
                  </div>
                  <p className="chart-caption">Probability of:</p>
                  <div className="chart-legend">
                    <span><span className="legend-swatch legend-legitimate"></span> Legitimate</span>
                    <span><span className="legend-swatch legend-phishing"></span> Phishing</span>
                  </div>
                </div>

                <div className="result-card" id="confidenceCard">
                  <h4>Confidence</h4>
                  <p className="confidence-disclaimer">Please remember that the model's predictions do not guarantee the legitimacy or illegitimacy of URLs.</p>
                  <div className="gauge-chart">
                    {/* role and label let screen readers read the score, since they cannot see the drawing */}
                    <svg
                      viewBox="0 0 100 60"
                      className="gauge-svg"
                      role="img"
                      aria-label={`Confidence ${Math.round(safeConfidenceFraction * 100)} percent`}
                    >
                        <path d={GAUGE_ARC_PATH} fill="none" className="gauge-track" strokeWidth="14" strokeLinecap="round"/>
                        <path d={GAUGE_ARC_PATH} fill="none" className="gauge-arc-confident" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${confidenceArcLength} ${GAUGE_HALF_CIRCUMFERENCE}`}/>
                        <path d={GAUGE_ARC_PATH} fill="none" className="gauge-arc-uncertain" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${confidenceRemainderArcLength} ${GAUGE_HALF_CIRCUMFERENCE}`} strokeDashoffset={-confidenceArcLength}/>
                    </svg>
                    <div className="gauge-label">{Math.round(safeConfidenceFraction * 100)}%</div>
                  </div>
                  <p className="chart-caption">How sure the model is:</p>
                  <div className="chart-legend">
                    <span><span className="legend-swatch legend-confident"></span> Confident</span>
                    <span><span className="legend-swatch legend-uncertain"></span> Uncertain</span>
                  </div>
                </div>

                <div className="result-card" id="reasonsCard">
                  <h4>Report</h4>
                  <ul>
                    {/* The backend sends "reasons", not "report". React prints these as plain text. */}
                    {result.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <p className="results-placeholder">Submit a URL above to see the phishing report.</p>
          )}
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
              <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: serverStatusIcon }} />
              {status}
            </p>
          </output>
          <output className={`model-status-box ${MODEL_STATE_CLASS[model_state] ?? 'loading'}`} title='The loading status of the AI Model'>
            <p>
              <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: aiModelStatusIcon }} />
              {model_state}
            </p>
          </output>
        </div>
        
      </footer>
    </>
  )
}
