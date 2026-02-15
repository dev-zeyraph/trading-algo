import React, { useMemo } from 'react'

export default function RiskRadarPanel({ ticker, shocks, manifold }) {
    if (!ticker) return null

    const spot = ticker.price * (1 + (shocks?.spot || 0) / 100)
    const exhaustion = manifold?.exhaustion || 0
    const curvature = manifold?.curvature || 0

    // --- 1. GEX Profile — Real data from options chain ---
    const gexProfile = useMemo(() => {
        const raw = ticker.gex_profile || []
        if (raw.length === 0) return []
        return raw.map(g => ({
            strike: g.strike,
            gex: g.gex,
            isShortGamma: g.gex < 0
        }))
    }, [ticker.gex_profile])

    const maxGex = useMemo(() => {
        if (gexProfile.length === 0) return 1
        return Math.max(...gexProfile.map(g => Math.abs(g.gex)), 0.001)
    }, [gexProfile])

    // --- 2. Sigma Bands (Enemy Territory) ---
    const sigmaBands = useMemo(() => {
        const iv = ticker.vol + ((shocks?.vol || 0) / 100)
        const t = 30 / 365 // 30-day horizon
        const oneSigmaMove = spot * iv * Math.sqrt(t)

        return {
            spot,
            oneSigma: [spot - oneSigmaMove, spot + oneSigmaMove],
            twoSigma: [spot - 2 * oneSigmaMove, spot + 2 * oneSigmaMove],
            threeSigma: [spot - 3 * oneSigmaMove, spot + 3 * oneSigmaMove],
            zScore: ticker.price !== spot
                ? (spot - ticker.price) / (ticker.price * ticker.vol * Math.sqrt(7 / 365))
                : 0
        }
    }, [ticker, shocks, spot])

    const isInEnemyTerritory = Math.abs(sigmaBands.zScore) > 2.5
    const isExhausted = exhaustion > 0.7

    // Theme logic: Neon Cyan -> Amber
    const headerClass = isExhausted
        ? 'bg-accent-warn/30 border-accent-warn/50 animate-pulse'
        : isInEnemyTerritory
            ? 'bg-accent-risk/20 animate-pulse'
            : 'bg-panel-alt'

    // --- 3. Ghost Signal — Real Hurst Exponents from R/S Analysis ---
    const ghostSignal = useMemo(() => {
        const hPrice = ticker.hurst_price ?? 0.5
        const hVol = ticker.hurst_vol ?? 0.5
        const gap = hPrice - hVol
        return {
            hPrice,
            hVol,
            gap,
            strength: Math.min(100, Math.max(0, Math.abs(gap) * 400)),
            status: gap > 0.15 ? 'DETECTED' : gap > 0.08 ? 'CHARGING' : 'DORMANT'
        }
    }, [ticker.hurst_price, ticker.hurst_vol])

    return (
        <div className="w-full h-full flex flex-col bg-panel-alt overflow-hidden border-t border-border">
            {/* Header */}
            <div className={`px-2 py-1.5 border-b border-border flex justify-between items-center transition-colors duration-500 ${headerClass}`}>
                <div className="flex flex-col">
                    <span className={`font-label text-[10px] font-bold tracking-widest uppercase ${isExhausted ? 'text-accent-warn' : 'text-text-muted'}`}>
                        {isExhausted ? '🔴 MANIFOLD EXHAUSTION' : isInEnemyTerritory ? '⚠️ ENEMY TERRITORY' : 'WAR ROOM: RISK RADAR'}
                    </span>
                    {manifold && (
                        <div className="flex gap-2 font-mono text-[7px] text-text-dim">
                            <span>FISHER-D: {manifold.fisher_distance.toFixed(4)}</span>
                            <span>κ: {curvature.toFixed(4)}</span>
                        </div>
                    )}
                </div>
                <span className="font-mono text-[9px] text-text-dim">
                    {gexProfile.length > 0 ? 'LIVE GEX' : 'AWAITING DATA'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-4">

                {/* 1. Sigma Cones */}
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-tight">Sigma Cones (30D)</span>
                    <div className="relative h-6 w-full bg-base border border-border mt-1">
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-text-dim/50" />
                        <div
                            className={`absolute top-0 bottom-0 w-1 transition-all duration-300 ${Math.abs(sigmaBands.zScore) > 2 ? 'bg-accent-risk' : 'bg-accent-data'}`}
                            style={{
                                left: `${Math.min(99, Math.max(1, 50 + (sigmaBands.zScore * 15)))}%`,
                                boxShadow: `0 0 10px ${Math.abs(sigmaBands.zScore) > 2 ? 'var(--color-accent-risk)' : 'var(--color-accent-data)'}`
                            }}
                        />
                        <div className="absolute inset-0 flex justify-between px-[10%] opacity-30 pointer-events-none">
                            <div className="w-px h-full bg-accent-warn" />
                            <div className="w-px h-full bg-accent-warn" />
                        </div>
                    </div>
                    <div className="flex justify-between font-mono text-[8px] text-text-dim px-1">
                        <span>-3σ {(sigmaBands.threeSigma[0]).toFixed(0)}</span>
                        <span>SPOT {sigmaBands.spot.toFixed(2)} (Z={sigmaBands.zScore.toFixed(2)})</span>
                        <span>+3σ {(sigmaBands.threeSigma[1]).toFixed(0)}</span>
                    </div>
                </div>

                {/* 2. GEX Profile */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-baseline">
                        <span className="font-mono text-[9px] text-text-muted uppercase tracking-tight">Dealer GEX Profile</span>
                        <span className="font-mono text-[8px] text-text-dim">{gexProfile.length} strikes</span>
                    </div>
                    {gexProfile.length === 0 ? (
                        <div className="border border-border bg-base p-4 text-center">
                            <span className="font-mono text-[9px] text-text-dim italic">Market closed — no options chain data</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-px border border-border bg-base p-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {gexProfile.map((level, i) => (
                                <div key={i} className="flex items-center gap-2 h-3 hover:bg-panel-alt/50">
                                    <span className={`font-mono text-[8px] w-10 text-right ${Math.abs(level.strike - spot) / spot < 0.01 ? 'text-text-primary font-bold' : 'text-text-dim'}`}>
                                        {level.strike.toFixed(0)}
                                    </span>
                                    <div className="flex-1 h-full flex items-center bg-panel/50 relative">
                                        <div className="absolute left-1/2 w-px h-full bg-border" />
                                        <div
                                            className={`h-1.5 transition-all ${level.isShortGamma ? 'bg-accent-risk' : 'bg-accent-itm'}`}
                                            style={{
                                                width: `${Math.min(50, (Math.abs(level.gex) / maxGex) * 50)}%`,
                                                marginLeft: level.isShortGamma ? '50%' : `calc(50% - ${Math.min(50, (Math.abs(level.gex) / maxGex) * 50)}%)`
                                            }}
                                        />
                                    </div>
                                    <span className={`font-mono text-[7px] w-10 text-right ${level.isShortGamma ? 'text-accent-risk' : 'text-accent-itm'}`}>
                                        {level.gex.toFixed(2)}M
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-between font-mono text-[8px] text-text-dim px-1">
                        <span className="text-accent-itm">LONG γ (SUPPRESSION)</span>
                        <span className="text-accent-risk">SHORT γ (VOLATILITY)</span>
                    </div>
                </div>

                {/* 3. Ghost Signal */}
                <div className="flex flex-col gap-1 mt-auto">
                    <div className="flex justify-between items-baseline">
                        <span className="font-mono text-[9px] text-text-muted uppercase tracking-tight">The "Ghost" Signal (Fractal)</span>
                        <span className={`font-mono text-[9px] font-bold ${ghostSignal.status === 'DETECTED' ? 'text-accent-surface animate-pulse' : ghostSignal.status === 'CHARGING' ? 'text-accent-warn' : 'text-text-dim'}`}>
                            {ghostSignal.status}
                        </span>
                    </div>
                    <div className="border border-border bg-base p-2">
                        <div className="flex justify-between font-mono text-[9px] mb-1">
                            <span className="text-text-dim">H(price)</span>
                            <span className={`font-bold ${ghostSignal.hPrice > 0.55 ? 'text-accent-itm' : ghostSignal.hPrice < 0.45 ? 'text-accent-risk' : 'text-text-muted'}`}>
                                {ghostSignal.hPrice.toFixed(4)}
                            </span>
                        </div>
                        <div className="flex justify-between font-mono text-[9px] mb-1">
                            <span className="text-text-dim">H(vol)</span>
                            <span className={`font-bold ${ghostSignal.hVol < 0.45 ? 'text-accent-warn' : 'text-text-muted'}`}>
                                {ghostSignal.hVol.toFixed(4)}
                            </span>
                        </div>
                        <div className="h-px bg-border my-1" />
                        <div className="flex justify-between font-mono text-[9px]">
                            <span className="text-text-dim">Efficiency Gap</span>
                            <span className={`font-bold ${ghostSignal.gap > 0.15 ? 'text-accent-surface' : 'text-text-muted'}`}>
                                {ghostSignal.gap.toFixed(4)}
                            </span>
                        </div>
                        {/* Visual gauge */}
                        <div className="h-2 w-full bg-panel mt-1.5 border border-border/50 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${ghostSignal.status === 'DETECTED' ? 'bg-accent-surface' : ghostSignal.status === 'CHARGING' ? 'bg-accent-warn' : 'bg-text-dim/30'}`}
                                style={{ width: `${ghostSignal.strength}%` }}
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
