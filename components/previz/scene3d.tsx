"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { Scene } from "@/lib/generate/schema";

// Превиз из простых фигур: персонаж, локация, реквизит и движение камеры по кадру.
// progress (0..1 внутри текущего кадра) приходит через ref, чтобы не перерисовывать React каждый кадр.

type Props = { scene: Scene; progress: MutableRefObject<number> };

const SKY: Record<Scene["location"], string> = {
  studio: "#0d0d10",
  rooftop: "#2a1a2e",
  office: "#14161c",
  street: "#1a1f2b",
  car: "#101114",
  home: "#1c1714",
};

const GROUND: Record<Scene["location"], string> = {
  studio: "#18181b",
  rooftop: "#2b2b30",
  office: "#23252b",
  street: "#2a2d33",
  car: "#1b1b1f",
  home: "#3a2f28",
};

const ACCENT = "#f5b544";
const SKIN = "#e8c7a8";
const SUIT = "#1f2937";

export default function Scene3D({ scene, progress }: Props) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 35, position: [0, 1.6, 4] }} gl={{ antialias: true }}>
      <color attach="background" args={[SKY[scene.location]]} />
      <fog attach="fog" args={[SKY[scene.location], 8, 22]} />
      <ambientLight intensity={0.55} />
      <spotLight position={[0, 3.5, 5]} angle={0.5} penumbra={0.8} intensity={30} castShadow />
      <directionalLight position={[3, 5, 4]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 2.5, -2]} intensity={6} color={ACCENT} distance={8} />
      <CameraRig scene={scene} progress={progress} />
      <Ground color={GROUND[scene.location]} />
      <Location location={scene.location} />
      <PropsLayer props={scene.props} />
      <Character action={scene.action} progress={progress} />
    </Canvas>
  );
}

function Ground({ color }: { color: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

const SHOT_DIST = { close: 2.3, medium: 3.8, wide: 6.8 };
const SHOT_HEIGHT = { close: 1.6, medium: 1.45, wide: 1.7 };

function CameraRig({ scene, progress }: Props) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const t = easeInOut(progress.current);
    let dist = SHOT_DIST[scene.shot];
    let angle = 0;
    let x = 0;
    if (scene.camera === "push_in") dist *= 1.35 - 0.35 * t;
    if (scene.camera === "pull_out") dist *= 1 + 0.45 * t;
    if (scene.camera === "orbit") angle = -0.6 + 1.2 * t;
    if (scene.camera === "pan") x = -1.2 + 2.4 * t;

    const h = SHOT_HEIGHT[scene.shot];
    camera.position.set(x + Math.sin(angle) * dist, h + 0.05, Math.cos(angle) * dist);
    target.set(x * 0.4, scene.action === "sit" ? h - 0.4 : h - 0.1, 0);
    camera.lookAt(target);
  });
  return null;
}

