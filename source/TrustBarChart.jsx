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

  return (
    <div className="bar-chart">
    </div>
  )
}