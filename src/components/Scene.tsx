import Table, { TABLE } from "./Table";
import SO101Arm from "./SO101Arm";
import TabletopTrack from "./TabletopTrack";

// Robots sit on the two long edges of the table, axis-aligned to the table:
// each robot faces straight across the table's width (perpendicular to its
// own edge). Along the length (X), they are offset from the −X end:
//   robot A: 40 cm from the end
//   robot B: 80 cm from the same end
const EDGE_INSET = 0.015; // 1.5 cm: align the bases close to the table edges
const EDGE_Z = TABLE.WIDTH / 2 - EDGE_INSET;
const NEAR_END_X = -TABLE.LENGTH / 2;
const ROBOT_A_X = NEAR_END_X + 0.4;
const ROBOT_B_X = NEAR_END_X + 0.8;
const ARM_Y = TABLE.HEIGHT;

// yaw=0 → forward +X; yaw=−π/2 → forward +Z; yaw=+π/2 → forward −Z.
const FACE_PLUS_Z = -Math.PI / 2;
const FACE_MINUS_Z = +Math.PI / 2;

export default function Scene() {
  return (
    <>
      <Table />
      <TabletopTrack />
      <SO101Arm position={[ROBOT_A_X, ARM_Y, -EDGE_Z]} yaw={FACE_PLUS_Z} />
      <SO101Arm position={[ROBOT_B_X, ARM_Y, +EDGE_Z]} yaw={FACE_MINUS_Z} />
    </>
  );
}
