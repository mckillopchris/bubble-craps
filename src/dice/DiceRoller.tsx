// ============================================================
// 3D Dice Roller Component
// Transparent dome with physics-simulated dice using Three.js
// ============================================================

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { DieValue, DiceOutcome, DiceTotal } from '../engine/types';

// -- Constants --
const DOME_RADIUS = 2.0;
const FLOOR_Y = 0;
const DIE_SIZE = 0.4;
const GRAVITY = -15;
const SETTLE_THRESHOLD = 0.05;
const SETTLE_FRAMES = 30;
const MIN_ROLL_TIME = 1.0;
const WALL_RESTITUTION = 0.4;
const FLOOR_RESTITUTION = 0.3;
const DIE_RESTITUTION = 0.35;
const DAMPING = 0.985;
const ANGULAR_DAMPING = 0.98;

// Face normals and their values (standard die: opposite faces sum to 7)
const FACE_VALUES: [THREE.Vector3, DieValue][] = [
  [new THREE.Vector3(0, 0, 1), 1],
  [new THREE.Vector3(-1, 0, 0), 2],
  [new THREE.Vector3(0, -1, 0), 3],
  [new THREE.Vector3(0, 1, 0), 4],
  [new THREE.Vector3(1, 0, 0), 5],
  [new THREE.Vector3(0, 0, -1), 6],
];

interface DieState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Quaternion;
  angularVelocity: THREE.Vector3;
}

function detectFaceUp(quaternion: THREE.Quaternion): DieValue {
  let maxDot = -Infinity;
  let result: DieValue = 1;
  const upVector = new THREE.Vector3(0, 1, 0);
  for (const [faceNormal, value] of FACE_VALUES) {
    const worldNormal = faceNormal.clone().applyQuaternion(quaternion);
    const dot = worldNormal.dot(upVector);
    if (dot > maxDot) {
      maxDot = dot;
      result = value;
    }
  }
  return result;
}

function constrainToDome(state: DieState): void {
  const pos = state.position;
  const vel = state.velocity;
  const halfDie = DIE_SIZE / 2;

  // Floor collision
  if (pos.y - halfDie < FLOOR_Y) {
    pos.y = FLOOR_Y + halfDie;
    vel.y = Math.abs(vel.y) * FLOOR_RESTITUTION;
    vel.x *= 0.95;
    vel.z *= 0.95;
    state.angularVelocity.multiplyScalar(0.9);
  }

  // Dome hemisphere collision
  const domeR = DOME_RADIUS - halfDie;
  const distFromCenter = pos.length();

  if (pos.y > FLOOR_Y && distFromCenter > domeR) {
    const normal = pos.clone().normalize();
    pos.copy(normal.clone().multiplyScalar(domeR));
    const velDotNormal = vel.dot(normal);
    if (velDotNormal > 0) {
      vel.sub(normal.clone().multiplyScalar(2 * velDotNormal));
      vel.multiplyScalar(WALL_RESTITUTION);
      state.angularVelocity.multiplyScalar(0.85);
    }
  }

  // Cylindrical wall at floor level
  const horizontalDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  const wallR = DOME_RADIUS - halfDie;
  if (horizontalDist > wallR) {
    const scale = wallR / horizontalDist;
    pos.x *= scale;
    pos.z *= scale;
    const wallNormal = new THREE.Vector3(pos.x, 0, pos.z).normalize();
    const vdn = vel.dot(wallNormal);
    if (vdn > 0) {
      vel.sub(wallNormal.multiplyScalar(2 * vdn));
      vel.multiplyScalar(WALL_RESTITUTION);
    }
  }
}

function handleDieCollision(die1: DieState, die2: DieState): void {
  const diff = die1.position.clone().sub(die2.position);
  const dist = diff.length();
  const minDist = DIE_SIZE * 1.2;
  if (dist < minDist && dist > 0) {
    const normal = diff.normalize();
    const overlap = minDist - dist;
    die1.position.add(normal.clone().multiplyScalar(overlap / 2));
    die2.position.sub(normal.clone().multiplyScalar(overlap / 2));
    const relVel = die1.velocity.clone().sub(die2.velocity);
    const velAlongNormal = relVel.dot(normal);
    if (velAlongNormal > 0) {
      const impulse = normal.multiplyScalar(velAlongNormal * DIE_RESTITUTION);
      die1.velocity.sub(impulse);
      die2.velocity.add(impulse);
    }
  }
}

