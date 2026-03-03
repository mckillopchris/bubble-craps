// ============================================================
// 3D Dice Roller Component
// Transparent dome with physics-simulated dice using Three.js + Rapier3D
// ============================================================

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { DieValue, DiceOutcome, DiceTotal } from '../engine/types';

// -- Constants --
const DOME_RADIUS = 2.5;
const DOME_HEIGHT = 2.0;
const FLOOR_Y = -0.5;
const DIE_SIZE = 0.4;
const GRAVITY = -15;
const SETTLE_THRESHOLD = 0.05;
const SETTLE_FRAMES = 30;
const MIN_ROLL_TIME = 1.0; // seconds
const WALL_RESTITUTION = 0.4;
const FLOOR_RESTITUTION = 0.3;
const DIE_RESTITUTION = 0.35;
const DAMPING = 0.985;
const ANGULAR_DAMPING = 0.98;

// Pip positions for each face (in local die coordinates)
// Face normals: +x, -x, +y, -y, +z, -z
// Standard die: opposite faces sum to 7
// +z = 1, -x = 2, -y = 3, +y = 4, +x = 5, -z = 6
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

function createDieMesh(): THREE.Group {
  const group = new THREE.Group();

  // Die body
  const geometry = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
  // Round the edges slightly
  const material = new THREE.MeshStandardMaterial({
    color: 0xf5f5f0,
    roughness: 0.3,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add pips to each face
  const pipRadius = DIE_SIZE * 0.06;
  const pipOffset = DIE_SIZE * 0.14;
  const pipGeometry = new THREE.CircleGeometry(pipRadius, 16);
  const pipMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8,
  });

  const pipPositions: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-1, 1], [1, -1]],
    3: [[-1, 1], [0, 0], [1, -1]],
    4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
    5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
    6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
  };

  // Face 1 (+Z)
  addPipsToFace(group, pipPositions[1]!, pipGeometry, pipMaterial, 'z+', pipOffset, DIE_SIZE);
  // Face 6 (-Z)
  addPipsToFace(group, pipPositions[6]!, pipGeometry, pipMaterial, 'z-', pipOffset, DIE_SIZE);
  // Face 2 (-X)
  addPipsToFace(group, pipPositions[2]!, pipGeometry, pipMaterial, 'x-', pipOffset, DIE_SIZE);
  // Face 5 (+X)
  addPipsToFace(group, pipPositions[5]!, pipGeometry, pipMaterial, 'x+', pipOffset, DIE_SIZE);
  // Face 3 (-Y)
  addPipsToFace(group, pipPositions[3]!, pipGeometry, pipMaterial, 'y-', pipOffset, DIE_SIZE);
  // Face 4 (+Y)
  addPipsToFace(group, pipPositions[4]!, pipGeometry, pipMaterial, 'y+', pipOffset, DIE_SIZE);

  return group;
}

