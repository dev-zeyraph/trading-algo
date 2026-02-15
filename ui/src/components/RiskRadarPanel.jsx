import React, { useMemo } from 'react'

export default function RiskRadarPanel({ ticker, shocks }) {
    if (!ticker) return null

    // --- 1. GEX Profile Simulation ---
    // Simulate dealer gamma positioning based on spot price relative to key levels
    const gexProfile = useMemo(() => {
        const spot = ticker.price * (1 + shocks.spot / 100)
        const levels = []
        for (let i = -5; i <= 5; i++) {
            const strike = Math.round(spot * (1 + i * 0.02))
            // Dealer Short Gamma (Red) above spot, Long Gamma (Green) below spot (simplified skew logic)
            // Flip point is usually near ATM or slightly OTM
            const isShortGamma = i > 1
            const magnitude = Math.abs(Math.cos(i) * 1000) * (Math.random() * 0.5 + 0.5)
            levels.push({ strike, magnitude, isShortGamma })
        }
        return levels
    }, [ticker, shocks])

    // --- 2. Sigma Bands (Enemy Territory) ---
    // Calculate dynamic bands based on realized volatility
    const sigmaBands = useMemo(() => {
        const spot = ticker.price * (1 + shocks.spot / 100)
        const iv = ticker.vol + (shocks.vol / 100)
        const t = 30 / 365 // 30-day horizon
        const oneSigmaMove = spot * iv * Math.sqrt(t)

        return {
            spot,
            oneSigma: [spot - oneSigmaMove, spot + oneSigmaMove],
            twoSigma: [spot - 2 * oneSigmaMove, spot + 2 * oneSigmaMove],
            threeSigma: [spot - 3 * oneSigmaMove, spot + 3 * oneSigmaMove],
            zScore: (spot - ticker.price) / (ticker.price * ticker.vol * Math.sqrt(7 / 365)) // simple 7d z-score proxy
        }
    }, [ticker, shocks])

    const isInEnemyTerritory = Math.abs(sigmaBands.zScore) > 2.5

    // --- 3. Ghost Signal (Fractal Efficiency) ---
    // Simulate fractal efficiency gap
    const ghostSignal = useMemo(() => {
        // High FEG = Efficient Price (H~0.5) vs Anti-persistent Vol (H<0.5)
        const efficiency = 0.5 + (Math.sin(Date.now() / 2000) * 0.1)
        const volPersistence = 0.3 + (Math.cos(Date.now() / 3000) * 0.1)
        const gap = efficiency - volPersistence
        return {
            value: gap,
            strength: Math.min(100, Math.max(0, gap * 400)), // 0-100 scale
            status: gap > 0.15 ? 'DETECTED' : 'DORMANT'
        }
    }, [ticker])

    return (
        <div className="w-full h-full flex flex-col bg-panel-alt overflow-hidden">
            {/* Header */}
            <div className={`px-2 py-1.5 border-b border-border flex justify-between items-center ${isInEnemyTerritory ? 'bg-accent-risk/20 animate-pulse' : ''}`}>
                <span className="font-label text-text-muted text-[10px] font-bold tracking-widest uppercase">
                    {isInEnemyTerritory ? '⚠️ ENEMY TERRITORY DETECTED' : 'WAR ROOM: RISK RADAR'}
                </span>
                <span className="font-mono text-[9px] text-text-dim">GEX/SIGMA/FRACTAL</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-4">

                {/* 1. Sigma Cones */}
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-tight">Sigma Cones (30D)</span>
                    <div className="relative h-6 w-full bg-base border border-border mt-1">
                        {/* Center Line */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-text-dim/50" />

                        {/* Cursor */}
                        <div
                            className={`absolute top-0 bottom-0 w-1 transition-all duration-300 ${Math.abs(sigmaBands.zScore) > 2 ? 'bg-accent-risk' : 'bg-accent-data'}`}
                            style={{
                                left: `${Math.min(99, Math.max(1, 50 + (sigmaBands.zScore * 15)))}%`, // Scale Z-score to width
                                boxShadow: `0 0 10px ${Math.abs(sigmaBands.zScore) > 2 ? 'var(--color-accent-risk)' : 'var(--color-accent-data)'}`
                            }}
                        />

                        {/* Zones */}
                        <div className="absolute inset-0 flex justify-between px-[10%] opacity-30 pointer-events-none">
                            <div className="w-px h-full bg-accent-warn" /> {/* -2 Sigma */}
                            <div className="w-px h-full bg-accent-warn" /> {/* +2 Sigma */}
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
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-tight">Dealer GEX Profile</span>
                    <div className="flex flex-col gap-px border border-border bg-base p-1">
                        {gexProfile.map((level, i) => (
                            <div key={i} className="flex items-center gap-2 h-3 hover:bg-panel-alt/50">
                                <span className={`font-mono text-[8px] w-8 text-right ${level.strike === Math.round(sigmaBands.spot) ? 'text-text-primary font-bold' : 'text-text-dim'}`}>
                                    {level.strike}
                                </span>
                                <div className="flex-1 h-full flex items-center bg-panel/50 relative">
                                    <div className="absolute left-1/2 w-px h-full bg-border" />
                                    <div
                                        className={`h-1.5 transition-all ${level.isShortGamma ? 'bg-accent-risk' : 'bg-accent-itm'}`}
                                        style={{
                                            width: `${Math.min(50, level.magnitude / 20)}%`,
                                            marginLeft: level.isShortGamma ? '50%' : `calc(50% - ${Math.min(50, level.magnitude / 20)}%)`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between font-mono text-[8px] text-text-dim px-1">
                        <span className="text-accent-itm">LONG GAMMA (SUPPRESSION)</span>
                        <span className="text-accent-risk">SHORT GAMMA (VOLATILITY)</span>
                    </div>
                </div>

                {/* 3. Ghost Signal */}
                <div className="flex flex-col gap-1 mt-auto">
                    <div className="flex justify-between items-baseline">
                        <span className="font-mono text-[9px] text-text-muted uppercase tracking-tight">The "Ghost" Signal (Fractal)</span>
                        <span className={`font-mono text-[9px] font-bold ${ghostSignal.status === 'DETECTED' ? 'text-accent-surface animate-pulse' : 'text-text-dim'}`}>
                            {ghostSignal.status}
                        </span>
                    </div>
                    <div className="h-10 w-full bg-base border border-border flex items-end gap-0.5 p-0.5 relative overflow-hidden">
                        {/* Simulated visualizer bars */}
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-accent-surface/20"
                                style={{
                                    height: `${Math.random() * ghostSignal.strength}%`,
                                    opacity: i > 15 ? 1 : 0.4
                                }}
                            />
                        ))}
                        {/* CRT Scanline effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent-surface/5 pointer-events-none" />
                    </div>
                    <div className="flex justify-between font-mono text-[8px] text-text-dim">
                        <span>H(p) - H(v) Efficiency Gap</span>
                        <span>{ghostSignal.value.toFixed(3)}</span>
                    </div>
                </div>

            </div>
        </div>
    )
}
