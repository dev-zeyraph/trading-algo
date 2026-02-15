import React, { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function SurfaceMesh({ params, view = 'VOL', shocks = { spot: 0, vol: 0 }, isShadow = false }) {
    const meshRef = useRef()
    const strikeCount = 40
    const tenorCount = 20
    const strikes = useMemo(() => Array.from({ length: strikeCount }, (_, i) => 70 + i * 1.5), [])
    const tenors = useMemo(() => Array.from({ length: tenorCount }, (_, i) => 0.05 + i * 2.0), [])

    const { geometry } = useMemo(() => {
        const { alpha, rho, nu } = params
        const volOffset = shocks.vol / 100
        const geom = new THREE.BufferGeometry()
        const vertices = []
        const cols = []
        const indices = []

        for (let j = 0; j < tenorCount; j++) {
            for (let i = 0; i < strikeCount; i++) {
                const K = strikes[i]
                const T = tenors[j]
                const F = 100.0
                const m = Math.log(K / F)

                // SABR IV
                const smile = nu * nu * m * m * 2.5
                const skew = rho * nu * m * 1.5
                const termStructure = 0.04 * Math.sqrt(T)
                const wings = 0.3 * Math.pow(Math.abs(m), 1.5)
                const iv = Math.max(0.08, alpha + volOffset + smile + skew + termStructure + wings)

                let value = iv
                let colorBase = [0, 0, 0]

                if (view === 'VOL') {
                    value = iv
                    const t = Math.min(1, Math.max(0, (iv - 0.1) / 0.5))
                    colorBase = [t * 0.7 + 0.1, (1 - Math.abs(t - 0.5) * 2) * 0.6 + 0.2, (1 - t) * 0.8 + 0.1]
                } else if (view === 'GAMMA') {
                    const d1 = m / (iv * Math.sqrt(T))
                    const gamma = Math.exp(-0.5 * d1 * d1) / (F * iv * Math.sqrt(T))
                    value = gamma * 150
                    const t = Math.min(1, Math.max(0, value / 4))
                    colorBase = [t * 0.9, t * 0.2, (1 - t) * 0.4 + 0.5]
                } else if (view === 'VEGA') {
                    const d1 = m / (iv * Math.sqrt(T))
                    const vega = F * Math.sqrt(T) * Math.exp(-0.5 * d1 * d1)
                    value = vega / 35
                    const t = Math.min(1, Math.max(0, value / 3))
                    colorBase = [0.1, t * 0.8 + 0.1, (1 - t) * 0.6 + 0.3]
                }

                const x = (i / (strikeCount - 1) - 0.5) * 6
                const z = (j / (tenorCount - 1) - 0.5) * 4

                // Spot Shock shifts the center of the surface m = log(K/(F*mult))
                const shiftedX = x - (shocks.spot / 100) * 2
                const y = value * 3.5

                vertices.push(shiftedX, y, z)
                cols.push(...colorBase)
            }
        }

        for (let j = 0; j < tenorCount - 1; j++) {
            for (let i = 0; i < strikeCount - 1; i++) {
                const a = j * strikeCount + i
                const b = a + 1
                const c = a + strikeCount
                const d = c + 1
                indices.push(a, b, c)
                indices.push(b, d, c)
            }
        }

        geom.setIndex(indices)
        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geom.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
        geom.computeVertexNormals()

        return { geometry: geom }
    }, [params, strikes, tenors, view, shocks])

    const gridLines = useMemo(() => {
        const pts = []
        for (let j = 0; j < tenorCount; j += 4) {
            for (let i = 0; i < strikeCount - 1; i++) {
                const idx1 = (j * strikeCount + i) * 3
                const idx2 = (j * strikeCount + i + 1) * 3
                const posAttr = geometry.getAttribute('position')
                pts.push(
                    new THREE.Vector3(posAttr.array[idx1], posAttr.array[idx1 + 1], posAttr.array[idx1 + 2]),
                    new THREE.Vector3(posAttr.array[idx2], posAttr.array[idx2 + 1], posAttr.array[idx2 + 2])
                )
            }
        }
        for (let i = 0; i < strikeCount; i += 5) {
            for (let j = 0; j < tenorCount - 1; j++) {
                const idx1 = (j * strikeCount + i) * 3
                const idx2 = ((j + 1) * strikeCount + i) * 3
                const posAttr = geometry.getAttribute('position')
                pts.push(
                    new THREE.Vector3(posAttr.array[idx1], posAttr.array[idx1 + 1], posAttr.array[idx1 + 2]),
                    new THREE.Vector3(posAttr.array[idx2], posAttr.array[idx2 + 1], posAttr.array[idx2 + 2])
                )
            }
        }
        return pts
    }, [geometry])

    return (
        <group>
            {isShadow ? (
                <lineSegments>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={gridLines.length}
                            array={new Float32Array(gridLines.flatMap(v => [v.x, v.y, v.z]))}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color="#ffffff" opacity={0.1} transparent />
                </lineSegments>
            ) : (
                <>
                    <mesh ref={meshRef} geometry={geometry}>
                        <meshStandardMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.8} />
                    </mesh>
                    {gridLines.length > 0 && (
                        <lineSegments>
                            <bufferGeometry>
                                <bufferAttribute
                                    attach="attributes-position"
                                    count={gridLines.length}
                                    array={new Float32Array(gridLines.flatMap(v => [v.x, v.y, v.z]))}
                                    itemSize={3}
                                />
                            </bufferGeometry>
                            <lineBasicMaterial color="#ffffff" opacity={0.2} transparent />
                        </lineSegments>
                    )}
                </>
            )}
        </group>
    )
}

export default function VolSurface({ params, shocks }) {
    const [view, setView] = React.useState('VOL')

    return (
        <div className="w-full h-full relative">
            <div className="absolute top-2 left-3 z-10 flex flex-col gap-0.5">
                <span className="font-label text-text-muted text-[10px] font-bold tracking-widest uppercase">
                    Surface Matrix: {view === 'VOL' ? 'Implied Volatility' : view === 'GAMMA' ? 'Gamma Density' : 'Vega Impact'}
                </span>
                <div className="flex gap-0 mt-1">
                    {['VOL', 'GAMMA', 'VEGA'].map((v, i) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-2 py-0.5 font-mono text-[9px] cursor-pointer border-y border-l transition-colors ${view === v ? 'border-accent-data bg-accent-data text-white' : 'border-border text-text-dim hover:bg-panel-alt'
                                } ${i === 2 ? 'border-r' : ''}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>
            <div className="absolute top-2 right-3 z-10 font-mono text-[9px] text-text-dim text-right leading-tight">
                α={params.alpha.toFixed(3)} β={params.beta.toFixed(2)}<br />
                ρ={params.rho.toFixed(3)} ν={params.nu.toFixed(3)}
            </div>
            <Canvas
                camera={{ position: [5, 4, 5], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <pointLight position={[-10, 5, -10]} intensity={0.5} />

                {/* Live Shocked Surface */}
                <SurfaceMesh params={params} view={view} shocks={shocks} />

                {/* Baseline Shadow */}
                {(shocks.spot !== 0 || shocks.vol !== 0) && (
                    <SurfaceMesh params={params} view={view} shocks={{ spot: 0, vol: 0 }} isShadow />
                )}

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    rotateSpeed={0.5}
                    minDistance={3}
                    maxDistance={12}
                />
                <gridHelper args={[8, 16, '#22252a', '#141619']} position={[0, -0.1, 0]} />
                <axesHelper args={[0.5]} position={[-3.2, 0, -2.2]} />
            </Canvas>
        </div>
    )
}
