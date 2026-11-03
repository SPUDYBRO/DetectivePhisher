import {useState} from 'react'
import {runAdvancedDemo, runModelLoadingDemo, runRateLimitDemo} from '../api.js'
import {AdvancedChart, RateLimitChart} from './SecurityCharts.jsx'

export default function SecurityPanel({topic, userInput}) {
  const [rateData, setRateData] = useState(null)
  const [modelData, setModelData] = useState(null)
  const [advancedData, setAdvancedData] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function run(kind) {
    setError('')
    setBusy(kind)
    try {
      if (kind === 'rate') setRateData(await runRateLimitDemo(topic, userInput))
      if (kind === 'model') setModelData(await runModelLoadingDemo(topic))
      if (kind === 'advanced') setAdvancedData(await runAdvancedDemo())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="panel security-panel">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Security demonstrations</div>
          <h2>Sections 2.7 and 2.8</h2>
        </div>
        <p className="heading-note">Run the examples without leaving this page.</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="security-grid">
        <article className="security-card">
          <span className="tag">2.7 · Basic</span>
          <h3>Missing rate limiting</h3>
          <p>Send the same request 10 times. Compare an unprotected API with a backend limit of 5 requests per minute.</p>
          <button onClick={() => run('rate')} disabled={busy}>Run before / after test</button>
          {rateData && (
            <>
              <RateLimitChart data={rateData} />
              <div className="mini-result-row">
                <span>Before: <strong>{rateData.summary.before_accepted}/10 accepted</strong></span>
                <span>After: <strong>{rateData.summary.after_accepted}/10 accepted</strong></span>
              </div>
              <p className="small-note">The rejected requests represent HTTP 429 Too Many Requests.</p>
            </>
          )}
        </article>

        <article className="security-card">
          <span className="tag">2.7 · Basic</span>
          <h3>Unsafe model loading</h3>
          <p>Safely simulate replacement of the approved <code>.joblib</code> file, then verify SHA-256 before deserialisation.</p>
          <button onClick={() => run('model')} disabled={busy}>Run integrity test</button>
          {modelData && (
            <div className="integrity-demo">
              <div className="before-after-box danger-soft">
                <strong>Before defence</strong>
                <span>{modelData.before.result}</span>
                <b>{modelData.before.status}</b>
              </div>
              <div className="arrow">→</div>
              <div className="before-after-box safe-soft">
                <strong>After defence</strong>
                <span>{modelData.after.result}</span>
                <b>{modelData.after.status}</b>
              </div>
              <details>
                <summary>Show hash evidence</summary>
                <code>Expected: {modelData.after.expected_hash}</code>
                <code>Replacement: {modelData.after.replacement_hash}</code>
              </details>
            </div>
          )}
        </article>

        <article className="security-card advanced-card">
          <span className="tag">2.8 · Advanced</span>
          <h3>Detection evasion experiment</h3>
          <p>This sample uses the Prompt Injection model: 30 obfuscated attacks are measured before and after input normalisation.</p>
          <button onClick={() => run('advanced')} disabled={busy}>Run advanced experiment</button>
          {advancedData && (
            <>
              <AdvancedChart data={advancedData} />
              <div className="metrics-row">
                <div><span>Before bypass</span><strong>{Math.round(advancedData.before.attack_success_rate*100)}%</strong></div>
                <div><span>After bypass</span><strong>{Math.round(advancedData.after.attack_success_rate*100)}%</strong></div>
                <div><span>Latency change</span><strong>{advancedData.cost.latency_change_ms >= 0 ? '+' : ''}{advancedData.cost.latency_change_ms} ms</strong></div>
                <div><span>FP change</span><strong>{Math.round(advancedData.cost.false_positive_change*100)} pp</strong></div>
              </div>
              <p className="small-note">{advancedData.interpretation}</p>
              <details>
                <summary>Show sample attack outcomes</summary>
                <div className="attack-table">
                  {advancedData.sample_results.map((row, i) => (
                    <div className="attack-row" key={i}>
                      <code>{row.input}</code>
                      <span>{row.before} → {row.after}</span>
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}
        </article>
      </div>
    </section>
  )
}
