// Line chart answering: how does this URL's features compare to the typical legitimate and
// phishing URL? One point per feature, all scaled to the same z-score axis so they line up.

// Size of the drawing and the space kept free around the plot for labels
const CHART_WIDTH = 480
const CHART_HEIGHT = 260
const MARGIN_TOP = 28
const MARGIN_RIGHT = 16
const MARGIN_BOTTOM = 78
const MARGIN_LEFT = 40

// The axis is fixed to -4..4 because every value arrives pre-scaled as a z-score
const Y_MIN = -4
const Y_MAX = 4
const Y_TICK_STEP = 2
const TICK_LABEL_GAP = 8
const LABEL_ROTATION_DEGREES = -30

export default function FeatureAverageChart({ points, yourValues }) {
  // Nothing to draw until the feature averages have loaded
  if (!points || points.length === 0) {
    return null
  }

  const plotWidth = CHART_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  const plotHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0

  // Keeps an unexpectedly large value from drawing outside the chart's fixed axis
  const clamp = value => Math.min(Math.max(value, Y_MIN), Y_MAX)
  const xFor = index => MARGIN_LEFT + index * stepX
  const yFor = value => MARGIN_TOP + plotHeight - ((clamp(value) - Y_MIN) / (Y_MAX - Y_MIN)) * plotHeight

  // Turns a list of {key, ...} points into an SVG path, picking the y value out with getValue
  function lineFor(getValue) {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(getValue(point))}`)
      .join(' ')
  }

  const legitimatePath = lineFor(point => point.legitimate)
  const phishingPath = lineFor(point => point.phishing)
  const yourUrlPath = yourValues ? lineFor(point => yourValues[point.key] ?? 0) : ''

  // Horizontal grid lines, evenly spaced across the fixed -4..4 axis
  const ticks = []
  for (let value = Y_MIN; value <= Y_MAX; value += Y_TICK_STEP) {
    ticks.push({ value, y: yFor(value) })
  }

  return (
    <div className="feature-average-chart">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="feature-average-svg"
        role="img"
        aria-label="Line chart comparing this URL's features against the legitimate and phishing averages"
      >
        {/* Grid lines with their numbers on the left */}
        {ticks.map(tick => (
          <g key={tick.value}>
            <line className="chart-grid-line" x1={MARGIN_LEFT} x2={CHART_WIDTH - MARGIN_RIGHT} y1={tick.y} y2={tick.y} />
            <text className="chart-text" x={MARGIN_LEFT - TICK_LABEL_GAP} y={tick.y} textAnchor="end" dominantBaseline="middle">
              {tick.value}
            </text>
          </g>
        ))}

        <path d={legitimatePath} className="feature-average-line-legitimate" fill="none" />
        <path d={phishingPath} className="feature-average-line-phishing" fill="none" />
        {yourUrlPath && <path d={yourUrlPath} className="feature-average-line-your-url" fill="none" />}

        {/* One rotated label per feature along the bottom */}
        {points.map((point, index) => (
          <text
            key={point.key}
            className="chart-text feature-average-tick-label"
            x={xFor(index)}
            y={MARGIN_TOP + plotHeight + TICK_LABEL_GAP * 2}
            textAnchor="end"
            transform={`rotate(${LABEL_ROTATION_DEGREES} ${xFor(index)} ${MARGIN_TOP + plotHeight + TICK_LABEL_GAP * 2})`}
          >
            {point.label}
          </text>
        ))}

        {/* Axis titles */}
        <text
          className="chart-text"
          transform={`translate(12 ${MARGIN_TOP + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Average
        </text>
        <text className="chart-text" x={MARGIN_LEFT + plotWidth / 2} y={CHART_HEIGHT - 6} textAnchor="middle">
          Features
        </text>
      </svg>

      <div className="chart-legend feature-average-legend">
        <span><span className="legend-swatch legend-legitimate"></span> Legitimate</span>
        <span><span className="legend-swatch legend-phishing"></span> Phishing</span>
        <span><span className="legend-swatch legend-your-url"></span> Your URL</span>
      </div>
    </div>
  )
}
