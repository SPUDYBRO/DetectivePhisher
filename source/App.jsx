import {checkURL} from './api.js'
import { useEffect, useRef, useState } from 'react'
import HelpPage from './HelpPage.jsx'
import ReportsPage from './ReportsPage.jsx'
import FeatureAverageChart from './components/FeatureAverageChart.jsx'
import PhishingProbabilityChart from './components/PhishingProbabilityChart.jsx'
import ConfidenceChart from './components/ConfidenceChart.jsx'
// ?react (from vite-plugin-svgr) imports the actual SVG file as a real React component built
// from its markup, so the icon's currentColor stroke still picks up the status badge's text
// color, without needing dangerouslySetInnerHTML.
import ServerStatusIcon from './icons/server-status-icon.svg?react'
import AiModelStatusIcon from './icons/ai-model-status-icon.svg?react'

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

// Legitimate/phishing averages for the "Feature average" graph, pre-scaled as z-scores.
// Computed from backend/data/processed Dataset2.csv: each value is
// (class mean - overall mean) / overall standard deviation, for benign vs malicious
// URLs, for every feature the model is trained on (see backend/features.py).
const FEATURE_AVERAGES = [
  { key: "num_dots", label: "Dots", legitimate: -0.28, phishing: 0.36 },
  { key: "num_hyphens", label: "Hyphens", legitimate: 0.24, phishing: -0.31 },
  { key: "host_hyphens", label: "Host hyphens", legitimate: -0.19, phishing: 0.24 },
  { key: "has_https", label: "HTTPS", legitimate: 0.57, phishing: -0.73 },
  { key: "has_ip", label: "IP address", legitimate: -0.14, phishing: 0.18 },
  { key: "domain_length", label: "Domain length", legitimate: -0.25, phishing: 0.32 },
  { key: "has_at_symbol", label: "@ symbol", legitimate: -0.08, phishing: 0.10 },
]

// The same overall mean/standard deviation used to turn FEATURE_AVERAGES into z-scores,
// also from backend/data/processed Dataset2.csv. The backend only sends back a checked
// URL's raw feature values (result.features), so these let the front-end rescale them
// onto the same -4..4 z-score axis to plot alongside the legitimate/phishing averages.
const FEATURE_STATS = {
  num_dots: { mean: 2.8418, std: 2.0250 },
  num_hyphens: { mean: 1.7871, std: 3.0166 },
  host_hyphens: { mean: 0.2002, std: 0.6921 },
  has_https: { mean: 0.4230, std: 0.4940 },
  has_ip: { mean: 0.0191, std: 0.1368 },
  domain_length: { mean: 20.7723, std: 16.4479 },
  has_at_symbol: { mean: 0.0088, std: 0.0934 },
}

// Converts the backend's raw per-feature values (result.features) into z-scores, so the
// checked URL's line can be drawn on the same axis as the legitimate/phishing averages.
function toFeatureZScores(features) {
  const zscores = {}
  for (const [key, { mean, std }] of Object.entries(FEATURE_STATS)) {
    const rawValue = features[key] ?? mean
    zscores[key] = std > 0 ? (rawValue - mean) / std : 0
  }
  return zscores
}

