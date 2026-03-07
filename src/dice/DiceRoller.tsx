// ============================================================
// 3D Dice Roller Component
// Rapier3D physics + impact ripple/dust effects
// RoundedBox dice with recessed pips, dramatic lighting, SMAA
// ============================================================

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, RoundedBox } from '@react-three/drei';
import { EffectComposer, Vignette, SMAA } from '@react-three/postprocessing';
import { Physics, RigidBody, CuboidCollider, RoundCuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import type { DieValue, DiceOutcome, DiceTotal } from '../engine/types';

// Preload Rapier WASM so it's ready when Physics mounts
import('@dimforge/rapier3d-compat').then(r => r.init()).catch(() => {});

// Simplex noise generator for organic floor vibration modulation
const noise3D = createNoise3D();

// Floor oscillation constants — derived from physics math (see plan)
// Peak velocity = AMPLITUDE × FREQ × 2π ≈ 0.028 × 8 × 6.28 ≈ 1.41 m/s
// With restitution 0.5, max hop ≈ 0.15 units (~25% die size)
const FLOOR_AMPLITUDE = 0.028;       // max floor displacement (units)
const FREQ_PRIMARY = 8;              // Hz — main bounce frequency
const FREQ_SECONDARY = 13;           // Hz — harmonic for organic feel
const FLOOR_NOISE_SCALE = 0.4;       // simplex noise modulation amplitude

/** Returns the floor Y offset at time t — multi-frequency oscillation + noise */
function floorY(t: number): number {
  const primary = Math.sin(t * FREQ_PRIMARY * 2 * Math.PI) * FLOOR_AMPLITUDE;
  const secondary = Math.sin(t * FREQ_SECONDARY * 2 * Math.PI) * FLOOR_AMPLITUDE * 0.4;
  const noiseModulation = noise3D(0, 0, t * 1.5) * FLOOR_NOISE_SCALE * FLOOR_AMPLITUDE;
  return primary + secondary + noiseModulation;
}

// -- Constants --
const DOME_RADIUS = 2.0;
const FLOOR_Y = 0;
const DIE_SIZE = 0.6;
const SETTLE_THRESHOLD = 0.12;
const SETTLE_FRAMES = 20;
const MIN_ROLL_TIME = 0.8;
const MAX_ROLL_TIME = 6.0;  // total wall-clock failsafe (includes jiggle + airborne)
const WALL_RESTITUTION = 0.15;
const PLAY_RADIUS = DOME_RADIUS * 0.50;  // cylindrical wall radius — keeps dice centered
const BUBBLE_RADIUS = PLAY_RADIUS + DIE_SIZE * 0.75;  // visual cylinder — wide enough to contain dice edges
const CYLINDER_HEIGHT = 3.5;              // flat ceiling height — tall like real bubble craps

// Pip geometry constants
const PIP_RADIUS = DIE_SIZE * 0.075;
const PIP_DEPTH = 0.024;
const PIP_OFFSET = DIE_SIZE * 0.15;

// Bubble craps roll phases — patent-informed: POP first, then JIGGLE
// Real machine: sharp VCM pop launches dice, they fall back, then floor vibrates ~3s
const JIGGLE_DURATION = 3.0;         // rumble duration — matches real machine (~3s)
const JIGGLE_MAX_SPEED = 4.0;        // total velocity safety clamp during jiggle
const JIGGLE_MAX_ANGULAR = 8.0;      // angular velocity clamp during jiggle
// Pop physics: v = sqrt(2*g*h), g=15
// Soft pop: v≈4.0 → h≈0.53 units.  Hard pop: v≈7.2 → h≈1.73 units.
const POP_VELOCITY_MIN = 4.0;      // softest pop → ~0.5 units high
const POP_VELOCITY_RANGE = 3.2;    // random range (4.0-7.2 → 0.5-1.75 units high)
const POP_ANGULAR = 18;            // angular velocity on pop — tumble in the air
const POP_SPREAD = 1.5;            // horizontal spread so dice separate during pop
const POP_LAND_Y = DIE_SIZE * 1.5; // dice considered "landed" when below this height
const POP_LAND_SPEED = 2.0;        // and total speed below this
const POP_MAX_TIME = 2.5;          // failsafe — force transition to jiggle after this

// Camera animation phases & positions
type CameraPhase = 'idle' | 'dramatic' | 'airborne' | 'settling' | 'topdown' | 'shrinking';

const CAMERA_POSITIONS: Record<CameraPhase, [number, number, number]> = {
  idle:      [0, 5.0, 1.0],
  dramatic:  [2.0, 3.0, 3.0],
  airborne:  [1.5, 4.0, 2.5],
  settling:  [0, 4.0, 0.8],
  topdown:   [0, 5.0, 0.3],
  shrinking: [0, 5.0, 1.0],
};

const CAMERA_LOOK_AT: Record<CameraPhase, [number, number, number]> = {
  idle:      [0, 0, 0.1],
  dramatic:  [0, 1.5, 0],
  airborne:  [0, 1.8, 0],
  settling:  [0, 0.2, 0],
  topdown:   [0, 0, 0],
  shrinking: [0, 0, 0.1],
};

const CAMERA_LERP_SPEED: Record<CameraPhase, number> = {
  idle: 3.0, dramatic: 4.0, airborne: 5.0, settling: 3.5, topdown: 5.0, shrinking: 3.0,
};

const TOPDOWN_HOLD_DURATION = 1.5;
const PRE_SETTLE_SPEED_THRESHOLD = 1.5;

// Effect constants
const IMPACT_VEL_THRESHOLD = 2.0;
const MAX_RIPPLES = 4;
const RIPPLE_DURATION = 0.35;
const MAX_DUST = 20;
const DUST_LIFE = 0.4;

// Face normals and their values (standard die: opposite faces sum to 7)
const FACE_VALUES: [THREE.Vector3, DieValue][] = [
  [new THREE.Vector3(0, 0, 1), 1],
  [new THREE.Vector3(-1, 0, 0), 2],
  [new THREE.Vector3(0, -1, 0), 3],
  [new THREE.Vector3(0, 1, 0), 4],
  [new THREE.Vector3(1, 0, 0), 5],
  [new THREE.Vector3(0, 0, -1), 6],
];

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

function snapRotation(rb: RapierRigidBody): void {
  const rot = rb.rotation();
  const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
  const upVector = new THREE.Vector3(0, 1, 0);
  let maxDot = -Infinity;
  let bestNormal = FACE_VALUES[0]![0];
  for (const [faceNormal] of FACE_VALUES) {
    const worldNormal = faceNormal.clone().applyQuaternion(q);
    const dot = worldNormal.dot(upVector);
    if (dot > maxDot) {
      maxDot = dot;
      bestNormal = faceNormal;
    }
  }
  const currentUp = bestNormal.clone().applyQuaternion(q);
  const correctionQuat = new THREE.Quaternion().setFromUnitVectors(currentUp.normalize(), upVector);
  q.premultiply(correctionQuat);
  q.normalize();
  rb.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
  rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
  rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
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

/** Recessed pip — cylinder sunken into the die face */
function Pip({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[PIP_RADIUS, PIP_RADIUS * 1.1, PIP_DEPTH, 16]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.9} metalness={0.0} />
    </mesh>
  );
}

/** Declarative die face with recessed pips */
function DieFace({ face, value }: { face: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-'; value: number }) {
  const pips = PIP_LAYOUTS[value] ?? [];
  const halfSize = DIE_SIZE / 2 - PIP_DEPTH / 2 + 0.001;

  return (
    <>
      {pips.map(([u, v], i) => {
        let pos: [number, number, number];
        let rot: [number, number, number] = [Math.PI / 2, 0, 0];
        switch (face) {
          case 'z+': pos = [u * PIP_OFFSET, v * PIP_OFFSET, halfSize]; rot = [Math.PI / 2, 0, 0]; break;
          case 'z-': pos = [-u * PIP_OFFSET, v * PIP_OFFSET, -halfSize]; rot = [-Math.PI / 2, 0, 0]; break;
          case 'x+': pos = [halfSize, v * PIP_OFFSET, -u * PIP_OFFSET]; rot = [0, 0, -Math.PI / 2]; break;
          case 'x-': pos = [-halfSize, v * PIP_OFFSET, u * PIP_OFFSET]; rot = [0, 0, Math.PI / 2]; break;
          case 'y+': pos = [u * PIP_OFFSET, halfSize, -v * PIP_OFFSET]; rot = [0, 0, 0]; break;
          case 'y-': pos = [u * PIP_OFFSET, -halfSize, v * PIP_OFFSET]; rot = [Math.PI, 0, 0]; break;
        }
        return <Pip key={i} position={pos} rotation={rot} />;
      })}
    </>
  );
}

/** Die mesh: RoundedBox with recessed pips on all faces */
function DieMesh() {
  return (
    <group>
      <RoundedBox
        args={[DIE_SIZE, DIE_SIZE, DIE_SIZE]}
        radius={0.08}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#f8f8f2"
          roughness={0.15}
          metalness={0.0}
          clearcoat={0.3}
          clearcoatRoughness={0.2}
        />
      </RoundedBox>
      <DieFace face="z+" value={1} />
      <DieFace face="z-" value={6} />
      <DieFace face="x-" value={2} />
      <DieFace face="x+" value={5} />
      <DieFace face="y-" value={3} />
      <DieFace face="y+" value={4} />
    </group>
  );
}

/** Visual-only scene geometry (floor + glass bubble enclosure) */
function SceneGeometry() {
  return (
    <group>
      {/* Green felt floor — sized to match cylinder base */}
      <mesh position={[0, FLOOR_Y - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[BUBBLE_RADIUS + 0.05, 64]} />
        <meshStandardMaterial color={0x1a6b2e} roughness={0.85} metalness={0.0} />
      </mesh>

      {/* Bubble enclosure — cylinder wall (open-ended tube) */}
      <mesh position={[0, CYLINDER_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[BUBBLE_RADIUS, BUBBLE_RADIUS, CYLINDER_HEIGHT, 64, 1, true]} />
        <meshPhysicalMaterial
          color="#a8d8ea"
          opacity={0.12}
          roughness={0.1}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          envMapIntensity={1.2}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bubble enclosure — top cap */}
      <mesh position={[0, CYLINDER_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BUBBLE_RADIUS, 64]} />
        <meshPhysicalMaterial
          color="#a8d8ea"
          opacity={0.06}
          roughness={0.1}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          envMapIntensity={0.8}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ============================================================
// Effects State (shared between physics scene & effect renderers)
// ============================================================

interface Impact {
  x: number;
  z: number;
  intensity: number;
}

interface EffectsData {
  pendingImpacts: Impact[];
}

function createEffectsData(): EffectsData {
  return {
    pendingImpacts: [],
  };
}

// ============================================================
// Dice Effects (impact ripples, dust, camera shake, sparkles)
// ============================================================

interface RippleState {
  x: number; z: number;
  age: number;
  intensity: number;
  active: boolean;
}

interface DustState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  active: boolean;
}

function DiceEffects({ effectsData }: { effectsData: EffectsData }) {
  // Ripple pool
  const ripples = useRef<RippleState[]>(
    Array.from({ length: MAX_RIPPLES }, () => ({
      x: 0, z: 0, age: 0, intensity: 0, active: false,
    }))
  );
  const nextRipple = useRef(0);
  const rippleMeshes = useRef<(THREE.Mesh | null)[]>([]);

  // Dust particle pool
  const dustPool = useRef<DustState[]>(
    Array.from({ length: MAX_DUST }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      age: 0, maxAge: 0, active: false,
    }))
  );
  const nextDust = useRef(0);
  const dustMeshes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);

    // ---- Process pending impacts ----
    for (const impact of effectsData.pendingImpacts) {
      // Spawn ripple
      const r = ripples.current[nextRipple.current]!;
      r.x = impact.x;
      r.z = impact.z;
      r.age = 0;
      r.intensity = impact.intensity;
      r.active = true;
      nextRipple.current = (nextRipple.current + 1) % MAX_RIPPLES;

      // Spawn dust particles (3-6 per impact depending on intensity)
      const dustCount = Math.floor(3 + impact.intensity * 3);
      for (let j = 0; j < dustCount; j++) {
        const d = dustPool.current[nextDust.current]!;
        d.pos.set(impact.x, 0.02, impact.z);
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.8 + Math.random() * 1.2) * impact.intensity;
        d.vel.set(
          Math.cos(angle) * speed,
          1.0 + Math.random() * 1.5,
          Math.sin(angle) * speed
        );
        d.age = 0;
        d.maxAge = DUST_LIFE * (0.6 + Math.random() * 0.4);
        d.active = true;
        nextDust.current = (nextDust.current + 1) % MAX_DUST;
      }
    }
    effectsData.pendingImpacts.length = 0;

    // ---- Update ripples ----
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const r = ripples.current[i]!;
      const mesh = rippleMeshes.current[i];
      if (!mesh) continue;
      if (r.active) {
        r.age += dt;
        if (r.age >= RIPPLE_DURATION) {
          r.active = false;
          mesh.visible = false;
        } else {
          const t = r.age / RIPPLE_DURATION;
          const scale = 0.15 + t * 0.5 * r.intensity;
          mesh.position.set(r.x, 0.005, r.z);
          mesh.scale.setScalar(scale);
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = (1 - t) * 0.25 * r.intensity;
          mesh.visible = true;
        }
      } else {
        mesh.visible = false;
      }
    }

    // ---- Update dust particles ----
    for (let i = 0; i < MAX_DUST; i++) {
      const d = dustPool.current[i]!;
      const mesh = dustMeshes.current[i];
      if (!mesh) continue;
      if (d.active) {
        d.age += dt;
        if (d.age >= d.maxAge) {
          d.active = false;
          mesh.visible = false;
        } else {
          d.pos.addScaledVector(d.vel, dt);
          d.vel.y -= 5 * dt; // gravity
          const t = 1 - d.age / d.maxAge;
          mesh.position.copy(d.pos);
          mesh.scale.setScalar(0.015 * t);
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = t * 0.5;
          mesh.visible = true;
        }
      } else {
        mesh.visible = false;
      }
    }
  });

  return (
    <group>
      {/* Impact ripples — expanding rings on floor */}
      {Array.from({ length: MAX_RIPPLES }, (_, i) => (
        <mesh
          key={`ripple-${i}`}
          ref={(el) => { rippleMeshes.current[i] = el; }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.7, 1.0, 24]} />
          <meshBasicMaterial color="#c4b48a" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* Dust particles — small spheres that scatter on impact */}
      {Array.from({ length: MAX_DUST }, (_, i) => (
        <mesh
          key={`dust-${i}`}
          ref={(el) => { dustMeshes.current[i] = el; }}
          visible={false}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#d4c4a0" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// Camera Animator — smoothly lerps camera through phases
// ============================================================

function CameraAnimator({ cameraPhase }: { cameraPhase: CameraPhase }) {
  const targetPos = useRef(new THREE.Vector3(...CAMERA_POSITIONS.idle));
  const targetLookAt = useRef(new THREE.Vector3(...CAMERA_LOOK_AT.idle));
  const currentLookAt = useRef(new THREE.Vector3(...CAMERA_LOOK_AT.idle));

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const speed = CAMERA_LERP_SPEED[cameraPhase];
    const alpha = 1 - Math.exp(-speed * dt);

    targetPos.current.set(...CAMERA_POSITIONS[cameraPhase]);
    targetLookAt.current.set(...CAMERA_LOOK_AT[cameraPhase]);

    camera.position.lerp(targetPos.current, alpha);
    currentLookAt.current.lerp(targetLookAt.current, alpha);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

// ============================================================
// Rapier Physics Simulation
// ============================================================

interface DiceSimulationProps {
  rolling: boolean;
  onRollingChange: (rolling: boolean) => void;
  onPendingResult: (die1: DieValue, die2: DieValue) => void;
  onCameraPhaseChange: (phase: CameraPhase) => void;
  effectsData: EffectsData;
}

function DicePhysicsScene({ rolling, onRollingChange, onPendingResult, onCameraPhaseChange, effectsData }: DiceSimulationProps) {
  const die1Ref = useRef<RapierRigidBody>(null);
  const die2Ref = useRef<RapierRigidBody>(null);
  const floorRef = useRef<RapierRigidBody>(null);
  const settleCounter = useRef(0);
  const rollTime = useRef(0);
  const rollStartWallTime = useRef(0);
  const isRolling = useRef(false);
  const rollPhase = useRef<'idle' | 'pop' | 'jiggle' | 'airborne'>('idle');
  const phaseStartTime = useRef(0);
  const prevVelY = useRef([0, 0]);
  const settlingSignaled = useRef(false);

  // Start roll — POP immediately, then jiggle after dice land (real bubble craps order)
  useEffect(() => {
    if (rolling && !isRolling.current && die1Ref.current && die2Ref.current) {
      isRolling.current = true;
      rollPhase.current = 'pop';
      phaseStartTime.current = performance.now();
      settleCounter.current = 0;
      settlingSignaled.current = false;
      rollTime.current = 0;
      rollStartWallTime.current = performance.now();
      prevVelY.current = [0, 0];

      // Random pop strength for this roll — each roll feels different
      const popStrength = POP_VELOCITY_MIN + Math.random() * POP_VELOCITY_RANGE;
      // Scale angular velocity and spread with pop strength for realism
      const strengthRatio = popStrength / (POP_VELOCITY_MIN + POP_VELOCITY_RANGE);

      const refs = [die1Ref.current, die2Ref.current];
      for (let i = 0; i < 2; i++) {
        const rb = refs[i]!;
        rb.setLinearDamping(0.2);
        rb.setAngularDamping(0.15);

        // Sharp upward pop — same strength for both dice (they're on the same platform)
        // but slightly different spread/spin for visual variety
        const spreadX = (Math.random() - 0.5) * POP_SPREAD * strengthRatio;
        const spreadZ = (Math.random() - 0.5) * POP_SPREAD * strengthRatio;
        rb.setLinvel({ x: spreadX, y: popStrength, z: spreadZ }, true);

        // Random angular velocity — scaled with pop strength
        rb.setAngvel({
          x: (Math.random() - 0.5) * POP_ANGULAR * strengthRatio,
          y: (Math.random() - 0.5) * POP_ANGULAR * 0.5 * strengthRatio,
          z: (Math.random() - 0.5) * POP_ANGULAR * strengthRatio,
        }, true);
        rb.wakeUp();
      }
    }
  }, [rolling]);

  // Inline settle helper (avoids useCallback stale-closure issues with useFrame)
  const settleRef = useRef({ onPendingResult, onRollingChange, onCameraPhaseChange });
  settleRef.current = { onPendingResult, onRollingChange, onCameraPhaseChange };

  // Post-step: pop → jiggle → dome constraints → settle detection
  useFrame((_, delta) => {
    if (!die1Ref.current || !die2Ref.current) return;
    if (!isRolling.current) return;

    const refs = [die1Ref.current, die2Ref.current];

    // ── Phase 1: POP — dice are in the air after initial launch ──
    if (rollPhase.current === 'pop') {
      const popElapsed = (performance.now() - phaseStartTime.current) / 1000;

      // Switch camera to airborne to track dice in the air
      if (popElapsed > 0.15) {
        settleRef.current.onCameraPhaseChange('airborne');
      }

      // Dome constraints during pop (walls + ceiling)
      for (let i = 0; i < 2; i++) {
        const rb = refs[i]!;
        const pos = rb.translation();

        // Cylinder boundary — vertical walls
        const hDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (hDist > PLAY_RADIUS) {
          const hScale = PLAY_RADIUS / hDist;
          rb.setTranslation({ x: pos.x * hScale, y: pos.y, z: pos.z * hScale }, true);
          const vel = rb.linvel();
          const nx = pos.x / hDist, nz = pos.z / hDist;
          const vdn = vel.x * nx + vel.z * nz;
          if (vdn > 0) {
            rb.setLinvel({
              x: (vel.x - 2 * vdn * nx) * WALL_RESTITUTION,
              y: vel.y,
              z: (vel.z - 2 * vdn * nz) * WALL_RESTITUTION,
            }, true);
            const av = rb.angvel();
            rb.setAngvel({ x: av.x * 0.5, y: av.y * 0.5, z: av.z * 0.5 }, true);
          }
        }

        // Flat ceiling
        if (pos.y > CYLINDER_HEIGHT) {
          rb.setTranslation({ x: pos.x, y: CYLINDER_HEIGHT, z: pos.z }, true);
          const vel = rb.linvel();
          if (vel.y > 0) {
            rb.setLinvel({ x: vel.x * WALL_RESTITUTION, y: -vel.y * WALL_RESTITUTION, z: vel.z * WALL_RESTITUTION }, true);
            const av = rb.angvel();
            rb.setAngvel({ x: av.x * 0.5, y: av.y * 0.5, z: av.z * 0.5 }, true);
          }
        }
      }

      // Check if dice have landed — both near floor and slowing down, or max time elapsed
      let bothLanded = true;
      for (const rb of refs) {
        const pos = rb.translation();
        const vel = rb.linvel();
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        if (pos.y > POP_LAND_Y || speed > POP_LAND_SPEED) {
          bothLanded = false;
          break;
        }
      }

      if (bothLanded || popElapsed > POP_MAX_TIME) {
        // ── Transition to JIGGLE — start vibrating floor ──
        rollPhase.current = 'jiggle';
        phaseStartTime.current = performance.now();
        settleRef.current.onCameraPhaseChange('dramatic');

        // Switch to jiggle damping
        for (const rb of refs) {
          rb.setLinearDamping(0.5);
          rb.setAngularDamping(0.3);
        }
      }
      return;
    }

    // ── Phase 2: JIGGLE — floor vibrates, dice tumble on surface ──
    if (rollPhase.current === 'jiggle') {
      const jiggleElapsed = (performance.now() - phaseStartTime.current) / 1000;

      if (jiggleElapsed < JIGGLE_DURATION) {
        const t = jiggleElapsed;

        // Oscillate the floor — this is what makes dice bounce (Interblock patent approach)
        if (floorRef.current) {
          const y = floorY(t);
          floorRef.current.setNextKinematicTranslation({ x: 0, y: y - 0.01, z: 0 });
        }

        // Boundary enforcement only — NO forces applied to dice
        for (let i = 0; i < 2; i++) {
          const rb = refs[i]!;
          const pos = rb.translation();

          // Keep dice inside cylinder
          const hDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
          if (hDist > PLAY_RADIUS) {
            const hScale = PLAY_RADIUS / hDist;
            rb.setTranslation({ x: pos.x * hScale, y: pos.y, z: pos.z * hScale }, true);
            const vel = rb.linvel();
            const nx = pos.x / hDist, nz = pos.z / hDist;
            const vdn = vel.x * nx + vel.z * nz;
            if (vdn > 0) {
              rb.setLinvel({
                x: (vel.x - 2 * vdn * nx) * WALL_RESTITUTION,
                y: vel.y,
                z: (vel.z - 2 * vdn * nz) * WALL_RESTITUTION,
              }, true);
            }
          }

          // Safety: cap total velocity
          const vel = rb.linvel();
          const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
          if (speed > JIGGLE_MAX_SPEED) {
            const s = JIGGLE_MAX_SPEED / speed;
            rb.setLinvel({ x: vel.x * s, y: vel.y * s, z: vel.z * s }, true);
          }
          const av = rb.angvel();
          const angSpeed = Math.sqrt(av.x * av.x + av.y * av.y + av.z * av.z);
          if (angSpeed > JIGGLE_MAX_ANGULAR) {
            const s = JIGGLE_MAX_ANGULAR / angSpeed;
            rb.setAngvel({ x: av.x * s, y: av.y * s, z: av.z * s }, true);
          }
        }
        return;
      }

      // ── Jiggle done — reset floor, restore damping, begin settle detection ──
      // Dice stay on the floor and settle naturally — no more launching
      if (floorRef.current) {
        floorRef.current.setNextKinematicTranslation({ x: 0, y: -0.01, z: 0 });
      }
      rollPhase.current = 'airborne'; // reuse airborne phase for settle detection logic
      rollTime.current = 0;
      rollStartWallTime.current = performance.now();
      for (const rb of refs) {
        rb.setLinearDamping(0.2);
        rb.setAngularDamping(0.15);
      }
      // Camera already in 'settling' from pop→jiggle transition — no change needed
      return;
    }

    // ── Phase 2: AIRBORNE — dome constraints + impact detection + settle ──
    for (let i = 0; i < 2; i++) {
      const rb = refs[i]!;
      const pos = rb.translation();

      // Impact detection — floor bounce
      const impactVel = rb.linvel();
      if (prevVelY.current[i]! < -IMPACT_VEL_THRESHOLD && impactVel.y >= 0 && pos.y < DIE_SIZE * 1.5) {
        const intensity = Math.min(1, Math.abs(prevVelY.current[i]!) / 8);
        effectsData.pendingImpacts.push({ x: pos.x, z: pos.z, intensity });
      }
      prevVelY.current[i] = impactVel.y;

      // Cylinder boundary — vertical walls
      const hDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      if (hDist > PLAY_RADIUS) {
        const hScale = PLAY_RADIUS / hDist;
        rb.setTranslation({ x: pos.x * hScale, y: pos.y, z: pos.z * hScale }, true);
        const vel = rb.linvel();
        const nx = pos.x / hDist, nz = pos.z / hDist;
        const vdn = vel.x * nx + vel.z * nz;
        if (vdn > 0) {
          rb.setLinvel({
            x: (vel.x - 2 * vdn * nx) * WALL_RESTITUTION,
            y: vel.y,
            z: (vel.z - 2 * vdn * nz) * WALL_RESTITUTION,
          }, true);
          const av = rb.angvel();
          rb.setAngvel({ x: av.x * 0.5, y: av.y * 0.5, z: av.z * 0.5 }, true);
        }
      }

      // Cylinder boundary — flat ceiling
      if (pos.y > CYLINDER_HEIGHT) {
        rb.setTranslation({ x: pos.x, y: CYLINDER_HEIGHT, z: pos.z }, true);
        const vel = rb.linvel();
        if (vel.y > 0) {
          rb.setLinvel({
            x: vel.x * WALL_RESTITUTION,
            y: -vel.y * WALL_RESTITUTION,
            z: vel.z * WALL_RESTITUTION,
          }, true);
          const av = rb.angvel();
          rb.setAngvel({ x: av.x * 0.5, y: av.y * 0.5, z: av.z * 0.5 }, true);
        }
      }
    }

    // ── Settle detection (only during airborne phase) ──
    const dt = Math.min(delta, 1 / 30);
    rollTime.current += dt;

    let shouldSettle = false;

    // Wall-clock failsafe (immune to rAF throttling)
    const wallElapsed = (performance.now() - rollStartWallTime.current) / 1000;
    if (wallElapsed > MAX_ROLL_TIME) {
      for (const rb of refs) {
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      shouldSettle = true;
    } else if (rollTime.current > MIN_ROLL_TIME) {
      let totalSpeed = 0;
      for (const rb of refs) {
        const lv = rb.linvel();
        const av = rb.angvel();
        totalSpeed += Math.sqrt(lv.x * lv.x + lv.y * lv.y + lv.z * lv.z);
        totalSpeed += Math.sqrt(av.x * av.x + av.y * av.y + av.z * av.z);
      }

      // Signal camera to start pulling back when dice are slowing down
      if (totalSpeed < PRE_SETTLE_SPEED_THRESHOLD && !settlingSignaled.current) {
        settlingSignaled.current = true;
        settleRef.current.onCameraPhaseChange('settling');
      }

      if (totalSpeed < SETTLE_THRESHOLD) {
        settleCounter.current++;
        if (settleCounter.current >= SETTLE_FRAMES) {
          shouldSettle = true;
        }
      } else {
        settleCounter.current = 0;
      }
    }

    if (shouldSettle) {
      isRolling.current = false;
      rollPhase.current = 'idle';
      settlingSignaled.current = false;

      snapRotation(die1Ref.current!);
      snapRotation(die2Ref.current!);

      const rot1 = die1Ref.current!.rotation();
      const rot2 = die2Ref.current!.rotation();
      const face1 = detectFaceUp(new THREE.Quaternion(rot1.x, rot1.y, rot1.z, rot1.w));
      const face2 = detectFaceUp(new THREE.Quaternion(rot2.x, rot2.y, rot2.z, rot2.w));

      // Signal topdown camera + deliver pending result (don't complete yet — animation controls timing)
      settleRef.current.onPendingResult(face1, face2);
      settleRef.current.onCameraPhaseChange('topdown');
    }
  });

  return (
    <>
      {/* Floor — kinematic rigid body that vibrates during jiggle phase */}
      <RigidBody ref={floorRef} type="kinematicPosition" restitution={0.5} friction={0.8}>
        <CuboidCollider args={[DOME_RADIUS, 0.01, DOME_RADIUS]} position={[0, -0.01, 0]} />
      </RigidBody>

      {/* Die 1 — dynamic rigid body with box collider */}
      <RigidBody
        ref={die1Ref}
        colliders={false}
        restitution={0.5}
        friction={0.6}
        linearDamping={0.2}
        angularDamping={0.15}
        mass={0.05}
        position={[-0.4, FLOOR_Y + DIE_SIZE / 2, 0]}
      >
        <RoundCuboidCollider args={[0.22, 0.22, 0.22, 0.08]} />
        <DieMesh />
      </RigidBody>

      {/* Die 2 — dynamic rigid body with box collider */}
      <RigidBody
        ref={die2Ref}
        colliders={false}
        restitution={0.5}
        friction={0.6}
        linearDamping={0.2}
        angularDamping={0.15}
        mass={0.05}
        position={[0.4, FLOOR_Y + DIE_SIZE / 2, 0]}
      >
        <RoundCuboidCollider args={[0.22, 0.22, 0.22, 0.08]} />
        <DieMesh />
      </RigidBody>
    </>
  );
}

// ============================================================
// Exported Component
// ============================================================

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
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>('idle');
  const effectsDataRef = useRef(createEffectsData());
  const pendingResultRef = useRef<{ face1: DieValue; face2: DieValue } | null>(null);
  const topdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shrinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [centerOffsetY, setCenterOffsetY] = useState(0);

  // Store pending result from physics scene (dice settled but animation still playing)
  const handlePendingResult = useCallback((die1: DieValue, die2: DieValue) => {
    pendingResultRef.current = { face1: die1, face2: die2 };
  }, []);

  // Camera phase orchestration — controls the animation timeline
  const handleCameraPhaseChange = useCallback((phase: CameraPhase) => {
    setCameraPhase(phase);

    if (phase === 'topdown') {
      // Hold top-down view to show result, then begin shrink sequence
      topdownTimerRef.current = setTimeout(() => {
        setCameraPhase('shrinking');

        // After shrink animation finishes, deliver result to game engine
        shrinkTimerRef.current = setTimeout(() => {
          if (pendingResultRef.current) {
            const { face1, face2 } = pendingResultRef.current;
            const total = (face1 + face2) as DiceTotal;
            onRollComplete({ die1: face1, die2: face2, total, isHardWay: face1 === face2 });
            pendingResultRef.current = null;
          }
          setRolling(false);
          setCameraPhase('idle');
        }, 500);
      }, TOPDOWN_HOLD_DURATION * 1000);
    }
  }, [onRollComplete]);

  // When roll starts, compute offset to center screen and begin animation
  useEffect(() => {
    if (rolling && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const elementCenterY = rect.top + rect.height / 2;
      const viewportCenterY = window.innerHeight / 2;
      setCenterOffsetY(viewportCenterY - elementCenterY);
      setCameraPhase('dramatic');
    }
  }, [rolling]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (topdownTimerRef.current) clearTimeout(topdownTimerRef.current);
      if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    roll: () => { if (!rolling) setRolling(true); },
  }));

  // Container scale + position: expanded during roll, normal at rest
  const isExpanded = cameraPhase !== 'idle' && cameraPhase !== 'shrinking';
  const containerScale = isExpanded ? 1.3 : 1.0;
  const yOffset = isExpanded ? centerOffsetY : 0;

  return (
    <div ref={containerRef} style={{
      width,
      height,
      borderRadius: 12,
      overflow: 'hidden',
      background: '#0a0a0a',
      transform: `translateY(${yOffset}px) scale(${containerScale})`,
      transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease',
      transformOrigin: 'center center',
      zIndex: cameraPhase !== 'idle' ? 100 : 1,
      position: 'relative',
      boxShadow: isExpanded
        ? '0 0 40px rgba(255, 215, 0, 0.3), 0 0 80px rgba(0, 0, 0, 0.5)'
        : 'none',
    }}>
      <Canvas shadows gl={{ antialias: false }}>
        <PerspectiveCamera
          makeDefault
          position={[0, 5.0, 1.0]}
          fov={46}
        />
        <CameraAnimator cameraPhase={cameraPhase} />
        <ambientLight intensity={0.6} />
        <spotLight
          position={[0, 4, 1]}
          angle={0.6}
          penumbra={0.5}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
        <pointLight position={[2, 2, -1]} intensity={0.5} color="#ffe4c4" />
        <pointLight position={[-1, 3, 1]} intensity={0.3} color="#ffffff" />
        <SceneGeometry />
        <Physics gravity={[0, -15, 0]}>
          <DicePhysicsScene
            rolling={rolling}
            onRollingChange={setRolling}
            onPendingResult={handlePendingResult}
            onCameraPhaseChange={handleCameraPhaseChange}
            effectsData={effectsDataRef.current}
          />
        </Physics>
        <DiceEffects effectsData={effectsDataRef.current} />
        <Environment preset="studio" />
        <EffectComposer multisampling={0}>
          <SMAA />
          <Vignette eskil={false} offset={0.4} darkness={0.3} />
        </EffectComposer>
      </Canvas>
    </div>
  );
});

export default DiceRollerInner;