function Character({ action, progress }: { action: Scene["action"]; progress: MutableRefObject<number> }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const sitting = action === "sit";

  useFrame(({ clock }) => {
    const s = clock.getElapsedTime();
    if (!root.current || !head.current || !armL.current || !armR.current) return;
    const talk = Math.sin(s * 9) * 0.03;

    root.current.position.set(action === "walk" ? -1 + 2 * progress.current : 0, sitting ? -0.45 : 0, 0);
    root.current.position.y += action === "walk" ? Math.abs(Math.sin(s * 6)) * 0.05 : 0;
    head.current.rotation.x = action === "talk" || action === "point" || action === "gesture" ? talk : 0;
    head.current.rotation.y = Math.sin(s * 0.7) * 0.12;

    armL.current.rotation.set(0, 0, 0.12);
    armR.current.rotation.set(0, 0, -0.12);
    if (action === "point") armR.current.rotation.set(-1.25 + Math.sin(s * 2) * 0.05, 0, -0.5);
    if (action === "hold_phone") armR.current.rotation.set(-1.1, 0.4, -0.3);
    if (action === "gesture") {
      armL.current.rotation.set(-0.8 + Math.sin(s * 3) * 0.25, 0, 0.3);
      armR.current.rotation.set(-0.8 + Math.cos(s * 3) * 0.25, 0, -0.3);
    }
    if (action === "walk") {
      armL.current.rotation.x = Math.sin(s * 6) * 0.5;
      armR.current.rotation.x = -Math.sin(s * 6) * 0.5;
    }
    if (sitting) {
      armL.current.rotation.set(-1.2, 0, 0.1);
      armR.current.rotation.set(-1.2, 0, -0.1);
    }
  });

  return (
    <group ref={root}>
      {/* ноги */}
      {!sitting && (
        <>
          <mesh position={[-0.12, 0.42, 0]} castShadow><capsuleGeometry args={[0.09, 0.62, 6, 12]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0.12, 0.42, 0]} castShadow><capsuleGeometry args={[0.09, 0.62, 6, 12]} /><meshStandardMaterial color="#111827" /></mesh>
        </>
      )}
      {sitting && (
        <>
          <mesh position={[-0.12, 0.88, 0.25]} rotation-x={Math.PI / 2} castShadow><capsuleGeometry args={[0.09, 0.4, 6, 12]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0.12, 0.88, 0.25]} rotation-x={Math.PI / 2} castShadow><capsuleGeometry args={[0.09, 0.4, 6, 12]} /><meshStandardMaterial color="#111827" /></mesh>
        </>
      )}
      {/* корпус */}
      <mesh position={[0, 1.12, 0]} castShadow><capsuleGeometry args={[0.24, 0.5, 8, 16]} /><meshStandardMaterial color={SUIT} roughness={0.6} /></mesh>
      <mesh position={[0, 1.36, 0.2]}><boxGeometry args={[0.08, 0.2, 0.02]} /><meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.3} /></mesh>
      {/* руки */}
      <group ref={armL} position={[-0.32, 1.38, 0]}>
        <mesh position={[0, -0.27, 0]} castShadow><capsuleGeometry args={[0.07, 0.42, 6, 12]} /><meshStandardMaterial color={SUIT} /></mesh>
      </group>
      <group ref={armR} position={[0.32, 1.38, 0]}>
        <mesh position={[0, -0.27, 0]} castShadow><capsuleGeometry args={[0.07, 0.42, 6, 12]} /><meshStandardMaterial color={SUIT} /></mesh>
        {action === "hold_phone" && (
          <mesh position={[0, -0.55, 0.05]}><boxGeometry args={[0.09, 0.17, 0.015]} /><meshStandardMaterial color="#0b0b0b" emissive="#3b82f6" emissiveIntensity={0.4} /></mesh>
        )}
      </group>
      {/* голова */}
      <group ref={head} position={[0, 1.72, 0]}>
        <mesh castShadow><sphereGeometry args={[0.17, 32, 32]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
        <mesh position={[0, 0.08, -0.02]}><sphereGeometry args={[0.175, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.2]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh position={[-0.06, 0.02, 0.155]}><sphereGeometry args={[0.018, 12, 12]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[0.06, 0.02, 0.155]}><sphereGeometry args={[0.018, 12, 12]} /><meshStandardMaterial color="#111" /></mesh>
      </group>
    </group>
  );
}

