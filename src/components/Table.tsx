// Table dimensions (meters): length 1.8 m (X), width 0.7 m (Z),
// top thickness 0.03 m, leg height 0.72 m → table top sits at y = 0.75.

import { useMemo } from "react";
import * as THREE from "three";

const LENGTH = 1.8;
const WIDTH = 0.7;
const TOP_THICKNESS = 0.03;
const HEIGHT = 0.75;
const LEG_THICKNESS = 0.05;
const ROOM_LENGTH = 4.8;
const ROOM_WIDTH = 4.4;
const ROOM_HEIGHT = 2.25;

export default function Table() {
  const tabletopTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      let seed = 42;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
      };
      ctx.fillStyle = "#b4b9bd";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y += 4) {
        const shade = 150 + Math.floor(rand() * 34);
        ctx.fillStyle = `rgba(${shade}, ${shade + 2}, ${shade + 4}, 0.12)`;
        ctx.fillRect(0, y, canvas.width, 2);
      }
      for (let i = 0; i < 4300; i++) {
        const v = 130 + Math.floor(rand() * 58);
        const alpha = 0.09 + rand() * 0.14;
        const size = rand() > 0.72 ? 2 : 1;
        ctx.fillStyle = `rgba(${v}, ${v + 1}, ${v + 3}, ${alpha})`;
        ctx.fillRect(
          rand() * canvas.width,
          rand() * canvas.height,
          size,
          size,
        );
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1.6);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
  const floorTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      let seed = 73;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
      };
      ctx.fillStyle = "#e2ded5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 4200; i++) {
        const warm = 210 + Math.floor(rand() * 22);
        ctx.fillStyle = `rgba(${warm}, ${warm - 3}, ${warm - 10}, ${0.035 + rand() * 0.045})`;
        ctx.fillRect(rand() * canvas.width, rand() * canvas.height, 1, 1);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
  const legY = (HEIGHT - TOP_THICKNESS) / 2;
  const legInset = 0.04;
  const legX = LENGTH / 2 - LEG_THICKNESS / 2 - legInset;
  const legZ = WIDTH / 2 - LEG_THICKNESS / 2 - legInset;

  return (
    <group>
      <mesh
        position={[0, HEIGHT - TOP_THICKNESS / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[LENGTH, TOP_THICKNESS, WIDTH]} />
        <meshStandardMaterial
          map={tabletopTexture}
          bumpMap={tabletopTexture}
          bumpScale={0.0018}
          color="#c0c4c7"
          roughness={0.88}
          metalness={0.01}
        />
      </mesh>

      {[
        [+legX, legY, +legZ],
        [+legX, legY, -legZ],
        [-legX, legY, +legZ],
        [-legX, legY, -legZ],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[LEG_THICKNESS, HEIGHT - TOP_THICKNESS, LEG_THICKNESS]} />
          <meshStandardMaterial color="#111111" roughness={0.78} />
        </mesh>
      ))}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_LENGTH, ROOM_WIDTH]} />
        <meshStandardMaterial
          map={floorTexture}
          bumpMap={floorTexture}
          bumpScale={0.0008}
          color="#e3dfd6"
          roughness={0.94}
        />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_WIDTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_LENGTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#f1f0eb" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, ROOM_HEIGHT / 2, ROOM_WIDTH / 2]}
        rotation={[0, Math.PI, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_LENGTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#f6f5ef" roughness={0.9} />
      </mesh>
      <mesh
        position={[-ROOM_LENGTH / 2, ROOM_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#efeee9" roughness={0.9} />
      </mesh>
      <mesh
        position={[ROOM_LENGTH / 2, ROOM_HEIGHT / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#f4f3ee" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, ROOM_HEIGHT, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_LENGTH, ROOM_WIDTH]} />
        <meshStandardMaterial color="#faf9f3" roughness={0.88} />
      </mesh>
    </group>
  );
}

export const TABLE = { LENGTH, WIDTH, HEIGHT, TOP_THICKNESS };
