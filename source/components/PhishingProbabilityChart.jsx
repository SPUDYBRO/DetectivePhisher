// Donut chart answering: how likely is this URL to be phishing? Renders the verdict's
// probability split as a two-colour ring, with the legitimate share labelled in the middle.

// Radius is kept small enough (r + strokeWidth / 2 <= 50) that the ring stays inside the 100x100 viewBox.
const DONUT_RADIUS = 35
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

export default function PhishingProbabilityChart({ phishingProbability }) {
  // Clamp in case the backend ever returns something outside 0-1.
  const safeFraction = Math.min(Math.max(1 - phishingProbability, 0), 1)
  const safeArcLength = safeFraction * DONUT_CIRCUMFERENCE
  const remainderArcLength = DONUT_CIRCUMFERENCE - safeArcLength

  return (
    <>
      <div className="donut-chart">
        {/* role and label let screen readers read the score, tabIndex lets keyboard users reach it */}
        <svg
          viewBox="0 0 100 100"
          className="chart-svg"
          role="img"
          tabIndex={0}
          aria-label={`Legitimate probability ${Math.round(safeFraction * 100)} percent, phishing probability ${Math.round((1 - safeFraction) * 100)} percent`}
        >
            <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" className="donut-arc-legitimate" strokeWidth="20" strokeDasharray={`${safeArcLength} ${DONUT_CIRCUMFERENCE}`}>
              <title>{`Legitimate: ${Math.round(safeFraction * 100)}%`}</title>
            </circle>
            <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" className="donut-arc-phishing" strokeWidth="20" strokeDasharray={`${remainderArcLength} ${DONUT_CIRCUMFERENCE}`} strokeDashoffset={-safeArcLength}>
              <title>{`Phishing: ${Math.round((1 - safeFraction) * 100)}%`}</title>
            </circle>
        </svg>
        <div className="chart-label">{Math.round(safeFraction * 100)}%</div>
      </div>
      <p className="chart-caption">Probability of:</p>
      <div className="chart-legend">
        <span><span className="legend-swatch legend-legitimate"></span> Legitimate</span>
        <span><span className="legend-swatch legend-phishing"></span> Phishing</span>
      </div>
    </>
  )
}
