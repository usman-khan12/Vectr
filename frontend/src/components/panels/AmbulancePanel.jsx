import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";

function AmbulanceModel() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 2]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Stripes */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.02, 0.2, 2.02]} />
        <meshStandardMaterial color="red" />
      </mesh>
      {/* Wheels */}
      <mesh position={[-0.5, 0, 0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[0.5, 0, 0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-0.5, 0, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[0.5, 0, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </group>
  );
}

export function AmbulancePanel({ positioningGuidance }) {
  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Top Section: 3D Model */}
      <div className="h-1/2 relative bg-gray-800/50">
        <div className="absolute top-2 left-2 z-10">
          <span className="px-2 py-1 text-xs font-bold text-white bg-red-600 rounded shadow-sm">
            UNIT STATUS: APPROACHING
          </span>
        </div>
        <Canvas>
          <PerspectiveCamera makeDefault position={[3, 3, 3]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <AmbulanceModel />
          <OrbitControls enableZoom={false} />
          <gridHelper args={[10, 10, 0x444444, 0x222222]} />
        </Canvas>
      </div>

      {/* Bottom Section: Dimensions & Notes */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="mb-3 text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          Positioning Data
        </h3>

        <div className="space-y-3">
          <div className="p-3 bg-gray-800 rounded-lg border-l-4 border-amber-500">
            <h4 className="text-xs font-semibold text-amber-500 mb-1">
              DIMENSIONS
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div>
                H: <span className="text-white">2.8m</span>
              </div>
              <div>
                W: <span className="text-white">2.2m</span>
              </div>
              <div>
                L: <span className="text-white">6.4m</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-800 rounded-lg border-l-4 border-blue-500">
            <h4 className="text-xs font-semibold text-blue-500 mb-1">
              APPROACH NOTES
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
              {positioningGuidance || "Awaiting approach data..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