// Each reason from the backend ends with "(raises suspicion)" or "(lowers suspicion)"
// (see backend/prediction.py's build_reasons), so its box can be outlined red or green
// to match. Reasons without either suffix (e.g. "no obvious red flags") get no extra class,
// and fall back to the verdict-coloured border set in style.css.
function reasonBoxClass(reason) {
  if (reason.includes('(raises suspicion)')) {
    return 'reason-box-raises'
  }
  if (reason.includes('(lowers suspicion)')) {
    return 'reason-box-lowers'
  }
  return ''
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

  // The checked URL's features, rescaled to z-scores so they can be plotted
  // alongside the legitimate/phishing averages on the feature average chart.
  let yourFeatureZScores = null
  if (result) {
    yourFeatureZScores = toFeatureZScores(result.features)
  }

  // Both the health fetch and a short timer run in parallel, and the badge only
  // updates once both finish, so "Loading" is visible for at least this long.
  const MIN_STATUS_LOADING_MS = 1500

  useEffect(() => {
    const minimumWait = new Promise(resolve => setTimeout(resolve, MIN_STATUS_LOADING_MS))
    const healthCheck = fetch("/api/health").then(response => response.json())

    Promise.all([healthCheck, minimumWait])
    .then(([data]) => setStatus(data.status))
    .catch(() => minimumWait.then(() => setStatus('offline')))
  }, []);

  useEffect(() => {
    const minimumWait = new Promise(resolve => setTimeout(resolve, MIN_STATUS_LOADING_MS))
    const healthCheck = fetch("/api/health").then(response => response.json())

    Promise.all([healthCheck, minimumWait])
    .then(([data]) => setModelState(data.model_state))
    .catch(() => minimumWait.then(() => setModelState('Failed')))
  }, []);

  // Changes the page and stops the link from reloading the browser
  function showPage(event, pageName) {
    event.preventDefault()
    setPage(pageName)
  }

  // Lets the page-change effect move keyboard focus back to the top of the page
  const headerRef = useRef(null)
  // Skips the focus move on the first render so loading the site doesn't steal focus
  const isFirstRender = useRef(true)

  // After switching pages, move focus to the header so tabbing starts from the
  // nav bar and then flows into the new page content in order
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (headerRef.current) {
      headerRef.current.focus()
    }
  }, [page]);

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
      {/* tabIndex -1 lets page changes focus the header without adding it to the Tab order */}
      <header tabIndex={-1} ref={headerRef}>
        {/* A real link so the logo is focusable and activates with Enter */}
        <a id="logo" href="#" onClick={event => showPage(event, 'home')}>
          <h1>DetectivePhisher</h1>
        </a>
        {/* nav tells screen readers this is the main menu */}
        <nav id="extra" aria-label="Main">
          <a href="#" aria-current={currentFor('reports')} onClick={event => showPage(event, 'reports')}>Reports</a>
          <a href="#" aria-current={currentFor('help')} onClick={event => showPage(event, 'help')}>Help</a>
        </nav>
      </header>

      <main id="main">
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
              placeholder="http://example.com"
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






        {/* aria-live announces the verdict to screen readers when a result appears */}
        <section id="results" aria-live="polite">
          {result ? (
            <div id="verdictBanner" className={`verdict-banner verdict-banner-${result.verdict}`}>
              <h3 className="verdict-banner-headline">{VERDICT_LABELS[result.verdict] ?? result.verdict}</h3>

              <div className="verdict-banner-grid">
                <div className="result-card" id="probabilityCard">
                  <h4>Phishing Probability</h4>
                  <PhishingProbabilityChart phishingProbability={result.phishing_probability} />
                </div>

                <div className="result-card" id="confidenceCard">
                  <h4>Confidence</h4>
                  <p className="confidence-disclaimer">Please remember that the model's predictions do not guarantee the legitimacy or illegitimacy of URLs.</p>
                  <ConfidenceChart confidence={result.confidence} />
                </div>

                <div className="result-card" id="reasonsCard">
                  <h4>Report</h4>
                  <p className="reasons-disclaimer">This identifies what influenced the model to make its decision.</p>
                  <p className="reasons-note">Please understand that these are only the top features that influenced it. These may not show an exact distribution of influence.</p>
                  {/* tabIndex lets keyboard users focus the list and scroll it with the arrow keys when it overflows */}
                  <ul className="reasons-list" tabIndex={0} aria-label="Reasons behind the verdict">
                    {/* The backend sends "reasons", not "report". Each one gets its own box to match the report's design. */}
                    {result.reasons.map((reason, index) => (
                      <li key={index} className={`reason-box ${reasonBoxClass(reason)}`}>{reason}</li>
                    ))}
                  </ul>
                  <p className="chart-caption">The overall suspicion was:</p>
                  <div className="chart-legend">
                    <span className={result.verdict === 'legitimate' ? 'reason-verdict-active' : 'reason-verdict-inactive'}>
                      <span className="legend-swatch legend-legitimate"></span> Legitimate
                    </span>
                    <span className={result.verdict === 'phishing' ? 'reason-verdict-active' : 'reason-verdict-inactive'}>
                      <span className="legend-swatch legend-phishing"></span> Phishing
                    </span>
                  </div>
                </div>

                <div className="result-card" id="featureAverageCard">
                  <h4>Feature average of URL against legitimate and phishing</h4>
                  <FeatureAverageChart points={FEATURE_AVERAGES} yourValues={yourFeatureZScores} />
                </div>

                <div className="result-card" id="historyCard">
                  <h4>History</h4>
                  <p className="chart-caption">You last viewed links in this browser session</p>
                  <p className="history-hint">(refreshing will clear)</p>
                  {/* tabIndex lets keyboard users focus the list and scroll it with the arrow keys when it overflows */}
                  <ul className="history-list" tabIndex={0} aria-label="URLs checked this session">
                    {history.map((entry, index) => (
                      <li key={index} className="history-item" title={entry.url}>{entry.url}</li>
                    ))}
                  </ul>
                  {history.length >= MAX_HISTORY_ENTRIES && (
                    <p className="history-limit-note">You've reached the maximum amount of history</p>
                  )}
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
              <ServerStatusIcon />
              {status}
            </p>
          </output>
          <output className={`model-status-box ${MODEL_STATE_CLASS[model_state] ?? 'loading'}`} title='The loading status of the AI Model'>
            <p>
              <AiModelStatusIcon />
              {model_state}
            </p>
          </output>
        </div>
        
      </footer>
    </>
  )
}
