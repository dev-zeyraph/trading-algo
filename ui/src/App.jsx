import React, { useState, useEffect, useReducer, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VolSurface from './components/VolSurface'
import SignatureViz from './components/SignatureViz'
import MarkovGrid from './components/MarkovGrid'
import CommandBar from './components/CommandBar'
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

  const statusColor =
    status === 'LIVE' ? 'text-accent-itm' :
      status === 'CONNECTING' ? 'text-accent-warn' : 'text-accent-risk'

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-base">
      {/* Header Ticker Bar */}
      <AnimatePresence>
        {!zenMode && (
          <motion.header
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-border flex-shrink-0"
          >
            <div className="flex items-center justify-between px-4 py-1.5">
              <div className="flex items-center gap-4">
                <span className="font-label text-xs font-semibold text-text-primary tracking-wider">QUANT KERNEL</span>
                <span className={`font-mono text-xs ${statusColor}`}>● {status}</span>
              </div>
              {ticker && (
                <div className="flex items-center gap-5 font-mono text-xs">
                  <span className="text-text-primary font-semibold">{ticker.symbol}</span>
                  <span className="text-text-muted">LAST <span className="text-accent-itm">{ticker.price?.toFixed(2)}</span></span>
                  <span className="text-text-muted">ATM <span className="text-accent-data">{(ticker.vol * 100)?.toFixed(1)}%</span></span>
                  <span className="text-text-muted">SKEW <span className="text-accent-risk">{(ticker.skew * 100)?.toFixed(1)}%</span></span>
                  <span className="text-text-muted">FLY <span className="text-accent-warn">{(ticker.fly * 100)?.toFixed(1)}%</span></span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setZenMode(prev => !prev)}
                  className="font-mono text-xs text-text-dim hover:text-text-muted px-2 py-0.5 border border-border cursor-pointer"
                  style={{ borderRadius: 2 }}
                >
                  ZEN
                </button>
                <button
                  onClick={() => setCmdOpen(true)}
                  className="font-mono text-xs text-text-dim hover:text-text-muted px-2 py-0.5 border border-border cursor-pointer"
                  style={{ borderRadius: 2 }}
                >
                  ⌘K
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Grid */}
      <div className={`flex-1 min-h-0 ${zenMode ? 'p-0' : 'p-1'} flex flex-col gap-1`}>
        {/* Top Row: Surface + Signature */}
        <div className={`flex gap-1 ${zenMode ? 'flex-1' : 'h-[55%]'}`}>
          <div className={`panel ${zenMode ? 'flex-1' : 'w-[60%]'}`}>
            <VolSurface params={params} />
          </div>
          <AnimatePresence>
            {!zenMode && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '40%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="panel"
              >
                <SignatureViz paths={livePaths} signatures={signatures} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Row: Markov Grid */}
        <AnimatePresence>
          {!zenMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '45%', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="panel"
            >
              <MarkovGrid states={gridSize} params={params} ticker={ticker} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zen Mode Floating Controls */}
      {zenMode && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 z-50">
          <button
            onClick={() => setZenMode(false)}
            className="font-mono text-xs text-text-dim hover:text-accent-itm px-3 py-1.5 bg-panel border border-border cursor-pointer"
            style={{ borderRadius: 2 }}
          >
            EXIT ZEN
          </button>
          <button
            onClick={() => setCmdOpen(true)}
            className="font-mono text-xs text-text-dim hover:text-accent-data px-3 py-1.5 bg-panel border border-border cursor-pointer"
            style={{ borderRadius: 2 }}
          >
            ⌘K
          </button>
        </div>
      )}

      {/* Command Bar */}
      <CommandBar
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onCommand={handleCommand}
      />
    </div>
  )
}

export default App
