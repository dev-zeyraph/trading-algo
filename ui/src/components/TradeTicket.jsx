import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TradeTicket({ ticker, onSubmitOrder, onClose }) {
    const [side, setSide] = useState('BUY')
    const [qty, setQty] = useState(100)
    const [orderType, setOrderType] = useState('LIMIT')
    const [price, setPrice] = useState(ticker ? ticker.price.toFixed(2) : '0.00')

    const handleSubmit = () => {
        const order = {
            symbol: ticker.symbol,
            side,
            qty: parseInt(qty),
            type: orderType,
            price: parseFloat(price),
            timestamp: Date.now()
        }
        onSubmitOrder(order)
    }

    if (!ticker) return null

    const totalValue = (parseFloat(price) * parseInt(qty)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-4 right-4 w-72 bg-panel border-2 border-border shadow-2xl z-50 flex flex-col overflow-hidden"
        >
            {/* Header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b border-border ${side === 'BUY' ? 'bg-accent-itm/10' : 'bg-accent-risk/10'}`}>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-text-primary">{ticker.symbol}</span>
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 ${side === 'BUY' ? 'bg-accent-itm text-black' : 'bg-accent-risk text-white'}`}>{side}</span>
                </div>
                <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col gap-3">
                {/* Side Toggle */}
                <div className="flex gap-0 border border-border">
                    <button
                        onClick={() => setSide('BUY')}
                        className={`flex-1 py-1 font-mono text-[10px] font-bold transition-colors ${side === 'BUY' ? 'bg-accent-itm text-black' : 'bg-panel-alt text-text-muted hover:text-text-primary'}`}
                    >
                        BUY
                    </button>
                    <button
                        onClick={() => setSide('SELL')}
                        className={`flex-1 py-1 font-mono text-[10px] font-bold border-l border-border transition-colors ${side === 'SELL' ? 'bg-accent-risk text-white' : 'bg-panel-alt text-text-muted hover:text-text-primary'}`}
                    >
                        SELL
                    </button>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-[9px] text-text-dim uppercase">Quantity</span>
                        <input
                            type="number"
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            className="w-full bg-base border border-border px-2 py-1 font-mono text-xs text-text-primary text-right outline-none focus:border-accent-data"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-[9px] text-text-dim uppercase">Order Type</span>
                        <select
                            value={orderType}
                            onChange={e => setOrderType(e.target.value)}
                            className="w-full bg-base border border-border px-1 py-1 font-mono text-[10px] text-text-primary outline-none focus:border-accent-data appearance-none"
                        >
                            <option value="MARKET">MARKET</option>
                            <option value="LIMIT">LIMIT</option>
                            <option value="STOP">STOP</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] text-text-dim uppercase">Limit Price</span>
                    <div className="relative">
                        <span className="absolute left-2 top-1.5 font-mono text-xs text-text-muted">$</span>
                        <input
                            type="number"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            disabled={orderType === 'MARKET'}
                            className={`w-full bg-base border border-border pl-6 pr-2 py-1 font-mono text-xs text-text-primary text-right outline-none focus:border-accent-data ${orderType === 'MARKET' ? 'opacity-50' : ''}`}
                        />
                    </div>
                </div>

                {/* Summary */}
                <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-mono text-[9px] text-text-dim uppercase">Est. Total</span>
                    <span className="font-mono text-xs font-bold text-text-primary">{totalValue}</span>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    className={`mt-1 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-transform active:scale-95 ${side === 'BUY'
                            ? 'bg-accent-itm text-black hover:bg-accent-itm/90'
                            : 'bg-accent-risk text-white hover:bg-accent-risk/90'
                        }`}
                >
                    SUBMIT {side}
                </button>
            </div>
        </motion.div>
    )
}
