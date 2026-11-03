import {useEffect, useRef} from 'react'
import * as d3 from 'd3'

export default function HistoryChart({history}) {
  const ref = useRef(null)

  useEffect(() => {
    const width = 430
    const height = 190
    const margin = {top: 18, right: 12, bottom: 36, left: 42}

    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    if (!history.length) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'chart-empty')
        .text('Run a few checks to build session history')
      return
    }

    const data = history.slice(-8)
    const x = d3.scaleBand()
      .domain(data.map((_, i) => `#${history.length - data.length + i + 1}`))
      .range([margin.left, width - margin.right])
      .padding(0.25)
    const y = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top])

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call(g => g.select('.domain').attr('class', 'axis-line'))

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')))
      .call(g => g.select('.domain').attr('class', 'axis-line'))

    svg.selectAll('.history-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'history-bar')
      .attr('x', (_, i) => x(`#${history.length - data.length + i + 1}`))
      .attr('y', d => y(d.score))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d.score))
      .attr('rx', 5)
      .append('title')
      .text(d => `${d.prediction}: ${Math.round(d.score * 100)}%`)

    svg.append('text')
      .attr('x', margin.left)
      .attr('y', 12)
      .attr('class', 'chart-label')
      .text('Current session — model score by request')
  }, [history])

  return <svg ref={ref} className="d3-chart" aria-label="Session result history" />
}
