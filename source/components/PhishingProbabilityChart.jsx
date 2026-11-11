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
        {/* Each slice is its own focusable/hoverable element, so it can highlight on its own like a bar chart bar */}
        <svg
          viewBox="0 0 100 100"
          className="chart-svg"
          role="group"
          aria-label={`Legitimate probability ${Math.round(safeFraction * 100)} percent, phishing probability ${Math.round((1 - safeFraction) * 100)} percent`}
        >
            <defs>
              {/* Traces an outline around just the hovered arc's own painted pixels, so the highlight follows
                  its curve and dash cut-offs instead of drawing a box around the whole ring's bounding area */}
              <filter id="donut-segment-outline" x="-40%" y="-40%" width="180%" height="180%">
                <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated" />
                <feFlood style={{ floodColor: 'var(--bar-chart-active-stroke-color)' }} result="outline-color" />
                <feComposite in="outline-color" in2="dilated" operator="in" result="outline" />
                <feMerge>
                  <feMergeNode in="outline" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx="50" cy="50" r={DONUT_RADIUS} fill="none" className="donut-arc-legitimate" strokeWidth="20"
              strokeDasharray={`${safeArcLength} ${DONUT_CIRCUMFERENCE}`}
              tabIndex={0}
              role="img"
              aria-label={`Legitimate: ${Math.round(safeFraction * 100)} percent`}
            >
              <title>{`Legitimate: ${Math.round(safeFraction * 100)}%`}</title>
            </circle>
            <circle
              cx="50" cy="50" r={DONUT_RADIUS} fill="none" className="donut-arc-phishing" strokeWidth="20"
              strokeDasharray={`${remainderArcLength} ${DONUT_CIRCUMFERENCE}`} strokeDashoffset={-safeArcLength}
              tabIndex={0}
              role="img"
              aria-label={`Phishing: ${Math.round((1 - safeFraction) * 100)} percent`}
            >
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
