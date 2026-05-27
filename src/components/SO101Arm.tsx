import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import URDFLoader from "urdf-loader";
import type { URDFRobot } from "urdf-loader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const URDF_URL = "/so-101/so101.urdf";
type MeshMaterialWithColor = THREE.Material & {
  color?: THREE.Color;
  map?: THREE.Texture | null;
};

function configureLoader(loader: URDFLoader) {
  loader.loadMeshCb = (path, _manager, done) => {
    const stl = new STLLoader();
    stl.load(
      path,
      (geometry) => {
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: 0xeeeeee,
          roughness: 0.55,
          metalness: 0.15,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        done(mesh);
      },
      undefined,
      (err) => {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        done(new THREE.Object3D(), wrapped);
      },
    );
  };
}

function asStandardMaterial(source: THREE.Material): THREE.MeshStandardMaterial {
  if (source instanceof THREE.MeshStandardMaterial) return source;
  const mat = source as MeshMaterialWithColor;
  return new THREE.MeshStandardMaterial({
    name: source.name,
    color: mat.color?.clone() ?? new THREE.Color("#eeeeee"),
    map: mat.map ?? null,
    opacity: source.opacity,
    transparent: source.transparent,
    depthWrite: source.depthWrite,
    side: source.side,
    roughness: 0.62,
    metalness: 0.02,
  });
}

function isOriginalPrintedYellow(color: THREE.Color) {
  return color.r > 0.85 && color.g > 0.62 && color.b < 0.28;
}

function replacePrintedYellowWithOrange(robot: THREE.Object3D) {
  robot.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const converted = sourceMaterials.map((source) => {
      const mat = asStandardMaterial(source);
      if (mat.name === "3d_printed" || isOriginalPrintedYellow(mat.color)) {
        mat.color.set("#d4772f");
        mat.roughness = 0.6;
        mat.metalness = 0.0;
        mat.envMapIntensity = 0.42;
      } else if (mat.name === "sts3215") {
        mat.color.set("#1a1a1a");
        mat.roughness = 0.5;
        mat.metalness = 0.12;
        mat.envMapIntensity = 0.5;
      }
      return mat;
    });

    mesh.material = Array.isArray(mesh.material) ? converted : converted[0];
  });
}

function applyDefaultPose(robot: URDFRobot) {
  const set = (name: string, v: number) => {
    const j = robot.joints?.[name];
    if (j) j.setJointValue(v);
  };
  set("shoulder_pan", 0);
  set("shoulder_lift", -0.6);
  set("elbow_flex", 1.2);
  set("wrist_flex", 0.4);
  set("wrist_roll", 0);
  set("gripper", 0.3);
}

function cloneRobot(robot: URDFRobot): URDFRobot {
  const cloned = robot.clone(true) as URDFRobot;
  cloned.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      if (m.material instanceof THREE.Material) m.material = m.material.clone();
    }
  });
  return cloned;
}

interface Props {
  position: [number, number, number];
  // Yaw around world +Y, in radians. yaw=0 → robot forward points +X.
  yaw: number;
}

export default function SO101Arm({ position, yaw }: Props) {
  // URDFLoader doesn't extend three's Loader base class, so cast for R3F.
  const robot = useLoader(
    URDFLoader as unknown as new () => THREE.Loader,
    URDF_URL,
    configureLoader as unknown as (loader: THREE.Loader) => void,
  ) as unknown as URDFRobot;

  const instance = useMemo(() => {
    const cloned = cloneRobot(robot);
    replacePrintedYellowWithOrange(cloned);
    applyDefaultPose(cloned);
    return cloned;
  }, [robot]);

  // URDF is Z-up; the inner rotation maps URDF Z → world Y so the base sits
  // flat. The outer yaw rotates the arm around world Y to aim its forward
  // direction (URDF +X) in the desired heading.
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={instance} />
      </group>
    </group>
  );
}
