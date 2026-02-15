import React from 'react'

export default function PositionBlotter({ positions, quotes }) {
    // Calculate totals
    const totalPL = positions.reduce((acc, pos) => {
        const quote = quotes[pos.symbol] || { price: pos.avgPrice }
        const currentVal = quote.price * pos.qty
        const costBasis = pos.avgPrice * pos.qty
        return acc + (currentVal - costBasis)
    }, 0)

    const totalDelta = positions.reduce((acc, pos) => {
        // Mock delta for now (1.0 for equity)
        return acc + (pos.qty * 1.0)
    }, 0)

    return (
        <div className="w-full h-full flex flex-col p-2.5 bg-panel-alt overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-1">
                <span className="font-label text-text-muted text-[10px] font-bold tracking-widest uppercase">Portfolio Blotter</span>
                <div className="flex gap-2">
                    <span className="font-mono text-[9px] text-text-dim">NET LIQ: <span className="text-text-primary">$100,000.00</span></span>
                    <span className="font-mono text-[9px] text-text-dim">DAY P&L: <span className={totalPL >= 0 ? 'text-accent-itm' : 'text-accent-risk'}>{totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar border border-border bg-base mt-2">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-panel-alt border-b border-border z-10">
                        <tr className="font-mono text-[8px] text-text-dim uppercase">
                            <th className="px-2 py-1.5 font-bold">Symbol</th>
                            <th className="px-2 py-1.5 font-bold text-right">Qty</th>
                            <th className="px-2 py-1.5 font-bold text-right">Avg Px</th>
                            <th className="px-2 py-1.5 font-bold text-right">Last</th>
                            <th className="px-2 py-1.5 font-bold text-right">P&L</th>
                            <th className="px-2 py-1.5 font-bold text-right">Delta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-2 py-8 text-center font-mono text-[9px] text-text-muted italic">
                                    No open positions
                                </td>
                            </tr>
                        ) : positions.map((pos, i) => {
                            const quote = quotes[pos.symbol] || { price: pos.avgPrice }
                            const pl = (quote.price - pos.avgPrice) * pos.qty
                            return (
                                <tr key={i} className="group hover:bg-panel-alt border-b border-border/10">
                                    <td className="px-2 py-1 font-mono text-[10px] font-bold text-text-primary">{pos.symbol}</td>
                                    <td className="px-2 py-1 text-right font-mono text-[10px] text-text-primary">{pos.qty}</td>
                                    <td className="px-2 py-1 text-right font-mono text-[9px] text-text-muted">{pos.avgPrice.toFixed(2)}</td>
                                    <td className="px-2 py-1 text-right font-mono text-[9px] text-text-muted">{quote.price.toFixed(2)}</td>
                                    <td className={`px-2 py-1 text-right font-mono text-[10px] font-bold ${pl >= 0 ? 'text-accent-itm' : 'text-accent-risk'}`}>
                                        {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                                    </td>
                                    <td className="px-2 py-1 text-right font-mono text-[9px] text-text-dim">{(pos.qty * 1.0).toFixed(0)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-auto px-2 py-1 border-t border-border bg-panel-alt flex justify-between">
                <span className="font-mono text-[8px] text-text-dim uppercase">Total Delta</span>
                <span className="font-mono text-[8px] text-text-primary">{totalDelta.toFixed(0)}</span>
            </div>
        </div>
    )
}
