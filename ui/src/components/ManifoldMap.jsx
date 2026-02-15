import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, MeshDistortMaterial, Text, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/**
 * ManifoldSurface: Renders the Fisher Information Manifold as a curved mesh.
 * Curvature and color transition based on the current regime (exhaustion score).
 */
function ManifoldSurface({ exhaustion = 0.5, curvature = 0.1 }) {
    const meshRef = useRef()

    // Color transition: Neon Cyan (Expansion) -> High-Contrast Amber (Exhaustion)
    const color = useMemo(() => {
        const cyan = new THREE.Color('#00f2ff')
        const amber = new THREE.Color('#ffbf00')
        return cyan.clone().lerp(amber, exhaustion)
    }, [exhaustion])

    useFrame((state) => {
        if (!meshRef.current) return
        const time = state.clock.getElapsedTime()

        // Dynamically "warp" the manifold based on curvature
        meshRef.current.distort = THREE.MathUtils.lerp(0.1, 0.6, curvature * 2)
        meshRef.current.speed = THREE.MathUtils.lerp(1, 4, exhaustion)
    })

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[1.5, 64, 64]} />
                <MeshDistortMaterial
                    ref={meshRef}
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.5}
                    roughness={0.1}
                    metalness={0.8}
                    wireframe={true}
                    transparent
                    opacity={0.3}
                />
            </mesh>
            {/* Inner core representation */}
            <mesh>
                <sphereGeometry args={[1.4, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.2}
                    transparent
                    opacity={0.1}
                />
            </mesh>
        </Float>
    )
}

/**
 * MarketStateParticle: Represents the current state moving through the manifold.
 * Position maps to (mu, sigma2) from the Fisher Information Metric.
 */
function MarketStateParticle({ mu = 0, sigma2 = 0.1, exhaustion = 0 }) {
    const particleRef = useRef()

    useFrame((state) => {
        if (!particleRef.current) return
        const time = state.clock.getElapsedTime()

        // Map mu/sigma2 to 3D coords
        // mu -> X, log(sigma2) -> Y, oscillation -> Z
        const x = mu * 2
        const y = Math.log10(sigma2 + 1) * 3
        const z = Math.sin(time * 2) * 0.2

        particleRef.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
    })

    const color = exhaustion > 0.7 ? '#ff0000' : '#00f2ff'

    return (
        <mesh ref={particleRef}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2}
            />
            <pointLight distance={3} intensity={5} color={color} />
        </mesh>
    )
}

export default function ManifoldMap({ manifold }) {
    if (!manifold) return (
        <div className="w-full h-full bg-panel/50 flex items-center justify-center border border-border border-dashed">
            <span className="font-mono text-[9px] text-text-dim animate-pulse uppercase tracking-widest">
                GEOMETRIC ENGINE OFFLINE | INITIALIZING MANIFOLD...
            </span>
        </div>
    )

    const { exhaustion, curvature, mu, sigma2 } = manifold

    return (
        <div className="w-full h-full relative bg-base overflow-hidden border border-border shadow-inner">
            {/* UI Overlay */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
                <span className="font-label text-[8px] text-text-muted tracking-widest uppercase">
                    Information Geometry Layer
                </span>
                <div className="flex gap-2 items-baseline">
                    <span className="font-mono text-xs font-bold text-text-primary uppercase">
                        Regime: {exhaustion > 0.7 ? 'SATURATION' : exhaustion > 0.4 ? 'TRANSITION' : 'EXPANSION'}
                    </span>
                    <span className={`font-mono text-[9px] px-1 rounded ${exhaustion > 0.7 ? 'bg-accent-risk text-white' : 'bg-accent-itm text-black'}`}>
                        {(exhaustion * 100).toFixed(1)}% EXH
                    </span>
                </div>
            </div>

            <div className="absolute top-2 right-2 z-10 text-right pointer-events-none">
                <div className="font-mono text-[8px] text-text-dim flex flex-col">
                    <span>μ: {mu.toFixed(4)}</span>
                    <span>σ²: {sigma2.toFixed(4)}</span>
                    <span>κ: {curvature.toFixed(4)}</span>
                </div>
            </div>

            {/* Canvas */}
            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                <color attach="background" args={['#050505']} />

                <ambientLight intensity={0.2} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                    <ManifoldSurface exhaustion={exhaustion} curvature={curvature} />
                </Float>

                <MarketStateParticle mu={mu} sigma2={sigma2} exhaustion={exhaustion} />

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate
                    autoRotateSpeed={0.5}
                />

                {/* Background Grid */}
                <gridHelper args={[20, 20, '#1a1a1a', '#0a0a0a']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -5]} />
            </Canvas>

            {/* Warning Glow */}
            {exhaustion > 0.8 && (
                <div className="absolute inset-0 pointer-events-none border-2 border-accent-risk/50 animate-pulse shadow-[inset_0_0_100px_rgba(255,0,0,0.2)]" />
            )}
        </div>
    )
}
