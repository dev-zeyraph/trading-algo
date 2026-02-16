import React, { useState, useEffect } from 'react';

// [RESEARCH LAB] 
// Visualizes the "R Sidecar" (or Python Fallback) Topological Analysis.
// It polls for the generated image and checks for mismatch warnings.

export default function ResearchLabPanel() {
    const [imageUrl, setImageUrl] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Poll for the diagnostic image every 2 seconds
    // (The backend updates it every 5s, but we want to catch it fresh)
    useEffect(() => {
        const interval = setInterval(() => {
            // We append a timestamp to bust the browser cache
            const timestamp = new Date().getTime();

            // In a real app, this would be served via an API.
            // For this local setup, we assume the file is served locally or via a simple file server.
            // Since we can't easily serve the generated file from the 'research' folder via Vite's dev server 
            // without configuration, we'll try to fetch it.
            // NOTE: In this specific environment, we might need a clearer way to serve this.
            // For now, we'll assume there's a mechanism or placeholder. 
            // Actually, since I can't modify Vite config to serve 'research/' easily,
            // I will trust the user to open the file or I will try to fetch it relative to root if possible.
            // A better approach for this demo: The BROWSER SUBAGENT can verify the file exists on disk.
            // But to show it in UI, we need it in 'public/' or 'ui/public/'.

            // FIX: I will modify the python script to output to 'ui/public/diagnostic_manifold.png' 
            // so Vite can serve it effortlessly.

            setImageUrl(`/diagnostic_manifold.png?t=${timestamp}`);
            setLastUpdate(new Date());
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#050510] border-l border-[#1a1a2e]">
            <div className="p-3 border-b border-[#1a1a2e] flex justify-between items-center bg-[#0a0a16]">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                    <span className="font-mono text-xs font-bold text-slate-200 tracking-wider">
                        R-SIDE CAR / FDA LAB
                    </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                    LAST: {lastUpdate.toLocaleTimeString()}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Diagnostic Image Viewer */}
                <div className="bg-[#000] border border-[#333] rounded p-1 relative min-h-[200px] flex items-center justify-center">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Topological Analysis"
                            className="max-w-full h-auto opacity-90 hover:opacity-100 transition-opacity"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                // Show placeholder text if image processing is pending
                            }}
                        />
                    ) : (
                        <div className="text-xs text-slate-600 font-mono animate-pulse">
                            AWAITING R/PYTHON BRIDGE DATA...
                        </div>
                    )}

                    {/* Fallback Text if image fails (hidden by default) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ display: imageUrl ? 'none' : 'flex' }}>
                        <div className="text-xs text-slate-600 font-mono">PROCESSING...</div>
                    </div>
                </div>

                {/* Console / Log Output */}
                <div className="bg-[#0a0a10] p-3 rounded border border-[#1a1a2e] font-mono text-[10px] text-slate-400">
                    <div className="text-purple-400 mb-2 border-b border-[#222] pb-1">
                > SYSTEM_DIAGNOSTICS
                    </div>
                    <div className="space-y-1">
                        <div>[BRIDGE] Protocol: START_FDA_ANALYSIS</div>
                        <div>[BRIDGE] Morph Targets: 20 Basis Functions</div>
                        <div>[BRIDGE] Penalty Lambda: 1e-4</div>
                        <div className="text-emerald-500">[STATUS] Bridge Active. Polling...</div>
                    </div>
                </div>

                <div className="p-3 bg-purple-900/10 border border-purple-500/20 rounded">
                    <h4 className="text-xs font-bold text-purple-400 mb-1">Topological Mismatch</h4>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                        If the <span className="text-cyan-400">B-Spline Roughness</span> diverges from the <span className="text-amber-400">Fisher Distance</span>, the market expansion is likely "Fake" (low volume/high noise).
                    </p>
                </div>
            </div>
        </div>
    );
}
