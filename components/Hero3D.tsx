"use client";

import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { FloatingDocuments } from "./FloatingDocuments";

export function Hero3D() {
  return (
    <div className="absolute bottom-0 right-[-6rem] top-20 hidden w-[55rem] max-w-[60vw] lg:block">
      <Canvas
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 5.8], fov: 42 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.8]} fov={42} />
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={1.35} />
        <pointLight position={[-2.8, 1.8, 3]} color="#2DD4BF" intensity={18} />
        <Suspense fallback={null}>
          <FloatingDocuments />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
