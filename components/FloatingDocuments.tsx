"use client";

import { Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useRef } from "react";

const cardPositions = [
  [-1.65, 0.46, 0],
  [0, 0.08, 0.12],
  [1.48, -0.34, -0.04]
] as const;

const nodePositions = [
  [-2.05, 1.18, 0.1],
  [-0.84, 1.55, -0.08],
  [0.72, 1.28, 0.12],
  [2.05, 0.76, -0.02],
  [1.7, -1.18, 0.08],
  [-1.5, -1.05, 0.1]
] as const;

export function FloatingDocuments() {
  const group = useRef<Group>(null);

  useFrame(({ pointer, clock }) => {
    if (!group.current) return;
    group.current.rotation.y = pointer.x * 0.18 + Math.sin(clock.elapsedTime * 0.45) * 0.05;
    group.current.rotation.x = -pointer.y * 0.12;
  });

  return (
    <group ref={group}>
      {cardPositions.map((position, index) => (
        <Float
          key={position.join("-")}
          speed={1.2 + index * 0.18}
          rotationIntensity={0.18}
          floatIntensity={0.55}
        >
          <group position={position} rotation={[0.05, -0.25 + index * 0.2, -0.08 + index * 0.08]}>
            <mesh>
              <boxGeometry args={[1.38, 1.78, 0.035]} />
              <meshStandardMaterial
                color={index === 1 ? "#f8fbff" : "#dfeaf5"}
                roughness={0.42}
                metalness={0.08}
              />
            </mesh>
            <mesh position={[0, 0.56, 0.026]}>
              <boxGeometry args={[0.82, 0.055, 0.02]} />
              <meshStandardMaterial color="#C77A3A" emissive="#5a3b09" emissiveIntensity={0.2} />
            </mesh>
            {[0.24, 0.04, -0.16].map((y) => (
              <mesh key={y} position={[0, y, 0.027]}>
                <boxGeometry args={[0.96, 0.028, 0.018]} />
                <meshStandardMaterial color="#aebdd0" />
              </mesh>
            ))}
          </group>
        </Float>
      ))}

      <mesh position={[0, 0, -0.16]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.08, 0.006, 12, 120]} />
        <meshBasicMaterial color="#2DD4BF" transparent opacity={0.38} />
      </mesh>

      {nodePositions.map((position, index) => (
        <Float
          key={position.join("-")}
          speed={1.6 + index * 0.05}
          rotationIntensity={0.08}
          floatIntensity={0.35}
        >
          <mesh position={position}>
            <sphereGeometry args={[index % 2 === 0 ? 0.09 : 0.065, 24, 24]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#2DD4BF" : "#C77A3A"}
              emissive={index % 2 === 0 ? "#0a6c75" : "#5f3e08"}
              emissiveIntensity={0.65}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}