function snapToFace(state: DieState): void {
  const upVector = new THREE.Vector3(0, 1, 0);
  let maxDot = -Infinity;
  let bestNormal = FACE_VALUES[0]![0];
  for (const [faceNormal] of FACE_VALUES) {
    const worldNormal = faceNormal.clone().applyQuaternion(state.rotation);
    const dot = worldNormal.dot(upVector);
    if (dot > maxDot) {
      maxDot = dot;
      bestNormal = faceNormal;
    }
  }
  const currentUp = bestNormal.clone().applyQuaternion(state.rotation);
  const correctionQuat = new THREE.Quaternion().setFromUnitVectors(currentUp.normalize(), upVector);
  state.rotation.premultiply(correctionQuat);
  state.rotation.normalize();
  state.velocity.set(0, 0, 0);
  state.angularVelocity.set(0, 0, 0);
}

// Pip layout positions for each face value
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
};

/** Declarative single pip */
function Pip({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <circleGeometry args={[DIE_SIZE * 0.065, 16]} />
      <meshStandardMaterial color="#111111" roughness={0.8} />
    </mesh>
  );
}

/** Declarative die face with pips */
function DieFace({ face, value }: { face: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-'; value: number }) {
  const pips = PIP_LAYOUTS[value] ?? [];
  const offset = DIE_SIZE * 0.15;
  const halfSize = DIE_SIZE / 2 + 0.002;

  return (
    <>
      {pips.map(([u, v], i) => {
        let pos: [number, number, number];
        let rot: [number, number, number] = [0, 0, 0];
        switch (face) {
          case 'z+': pos = [u * offset, v * offset, halfSize]; break;
          case 'z-': pos = [-u * offset, v * offset, -halfSize]; rot = [0, Math.PI, 0]; break;
          case 'x+': pos = [halfSize, v * offset, -u * offset]; rot = [0, Math.PI / 2, 0]; break;
          case 'x-': pos = [-halfSize, v * offset, u * offset]; rot = [0, -Math.PI / 2, 0]; break;
          case 'y+': pos = [u * offset, halfSize, -v * offset]; rot = [-Math.PI / 2, 0, 0]; break;
          case 'y-': pos = [u * offset, -halfSize, v * offset]; rot = [Math.PI / 2, 0, 0]; break;
        }
        return <Pip key={i} position={pos} rotation={rot} />;
      })}
    </>
  );
}

/** Declarative die mesh (box + pips on all faces) */
function DieMesh() {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[DIE_SIZE, DIE_SIZE, DIE_SIZE]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.3} metalness={0.0} />
      </mesh>
      <DieFace face="z+" value={1} />
      <DieFace face="z-" value={6} />
      <DieFace face="x-" value={2} />
      <DieFace face="x+" value={5} />
      <DieFace face="y-" value={3} />
      <DieFace face="y+" value={4} />
    </group>
  );
}

