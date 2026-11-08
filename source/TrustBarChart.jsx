import { useState } from 'react'

// Same labels as the other pages
const VERDICT_LABELS = {
    benign: 'Looks Safe',
    caution: 'Use Caution',
    malicious: 'Likely Phishing',
}

// Size of the drawing and the space kept free around the bars for labels
const CHART_WIDTH = 400
const CHART_HEIGHT = 220
const MARGIN_TOP = 10
const MARGIN_RIGHT = 10
const MARGIN_BOTTOM = 40
const MARGIN_LEFT = 50

// Spacing numbers named here so the drawing code has no unexplained values
const PERCENT_MAX = 100
const TICK_STEP = 25
const BAR_WIDTH_RATIO = 0.6
const TICK_LABEL_GAP = 8
const BAR_LABEL_OFFSET = 16
const Y_TITLE_X = 12
const X_TITLE_OFFSET = 6

// Bar chart answering: how do my checks compare? One bar per url checked this session
export default function TrustBarChart({ history }) {
  // The bar the user is hovering over or has tabbed to
  const [selected, setSelected] = useState(null)

  // Nothing to draw until a url has been checked
  if (history.length === 0) {
    return null
  }

  // The drawing area left over once the margins are taken away
  const plotWidth = CHART_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  const plotHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM
  const slotWidth = plotWidth / history.length
  const barWidth = slotWidth * BAR_WIDTH_RATIO

 // Turn each past check into the position and height of one bar
  const bars = []
  for (let i = 0; i < history.length; i++) {
    const entry = history[i]
    const trustPercent = Math.round(entry.trustScore * PERCENT_MAX)
    const barHeight = (trustPercent / PERCENT_MAX) * plotHeight
    const x = MARGIN_LEFT + i * slotWidth + (slotWidth - barWidth) / 2
    const y = MARGIN_TOP + plotHeight - barHeight
    bars.push({ x, y, barHeight, trustPercent, url: entry.url, verdict: entry.verdict })
  }

  // Horizontal grid lines at 0, 25, 50, 75 and 100
  const ticks = []
  for (let value = 0; value <= PERCENT_MAX; value += TICK_STEP) {
    const y = MARGIN_TOP + plotHeight - (value / PERCENT_MAX) * plotHeight
    ticks.push({ value, y })
  }

  // Text shown under the chart for the bar being hovered or focused
  let detailsText = ''
  if (selected !== null && history[selected]) {
    const chosen = history[selected]
    const chosenPercent = Math.round(chosen.trustScore * PERCENT_MAX)
    detailsText = chosen.url + ': ' + VERDICT_LABELS[chosen.verdict] + ', trust ' + chosenPercent + '%'
  }
  

  return (
    <div className="bar-chart">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="bar-chart-svg"
        role="group"
        aria-label="Bar chart of the trust score for each URL checked"
      >
        {/* Grid lines with their numbers on the left */}
        {ticks.map(tick => (
          <g key={tick.value}>
            <line
              className="chart-grid-line"
              x1={MARGIN_LEFT}
              x2={CHART_WIDTH - MARGIN_RIGHT}
              y1={tick.y}
              y2={tick.y}
            />
            <text className="chart-text" x={MARGIN_LEFT - TICK_LABEL_GAP} y={tick.y} textAnchor="end" dominantBaseline="middle">
              {tick.value}
            </text>
          </g>
        ))}

        {/* One bar per check. The title inside is the hover tooltip, tabIndex lets keyboard users reach it */}
        {bars.map((bar, index) => (
          <g key={index}>
            <rect
              className={`bar bar-${bar.verdict}`}
              x={bar.x}
              y={bar.y}
              width={barWidth}
              height={bar.barHeight}
              tabIndex={0}
              role="img"
              aria-label={`Check ${index + 1}: ${bar.url}, trust score ${bar.trustPercent} percent`}
              onMouseEnter={() => setSelected(index)}
              onMouseLeave={() => setSelected(null)}
              onFocus={() => setSelected(index)}
              onBlur={() => setSelected(null)}
            >
              <title>{bar.url}: {bar.trustPercent}%</title>
            </rect>
            <text
              className="chart-text"
              x={bar.x + barWidth / 2}
              y={MARGIN_TOP + plotHeight + BAR_LABEL_OFFSET}
              textAnchor="middle"
            >
              {index + 1}
            </text>
          </g>
        ))}

        {/* Axis titles */}
        <text
          className="chart-text"
          transform={`translate(${Y_TITLE_X} ${MARGIN_TOP + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Trust score (%)
        </text>
        <text
          className="chart-text"
          x={MARGIN_LEFT + plotWidth / 2}
          y={CHART_HEIGHT - X_TITLE_OFFSET}
          textAnchor="middle"
        >
          Check number (1 is the newest)
        </text>
      </svg>
    </div>