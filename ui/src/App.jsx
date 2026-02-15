import React, { useState, useEffect, useReducer, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VolSurface from './components/VolSurface'
import SignatureViz from './components/SignatureViz'
import MarkovGrid from './components/MarkovGrid'
import CommandBar from './components/CommandBar'
import StockSelector from './components/StockSelector'
import IntelligencePanel from './components/IntelligencePanel'
import ScannerPanel from './components/ScannerPanel'
import RiskRadarPanel from './components/RiskRadarPanel'
import './index.css'

const DEFAULT_PARAMS = { alpha: 0.25, beta: 0.5, rho: -0.5, nu: 0.4 }

function paramsReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, ...action.payload }
    case 'RESET':
      return DEFAULT_PARAMS
    default:
      return state
  }
}

const App = () => {
  const [params, dispatch] = useReducer(paramsReducer, DEFAULT_PARAMS)
  const [ticker, setTicker] = useState(null)
  const [livePaths, setLivePaths] = useState([])
  const [signatures, setSignatures] = useState([])
  const [status, setStatus] = useState('CONNECTING')
  const [zenMode, setZenMode] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [gridSize, setGridSize] = useState(20)
  const [selectedSymbol, setSelectedSymbol] = useState('NVDA')
  const [stockOpen, setStockOpen] = useState(false)
  const [shocks, setShocks] = useState({ spot: 0, vol: 0 }) // % offsets
  const [activeRightPanel, setActiveRightPanel] = useState('INTEL') // INTEL | SCANNER | RISK
  const wsRef = useRef(null)

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080')
    wsRef.current = ws

    ws.onopen = () => setStatus('LIVE')
    ws.onclose = () => setStatus('DISCONNECTED')
    ws.onerror = () => setStatus('ERROR')

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'path_update') {
          setLivePaths(prev => {
            const updated = [...msg.paths, ...prev]
            return updated.slice(0, 8)
          })

          if (msg.ticker) {
            setTicker(msg.ticker)
          }

          // Generate mock signatures from paths for visualization
          if (msg.paths && msg.paths.length > 0) {
            const sigs = msg.paths.slice(0, 5).map(path => {
              const n = path.length
              const sig = []
              // Level 1
              sig.push(path[n - 1] - path[0])
              sig.push((path[n - 1] - path[0]) / n)
              // Level 2
              for (let i = 0; i < 4; i++) {
                const mid = Math.floor(n / 4 * (i + 1))
                sig.push((path[mid] - path[Math.max(0, mid - 5)]) * 0.01)
              }
              // Level 3
              for (let i = 0; i < 8; i++) {
                const idx = Math.floor(n / 8 * (i + 1))
                sig.push((path[idx] * 0.001) + Math.sin(idx * 0.1) * 0.01)
              }
              sig.push(sig.reduce((a, b) => a + Math.abs(b), 0))
              return sig
            })
            setSignatures(sigs)
          }
        }
      } catch (e) { }
    }

    return () => ws.close()
  }, [])

  // Sync Ticker Selection with Backend
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'switch_symbol',
        symbol: selectedSymbol
      }))
    }
  }, [selectedSymbol])

  // Global keyboard shortcut
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setCmdOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Command handler
  const handleCommand = useCallback((parsed) => {
    switch (parsed.cmd) {
      case 'SABR':
        dispatch({ type: 'SET', payload: parsed.args })
        break
      case 'ZEN':
        setZenMode(prev => !prev)
        break
      case 'GRID':
        if (parsed.args.size) setGridSize(Math.min(50, Math.max(5, parsed.args.size)))
        break
      case 'RESET':
        dispatch({ type: 'RESET' })
        break
    }
  }, [])

  // Symbol switching
  const handleSwitchSymbol = useCallback((symbol) => {
    setSelectedSymbol(symbol)
    // Clear stale data
    setTicker(null)
    setLivePaths([])
    setSignatures([])
    // Notify WebSocket server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'switch_symbol', symbol }))
    }
  }, [])

  const statusColor =
    status === 'LIVE' ? 'text-accent-itm' :
      status === 'CONNECTING' ? 'text-accent-warn' : 'text-accent-risk'

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-base text-text-primary">
      {/* Institutional Header */}
      <AnimatePresence>
        {!zenMode && (
          <motion.header
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-border bg-panel-alt flex-shrink-0"
          >
            <div className="flex items-center justify-between px-3 py-1">
              <div className="flex items-center gap-3">
                <span className="font-label text-[11px] font-bold text-text-primary tracking-widest uppercase">Quant Kernel</span>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 border border-border bg-base ${statusColor}`}>
                  <span className="text-[10px] scale-75">●</span>
                  <span className="font-mono text-[10px] font-bold tracking-tighter uppercase">{status}</span>
                </div>
              </div>
              {ticker && (
                <div className="flex items-center gap-6 font-mono text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-dim uppercase leading-none mb-0.5">Ticker</span>
                    <span
                      className="text-accent-itm font-bold cursor-pointer hover:bg-white/5 px-0.5 -mx-0.5"
                      onClick={() => setStockOpen(true)}
                    >
                      {ticker.symbol}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-dim uppercase leading-none mb-0.5">Last</span>
                    <span className="text-text-primary font-bold">{ticker.price?.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-dim uppercase leading-none mb-0.5">Vol (ATM)</span>
                    <span className="text-accent-data font-bold">{(ticker.vol * 100)?.toFixed(1)}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-dim uppercase leading-none mb-0.5">Skew</span>
                    <span className="text-accent-risk font-bold">{(ticker.skew * 100)?.toFixed(1)}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-dim uppercase leading-none mb-0.5">Fly</span>
                    <span className="text-accent-warn font-bold">{(ticker.fly * 100)?.toFixed(1)}%</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShocks({ spot: 0, vol: 0 })}
                  className={`font-mono text-[10px] px-2 py-1 border border-border cursor-pointer transition-colors ${shocks.spot !== 0 || shocks.vol !== 0 ? 'text-accent-warn border-accent-warn bg-accent-warn/10' : 'text-text-dim opacity-40 select-none'}`}
                >
                  RESET SHOCKS
                </button>

                {['STOCKS', 'ZEN', '⌘K'].map(label => (
                  <button
                    key={label}
                    onClick={() => {
                      if (label === 'STOCKS') setStockOpen(true)
                      else if (label === 'ZEN') setZenMode(prev => !prev)
                      else if (label === '⌘K') setCmdOpen(true)
                    }}
                    className="font-mono text-[10px] text-text-muted hover:text-text-primary hover:bg-border px-2 py-1 border border-border cursor-pointer transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Grid - Tight Spacing */}
      <div className={`flex-1 min-h-0 ${zenMode ? 'p-0' : 'p-[2px]'} flex flex-col gap-[2px]`}>
        {/* Top Row: Surface + Signature */}
        <div className={`flex gap-[2px] ${zenMode ? 'flex-1' : 'h-[55%]'}`}>
          <div className={`panel ${zenMode ? 'flex-1' : 'w-1/2'}`}>
            <VolSurface params={params} shocks={shocks} />
          </div>
          <AnimatePresence>
            {!zenMode && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '50%' }}
                className="panel border-l-0"
              >
                <SignatureViz paths={livePaths} signatures={signatures} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Row: Markov + Intelligence */}
        <AnimatePresence>
          {!zenMode && (
            <div className="flex flex-1 gap-[2px] min-h-0">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                className="panel w-1/2"
              >
                <MarkovGrid states={gridSize} params={params} ticker={ticker} />
              </motion.div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                className="panel w-1/2 border-l-0 flex flex-col"
              >
                {/* Panel Tabs */}
                <div className="flex bg-panel-alt border-b border-border">
                  {['INTEL', 'SCANNER', 'RISK'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveRightPanel(tab)}
                      className={`px-3 py-1 font-mono text-[9px] uppercase tracking-widest cursor-pointer transition-colors ${activeRightPanel === tab ? 'bg-panel text-accent-data border-r border-border' : 'text-text-dim hover:text-text-muted border-r border-border/50'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-h-0">
                  {activeRightPanel === 'INTEL' ? (
                    <IntelligencePanel
                      ticker={ticker}
                      params={params}
                      shocks={shocks}
                      onShockChange={setShocks}
                    />
                  ) : activeRightPanel === 'SCANNER' ? (
                    <ScannerPanel
                      onSelectTicker={(sym) => {
                        setSelectedSymbol(sym);
                      }}
                    />
                  ) : (
                    <RiskRadarPanel
                      ticker={ticker}
                      shocks={shocks}
                    />
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Overlays */}

      </div>

      {/* Command Bar */}
      <CommandBar
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onCommand={handleCommand}
      />

      {/* Stock Selector */}
      <StockSelector
        selectedSymbol={selectedSymbol}
        onSelect={handleSwitchSymbol}
        isOpen={stockOpen}
        onClose={() => setStockOpen(false)}
      />
    </div>
  )
}

export default App
