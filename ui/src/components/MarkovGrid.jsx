import React, { useRef, useEffect, useMemo } from 'react'

export default function MarkovGrid({ states = 20, params, ticker }) {
    const spot = ticker?.price || 100
    const atmVol = ticker?.vol || 0.25
    const canvasRef = useRef(null)

    // Generate transition matrix from SABR params
    const matrix = useMemo(() => {
        const n = states
        const { alpha, rho, nu } = params
        const mat = Array.from({ length: n }, () => Array(n).fill(0))
        const pruned = Array.from({ length: n }, () => Array(n).fill(false))

        for (let i = 0; i < n; i++) {
            let rowSum = 0
            for (let j = 0; j < n; j++) {
                const dist = Math.abs(i - j)
                // Diffusion kernel: probability decays with distance
                const base = Math.exp(-dist * dist / (2 * nu * nu * n * 0.5))
                // Drift: slight bias from rho correlation
                const drift = 1 + rho * (j - i) / n * 0.5
                mat[i][j] = Math.max(0, base * drift)
                rowSum += mat[i][j]
            }
            // Normalize
            for (let j = 0; j < n; j++) {
                mat[i][j] = rowSum > 0 ? mat[i][j] / rowSum : 0
                // Prune very small probabilities
                if (mat[i][j] < 0.005) {
                    pruned[i][j] = true
                }
            }
        }
        return { mat, pruned }
    }, [states, params])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const parent = canvas.parentElement
        const width = parent.clientWidth
        const height = parent.clientHeight
        canvas.width = width * 2  // 2x for retina
        canvas.height = height * 2
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'

        const ctx = canvas.getContext('2d')
        ctx.scale(2, 2)

        const labelW = 48
        const labelH = 18
        const cellW = (width - labelW) / states
        const cellH = (height - labelH) / states
        const { mat, pruned } = matrix

        ctx.clearRect(0, 0, width, height)

        // Column headers — vol levels (ATM ± 30%)
        ctx.font = '8px JetBrains Mono'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const volLo = Math.max(0.05, atmVol * 0.7)
        const volHi = atmVol * 1.3
        for (let j = 0; j < states; j++) {
            const v = volLo + (volHi - volLo) * j / (states - 1)
            ctx.fillStyle = '#fefefeff'
            ctx.fillText(`${(v * 100).toFixed(0)}%`, labelW + j * cellW + cellW / 2, labelH / 2)
        }

        // Row headers — price levels (spot ± 2%)
        const priceLo = spot * 0.98
        const priceHi = spot * 1.02
        for (let i = 0; i < states; i++) {
            const p = priceLo + (priceHi - priceLo) * i / (states - 1)
            ctx.fillStyle = '#f9f9fbff'
            ctx.textAlign = 'right'
            ctx.fillText(`$${p.toFixed(1)}`, labelW - 4, labelH + i * cellH + cellH / 2)

            for (let j = 0; j < states; j++) {
                const x = labelW + j * cellW
                const y = labelH + i * cellH
                const val = mat[i][j]
                const isPruned = pruned[i][j]

                // Cell background
                if (isPruned) {
                    ctx.fillStyle = '#0f1729'
                } else {
                    // Intensity map: transparent -> accent-itm
                    const intensity = Math.min(1, val * 8)
                    const r = Math.round(0 + intensity * 0)
                    const g = Math.round(23 + intensity * (255 - 23))
                    const b = Math.round(41 + intensity * (200 - 41))
                    ctx.fillStyle = `rgb(${r},${g},${b})`
                }
                ctx.fillRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1)

                // Cell value
                if (cellW > 18) {
                    ctx.textAlign = 'center'
                    ctx.font = '8px JetBrains Mono'
                    if (isPruned) {
                        ctx.fillStyle = 'rgba(71, 85, 105, 0.3)'
                        ctx.fillText('·', x + cellW / 2, y + cellH / 2)
                    } else if (val > 0.01) {
                        ctx.fillStyle = val > 0.15 ? '#0f172a' : '#94a3b8'
                        ctx.fillText(val.toFixed(2), x + cellW / 2, y + cellH / 2)
                    }
                }
            }
        }

        // Border
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 0.5
        ctx.strokeRect(labelW, labelH, states * cellW, states * cellH)

    }, [matrix, states])

    return (
        <div className="w-full h-full relative flex flex-col">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="font-label text-text-muted text-xs tracking-wider uppercase">
                    Markov Chain · Transition Grid (S,V)
                </span>
                <span className="font-mono text-xs text-text-dim">
                    {states}×{states} · pruned &lt;0.5%
                </span>
            </div>
            <div className="flex-1 min-h-0 px-1 pb-1">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>
        </div>
    )
}