function DomeGeometry() {
  return (
    <group>
      {/* Transparent dome */}
      <mesh>
        <sphereGeometry args={[DOME_RADIUS, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={0xeeeeff}
          transparent
          opacity={0.12}
          roughness={0.05}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Floor / base */}
      <mesh position={[0, FLOOR_Y - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[DOME_RADIUS, 64]} />
        <meshStandardMaterial color={0x1a6b2e} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Base ring */}
      <mesh position={[0, FLOOR_Y - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[DOME_RADIUS - 0.05, DOME_RADIUS + 0.08, 64]} />
        <meshStandardMaterial color={0x444444} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

interface DiceSimulationProps {
  onRollComplete: (die1: DieValue, die2: DieValue) => void;
  rolling: boolean;
  onRollingChange: (rolling: boolean) => void;
}

function DiceSimulation({ onRollComplete, rolling, onRollingChange }: DiceSimulationProps) {
  const die1Ref = useRef<THREE.Group>(null);
  const die2Ref = useRef<THREE.Group>(null);
  const die1State = useRef<DieState>({
    position: new THREE.Vector3(-0.3, FLOOR_Y + DIE_SIZE / 2, 0),
    velocity: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    angularVelocity: new THREE.Vector3(),
  });
  const die2State = useRef<DieState>({
    position: new THREE.Vector3(0.3, FLOOR_Y + DIE_SIZE / 2, 0),
    velocity: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    angularVelocity: new THREE.Vector3(),
  });
  const settleCounter = useRef(0);
  const rollTime = useRef(0);
  const isRolling = useRef(false);

  // Start roll
  useEffect(() => {
    if (rolling && !isRolling.current) {
      isRolling.current = true;
      settleCounter.current = 0;
      rollTime.current = 0;

      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const force = 4 + Math.random() * 4;

      die1State.current = {
        position: new THREE.Vector3((Math.random() - 0.5) * 0.4, FLOOR_Y + 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4),
        velocity: new THREE.Vector3(Math.cos(angle1) * force, 3 + Math.random() * 3, Math.sin(angle1) * force),
        rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)),
        angularVelocity: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
      };

      die2State.current = {
        position: new THREE.Vector3((Math.random() - 0.5) * 0.4, FLOOR_Y + 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4),
        velocity: new THREE.Vector3(Math.cos(angle2) * force, 3 + Math.random() * 3, Math.sin(angle2) * force),
        rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)),
        angularVelocity: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
      };
    }
  }, [rolling]);

  useFrame((_, delta) => {
    // Always sync visual position with state (even when not rolling)
    if (die1Ref.current) {
      die1Ref.current.position.copy(die1State.current.position);
      die1Ref.current.quaternion.copy(die1State.current.rotation);
    }
    if (die2Ref.current) {
      die2Ref.current.position.copy(die2State.current.position);
      die2Ref.current.quaternion.copy(die2State.current.rotation);
    }

    if (!isRolling.current) return;

    const dt = Math.min(delta, 1 / 30);
    rollTime.current += dt;

    for (const state of [die1State.current, die2State.current]) {
      state.velocity.y += GRAVITY * dt;
      state.position.add(state.velocity.clone().multiplyScalar(dt));
      const angVelMag = state.angularVelocity.length();
      if (angVelMag > 0.001) {
        const axis = state.angularVelocity.clone().normalize();
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angVelMag * dt);
        state.rotation.premultiply(q);
        state.rotation.normalize();
      }
      state.velocity.multiplyScalar(DAMPING);
      state.angularVelocity.multiplyScalar(ANGULAR_DAMPING);
      constrainToDome(state);
    }

    handleDieCollision(die1State.current, die2State.current);

    if (rollTime.current > MIN_ROLL_TIME) {
      const die1Speed = die1State.current.velocity.length() + die1State.current.angularVelocity.length();
      const die2Speed = die2State.current.velocity.length() + die2State.current.angularVelocity.length();

      if (die1Speed < SETTLE_THRESHOLD && die2Speed < SETTLE_THRESHOLD) {
        settleCounter.current++;
        if (settleCounter.current >= SETTLE_FRAMES) {
          isRolling.current = false;
          snapToFace(die1State.current);
          snapToFace(die2State.current);
          const face1 = detectFaceUp(die1State.current.rotation);
          const face2 = detectFaceUp(die2State.current.rotation);
          onRollingChange(false);
          onRollComplete(face1, face2);
        }
      } else {
        settleCounter.current = 0;
      }
    }
  });

  return (
    <>
      <group ref={die1Ref}>
        <DieMesh />
      </group>
      <group ref={die2Ref}>
        <DieMesh />
      </group>
    </>
  );
}

export interface DiceRollerRef {
  roll: () => void;
}

interface DiceRollerProps {
  onRollComplete: (outcome: DiceOutcome) => void;
  width?: number;
  height?: number;
}

const DiceRollerInner = forwardRef<DiceRollerRef, DiceRollerProps>(function DiceRollerInner(
  { onRollComplete, width = 400, height = 350 },
  ref
) {
  const [rolling, setRolling] = useState(false);

  const handleRollComplete = useCallback(
    (die1: DieValue, die2: DieValue) => {
      const total = (die1 + die2) as DiceTotal;
      onRollComplete({ die1, die2, total, isHardWay: die1 === die2 });
    },
    [onRollComplete]
  );

  useImperativeHandle(ref, () => ({
    roll: () => { if (!rolling) setRolling(true); },
  }));

  return (
    <div style={{ width, height, borderRadius: 12, overflow: 'hidden', background: '#0a0a0a' }}>
      <Canvas shadows>
        <PerspectiveCamera
          makeDefault
          position={[0, 2.8, 2.2]}
          fov={50}
          onUpdate={(self) => self.lookAt(0, 0.3, 0)}
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 2]} intensity={1.5} castShadow />
        <pointLight position={[0, 3, 0]} intensity={0.8} />
        <DomeGeometry />
        <DiceSimulation
          onRollComplete={handleRollComplete}
          rolling={rolling}
          onRollingChange={setRolling}
        />
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
});

export default DiceRollerInner;
