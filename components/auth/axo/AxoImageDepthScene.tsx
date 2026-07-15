"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import type { AxoStoryVariant } from "@/lib/auth/axoStoryConfig";

type AxoImageDepthSceneProps = {
  progress: number;
  pointer: { x: number; y: number };
  active: boolean;
  transitioning: boolean;
  variant: AxoStoryVariant;
};

export function AxoImageDepthScene({ progress, pointer, active, transitioning }: AxoImageDepthSceneProps) {
  const texturePath = "/images/auth/axo/axo-login-desktop.webp";
  const texture = useLoader(TextureLoader, texturePath);
  const eased = progress * progress * (3 - 2 * progress);
  const degrees = Math.PI / 180;
  const planeHeight = 2.65;
  const planeWidth = 2.05;

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={32}
        near={0.1}
        far={20}
        position={[0, 0, transitioning ? 4.65 : 6 - eased * 1.05]}
      />
      <mesh
        visible={active}
        position={[-0.08 + eased * 0.14 + pointer.x * 0.035, 0.42 - eased * 0.1 + pointer.y * 0.025, 0]}
        rotation={[
          (-0.35 + pointer.y * 0.35) * degrees,
          (-0.55 + eased * 1.35 + pointer.x * 0.55) * degrees,
          eased * 0.35 * degrees
        ]}
        scale={transitioning ? 1.035 : 1}
      >
        <planeGeometry args={[planeWidth, planeHeight, 24, 24]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}
