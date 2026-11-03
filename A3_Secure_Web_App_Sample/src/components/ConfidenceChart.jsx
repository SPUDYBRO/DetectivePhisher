import {useEffect, useRef} from 'react'
import * as d3 from 'd3'

export default function ConfidenceChart({score = 0, label = 'Score'}) {
  const ref = useRef(null)

  useEffect(() => {
    const width = 430
    const height = 92
    const margin = {left: 14, right: 14, top: 26, bottom: 24}

    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const x = d3.scaleLinear().domain([0, 1]).range([margin.left, width - margin.right])

    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', 37)
      .attr('width', width - margin.left - margin.right)
      .attr('height', 18)
      .attr('rx', 9)
      .attr('class', 'chart-track')

    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', 37)
      .attr('width', Math.max(0, x(score) - margin.left))
      .attr('height', 18)
      .attr('rx', 9)
      .attr('class', 'chart-fill')

    svg.append('line')
      .attr('x1', x(0.5))
      .attr('x2', x(0.5))
      .attr('y1', 31)
      .attr('y2', 61)
      .attr('class', 'chart-threshold')

    svg.append('text')
      .attr('x', margin.left)
      .attr('y', 17)
      .attr('class', 'chart-label')
      .text(label)

    svg.append('text')
      .attr('x', width - margin.right)
      .attr('y', 17)
      .attr('text-anchor', 'end')
      .attr('class', 'chart-value')
      .text(`${Math.round(score * 100)}%`)

    svg.append('text')
      .attr('x', x(0.5))
      .attr('y', 80)
      .attr('text-anchor', 'middle')
      .attr('class', 'chart-small')
      .text('0.50 threshold / reference')
  }, [score, label])

  return <svg ref={ref} className="d3-chart" aria-label={`${label}: ${Math.round(score * 100)} percent`} />
}
