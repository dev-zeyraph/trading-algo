import React, { useState, useMemo } from 'react'

export default function IntelligencePanel({ ticker, params, shocks, onShockChange }) {
    const [targetStrike, setTargetStrike] = useState('')

    const stats = useMemo(() => {
        if (!ticker) return null
        const iv = ticker.vol
        const rv = ticker.rv_20d
        const spread = (iv - rv) * 100
        const edge = spread > 2 ? 'EXPENSIVE' : spread < -2 ? 'CHEAP' : 'FAIR'
        const edgeColor = spread > 2 ? '#ff4b2b' : spread < -2 ? '#00ffc8' : '#94a3b8'

        return { iv, rv, spread, edge, edgeColor }
    }, [ticker])

    const probability = useMemo(() => {
        if (!ticker || !targetStrike || isNaN(targetStrike)) return null

        // Apply Shocks
        const spotMult = 1 + (shocks.spot / 100)
        const volOffset = shocks.vol / 100

        const s = ticker.price * spotMult
        const k = parseFloat(targetStrike)
        const vol = ticker.vol + volOffset
        const t = 7 / 365 // 1 week probability

        if (vol <= 0 || s <= 0) return { itm: 0, touch: 0 }

        // Quick Black-Scholes d2 approximation for ITM prob
        const d2 = (Math.log(s / k) + (- 0.5 * vol * vol) * t) / (vol * Math.sqrt(t))

        // Normal CDF approx
        const cdf = (x) => {
            const t = 1 / (1 + 0.2316419 * Math.abs(x))
            const d = 0.3989423 * Math.exp(-x * x / 2)
            const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302745))))
            return x > 0 ? 1 - p : p
        }

        const itmProb = cdf(d2)
        const touchProb = Math.min(1, itmProb * 2)

        return { itm: itmProb * 100, touch: touchProb * 100 }
    }, [ticker, targetStrike, shocks])

    if (!ticker) return (
        <div className="flex-1 flex items-center justify-center font-mono text-xs text-text-dim uppercase">
            Awaiting intelligence data...
        </div>
    )

    const hasShocks = shocks.spot !== 0 || shocks.vol !== 0

    return (
        <div className="w-full h-full flex flex-col p-2.5 gap-3 bg-panel-alt">
            <div className="flex items-center justify-between border-b border-border pb-1">
                <span className="font-label text-text-muted text-[10px] font-bold tracking-widest uppercase">Research Intelligence</span>
                <span className={`font-mono text-[9px] ${hasShocks ? 'text-accent-warn animate-pulse' : 'text-accent-data'}`}>
                    {hasShocks ? 'PREDICTIVE' : 'LIVE'} V1.1
                </span>
            </div>

            {/* Edge Detection */}
            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-tight">Vol Spread (IV-RV)</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: stats.edgeColor }}>
                        {stats.edge} {stats.spread > 0 ? '+' : ''}{stats.spread.toFixed(1)}%
                    </span>
                </div>
                <div className="h-1.5 w-full bg-base border border-border overflow-hidden">
                    <div
                        className="h-full"
                        style={{
                            width: `${Math.min(100, Math.abs(stats.spread) * 3)}%`,
                            backgroundColor: stats.edgeColor,
                            marginLeft: stats.spread < 0 ? 'auto' : '0'
                        }}
                    />
                </div>
                <div className="flex justify-between font-mono text-[9px] text-text-dim">
                    <span>IV: {(stats.iv * 100).toFixed(1)}%</span>
                    <span>RV (20D): {(stats.rv * 100).toFixed(1)}%</span>
                </div>
            </div>

            {/* Scenario Stress-Testing */}
            <div className="flex flex-col gap-2 bg-base p-2 border border-border">
                <span className="font-mono text-[9px] text-text-muted uppercase font-bold tracking-widest">Scenario Shocks</span>

                <div className="flex flex-col gap-1">
                    <div className="flex justify-between font-mono text-[8px] text-text-muted uppercase">
                        <span>Spot Shock</span>
                        <span className={shocks.spot !== 0 ? 'text-accent-warn' : ''}>{shocks.spot > 0 ? '+' : ''}{shocks.spot}%</span>
                    </div>
                    <input
                        type="range" min="-20" max="20" step="1"
                        value={shocks.spot}
                        onChange={e => onShockChange({ ...shocks, spot: parseInt(e.target.value) })}
                        className="w-full h-1 bg-panel border-none outline-none appearance-none cursor-pointer accent-accent-warn"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex justify-between font-mono text-[8px] text-text-muted uppercase">
                        <span>Vol Shock</span>
                        <span className={shocks.vol !== 0 ? 'text-accent-warn' : ''}>{shocks.vol > 0 ? '+' : ''}{shocks.vol}%</span>
                    </div>
                    <input
                        type="range" min="-50" max="50" step="1"
                        value={shocks.vol}
                        onChange={e => onShockChange({ ...shocks, vol: parseInt(e.target.value) })}
                        className="w-full h-1 bg-panel border-none outline-none appearance-none cursor-pointer accent-accent-warn"
                    />
                </div>
            </div>

            {/* Probability Analyzer */}
            <div className="flex flex-col gap-2 bg-base p-2 border border-border">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-tight">Strike Analyzer ($)</span>
                    <input
                        type="text"
                        value={targetStrike}
                        onChange={e => setTargetStrike(e.target.value)}
                        placeholder={(ticker.price * (1 + shocks.spot / 100)).toFixed(0)}
                        className="w-14 bg-panel-alt border border-border text-right px-1 font-mono text-[10px] text-text-primary outline-none focus:border-accent-data"
                    />
                </div>

                {probability ? (
                    <div className="grid grid-cols-2 gap-4 mt-1 border-t border-border/50 pt-2">
                        <div className="flex flex-col">
                            <span className="font-mono text-[8px] text-text-dim uppercase tracking-widest leading-none mb-1">Prob. Touch</span>
                            <span className={`font-mono text-[13px] font-bold ${hasShocks ? 'text-accent-warn' : 'text-text-primary'}`}>
                                {probability.touch.toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex flex-col border-l border-border/50 pl-3">
                            <span className="font-mono text-[8px] text-text-dim uppercase tracking-widest leading-none mb-1">Prob. ITM</span>
                            <span className={`font-mono text-[13px] font-bold ${hasShocks ? 'text-accent-warn' : 'text-accent-itm'}`}>
                                {probability.itm.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="py-2 text-center font-mono text-[9px] text-text-dim italic">
                        Select strike for predictive profile
                    </div>
                )}
            </div>

            <div className="mt-auto pt-2 border-t border-border flex justify-between">
                <span className="font-mono text-[8px] text-text-dim uppercase">Term Curve (IV)</span>
                <span className="font-mono text-[8px] text-accent-data">{(ticker.vol * 100).toFixed(1)}% ATM</span>
            </div>
        </div>
    )
}
