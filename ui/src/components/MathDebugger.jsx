import React from 'react';

export default function MathDebugger({ manifold }) {
    if (!manifold) return <div className="p-4 text-xs text-slate-500 font-mono">MATH_GUARD: NO DATA</div>;

    const { fisher_distance, curvature, exhaustion, mu, sigma2 } = manifold;

    // Safebounds
    const isDistanceUnsafe = fisher_distance < 0.05;
    const isCurvatureUnsafe = curvature > 5.0;
    const isExhaustionCritical = exhaustion > 0.95;

    return (
        <div className="bg-[#050510] border border-[#1a1a2e] rounded-sm p-2 font-mono text-[10px] w-full">
            <div className="text-[#666] mb-2 uppercase tracking-widest border-b border-[#1a1a2e] pb-1 flex justify-between">
                <span>Math Invariant Monitor</span>
                <span className={isExhaustionCritical ? "text-red-500 animate-pulse" : "text-emerald-500"}>
                    {isExhaustionCritical ? "CRITICAL" : "SAFE"}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="text-[#888] cursor-help border-b border-dotted border-[#333]" title="Measure of how fast the market probability distribution is changing. High = Regime Shift.">
                    Fisher Metric (gij)
                </div>
                <div className="text-right text-[#00e5ff]">
                    μ={mu.toFixed(4)} σ²={sigma2.toFixed(4)}
                </div>

                <div className="text-[#888] cursor-help border-b border-dotted border-[#333]" title="Distance from 'Normal'. High (>3.0) = Deep Outlier Territory (Crash/Squeeze Possible).">
                    Geodesic Dist (Rao)
                </div>
                <div className={`text-right ${isDistanceUnsafe ? 'text-red-500 font-bold' : 'text-[#e0e0e0]'}`}>
                    {fisher_distance.toFixed(4)}
                </div>

                <div className="text-[#888] cursor-help border-b border-dotted border-[#333]" title="Geometric Tension. High (>1.0) = Market is trapped in a tight, volatile loop.">
                    Sig Curvature (κ)
                </div>
                <div className={`text-right ${isCurvatureUnsafe ? 'text-amber-500 font-bold' : 'text-[#e0e0e0]'}`}>
                    {curvature.toFixed(4)}
                </div>

                <div className="text-[#888] cursor-help border-b border-dotted border-[#333]" title="Probability that the trend has depleted its energy. >0.8 is Critical.">
                    Exhaustion Density (ρ)
                </div>
                <div className="text-right">
                    <div className="w-full bg-[#1a1a2e] h-1.5 mt-1 relative">
                        <div
                            className={`h-full absolute top-0 left-0 transition-all duration-300 ${isExhaustionCritical ? 'bg-red-500' : 'bg-[#00e5ff]'}`}
                            style={{ width: `${Math.min(100, exhaustion * 100)}%` }}
                        />
                    </div>
                    <div className="text-[9px] mt-0.5 text-[#fff]">{exhaustion.toFixed(4)}</div>
                </div>
            </div>
        </div>
    );
}
