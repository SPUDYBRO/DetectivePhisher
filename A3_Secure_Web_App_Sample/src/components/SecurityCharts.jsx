import {useEffect, useRef} from 'react'
import * as d3 from 'd3'

export function RateLimitChart({data}) {
  const ref = useRef(null)
  useEffect(() => {
    if (!data) return
    const width = 430, height = 180
    const margin = {top: 26, right: 12, bottom: 38, left: 42}
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const rows = [
      {phase: 'Before', accepted: data.summary.before_accepted},
      {phase: 'After', accepted: data.summary.after_accepted},
    ]
    const x = d3.scaleBand().domain(rows.map(d => d.phase)).range([margin.left, width-margin.right]).padding(.45)
    const y = d3.scaleLinear().domain([0, 10]).range([height-margin.bottom, margin.top])

    svg.append('g').attr('transform', `translate(0,${height-margin.bottom})`).call(d3.axisBottom(x))
    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5))
    svg.selectAll('rect').data(rows).enter().append('rect')
      .attr('class', 'security-bar')
      .attr('x', d => x(d.phase))
      .attr('y', d => y(d.accepted))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0)-y(d.accepted))
      .attr('rx', 6)
    svg.selectAll('.value').data(rows).enter().append('text')
      .attr('class', 'chart-value')
      .attr('x', d => x(d.phase)+x.bandwidth()/2)
      .attr('y', d => y(d.accepted)-7)
      .attr('text-anchor', 'middle')
      .text(d => `${d.accepted}/10 accepted`)
  }, [data])
  return <svg ref={ref} className="d3-chart" />
}

export function AdvancedChart({data}) {
  const ref = useRef(null)
  useEffect(() => {
    if (!data) return
    const width = 430, height = 190
    const margin = {top: 28, right: 12, bottom: 42, left: 48}
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const rows = [
      {phase: 'Before defence', value: data.before.attack_success_rate},
      {phase: 'After defence', value: data.after.attack_success_rate},
    ]
    const x = d3.scaleBand().domain(rows.map(d=>d.phase)).range([margin.left,width-margin.right]).padding(.42)
    const y = d3.scaleLinear().domain([0,1]).range([height-margin.bottom,margin.top])

    svg.append('g').attr('transform', `translate(0,${height-margin.bottom})`).call(d3.axisBottom(x))
    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')))
    svg.selectAll('rect').data(rows).enter().append('rect')
      .attr('class','advanced-bar')
      .attr('x',d=>x(d.phase)).attr('y',d=>y(d.value))
      .attr('width',x.bandwidth()).attr('height',d=>y(0)-y(d.value)).attr('rx',6)
    svg.selectAll('.value').data(rows).enter().append('text')
      .attr('class','chart-value')
      .attr('x',d=>x(d.phase)+x.bandwidth()/2).attr('y',d=>y(d.value)-7)
      .attr('text-anchor','middle').text(d=>d3.format('.1%')(d.value))
    svg.append('text').attr('x',margin.left).attr('y',16).attr('class','chart-label')
      .text('Detection-evasion attack success rate')
  }, [data])
  return <svg ref={ref} className="d3-chart" />
}
