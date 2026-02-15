import React, { useState, useMemo, useRef, useEffect } from 'react'

const STOCKS = [
    // Tech
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'Tech' },
    { symbol: 'AAPL', name: 'Apple', sector: 'Tech' },
    { symbol: 'MSFT', name: 'Microsoft', sector: 'Tech' },
    { symbol: 'GOOGL', name: 'Alphabet', sector: 'Tech' },
    { symbol: 'AMZN', name: 'Amazon', sector: 'Tech' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Tech' },
    { symbol: 'TSLA', name: 'Tesla', sector: 'Tech' },
    { symbol: 'TSM', name: 'Taiwan Semi', sector: 'Tech' },
    { symbol: 'AVGO', name: 'Broadcom', sector: 'Tech' },
    { symbol: 'ORCL', name: 'Oracle', sector: 'Tech' },
    { symbol: 'CRM', name: 'Salesforce', sector: 'Tech' },
    { symbol: 'AMD', name: 'AMD', sector: 'Tech' },
    { symbol: 'ADBE', name: 'Adobe', sector: 'Tech' },
    { symbol: 'INTC', name: 'Intel', sector: 'Tech' },
    { symbol: 'QCOM', name: 'Qualcomm', sector: 'Tech' },
    { symbol: 'TXN', name: 'Texas Instruments', sector: 'Tech' },
    { symbol: 'AMAT', name: 'Applied Materials', sector: 'Tech' },
    { symbol: 'LRCX', name: 'Lam Research', sector: 'Tech' },
    { symbol: 'KLAC', name: 'KLA Corp', sector: 'Tech' },
    { symbol: 'MU', name: 'Micron', sector: 'Tech' },
    { symbol: 'SNPS', name: 'Synopsys', sector: 'Tech' },
    { symbol: 'CDNS', name: 'Cadence Design', sector: 'Tech' },
    { symbol: 'MRVL', name: 'Marvell Tech', sector: 'Tech' },
    { symbol: 'NOW', name: 'ServiceNow', sector: 'Tech' },
    { symbol: 'PANW', name: 'Palo Alto Networks', sector: 'Tech' },
    { symbol: 'CRWD', name: 'CrowdStrike', sector: 'Tech' },
    { symbol: 'SNOW', name: 'Snowflake', sector: 'Tech' },
    { symbol: 'NET', name: 'Cloudflare', sector: 'Tech' },
    { symbol: 'DDOG', name: 'Datadog', sector: 'Tech' },
    { symbol: 'ZS', name: 'Zscaler', sector: 'Tech' },
    { symbol: 'PLTR', name: 'Palantir', sector: 'Tech' },
    { symbol: 'SHOP', name: 'Shopify', sector: 'Tech' },
    { symbol: 'SQ', name: 'Block', sector: 'Tech' },
    { symbol: 'COIN', name: 'Coinbase', sector: 'Tech' },
    { symbol: 'UBER', name: 'Uber', sector: 'Tech' },
    { symbol: 'ABNB', name: 'Airbnb', sector: 'Tech' },
    { symbol: 'ROKU', name: 'Roku', sector: 'Tech' },
    { symbol: 'SPOT', name: 'Spotify', sector: 'Tech' },
    { symbol: 'RBLX', name: 'Roblox', sector: 'Tech' },
    { symbol: 'U', name: 'Unity Software', sector: 'Tech' },
    { symbol: 'DELL', name: 'Dell Technologies', sector: 'Tech' },
    { symbol: 'HPE', name: 'HP Enterprise', sector: 'Tech' },
    { symbol: 'SMCI', name: 'Super Micro', sector: 'Tech' },
    { symbol: 'ARM', name: 'ARM Holdings', sector: 'Tech' },
    { symbol: 'IONQ', name: 'IonQ', sector: 'Tech' },
    { symbol: 'AI', name: 'C3.ai', sector: 'Tech' },
    { symbol: 'PATH', name: 'UiPath', sector: 'Tech' },
    { symbol: 'ESTC', name: 'Elastic', sector: 'Tech' },
    { symbol: 'MDB', name: 'MongoDB', sector: 'Tech' },
    { symbol: 'TEAM', name: 'Atlassian', sector: 'Tech' },

    // Finance
    { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance' },
    { symbol: 'BAC', name: 'Bank of America', sector: 'Finance' },
    { symbol: 'WFC', name: 'Wells Fargo', sector: 'Finance' },
    { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance' },
    { symbol: 'MS', name: 'Morgan Stanley', sector: 'Finance' },
    { symbol: 'C', name: 'Citigroup', sector: 'Finance' },
    { symbol: 'BLK', name: 'BlackRock', sector: 'Finance' },
    { symbol: 'SCHW', name: 'Schwab', sector: 'Finance' },
    { symbol: 'AXP', name: 'American Express', sector: 'Finance' },
    { symbol: 'V', name: 'Visa', sector: 'Finance' },
    { symbol: 'MA', name: 'Mastercard', sector: 'Finance' },
    { symbol: 'PYPL', name: 'PayPal', sector: 'Finance' },
    { symbol: 'COF', name: 'Capital One', sector: 'Finance' },
    { symbol: 'USB', name: 'US Bancorp', sector: 'Finance' },
    { symbol: 'PNC', name: 'PNC Financial', sector: 'Finance' },
    { symbol: 'TFC', name: 'Truist Financial', sector: 'Finance' },
    { symbol: 'CME', name: 'CME Group', sector: 'Finance' },
    { symbol: 'ICE', name: 'Intercontinental Exch', sector: 'Finance' },
    { symbol: 'SPGI', name: 'S&P Global', sector: 'Finance' },
    { symbol: 'MCO', name: 'Moody\'s', sector: 'Finance' },
    { symbol: 'MKTX', name: 'MarketAxess', sector: 'Finance' },

    // Healthcare
    { symbol: 'UNH', name: 'UnitedHealth', sector: 'Health' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Health' },
    { symbol: 'LLY', name: 'Eli Lilly', sector: 'Health' },
    { symbol: 'PFE', name: 'Pfizer', sector: 'Health' },
    { symbol: 'ABBV', name: 'AbbVie', sector: 'Health' },
    { symbol: 'MRK', name: 'Merck', sector: 'Health' },
    { symbol: 'TMO', name: 'Thermo Fisher', sector: 'Health' },
    { symbol: 'ABT', name: 'Abbott Labs', sector: 'Health' },
    { symbol: 'DHR', name: 'Danaher', sector: 'Health' },
    { symbol: 'BMY', name: 'Bristol-Myers', sector: 'Health' },
    { symbol: 'AMGN', name: 'Amgen', sector: 'Health' },
    { symbol: 'GILD', name: 'Gilead Sciences', sector: 'Health' },
    { symbol: 'ISRG', name: 'Intuitive Surgical', sector: 'Health' },
    { symbol: 'MRNA', name: 'Moderna', sector: 'Health' },
    { symbol: 'REGN', name: 'Regeneron', sector: 'Health' },
    { symbol: 'VRTX', name: 'Vertex Pharma', sector: 'Health' },
    { symbol: 'ZTS', name: 'Zoetis', sector: 'Health' },
    { symbol: 'SYK', name: 'Stryker', sector: 'Health' },
    { symbol: 'BSX', name: 'Boston Scientific', sector: 'Health' },
    { symbol: 'MDT', name: 'Medtronic', sector: 'Health' },

    // Energy
    { symbol: 'XOM', name: 'ExxonMobil', sector: 'Energy' },
    { symbol: 'CVX', name: 'Chevron', sector: 'Energy' },
    { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy' },
    { symbol: 'SLB', name: 'Schlumberger', sector: 'Energy' },
    { symbol: 'EOG', name: 'EOG Resources', sector: 'Energy' },
    { symbol: 'MPC', name: 'Marathon Petroleum', sector: 'Energy' },
    { symbol: 'PSX', name: 'Phillips 66', sector: 'Energy' },
    { symbol: 'VLO', name: 'Valero Energy', sector: 'Energy' },
    { symbol: 'OXY', name: 'Occidental', sector: 'Energy' },
    { symbol: 'HAL', name: 'Halliburton', sector: 'Energy' },
    { symbol: 'DVN', name: 'Devon Energy', sector: 'Energy' },
    { symbol: 'FANG', name: 'Diamondback', sector: 'Energy' },
    { symbol: 'HES', name: 'Hess Corp', sector: 'Energy' },
    { symbol: 'BKR', name: 'Baker Hughes', sector: 'Energy' },
    { symbol: 'KMI', name: 'Kinder Morgan', sector: 'Energy' },

    // Consumer
    { symbol: 'WMT', name: 'Walmart', sector: 'Consumer' },
    { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer' },
    { symbol: 'KO', name: 'Coca-Cola', sector: 'Consumer' },
    { symbol: 'PEP', name: 'PepsiCo', sector: 'Consumer' },
    { symbol: 'COST', name: 'Costco', sector: 'Consumer' },
    { symbol: 'HD', name: 'Home Depot', sector: 'Consumer' },
    { symbol: 'MCD', name: 'McDonald\'s', sector: 'Consumer' },
    { symbol: 'NKE', name: 'Nike', sector: 'Consumer' },
    { symbol: 'SBUX', name: 'Starbucks', sector: 'Consumer' },
    { symbol: 'TGT', name: 'Target', sector: 'Consumer' },
    { symbol: 'LOW', name: 'Lowe\'s', sector: 'Consumer' },
    { symbol: 'EL', name: 'Estée Lauder', sector: 'Consumer' },
    { symbol: 'CL', name: 'Colgate-Palmolive', sector: 'Consumer' },
    { symbol: 'MDLZ', name: 'Mondelez', sector: 'Consumer' },
    { symbol: 'DIS', name: 'Walt Disney', sector: 'Consumer' },
    { symbol: 'NFLX', name: 'Netflix', sector: 'Consumer' },
    { symbol: 'CMCSA', name: 'Comcast', sector: 'Consumer' },
    { symbol: 'LULU', name: 'Lululemon', sector: 'Consumer' },
    { symbol: 'YUM', name: 'Yum! Brands', sector: 'Consumer' },
    { symbol: 'CMG', name: 'Chipotle', sector: 'Consumer' },

    // Industrials
    { symbol: 'CAT', name: 'Caterpillar', sector: 'Industrial' },
    { symbol: 'DE', name: 'Deere & Company', sector: 'Industrial' },
    { symbol: 'UPS', name: 'UPS', sector: 'Industrial' },
    { symbol: 'HON', name: 'Honeywell', sector: 'Industrial' },
    { symbol: 'GE', name: 'GE Aerospace', sector: 'Industrial' },
    { symbol: 'BA', name: 'Boeing', sector: 'Industrial' },
    { symbol: 'LMT', name: 'Lockheed Martin', sector: 'Industrial' },
    { symbol: 'RTX', name: 'RTX Corp', sector: 'Industrial' },
    { symbol: 'NOC', name: 'Northrop Grumman', sector: 'Industrial' },
    { symbol: 'GD', name: 'General Dynamics', sector: 'Industrial' },
    { symbol: 'MMM', name: '3M Company', sector: 'Industrial' },
    { symbol: 'FDX', name: 'FedEx', sector: 'Industrial' },
    { symbol: 'WM', name: 'Waste Management', sector: 'Industrial' },
    { symbol: 'EMR', name: 'Emerson Electric', sector: 'Industrial' },
    { symbol: 'ETN', name: 'Eaton Corp', sector: 'Industrial' },

    // ETFs & Indices
    { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'ETF' },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF', sector: 'ETF' },
    { symbol: 'IWM', name: 'Russell 2000 ETF', sector: 'ETF' },
    { symbol: 'DIA', name: 'Dow Jones ETF', sector: 'ETF' },
    { symbol: 'VTI', name: 'Total Market ETF', sector: 'ETF' },
    { symbol: 'EEM', name: 'Emerging Markets ETF', sector: 'ETF' },
    { symbol: 'XLF', name: 'Financials ETF', sector: 'ETF' },
    { symbol: 'XLE', name: 'Energy ETF', sector: 'ETF' },
    { symbol: 'XLK', name: 'Tech ETF', sector: 'ETF' },
    { symbol: 'XLV', name: 'Healthcare ETF', sector: 'ETF' },
    { symbol: 'XLI', name: 'Industrials ETF', sector: 'ETF' },
    { symbol: 'XLP', name: 'Staples ETF', sector: 'ETF' },
    { symbol: 'XLY', name: 'Discretionary ETF', sector: 'ETF' },
    { symbol: 'GLD', name: 'Gold ETF', sector: 'ETF' },
    { symbol: 'SLV', name: 'Silver ETF', sector: 'ETF' },
    { symbol: 'TLT', name: '20Y Treasury ETF', sector: 'ETF' },
    { symbol: 'HYG', name: 'High Yield Bond ETF', sector: 'ETF' },
    { symbol: 'VIX', name: 'Volatility Index', sector: 'ETF' },
    { symbol: 'ARKK', name: 'ARK Innovation ETF', sector: 'ETF' },
    { symbol: 'SOXX', name: 'Semiconductor ETF', sector: 'ETF' },

    // Crypto-adjacent
    { symbol: 'MSTR', name: 'MicroStrategy', sector: 'Crypto' },
    { symbol: 'MARA', name: 'Marathon Digital', sector: 'Crypto' },
    { symbol: 'RIOT', name: 'Riot Platforms', sector: 'Crypto' },
    { symbol: 'HUT', name: 'Hut 8 Mining', sector: 'Crypto' },
    { symbol: 'BITF', name: 'Bitfarms', sector: 'Crypto' },

    // Real Estate
    { symbol: 'AMT', name: 'American Tower', sector: 'REIT' },
    { symbol: 'PLD', name: 'Prologis', sector: 'REIT' },
    { symbol: 'CCI', name: 'Crown Castle', sector: 'REIT' },
    { symbol: 'EQIX', name: 'Equinix', sector: 'REIT' },
    { symbol: 'SPG', name: 'Simon Property', sector: 'REIT' },
    { symbol: 'O', name: 'Realty Income', sector: 'REIT' },
    { symbol: 'DLR', name: 'Digital Realty', sector: 'REIT' },
    { symbol: 'WELL', name: 'Welltower', sector: 'REIT' },

    // Telecom & Utilities
    { symbol: 'T', name: 'AT&T', sector: 'Telecom' },
    { symbol: 'VZ', name: 'Verizon', sector: 'Telecom' },
    { symbol: 'TMUS', name: 'T-Mobile', sector: 'Telecom' },
    { symbol: 'NEE', name: 'NextEra Energy', sector: 'Utility' },
    { symbol: 'DUK', name: 'Duke Energy', sector: 'Utility' },
    { symbol: 'SO', name: 'Southern Company', sector: 'Utility' },
    { symbol: 'D', name: 'Dominion Energy', sector: 'Utility' },
    { symbol: 'AEP', name: 'Amer Electric Power', sector: 'Utility' },
]

export default function StockSelector({ selectedSymbol, onSelect, isOpen, onClose }) {
    const [search, setSearch] = useState('')
    const [sectorFilter, setSectorFilter] = useState('ALL')
    const inputRef = useRef(null)

    useEffect(() => {
        if (isOpen) {
            setSearch('')
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    const filtered = useMemo(() => {
        return STOCKS.filter(s => {
            const matchSearch = s.symbol.toLowerCase().includes(search.toLowerCase()) ||
                s.name.toLowerCase().includes(search.toLowerCase())
            const matchSector = sectorFilter === 'ALL' || s.sector === sectorFilter
            return matchSearch && matchSector
        })
    }, [search, sectorFilter])

    const sectors = useMemo(() => ['ALL', ...new Set(STOCKS.map(s => s.sector))], [])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/80" onClick={onClose}>
            <div
                className="w-[600px] bg-panel border-2 border-accent-data shadow-none flex flex-col max-h-[60vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col border-b border-border bg-panel-alt">
                    <div className="flex items-center px-4 py-3 border-b border-border">
                        <span className="font-mono text-xs text-accent-data mr-4 uppercase font-bold text-[11px]">Symbol Search</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="ENTER TICKER OR COMPANY..."
                            className="flex-1 bg-transparent border-none outline-none font-mono text-[13px] text-text-primary placeholder:text-text-dim uppercase"
                        />
                    </div>
                    <div className="flex flex-wrap gap-0 px-1 py-1 bg-base">
                        {sectors.map(s => (
                            <button
                                key={s}
                                onClick={() => setSectorFilter(s)}
                                className={`px-3 py-1 font-mono text-[9px] uppercase cursor-pointer border-r border-border transition-colors ${sectorFilter === s ? 'bg-accent-data text-white' : 'text-text-muted hover:bg-panel'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {filtered.map(stock => (
                        <div
                            key={stock.symbol}
                            onClick={() => { onSelect(stock.symbol); onClose() }}
                            className={`flex items-center justify-between px-4 py-2 border-b border-border/30 cursor-pointer group transition-colors ${selectedSymbol === stock.symbol ? 'bg-accent-data/10 border-l-2 border-l-accent-data' : 'hover:bg-panel-alt'
                                }`}
                        >
                            <div className="flex items-baseline gap-4">
                                <span className={`font-mono text-[13px] font-bold w-16 ${selectedSymbol === stock.symbol ? 'text-accent-data' : 'text-accent-itm'}`}>
                                    {stock.symbol}
                                </span>
                                <span className="font-label text-[12px] text-text-primary group-hover:text-white transition-colors">
                                    {stock.name}
                                </span>
                            </div>
                            <span className="font-mono text-[9px] text-text-dim uppercase tracking-widest">
                                {stock.sector}
                            </span>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="px-3 py-8 text-center font-mono text-xs text-text-dim italic">
                            NO MATCHING INSTRUMENTS FOUND
                        </div>
                    )}
                </div>

                <div className="px-3 py-1.5 bg-panel-alt border-t border-border flex justify-between items-center">
                    <span className="font-mono text-[9px] text-text-dim">{filtered.length} / {STOCKS.length} INSTRUMENTS</span>
                    <span className="font-mono text-[9px] text-text-dim">ESC to close</span>
                </div>
            </div>
        </div>
    )
}

export { STOCKS }
