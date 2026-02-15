import React, { useState, useMemo, useEffect } from 'react'
import { STOCKS } from './StockSelector'

export default function ScannerPanel({ onSelectTicker }) {
    const [scanResults, setScanResults] = useState([])
    const [isScanning, setIsScanning] = useState(false)
    const [activeSector, setActiveSector] = useState('ALL')

    // Simulate a scan for the prototype - in production this would hit a batch endpoint
    const runScan = () => {
        setIsScanning(true)
        setTimeout(() => {
            const results = STOCKS.map(s => {
                // Deterministic simulation based on symbol for demo
                const iv = 0.15 + (s.symbol.charCodeAt(0) % 30) / 100
                const rv = 0.12 + (s.symbol.charCodeAt(1) % 25) / 100
                const spread = (iv - rv) * 100
                return { ...s, iv, rv, spread }
            }).sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread))

            setScanResults(results)
            setIsScanning(false)
        }, 1200)
    }

    useEffect(() => {
        runScan()
    }, [])

    const filtered = useMemo(() => {
        return scanResults.filter(r => activeSector === 'ALL' || r.sector === activeSector)
    }, [scanResults, activeSector])

    const sectors = ['ALL', ...new Set(STOCKS.map(s => s.sector))]

    return (
        <div className="w-full h-full flex flex-col p-2.5 gap-3 bg-panel-alt overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-1">
                <span className="font-label text-text-muted text-[10px] font-bold tracking-widest uppercase">Rel-Val Sector Scanner</span>
                <button
                    onClick={runScan}
                    disabled={isScanning}
                    className={`font-mono text-[9px] px-2 py-0.5 border ${isScanning ? 'border-border text-text-dim' : 'border-accent-data text-accent-data hover:bg-accent-data/10'} transition-colors`}
                >
                    {isScanning ? 'SCANNING...' : 'REFRESH SCAN'}
                </button>
            </div>

            {/* Sector Selection */}
            <div className="flex flex-wrap gap-0 border border-border bg-base">
                {sectors.map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveSector(s)}
                        className={`px-2 py-1 font-mono text-[8px] border-r border-border transition-colors uppercase ${activeSector === s ? 'bg-accent-data text-white' : 'text-text-muted hover:bg-panel'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Alpha Ranking Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-border bg-base">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-panel-alt border-b border-border z-10">
                        <tr className="font-mono text-[8px] text-text-dim uppercase">
                            <th className="px-2 py-1.5 font-bold">Ticker</th>
                            <th className="px-2 py-1.5 font-bold text-right">Spread</th>
                            <th className="px-2 py-1.5 font-bold text-right">IV</th>
                            <th className="px-2 py-1.5 font-bold text-right">RV</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(r => (
                            <tr
                                key={r.symbol}
                                onClick={() => onSelectTicker(r.symbol)}
                                className="group hover:bg-panel-alt cursor-pointer border-b border-border/10"
                            >
                                <td className="px-2 py-1">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-[11px] font-bold text-text-primary group-hover:text-accent-data">{r.symbol}</span>
                                    </div>
                                </td>
                                <td className="px-2 py-1 text-right">
                                    <span className={`font-mono text-[10px] font-bold ${r.spread > 0 ? 'text-accent-risk' : 'text-accent-itm'}`}>
                                        {r.spread > 0 ? '+' : ''}{r.spread.toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-2 py-1 text-right font-mono text-[9px] text-text-muted">{(r.iv * 100).toFixed(0)}%</td>
                                <td className="px-2 py-1 text-right font-mono text-[9px] text-text-muted">{(r.rv * 100).toFixed(0)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center px-2 py-1 border-t border-border mt-auto bg-panel-alt">
                <span className="font-mono text-[8px] text-text-dim">TOTAL SAMPLES: {scanResults.length}</span>
                <span className="font-mono text-[8px] text-text-dim">ALPHA SIGNALS: {scanResults.filter(r => Math.abs(r.spread) > 4).length}</span>
            </div>
        </div>
    )
}