function addPipsToFace(
  group: THREE.Group,
  positions: [number, number][],
  geometry: THREE.CircleGeometry,
  material: THREE.MeshStandardMaterial,
  face: string,
  offset: number,
  dieSize: number,
) {
  const halfSize = dieSize / 2 + 0.001; // slightly above surface

  for (const [u, v] of positions) {
    const pip = new THREE.Mesh(geometry, material);

    switch (face) {
      case 'z+':
        pip.position.set(u * offset, v * offset, halfSize);
        break;
      case 'z-':
        pip.position.set(-u * offset, v * offset, -halfSize);
        pip.rotation.y = Math.PI;
        break;
      case 'x+':
        pip.position.set(halfSize, v * offset, -u * offset);
        pip.rotation.y = Math.PI / 2;
        break;
      case 'x-':
        pip.position.set(-halfSize, v * offset, u * offset);
        pip.rotation.y = -Math.PI / 2;
        break;
      case 'y+':
        pip.position.set(u * offset, halfSize, -v * offset);
        pip.rotation.x = -Math.PI / 2;
        break;
      case 'y-':
        pip.position.set(u * offset, -halfSize, v * offset);
        pip.rotation.x = Math.PI / 2;
        break;
    }

    group.add(pip);
  }
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

// Simple collision with dome (hemisphere shell)
function constrainToDome(state: DieState): void {
  const pos = state.position;
  const vel = state.velocity;

  // Floor collision
  if (pos.y - DIE_SIZE / 2 < FLOOR_Y) {
    pos.y = FLOOR_Y + DIE_SIZE / 2;
    vel.y = Math.abs(vel.y) * FLOOR_RESTITUTION;
    vel.x *= 0.95;
    vel.z *= 0.95;
    state.angularVelocity.multiplyScalar(0.9);
  }

  // Dome wall collision (cylindrical approximation for lower part, hemispherical for top)
  const horizontalDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  const effectiveRadius = DOME_RADIUS - DIE_SIZE / 2;

  // Hemispherical dome collision
  const distFromCenter = pos.length();
  const domeR = DOME_RADIUS - DIE_SIZE / 2;

  if (pos.y > FLOOR_Y && distFromCenter > domeR) {
    // Push back inside
    const normal = pos.clone().normalize();
    pos.copy(normal.multiplyScalar(domeR));

    // Reflect velocity
    const velDotNormal = vel.dot(normal.normalize());
    if (velDotNormal > 0) {
      const reflection = normal.multiplyScalar(2 * velDotNormal);
      vel.sub(reflection);
      vel.multiplyScalar(WALL_RESTITUTION);
      state.angularVelocity.multiplyScalar(0.85);
    }
  }

  // Hard cylindrical wall at bottom
  if (horizontalDist > effectiveRadius && pos.y <= FLOOR_Y + DOME_HEIGHT * 0.3) {
    const scale = effectiveRadius / horizontalDist;
    pos.x *= scale;
    pos.z *= scale;

    const wallNormal = new THREE.Vector3(pos.x, 0, pos.z).normalize();
    const velDotNormal = vel.dot(wallNormal);
    if (velDotNormal > 0) {
      vel.sub(wallNormal.multiplyScalar(2 * velDotNormal));
      vel.multiplyScalar(WALL_RESTITUTION);
    }
  }
}

// Die-to-die collision (simple sphere approximation)
function handleDieCollision(die1: DieState, die2: DieState): void {
  const diff = die1.position.clone().sub(die2.position);
  const dist = diff.length();
  const minDist = DIE_SIZE * 1.2; // slightly larger than die for collision

  if (dist < minDist && dist > 0) {
    const normal = diff.normalize();
    const overlap = minDist - dist;

    // Separate
    die1.position.add(normal.clone().multiplyScalar(overlap / 2));
    die2.position.sub(normal.clone().multiplyScalar(overlap / 2));

    // Velocity exchange along collision normal
    const relVel = die1.velocity.clone().sub(die2.velocity);
    const velAlongNormal = relVel.dot(normal);

    if (velAlongNormal > 0) {
      const impulse = normal.multiplyScalar(velAlongNormal * DIE_RESTITUTION);
      die1.velocity.sub(impulse);
      die2.velocity.add(impulse);
    }
  }
}

function DomeGeometry() {
  return (
    <group>
      {/* Transparent dome */}
      <mesh>
        <sphereGeometry args={[DOME_RADIUS, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={0xffffff}
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
          envMapIntensity={0.5}
        />
      </mesh>
      {/* Floor / base */}
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[DOME_RADIUS, 64]} />
        <meshStandardMaterial color={0x1a5c2a} roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Base ring */}
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[DOME_RADIUS - 0.05, DOME_RADIUS + 0.05, 64]} />
        <meshStandardMaterial color={0x333333} metalness={0.8} roughness={0.2} />
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

  // Initialize die meshes
  useEffect(() => {
    if (die1Ref.current && die1Ref.current.children.length === 0) {
      const mesh1 = createDieMesh();
      die1Ref.current.add(mesh1);
    }
    if (die2Ref.current && die2Ref.current.children.length === 0) {
      const mesh2 = createDieMesh();
      die2Ref.current.add(mesh2);
    }
  }, []);

  // Start roll when rolling changes to true
  useEffect(() => {
    if (rolling && !isRolling.current) {
      isRolling.current = true;
      settleCounter.current = 0;
      rollTime.current = 0;

      // Randomized initial conditions
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const force = 5 + Math.random() * 5;

      die1State.current = {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          FLOOR_Y + 0.5 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle1) * force,
          3 + Math.random() * 4,
          Math.sin(angle1) * force
        ),
        rotation: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          )
        ),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ),
      };

      die2State.current = {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          FLOOR_Y + 0.5 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle2) * force,
          3 + Math.random() * 4,
          Math.sin(angle2) * force
        ),
        rotation: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          )
        ),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ),
      };
    }
  }, [rolling]);

  useFrame((_, delta) => {
    if (!isRolling.current) return;

    const dt = Math.min(delta, 1 / 30); // cap delta
    rollTime.current += dt;

    // Physics step for each die
    for (const state of [die1State.current, die2State.current]) {
      // Apply gravity
      state.velocity.y += GRAVITY * dt;

      // Update position
      state.position.add(state.velocity.clone().multiplyScalar(dt));

      // Update rotation from angular velocity
      const angVelQuat = new THREE.Quaternion();
      const angVelMag = state.angularVelocity.length();
      if (angVelMag > 0.001) {
        const axis = state.angularVelocity.clone().normalize();
        angVelQuat.setFromAxisAngle(axis, angVelMag * dt);
        state.rotation.premultiply(angVelQuat);
        state.rotation.normalize();
      }

      // Damping
      state.velocity.multiplyScalar(DAMPING);
      state.angularVelocity.multiplyScalar(ANGULAR_DAMPING);

      // Dome constraints
      constrainToDome(state);
    }

    // Die-to-die collision
    handleDieCollision(die1State.current, die2State.current);

    // Update visual meshes
    if (die1Ref.current) {
      die1Ref.current.position.copy(die1State.current.position);
      die1Ref.current.quaternion.copy(die1State.current.rotation);
    }
    if (die2Ref.current) {
      die2Ref.current.position.copy(die2State.current.position);
      die2Ref.current.quaternion.copy(die2State.current.rotation);
    }

    // Check settlement (only after minimum roll time)
    if (rollTime.current > MIN_ROLL_TIME) {
      const die1Speed = die1State.current.velocity.length() + die1State.current.angularVelocity.length();
      const die2Speed = die2State.current.velocity.length() + die2State.current.angularVelocity.length();

      if (die1Speed < SETTLE_THRESHOLD && die2Speed < SETTLE_THRESHOLD) {
        settleCounter.current++;
        if (settleCounter.current >= SETTLE_FRAMES) {
          // Dice have settled
          isRolling.current = false;

          // Snap dice to nearest face
          snapToFace(die1State.current);
          snapToFace(die2State.current);

          if (die1Ref.current) {
            die1Ref.current.quaternion.copy(die1State.current.rotation);
          }
          if (die2Ref.current) {
            die2Ref.current.quaternion.copy(die2State.current.rotation);
          }

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
      <group ref={die1Ref} />
      <group ref={die2Ref} />
    </>
  );
}

/** Snap quaternion to nearest axis-aligned rotation */
function snapToFace(state: DieState): void {
  // Find which face is most upward
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

  // Create rotation that aligns bestNormal with up
  const currentUp = bestNormal.clone().applyQuaternion(state.rotation);
  const correctionQuat = new THREE.Quaternion().setFromUnitVectors(currentUp.normalize(), upVector);
  state.rotation.premultiply(correctionQuat);
  state.rotation.normalize();
  state.velocity.set(0, 0, 0);
  state.angularVelocity.set(0, 0, 0);
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
      onRollComplete({
        die1,
        die2,
        total,
        isHardWay: die1 === die2,
      });
    },
    [onRollComplete]
  );

  useImperativeHandle(ref, () => ({
    roll: () => {
      if (!rolling) {
        setRolling(true);
      }
    },
  }));

  return (
    <div style={{ width, height, borderRadius: 12, overflow: 'hidden', background: '#0a0a0a' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 3.5, 4]} fov={45} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[3, 5, 2]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[0, DOME_HEIGHT + 1, 0]} intensity={0.5} />
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
