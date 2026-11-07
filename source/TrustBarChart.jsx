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
    </div>
  )
}