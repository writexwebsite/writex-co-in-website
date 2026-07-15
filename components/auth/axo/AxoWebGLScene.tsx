"use client";

import { Canvas } from "@react-three/fiber";
import { useCallback, useState } from "react";
import { AXO_RENDER_MODE } from "@/lib/auth/axoStoryConfig";
import type { AxoStoryVariant } from "@/lib/auth/axoStoryConfig";
import { AxoImageDepthScene } from "./AxoImageDepthScene";
import { AxoModelScene } from "./AxoModelScene";
import { AxoStaticFallback } from "./AxoStaticFallback";

type AxoWebGLSceneProps = {
  progress: number;
  pointer: { x: number; y: number };
  active: boolean;
  transitioning: boolean;
  variant: AxoStoryVariant;
};

export default function AxoWebGLScene(props: AxoWebGLSceneProps) {
  const [contextLost, setContextLost] = useState(false);
  const handleCreated = useCallback(({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
    const canvas = gl.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.tabIndex = -1;
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      setContextLost(true);
    });
    canvas.addEventListener("webglcontextrestored", () => setContextLost(false));
  }, []);

  if (contextLost) return <AxoStaticFallback priority variant={props.variant} />;
  const Scene = AXO_RENDER_MODE === "model" ? AxoModelScene : AxoImageDepthScene;

  return (
    <Canvas
      aria-hidden="true"
      tabIndex={-1}
      camera={{ fov: 32, position: [0, 0, 6], near: 0.1, far: 20 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      onCreated={handleCreated}
      className="pointer-events-none"
    >
      <Scene {...props} />
    </Canvas>
  );
}
