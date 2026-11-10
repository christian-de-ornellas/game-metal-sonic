import { Renderer } from "../core/Renderer";
import { MetalSonicAnimator } from "./MetalSonicAnimator";
import sheetUrl from "../assets/Personagem Pedro Lucas.jpeg";

// Sprite sheet layout (2x2 grid):
// Top-left: IDLE     | Top-right: ATTACK
// Bottom-left: RUNNING | Bottom-right: HIT

const sheetImg = new Image();
sheetImg.src = sheetUrl;
let sheetReady = false;
sheetImg.onload = () => { sheetReady = true; };

// Frame regions in the sprite sheet (sx, sy, sw, sh) — set after load
// These are ratios of the full image, resolved to pixels on first draw
let frameW = 0;
let frameH = 0;
let framesResolved = false;

interface Frame { sx: number; sy: number; sw: number; sh: number }

const frames: Record<string, Frame> = {
  idle:    { sx: 0, sy: 0, sw: 0, sh: 0 },
  attack:  { sx: 0, sy: 0, sw: 0, sh: 0 },
  running: { sx: 0, sy: 0, sw: 0, sh: 0 },
  hit:     { sx: 0, sy: 0, sw: 0, sh: 0 },
};

function resolveFrames() {
  if (framesResolved || !sheetReady) return;
  const w = sheetImg.naturalWidth;
  const h = sheetImg.naturalHeight;
  frameW = w / 2;
  frameH = h / 2;

  frames.idle    = { sx: 0,      sy: 0,      sw: frameW, sh: frameH };
  frames.attack  = { sx: frameW, sy: 0,      sw: frameW, sh: frameH };
  frames.running = { sx: 0,      sy: frameH, sw: frameW, sh: frameH };
  frames.hit     = { sx: frameW, sy: frameH, sw: frameW, sh: frameH };
  framesResolved = true;
}

/** Size in world units (must roughly match Metal Sonic hitbox ~1 unit wide) */
const WORLD_SIZE = 1.8;

function getFrame(state: string): Frame {
  switch (state) {
    case "running": return frames.running;
    case "spinning": return frames.attack;
    case "air": return frames.running;
    case "hurt": return frames.hit;
    default: return frames.idle;
  }
}

export function drawPedroLucas(
  r: Renderer,
  x: number, y: number,
  facingRight: boolean,
  animator: MetalSonicAnimator,
  isSpinning: boolean,
  invincible: boolean,
  invincibilityFlicker: boolean,
) {
  if (invincible && !invincibilityFlicker) return;
  if (!sheetReady) return;
  resolveFrames();

  const ctx = r.ctx;
  const sx = r.worldToScreenX(x);
  const sy = r.worldToScreenY(y);
  const drawSize = WORLD_SIZE * r.zoom;

  // Aspect ratio of each frame cell
  const aspect = frameW / frameH;
  const drawW = drawSize * aspect;
  const drawH = drawSize;

  ctx.save();
  ctx.translate(sx, sy);

  // Flip when facing left (sprite default faces right)
  if (!facingRight) {
    ctx.scale(-1, 1);
  }

  // Hurt flicker
  if (animator.currentState === "hurt" && !animator.flickerVisible) {
    ctx.restore();
    return;
  }

  const frame = isSpinning ? frames.attack : getFrame(animator.currentState);

  if (isSpinning) {
    // Spin ball: rotate the attack frame
    ctx.rotate(animator.spinAngle);
    ctx.drawImage(
      sheetImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawW / 2, -drawH / 2, drawW, drawH,
    );
  } else {
    // Vertical bob for running
    let bobY = 0;
    if (animator.currentState === "running") {
      bobY = Math.sin(animator.time * 12) * drawH * 0.03;
    }

    ctx.drawImage(
      sheetImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawW / 2, -drawH + bobY, drawW, drawH,
    );
  }

  ctx.restore();
}

/** Draw a small idle preview (screen-space) for character select */
export function drawPedroLucasPreview(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
) {
  if (!sheetReady) return;
  resolveFrames();

  const aspect = frameW / frameH;
  const w = size * aspect;
  const h = size;
  const f = frames.idle;
  ctx.drawImage(sheetImg, f.sx, f.sy, f.sw, f.sh, cx - w / 2, cy - h / 2, w, h);
}
