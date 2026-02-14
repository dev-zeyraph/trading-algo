import React, { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function SurfaceMesh({ params, sliceTenor, onSlice }) {
    const meshRef = useRef()
    const strikeCount = 40
    const tenorCount = 20
    const strikes = useMemo(() => Array.from({ length: strikeCount }, (_, i) => 70 + i * 1.5), [])
    const tenors = useMemo(() => Array.from({ length: tenorCount }, (_, i) => 0.05 + i * 0.1), [])

    const { geometry, colors } = useMemo(() => {
        const { alpha, beta, rho, nu } = params
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
                // Amplified SABR-style surface for visual impact
                const baseVol = alpha
                const smile = nu * nu * m * m * 2.5  // Quadratic smile
                const skew = rho * nu * m * 1.5       // Linear skew from correlation
                const termStructure = 0.04 * Math.sqrt(T)  // Vol increases with tenor
                const wings = 0.3 * Math.pow(Math.abs(m), 1.5)  // Fat wings
                const iv = Math.max(0.08, baseVol + smile + skew + termStructure + wings)

                const x = (i / (strikeCount - 1) - 0.5) * 6
                const z = (j / (tenorCount - 1) - 0.5) * 4
                const y = iv * 3.5

                vertices.push(x, y, z)

                // Cool-to-warm colormap
                const t = Math.min(1, Math.max(0, (iv - 0.1) / 0.5))
                const r = t
                const g = 1 - Math.abs(t - 0.5) * 2
                const b = 1 - t
                cols.push(r * 0.7 + 0.1, g * 0.6 + 0.2, b * 0.8 + 0.1)
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

        return { geometry: geom, colors: cols }
    }, [params, strikes, tenors])

    // Grid lines
    const gridLines = useMemo(() => {
        const pts = []
        // Strike lines
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
        // Tenor lines
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
            <mesh ref={meshRef} geometry={geometry}>
                <meshStandardMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.85} />
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
                    <lineBasicMaterial color="#64748b" opacity={0.3} transparent />
                </lineSegments>
            )}
            {/* Axis labels as sprites */}
            <axesHelper args={[0.5]} position={[-3.2, 0, -2.2]} />
        </group>
    )
}

export default function VolSurface({ params, sliceTenor, onSlice }) {
    return (
        <div className="w-full h-full relative">
            <div className="absolute top-2 left-3 z-10 font-label text-text-muted text-xs tracking-wider uppercase">
                Neural-SABR Implied Volatility
            </div>
            <div className="absolute top-2 right-3 z-10 font-mono text-xs text-text-dim">
                α={params.alpha.toFixed(3)} β={params.beta.toFixed(2)} ρ={params.rho.toFixed(3)} ν={params.nu.toFixed(3)}
            </div>
            <Canvas
                camera={{ position: [4, 3, 4], fov: 50 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
                frameloop="demand"
            >
                <ambientLight intensity={0.4} />
                <directionalLight position={[5, 10, 5]} intensity={0.8} />
                <directionalLight position={[-5, 5, -5]} intensity={0.3} />
                <SurfaceMesh params={params} sliceTenor={sliceTenor} onSlice={onSlice} />
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    rotateSpeed={0.5}
                    minDistance={3}
                    maxDistance={12}
                />
                <gridHelper args={[8, 16, '#1e293b', '#1e293b']} position={[0, -0.1, 0]} />
            </Canvas>
        </div>
    )
}
