import { Renderer } from "../core/Renderer";
import { RING_COLLECT_RADIUS, RING_SCATTER_SPEED, RING_SCATTER_JUMP, RING_DESPAWN_TIME } from "../constants";

export interface RingData {
  x: number;
  y: number;
  collected: boolean;
  active: boolean;
  scattered: boolean;
  vx: number;
  vy: number;
  scatterTimer: number;
  animPhase: number;
}

export function createRing(x: number, y: number): RingData {
  return {
    x, y,
    collected: false,
    active: true,
    scattered: false,
    vx: 0, vy: 0,
    scatterTimer: 0,
    animPhase: Math.random() * Math.PI * 2,
  };
}

export function createScatteredRing(x: number, y: number): RingData {
  const angle = Math.random() * Math.PI * 2;
  const speed = RING_SCATTER_SPEED * (0.5 + Math.random() * 0.5);
  return {
    x, y,
    collected: false,
    active: true,
    scattered: true,
    vx: Math.cos(angle) * speed,
    vy: RING_SCATTER_JUMP * (0.7 + Math.random() * 0.6),
    scatterTimer: RING_DESPAWN_TIME,
    animPhase: Math.random() * Math.PI * 2,
  };
}

const RING_COLLECT_RADIUS_SQ = RING_COLLECT_RADIUS * RING_COLLECT_RADIUS;

export function checkRingCollect(ring: RingData, px: number, py: number): boolean {
  if (!ring.active || ring.collected) return false;
  const dx = ring.x - px;
  const dy = ring.y - py;
  return dx * dx + dy * dy < RING_COLLECT_RADIUS_SQ;
}

export function updateScatteredRing(ring: RingData, dt: number): boolean {
  if (!ring.scattered || !ring.active) return true;

  ring.vy -= 20 * dt;
  ring.x += ring.vx * dt;
  ring.y += ring.vy * dt;

  // Bounce
  if (ring.y < 0.3) {
    ring.y = 0.3;
    ring.vy = Math.abs(ring.vy) * 0.5;
    ring.vx *= 0.8;
  }

  ring.scatterTimer -= dt;
  if (ring.scatterTimer <= 0) {
    ring.active = false;
    return false;
  }

  return true;
}

export function drawRing(r: Renderer, ring: RingData, time: number) {
  if (!ring.active || ring.collected) return;

  // Flicker when about to despawn
  if (ring.scattered && ring.scatterTimer < 1) {
    if (Math.sin(ring.scatterTimer * 20) < 0) return;
  }

  const ctx = r.ctx;
  const sx = r.worldToScreenX(ring.x);
  const sy = r.worldToScreenY(ring.y);

  // Simulated 3D rotation - scaleX oscillates
  const scaleX = Math.abs(Math.cos(time * 4 + ring.animPhase));
  const radiusX = 0.35 * r.zoom * Math.max(scaleX, 0.15);
  const radiusY = 0.35 * r.zoom;

  // Ring body - flat gold
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.ellipse(sx, sy, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner hole
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(sx, sy, radiusX * 0.5, radiusY * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}
