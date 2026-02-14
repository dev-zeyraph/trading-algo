import React, { useState, useEffect, useRef, useCallback } from 'react'

const PARAM_KEYS = ['alpha', 'beta', 'rho', 'nu']
const COMMANDS = [
    { cmd: 'SABR', desc: 'Set SABR parameters', args: PARAM_KEYS },
    { cmd: 'ZEN', desc: 'Toggle Zen Mode' },
    { cmd: 'GRID', desc: 'Set Markov grid size', args: ['size'] },
    { cmd: 'RESET', desc: 'Reset all parameters to defaults' },
]

export default function CommandBar({ onCommand, isOpen, onClose }) {
    const [input, setInput] = useState('')
    const [history, setHistory] = useState([])
    const [historyIdx, setHistoryIdx] = useState(-1)
    const [suggestions, setSuggestions] = useState([])
    const inputRef = useRef(null)

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
            setInput('')
            setSuggestions(COMMANDS)
        }
    }, [isOpen])

    const parseCommand = useCallback((raw) => {
        const parts = raw.trim().split(/\s+/)
        const cmd = parts[0]?.toUpperCase()
        const args = {}

        for (let i = 1; i < parts.length; i++) {
            if (parts[i].startsWith('--') && i + 1 < parts.length) {
                const key = parts[i].slice(2)
                const val = parseFloat(parts[i + 1])
                if (!isNaN(val)) args[key] = val
                i++
            }
        }

        return { cmd, args }
    }, [])

    const execute = useCallback(() => {
        if (!input.trim()) return
        const parsed = parseCommand(input)
        setHistory(prev => [input, ...prev.slice(0, 9)])
        setHistoryIdx(-1)
        onCommand(parsed)
        setInput('')
        onClose()
    }, [input, parseCommand, onCommand, onClose])

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            execute()
        } else if (e.key === 'Escape') {
            onClose()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (history.length > 0) {
                const idx = Math.min(historyIdx + 1, history.length - 1)
                setHistoryIdx(idx)
                setInput(history[idx])
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (historyIdx > 0) {
                const idx = historyIdx - 1
                setHistoryIdx(idx)
                setInput(history[idx])
            } else {
                setHistoryIdx(-1)
                setInput('')
            }
        }
    }, [execute, onClose, history, historyIdx])

    useEffect(() => {
        const word = input.split(/\s+/)[0]?.toUpperCase() || ''
        if (word.length === 0) {
            setSuggestions(COMMANDS)
        } else {
            setSuggestions(COMMANDS.filter(c => c.cmd.startsWith(word)))
        }
    }, [input])

    if (!isOpen) return null

    return (
        <div className="cmd-overlay" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ width: 560 }}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-text-dim">⌘K</span>
                    <span className="font-label text-xs text-text-muted">Command Bar</span>
                </div>
                <input
                    ref={inputRef}
                    className="cmd-input w-full"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="SABR --nu 0.5 --rho -0.7"
                    spellCheck={false}
                    autoComplete="off"
                />
                {suggestions.length > 0 && (
                    <div className="mt-1 border border-border bg-panel" style={{ borderRadius: 2 }}>
                        {suggestions.map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-border-subtle/50"
                                onClick={() => { setInput(s.cmd + ' '); inputRef.current?.focus() }}
                            >
                                <span className="font-mono text-xs text-accent-data">{s.cmd}</span>
                                <span className="font-label text-xs text-text-dim">{s.desc}</span>
                            </div>
                        ))}
                    </div>
                )}
                {history.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <span className="font-label text-xs text-text-dim">History:</span>
                        {history.slice(0, 5).map((h, i) => (
                            <span
                                key={i}
                                className="font-mono text-xs text-text-muted px-1.5 py-0.5 bg-border-subtle cursor-pointer hover:text-text-primary"
                                style={{ borderRadius: 2 }}
                                onClick={() => { setInput(h); inputRef.current?.focus() }}
                            >
                                {h}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
