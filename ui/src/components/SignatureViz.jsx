import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

export default function SignatureViz({ paths, signatures }) {
    const svgRef = useRef(null)
    const [mode, setMode] = useState('price') // 'price' | 'signature'

    useEffect(() => {
        if (!svgRef.current) return
        const svg = d3.select(svgRef.current)
        const rect = svgRef.current.parentElement.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const margin = { top: 8, right: 12, bottom: 24, left: 40 }
        const w = width - margin.left - margin.right
        const h = height - margin.top - margin.bottom

        svg.attr('width', width).attr('height', height)
        svg.selectAll('*').remove()

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

        if (mode === 'price' && paths.length > 0) {
            // Raw price series mode
            const allValues = paths.flat()
            const yExtent = d3.extent(allValues)
            const xScale = d3.scaleLinear().domain([0, (paths[0]?.length || 100) - 1]).range([0, w])
            const yScale = d3.scaleLinear().domain([yExtent[0] * 0.98, yExtent[1] * 1.02]).range([h, 0])

            // Grid
            g.append('g')
                .attr('transform', `translate(0,${h})`)
                .call(d3.axisBottom(xScale).ticks(6).tickSize(-h))
                .call(g => g.selectAll('line').attr('stroke', '#1e293b'))
                .call(g => g.selectAll('text').attr('fill', '#64748b').style('font-family', 'JetBrains Mono').style('font-size', '10px'))
                .call(g => g.select('.domain').remove())

            g.append('g')
                .call(d3.axisLeft(yScale).ticks(5).tickSize(-w))
                .call(g => g.selectAll('line').attr('stroke', '#1e293b'))
                .call(g => g.selectAll('text').attr('fill', '#64748b').style('font-family', 'JetBrains Mono').style('font-size', '10px'))
                .call(g => g.select('.domain').remove())

            const line = d3.line()
                .x((d, i) => xScale(i))
                .y(d => yScale(d))
                .curve(d3.curveMonotoneX)

            // Color gradient: blue -> cyan per path
            const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, Math.max(1, paths.length - 1)])

            paths.forEach((path, idx) => {
                g.append('path')
                    .datum(path)
                    .attr('d', line)
                    .attr('fill', 'none')
                    .attr('stroke', colorScale(idx))
                    .attr('stroke-width', 1.2)
                    .attr('opacity', 0.7)
            })

        } else if (mode === 'signature') {
            // Iterated integral projection — parallel coordinates
            const sigLabels = ['S¹', 'S²', 'S¹¹', 'S¹²', 'S²¹', 'S²²', 'S¹¹¹', 'S¹¹²', 'S¹²¹', 'S¹²²', 'S²¹¹', 'S²¹²', 'S²²¹', 'S²²²', 'ΣL3']
            const dims = sigLabels.length
            const xScale = d3.scalePoint().domain(sigLabels).range([0, w]).padding(0.1)

            // Create scale per dimension
            const yScales = {}
            sigLabels.forEach((label, i) => {
                const vals = signatures.map(s => s[i] || 0)
                const ext = d3.extent(vals)
                const pad = (ext[1] - ext[0]) * 0.1 || 0.01
                yScales[label] = d3.scaleLinear().domain([ext[0] - pad, ext[1] + pad]).range([h, 0])
            })

            // Axes
            sigLabels.forEach(label => {
                const x = xScale(label)
                g.append('line')
                    .attr('x1', x).attr('y1', 0)
                    .attr('x2', x).attr('y2', h)
                    .attr('stroke', '#334155')
                    .attr('stroke-width', 1)
                g.append('text')
                    .attr('x', x).attr('y', h + 16)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#64748b')
                    .style('font-family', 'JetBrains Mono')
                    .style('font-size', '9px')
                    .text(label)
            })

            // Lines
            const colorScale = d3.scaleSequential(d3.interpolateCool).domain([0, Math.max(1, signatures.length - 1)])
            const lineGen = d3.line().curve(d3.curveMonotoneX)

            signatures.forEach((sig, idx) => {
                const pts = sigLabels.map((label, i) => [xScale(label), yScales[label](sig[i] || 0)])
                g.append('path')
                    .datum(pts)
                    .attr('d', lineGen)
                    .attr('fill', 'none')
                    .attr('stroke', colorScale(idx))
                    .attr('stroke-width', 1)
                    .attr('opacity', 0.6)
            })

            // No-data fallback
            if (signatures.length === 0) {
                g.append('text')
                    .attr('x', w / 2).attr('y', h / 2)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#475569')
                    .style('font-family', 'Fira Sans')
                    .style('font-size', '12px')
                    .text('Awaiting signature stream…')
            }
        }
    }, [paths, signatures, mode])

    return (
        <div className="w-full h-full relative flex flex-col">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="font-label text-text-muted text-xs tracking-wider uppercase">
                    Path Signature · r-Bergomi
                </span>
                <div className="flex gap-0.5">
                    <button
                        onClick={() => setMode('price')}
                        className={`px-2 py-0.5 text-xs font-mono cursor-pointer border border-border ${mode === 'price' ? 'bg-accent-data/20 text-accent-data border-accent-data' : 'bg-transparent text-text-dim hover:text-text-muted'
                            }`}
                        style={{ borderRadius: '2px' }}
                    >
                        PRICE
                    </button>
                    <button
                        onClick={() => setMode('signature')}
                        className={`px-2 py-0.5 text-xs font-mono cursor-pointer border border-border ${mode === 'signature' ? 'bg-accent-data/20 text-accent-data border-accent-data' : 'bg-transparent text-text-dim hover:text-text-muted'
                            }`}
                        style={{ borderRadius: '2px' }}
                    >
                        SIG∫
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <svg ref={svgRef} className="w-full h-full" />
            </div>
        </div>
    )
}
