import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { TABLE } from "./Table";

const MM_TO_M = 0.001;
const TRACK_CENTER_OFFSET: Point2 = [-0.083, 0.286];

const TRACK_URLS = {
  straight: "/track/straight-150mm.stl",
  curve45: "/track/curve-45-flat.stl",
} as const;

const TOWER_URLS = {
  base: "/track/tower-base.stl",
  section150: "/track/tower-section-150mm.stl",
  section100: "/track/tower-section-100mm.stl",
  section50: "/track/tower-section-50mm.stl",
  top: "/track/tower-top-plate.stl",
} as const;

type TrackModel = keyof typeof TRACK_URLS;
type TowerModel = keyof typeof TOWER_URLS;

type TrackPiece = {
  model: TrackModel;
  x: number;
  z: number;
  yaw: number;
  start: Point2;
  end: Point2;
  endDirection: Point2;
  midpoint: Point2;
};

type Point2 = [number, number];
type ConnectorName = "A" | "B";

type Connector = {
  point: Point2;
  outward: Point2;
};

type TrackPieceTemplate = {
  model: TrackModel;
  from: ConnectorName;
  to: ConnectorName;
};

const CONNECTORS: Record<TrackModel, Record<ConnectorName, Connector>> = {
  straight: {
    A: { point: [0, 0.0751], outward: [0, 1] },
    B: { point: [0, -0.0751], outward: [0, -1] },
  },
  curve45: {
    A: { point: [-0.0193, 0.0614], outward: [0, 1] },
    B: {
      point: [0.0254, -0.0465],
      outward: [Math.SQRT1_2, -Math.SQRT1_2],
    },
  },
};

const S_PATH: TrackPieceTemplate[] = [
  { model: "curve45", from: "A", to: "B" },
  { model: "straight", from: "A", to: "B" },
  { model: "curve45", from: "A", to: "B" },
  { model: "curve45", from: "A", to: "B" },
  { model: "straight", from: "A", to: "B" },
  { model: "straight", from: "A", to: "B" },
  { model: "curve45", from: "B", to: "A" },
  { model: "curve45", from: "B", to: "A" },
  { model: "straight", from: "A", to: "B" },
  { model: "curve45", from: "B", to: "A" },
];

const S_START: Point2 = [-0.788, -0.185];
const S_START_DIRECTION: Point2 = [Math.SQRT1_2, -Math.SQRT1_2];
const S_YAW = 0;

function rotatePoint([x, z]: Point2, yaw: number): Point2 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x * c + z * s, -x * s + z * c];
}

function addPoint([ax, az]: Point2, [bx, bz]: Point2): Point2 {
  return [ax + bx, az + bz];
}

function scalePoint([x, z]: Point2, scalar: number): Point2 {
  return [x * scalar, z * scalar];
}

function subtractPoint([ax, az]: Point2, [bx, bz]: Point2): Point2 {
  return [ax - bx, az - bz];
}

function pointAngle([x, z]: Point2) {
  return Math.atan2(z, x);
}

function yawToRotate(from: Point2, to: Point2) {
  return pointAngle(from) - pointAngle(to);
}

function makePieces(): TrackPiece[] {
  let point: Point2 = [0, 0];
  let direction: Point2 = S_START_DIRECTION;

  return S_PATH.map(({ model, from, to }) => {
    const entryPoint = point;
    const start = CONNECTORS[model][from];
    const end = CONNECTORS[model][to];
    const yaw = yawToRotate(start.outward, [-direction[0], -direction[1]]);
    const origin = subtractPoint(point, rotatePoint(start.point, yaw));
    point = addPoint(origin, rotatePoint(end.point, yaw));
    direction = rotatePoint(end.outward, yaw);

    const rotatedStart = rotatePoint(entryPoint, S_YAW);
    const rotatedEnd = rotatePoint(point, S_YAW);
    const rotatedEndDirection = rotatePoint(direction, S_YAW);
    const rotatedOrigin = rotatePoint(origin, S_YAW);
    const rotatedMidpoint = rotatePoint(
      [(entryPoint[0] + point[0]) / 2, (entryPoint[1] + point[1]) / 2],
      S_YAW,
    );
    return {
      model,
      x: S_START[0] + rotatedOrigin[0],
      z: S_START[1] + rotatedOrigin[1],
      yaw: yaw + S_YAW,
      start: [S_START[0] + rotatedStart[0], S_START[1] + rotatedStart[1]],
      end: [S_START[0] + rotatedEnd[0], S_START[1] + rotatedEnd[1]],
      endDirection: rotatedEndDirection,
      midpoint: [
        S_START[0] + rotatedMidpoint[0],
        S_START[1] + rotatedMidpoint[1],
      ],
    };
  });
}

