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
        {/* Each slice is its own focusable/hoverable element, so it can highlight on its own like a bar chart bar */}
        <svg
          viewBox="0 0 100 60"
          className="gauge-svg"
          role="group"
          aria-label={`Confidence ${Math.round(safeConfidenceFraction * 100)} percent`}
        >
            <defs>
              {/* Traces an outline around just the hovered arc's own painted pixels, so the highlight follows
                  its curve and dash cut-offs instead of drawing a box around the whole arc's bounding area */}
              <filter id="gauge-segment-outline" x="-40%" y="-80%" width="180%" height="260%">
                <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated" />
                <feFlood style={{ floodColor: 'var(--bar-chart-active-stroke-color)' }} result="outline-color" />
                <feComposite in="outline-color" in2="dilated" operator="in" result="outline" />
                <feMerge>
                  <feMergeNode in="outline" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path d={GAUGE_ARC_PATH} fill="none" className="gauge-track" strokeWidth="14" strokeLinecap="round"/>
            <path
              d={GAUGE_ARC_PATH} fill="none" className="gauge-arc-confident" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${confidenceArcLength} ${GAUGE_HALF_CIRCUMFERENCE}`}
              tabIndex={0}
              role="img"
              aria-label={`Confident: ${Math.round(safeConfidenceFraction * 100)} percent`}
            >
              <title>{`Confident: ${Math.round(safeConfidenceFraction * 100)}%`}</title>
            </path>
            <path
              d={GAUGE_ARC_PATH} fill="none" className="gauge-arc-uncertain" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${confidenceRemainderArcLength} ${GAUGE_HALF_CIRCUMFERENCE}`} strokeDashoffset={-confidenceArcLength}
              tabIndex={0}
              role="img"
              aria-label={`Uncertain: ${Math.round((1 - safeConfidenceFraction) * 100)} percent`}
            >
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