function Location({ location }: { location: Scene["location"] }) {
  const buildings = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ x: -12 + i * 1.8 + (i % 3) * 0.3, h: 2 + ((i * 37) % 9), w: 1 + (i % 2) * 0.6 })),
    [],
  );

  if (location === "rooftop") {
    return (
      <group>
        {buildings.map((b, i) => (
          <mesh key={i} position={[b.x, b.h / 2 - 1.5, -12]}>
            <boxGeometry args={[b.w, b.h, 1]} />
            <meshStandardMaterial color="#1e1b2e" emissive={i % 3 === 0 ? ACCENT : "#000"} emissiveIntensity={0.08} />
          </mesh>
        ))}
        <mesh position={[0, 6, -18]}><sphereGeometry args={[1.4, 32, 32]} /><meshBasicMaterial color="#f97316" /></mesh>
        <mesh position={[0, 0.5, -2.5]}><boxGeometry args={[8, 1, 0.08]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.25} /></mesh>
      </group>
    );
  }
  if (location === "street") {
    return (
      <group>
        {buildings.slice(0, 6).map((b, i) => (
          <mesh key={i} position={[i % 2 ? 4 : -4, b.h / 2, -3 - i * 2.5]} castShadow>
            <boxGeometry args={[2, b.h, 2]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        ))}
      </group>
    );
  }
  if (location === "office" || location === "home") {
    return (
      <group>
        <mesh position={[0, 2, -2.2]} receiveShadow><boxGeometry args={[10, 4, 0.1]} /><meshStandardMaterial color={location === "home" ? "#4a3c33" : "#1f232b"} /></mesh>
        <mesh position={[1.6, 2.1, -2.12]}><boxGeometry args={[1.6, 1.4, 0.02]} /><meshStandardMaterial color="#93c5fd" emissive="#60a5fa" emissiveIntensity={0.35} /></mesh>
        {location === "home" && (
          <RoundedBox args={[2.4, 0.5, 0.9]} radius={0.12} position={[-1.8, 0.35, -1.5]}><meshStandardMaterial color="#6b5545" /></RoundedBox>
        )}
      </group>
    );
  }
  if (location === "car") {
    return (
      <group>
        <RoundedBox args={[1.2, 1.2, 0.4]} radius={0.15} position={[0, 0.8, -0.45]}><meshStandardMaterial color="#27272a" /></RoundedBox>
        <mesh position={[0, 2, -2]}><boxGeometry args={[4, 1.2, 0.05]} /><meshStandardMaterial color="#60a5fa" transparent opacity={0.2} /></mesh>
      </group>
    );
  }
  // студия: циклорама и контровой свет
  return (
    <mesh position={[0, 3, -3]}>
      <cylinderGeometry args={[6, 6, 6, 48, 1, true, Math.PI * 0.75, Math.PI * 0.5]} />
      <meshStandardMaterial color="#141418" side={THREE.BackSide} />
    </mesh>
  );
}

function PropsLayer({ props }: { props: Scene["props"] }) {
  const has = (p: Scene["props"][number]) => props.includes(p);
  return (
    <group>
      {(has("desk") || has("table")) && (
        <RoundedBox args={[1.8, 0.08, 0.8]} radius={0.03} position={[0, 0.78, 0.75]} castShadow receiveShadow>
          <meshStandardMaterial color={has("desk") ? "#3f3f46" : "#7c5c45"} />
        </RoundedBox>
      )}
      {has("monitors") &&
        [-0.6, 0, 0.6].map((x, i) => (
          <mesh key={i} position={[x * 1.6, 1.0, 0.95 - Math.abs(x) * 0.3]} rotation-y={Math.PI - x * 0.9} castShadow>
            <boxGeometry args={[0.5, 0.3, 0.03]} />
            <meshStandardMaterial color="#0b0b0f" emissive={i === 1 ? "#22c55e" : "#3b82f6"} emissiveIntensity={0.5} />
          </mesh>
        ))}
      {has("laptop") && (
        <mesh position={[0, 0.9, 0.7]} rotation-x={-0.3}><boxGeometry args={[0.4, 0.25, 0.02]} /><meshStandardMaterial color="#a1a1aa" emissive="#3b82f6" emissiveIntensity={0.2} /></mesh>
      )}
      {has("chair") && (
        <RoundedBox args={[0.6, 0.9, 0.12]} radius={0.05} position={[0, 0.95, -0.4]} castShadow><meshStandardMaterial color="#18181b" /></RoundedBox>
      )}
      {has("board") && (
        <mesh position={[-1.4, 1.5, -0.6]} rotation-y={0.4}><boxGeometry args={[1.2, 0.8, 0.04]} /><meshStandardMaterial color="#f4f4f5" /></mesh>
      )}
      {has("car") && (
        <RoundedBox args={[2.2, 0.8, 1]} radius={0.25} position={[2.2, 0.5, -1]} castShadow><meshStandardMaterial color="#111827" metalness={0.6} roughness={0.3} /></RoundedBox>
      )}
      {has("window") && (
        <mesh position={[-1.6, 2, -2.1]}><boxGeometry args={[1.4, 1.6, 0.02]} /><meshStandardMaterial color="#bae6fd" emissive="#7dd3fc" emissiveIntensity={0.3} /></mesh>
      )}
    </group>
  );
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