const PIECES = makePieces();

const TOWER_HEIGHTS = {
  base: 0.018,
  section150: 0.15,
  section100: 0.1,
  section50: 0.05,
  top: 0.006,
} as const;
const TRACK_TOWER_CLEARANCE = 0.008;
const MIDDLE_PLATE_POINT: Point2 = [
  (PIECES[4].x + PIECES[5].x) / 2,
  (PIECES[4].z + PIECES[5].z) / 2,
];
const MIDDLE_PLATE_YAW = PIECES[4].yaw;
const LAST_PIECE = PIECES[PIECES.length - 1];
const CUP_POINT = addPoint(LAST_PIECE.end, scalePoint(LAST_PIECE.endDirection, 0.08));

const SUPPORTS = [
  {
    point: PIECES[0].midpoint,
    section: "section150" as const,
  },
  {
    point: PIECES[9].midpoint,
    section: "section50" as const,
  },
];

function towerTopHeight(section: (typeof SUPPORTS)[number]["section"]) {
  return (
    TOWER_HEIGHTS.base +
    TOWER_HEIGHTS[section] +
    TOWER_HEIGHTS.top +
    TRACK_TOWER_CLEARANCE
  );
}

function makeSlopeCoefficients() {
  const highSupport = SUPPORTS[0];
  const lowSupport = SUPPORTS[1];
  const [x1, z1] = highSupport.point;
  const [x2, z2] = lowSupport.point;
  const y1 = towerTopHeight(highSupport.section);
  const y2 = towerTopHeight(lowSupport.section);
  const dx = x2 - x1;
  const dz = z2 - z1;
  const slope = (y2 - y1) / (dx * dx + dz * dz);
  const a = slope * dx;
  const b = slope * dz;
  const c = y1 - a * x1 - b * z1;

  return { a, b, c };
}

const TRACK_SLOPE = makeSlopeCoefficients();

function trackHeightAt([x, z]: Point2) {
  return TABLE.HEIGHT + TRACK_SLOPE.a * x + TRACK_SLOPE.b * z + TRACK_SLOPE.c;
}

function makeSlopeMatrix() {
  const { a, b, c } = TRACK_SLOPE;

  return new THREE.Matrix4().set(
    1,
    0,
    0,
    0,
    a,
    1,
    b,
    TABLE.HEIGHT + c,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  );
}

const TRACK_SLOPE_MATRIX = makeSlopeMatrix();
const CUP_RADIUS = 0.048;
const CUP_HEIGHT = Math.min(
  0.048,
  Math.max(0.03, trackHeightAt(LAST_PIECE.end) - TABLE.HEIGHT - 0.025),
);
const PLATE_RADIUS = 0.078;
const PLATE_THICKNESS = 0.006;
const PLATE_RIM_THICKNESS = 0.0045;

function useTrackGeometry(url: string) {
  const rawGeometry = useLoader(STLLoader, url) as THREE.BufferGeometry;

  return useMemo(() => {
    const geometry = rawGeometry.clone();
    geometry.computeBoundingBox();

    const box = geometry.boundingBox;
    if (!box) return geometry;

    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -box.min.z);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }, [rawGeometry]);
}

type TrackPieceMeshProps = TrackPiece & {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
};

function TrackPieceMesh({ geometry, material, x, z, yaw }: TrackPieceMeshProps) {
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={MM_TO_M}
        castShadow
        receiveShadow
      />
    </group>
  );
}

type TowerStackProps = {
  geometries: Record<TowerModel, THREE.BufferGeometry>;
  material: THREE.Material;
  point: Point2;
  section: (typeof SUPPORTS)[number]["section"];
};

function TowerMesh({
  geometry,
  material,
  y,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  y: number;
}) {
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, TABLE.HEIGHT + y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={MM_TO_M}
      castShadow
      receiveShadow
    />
  );
}

function TowerStack({ geometries, material, point, section }: TowerStackProps) {
  return (
    <group position={[point[0], 0, point[1]]}>
      <TowerMesh geometry={geometries.base} material={material} y={0} />
      <TowerMesh
        geometry={geometries[section]}
        material={material}
        y={TOWER_HEIGHTS.base}
      />
      <TowerMesh
        geometry={geometries.top}
        material={material}
        y={TOWER_HEIGHTS.base + TOWER_HEIGHTS[section]}
      />
    </group>
  );
}

