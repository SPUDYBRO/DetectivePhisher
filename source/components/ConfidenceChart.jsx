// Gauge chart answering: how sure is the model about this verdict? Renders confidence as
// a semicircular dial split into confident vs uncertain shares.

// The confidence gauge only draws the top half of a ring, so its viewBox is wider than it is tall (100x60).
// Path is a single semicircle arc, reused for the background track and both of the coloured overlays.
const GAUGE_RADIUS = 36
const GAUGE_CENTER_X = 50
const GAUGE_CENTER_Y = 50
const GAUGE_HALF_CIRCUMFERENCE = Math.PI * GAUGE_RADIUS
const GAUGE_ARC_PATH = `M ${GAUGE_CENTER_X - GAUGE_RADIUS} ${GAUGE_CENTER_Y} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_CENTER_X + GAUGE_RADIUS} ${GAUGE_CENTER_Y}`

export default function ConfidenceChart({ confidence }) {
  // Clamp in case the backend ever returns something outside 0-1.
  const safeConfidenceFraction = Math.min(Math.max(confidence, 0), 1)
  const confidenceArcLength = safeConfidenceFraction * GAUGE_HALF_CIRCUMFERENCE
  const confidenceRemainderArcLength = GAUGE_HALF_CIRCUMFERENCE - confidenceArcLength

  return (
    <>
      <div className="gauge-chart">
        {/* role and label let screen readers read the score, tabIndex lets keyboard users reach it */}
        <svg
          viewBox="0 0 100 60"
          className="gauge-svg"
          role="img"
          tabIndex={0}
          aria-label={`Confidence ${Math.round(safeConfidenceFraction * 100)} percent`}
        >
            <path d={GAUGE_ARC_PATH} fill="none" className="gauge-track" strokeWidth="14" strokeLinecap="round"/>
            <path d={GAUGE_ARC_PATH} fill="none" className="gauge-arc-confident" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${confidenceArcLength} ${GAUGE_HALF_CIRCUMFERENCE}`}>
              <title>{`Confident: ${Math.round(safeConfidenceFraction * 100)}%`}</title>
            </path>
            <path d={GAUGE_ARC_PATH} fill="none" className="gauge-arc-uncertain" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${confidenceRemainderArcLength} ${GAUGE_HALF_CIRCUMFERENCE}`} strokeDashoffset={-confidenceArcLength}>
              <title>{`Uncertain: ${Math.round((1 - safeConfidenceFraction) * 100)}%`}</title>
            </path>
        </svg>
        <div className="gauge-label">{Math.round(safeConfidenceFraction * 100)}%</div>
      </div>
      <p className="chart-caption">How sure the model is:</p>
      <div className="chart-legend">
        <span><span className="legend-swatch legend-confident"></span> Confident</span>
        <span><span className="legend-swatch legend-uncertain"></span> Uncertain</span>
      </div>
    </>
  )
}
