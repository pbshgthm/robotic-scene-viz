import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import Scene from "./components/Scene";

export default function App() {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.92;
      }}
      camera={{ position: [2.2, 1.6, 2.0], fov: 45, near: 0.05, far: 50 }}
    >
      <color attach="background" args={["#eef2f5"]} />
      <fog attach="fog" args={["#eef2f5", 6, 11]} />
      <ambientLight intensity={0.18} />
      <hemisphereLight intensity={0.55} color="#f4f5ef" groundColor="#d4cec2" />
      <directionalLight
        position={[-3.5, 5.2, 4]}
        intensity={1.2}
        color="#fff2dd"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={12}
        shadow-bias={-0.00012}
        shadow-normalBias={0.018}
        shadow-radius={5}
      />
      <directionalLight position={[4, 3, -3]} intensity={0.14} color="#dce8ff" />
      <directionalLight position={[0, 2.4, -4]} intensity={0.18} color="#f1eef8" />
      <Suspense fallback={null}>
        <Scene />
        <Environment preset="apartment" environmentIntensity={0.32} />
      </Suspense>
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.28}
        blur={3.4}
        scale={6}
        far={2}
      />
      <OrbitControls
        target={[0, 0.75, 0]}
        enableDamping
        minDistance={0.8}
        maxDistance={6}
      />
    </Canvas>
  );
}