function CyanPlate({
  material,
  point,
  yaw,
}: {
  material: THREE.Material;
  point: Point2;
  yaw: number;
}) {
  return (
    <group position={[point[0], 0, point[1]]} rotation={[0, yaw, 0]}>
      <mesh
        position={[0, TABLE.HEIGHT + PLATE_THICKNESS / 2 + 0.001, 0]}
        scale={[1.75, 1, 0.95]}
        material={material}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[PLATE_RADIUS, PLATE_RADIUS, PLATE_THICKNESS, 96]} />
      </mesh>
      <mesh
        position={[0, TABLE.HEIGHT + PLATE_THICKNESS + 0.004, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1.75, 0.95, 1]}
        material={material}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[PLATE_RADIUS, PLATE_RIM_THICKNESS, 12, 96]} />
      </mesh>
    </group>
  );
}

function CyanCup({
  material,
  point,
}: {
  material: THREE.Material;
  point: Point2;
}) {
  const centerY = TABLE.HEIGHT + CUP_HEIGHT / 2 + 0.001;
  const rimY = TABLE.HEIGHT + CUP_HEIGHT + 0.001;

  return (
    <group position={[point[0], 0, point[1]]}>
      <mesh
        position={[0, centerY, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[CUP_RADIUS, CUP_RADIUS * 0.82, CUP_HEIGHT, 64, 1, true]} />
      </mesh>
      <mesh
        position={[0, TABLE.HEIGHT + 0.0035, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[CUP_RADIUS * 0.82, CUP_RADIUS * 0.82, 0.007, 64]} />
      </mesh>
      <mesh
        position={[0, rimY, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[CUP_RADIUS, 0.0042, 12, 64]} />
      </mesh>
      <mesh
        position={[0, TABLE.HEIGHT + 0.009, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[CUP_RADIUS * 0.82, 0.003, 10, 48]} />
      </mesh>
    </group>
  );
}

export default function TabletopTrack() {
  const straight = useTrackGeometry(TRACK_URLS.straight);
  const curve45 = useTrackGeometry(TRACK_URLS.curve45);
  const towerBase = useTrackGeometry(TOWER_URLS.base);
  const towerSection150 = useTrackGeometry(TOWER_URLS.section150);
  const towerSection100 = useTrackGeometry(TOWER_URLS.section100);
  const towerSection50 = useTrackGeometry(TOWER_URLS.section50);
  const towerTop = useTrackGeometry(TOWER_URLS.top);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7047b8",
        roughness: 0.78,
        metalness: 0.0,
        envMapIntensity: 0.18,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const towerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7b55c2",
        roughness: 0.8,
        metalness: 0.0,
        envMapIntensity: 0.16,
      }),
    [],
  );
  const cyanMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2aa9b8",
        roughness: 0.76,
        metalness: 0.0,
        envMapIntensity: 0.18,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const geometries: Record<TrackModel, THREE.BufferGeometry> = {
    straight,
    curve45,
  };
  const towerGeometries: Record<TowerModel, THREE.BufferGeometry> = {
    base: towerBase,
    section150: towerSection150,
    section100: towerSection100,
    section50: towerSection50,
    top: towerTop,
  };

  return (
    <group
      position={[TRACK_CENTER_OFFSET[0], 0, TRACK_CENTER_OFFSET[1]]}
      rotation={[0, -Math.PI / 4, 0]}
      scale={[1, 1, -1]}
    >
      {SUPPORTS.map((support) => (
        <TowerStack
          key={support.section}
          {...support}
          geometries={towerGeometries}
          material={towerMaterial}
        />
      ))}
      <CyanPlate
        material={cyanMaterial}
        point={MIDDLE_PLATE_POINT}
        yaw={MIDDLE_PLATE_YAW}
      />
      <CyanCup material={cyanMaterial} point={CUP_POINT} />
      <group matrix={TRACK_SLOPE_MATRIX} matrixAutoUpdate={false}>
        {PIECES.map((piece, index) => (
          <TrackPieceMesh
            key={`${piece.model}-${index}`}
            {...piece}
            geometry={geometries[piece.model]}
            material={material}
          />
        ))}
      </group>
    </group>
  );
}
