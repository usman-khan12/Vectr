import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

// --- Mock Data ---
const ROUTE_STEPS = [
  {
    id: 1,
    distance: 0.7,
    unit: "mi",
    street: "Baum Blvd",
    action: "turn-left",
    duration: 5000,
  },
  {
    id: 2,
    distance: 1.2,
    unit: "mi",
    street: "Liberty Ave",
    action: "straight",
    duration: 8000,
  },
  {
    id: 3,
    distance: 0.3,
    unit: "mi",
    street: "Centre Ave",
    action: "turn-right",
    duration: 5000,
  },
  {
    id: 4,
    distance: 0.5,
    unit: "mi",
    street: "Hospital Dr",
    action: "destination",
    duration: 5000,
  },
];

// --- Icons ---
const TurnLeftIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 18l-6-6 6-6" />
    <path d="M3 12h10a4 4 0 0 1 4 4v4" />
  </svg>
);

const TurnRightIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 18l6-6-6-6" />
    <path d="M21 12H11a4 4 0 0 0-4 4v4" />
  </svg>
);

const StraightIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2v20" />
    <path d="m17 7-5-5-5 5" />
  </svg>
);

const DestinationIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 22s-8-10-8-14a8 8 0 0 1 16 0c0 4-8 14-8 14z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

function NavigationOverlay({ step }) {
  const getIcon = () => {
    switch (step.action) {
      case "turn-left":
        return <TurnLeftIcon className="w-8 h-8 text-white" />;
      case "turn-right":
        return <TurnRightIcon className="w-8 h-8 text-white" />;
      case "straight":
        return <StraightIcon className="w-8 h-8 text-white" />;
      case "destination":
        return <DestinationIcon className="w-8 h-8 text-red-500" />;
      default:
        return <StraightIcon className="w-8 h-8 text-white" />;
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl flex items-center gap-4 min-w-[240px] border border-slate-700">
        <div className="flex-none">{getIcon()}</div>
        <div className="flex flex-col">
          <span className="text-2xl font-black text-white leading-none">
            {step.distance}{" "}
            <span className="text-sm font-medium">{step.unit}</span>
          </span>
          <span className="text-sm font-medium text-slate-400 truncate max-w-[140px]">
            {step.street}
          </span>
        </div>
      </div>
    </div>
  );
}

function AmbulanceModel({ action, progress }) {
  const groupRef = useRef();
  const wheelsRef = useRef([]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Simulate slight vibration/movement
      groupRef.current.position.y =
        0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.02;

      // Handle Turning Animation
      // Smoothly rotate towards target rotation based on action
      let targetRotation = 0;
      if (action === "turn-left") targetRotation = Math.PI / 4;
      if (action === "turn-right") targetRotation = -Math.PI / 4;

      // Interpolate rotation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotation,
        delta * 2,
      );

      // Wheel Spin
      wheelsRef.current.forEach((wheel) => {
        if (wheel) wheel.rotation.x -= delta * 10; // Spin wheels
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Chassis */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.2, 2.5]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Windows */}
      <mesh position={[0, 0.9, 0.8]} castShadow>
        <boxGeometry args={[1.25, 0.5, 1]} />
        <meshStandardMaterial color="#23408e" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Stripe */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.22, 0.2, 2.52]} />
        <meshStandardMaterial color="#ed1b24" />
      </mesh>

      {/* Lights Bar */}
      <mesh position={[0, 1.25, 0.8]}>
        <boxGeometry args={[1, 0.15, 0.3]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
      <mesh position={[-0.35, 1.25, 0.8]}>
        <boxGeometry args={[0.2, 0.16, 0.31]} />
        <meshStandardMaterial
          color="#ed1b24"
          emissive="#ed1b24"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[0.35, 1.25, 0.8]}>
        <boxGeometry args={[0.2, 0.16, 0.31]} />
        <meshStandardMaterial
          color="#ed1b24"
          emissive="#ed1b24"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Wheels */}
      {[
        [-0.6, 0.3, 0.8],
        [0.6, 0.3, 0.8],
        [-0.6, 0.3, -0.8],
        [0.6, 0.3, -0.8],
      ].map((pos, i) => (
        <group key={i} position={pos}>
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            ref={(el) => (wheelsRef.current[i] = el)}
          >
            <cylinderGeometry args={[0.3, 0.3, 0.25, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            position={[pos[0] > 0 ? 0.13 : -0.13, 0, 0]}
          >
            <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
            <meshStandardMaterial color="#cccccc" metalness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MovingGrid() {
  const gridRef = useRef();
  useFrame((state, delta) => {
    if (gridRef.current) {
      // Move grid backward to simulate forward motion
      gridRef.current.position.z -= delta * 5;
      if (gridRef.current.position.z < -10) {
        gridRef.current.position.z = 0;
      }
    }
  });

  return (
    <group ref={gridRef}>
      <gridHelper args={[40, 40, 0xcccccc, 0xe5e5e5]} position={[0, 0, 0]} />
      <gridHelper args={[40, 40, 0xcccccc, 0xe5e5e5]} position={[0, 0, 20]} />
    </group>
  );
}

export function AmbulancePanel({ positioningGuidance }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const step = ROUTE_STEPS[currentStepIndex];
    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => (prev + 1) % ROUTE_STEPS.length);
    }, step.duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  const currentStep = ROUTE_STEPS[currentStepIndex];

  return (
    <div className="flex flex-col h-full bg-ems-white border-r border-ems-gray">
      <div className="h-1/2 bg-slate-100 overflow-hidden flex flex-col">
        <div className="relative flex-none h-24">
          <div className="absolute top-2 left-2 z-10"></div>
          <NavigationOverlay step={currentStep} />
        </div>

        <div className="flex-1">
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[4, 5, 6]} fov={50} />
            <ambientLight intensity={0.7} />
            <directionalLight
              position={[5, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />

            <AmbulanceModel action={currentStep.action} />
            <MovingGrid />

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 2.5}
            />
            <fog attach="fog" args={["#f1f5f9", 5, 25]} />
          </Canvas>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="mb-3 text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          Positioning Data
        </h3>

        <div className="space-y-3">
          <div className="p-3 bg-white rounded-lg border-l-4 border-amber-500 shadow-sm border border-gray-100">
            <h4 className="text-xs font-semibold text-amber-600 mb-1">
              DIMENSIONS
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                H: <span className="text-slate-900 font-bold">2.8m</span>
              </div>
              <div>
                W: <span className="text-slate-900 font-bold">2.2m</span>
              </div>
              <div>
                L: <span className="text-slate-900 font-bold">6.4m</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border-l-4 border-ems-blue shadow-sm border border-gray-100">
            <h4 className="text-xs font-semibold text-ems-blue mb-1">
              APPROACH NOTES
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
              {positioningGuidance || "Awaiting approach data..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
