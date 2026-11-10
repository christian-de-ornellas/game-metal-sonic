import { Renderer } from "../core/Renderer";
import { MetalSonicAnimator } from "./MetalSonicAnimator";

const BODY_HEIGHT = 40;
const SCALE = 0.025;

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

  const ctx = r.ctx;
  const sx = r.worldToScreenX(x);
  const sy = r.worldToScreenY(y);
  const s = r.zoom * SCALE * BODY_HEIGHT;
  const dir = facingRight ? 1 : -1;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(dir, 1);

  if (isSpinning) {
    drawSpinBall(ctx, s, animator.spinAngle);
    ctx.restore();
    return;
  }

  if (!animator.flickerVisible) {
    ctx.restore();
    return;
  }

  const lean = animator.bodyLean;
  ctx.rotate(-lean * dir);

  drawLeg(ctx, s, 0.15 * s, animator.leftLegAngle);
  drawLeg(ctx, s, -0.15 * s, animator.rightLegAngle);
  drawBody(ctx, s);
  drawArm(ctx, s, animator.leftArmAngle, true);
  drawArm(ctx, s, animator.rightArmAngle, false);
  drawHead(ctx, s, animator.breathOffset * s * 0.02, animator);

  ctx.restore();
}

// --- BODY ---
function drawBody(ctx: CanvasRenderingContext2D, s: number) {
  const bw = s * 0.48;
  const bh = s * 0.5;

  const grad = ctx.createLinearGradient(0, -s * 0.45, 0, s * 0.15);
  grad.addColorStop(0, "#8b2252");
  grad.addColorStop(0.55, "#6b1a3e");
  grad.addColorStop(0.56, "#f0f0f0");
  grad.addColorStop(1, "#e0e0e0");

  ctx.beginPath();
  ctx.ellipse(0, -s * 0.2, bw, bh, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -s * 0.2, bw, bh, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = s * 0.02;
  ctx.stroke();
}

// --- HEAD ---
function drawHead(ctx: CanvasRenderingContext2D, s: number, breathY: number, animator: MetalSonicAnimator) {
  const headY = -s * 0.65 + breathY;
  const headR = s * 0.34;

  // Skin
  const skinGrad = ctx.createRadialGradient(
    -headR * 0.2, headY - headR * 0.25, headR * 0.1,
    0, headY, headR,
  );
  skinGrad.addColorStop(0, "#f5d0a9");
  skinGrad.addColorStop(0.7, "#e8b88a");
  skinGrad.addColorStop(1, "#d4976a");
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = skinGrad;
  ctx.fill();

  // Hair
  drawHair(ctx, s, headY, headR);

  // Glasses (with shake during running)
  const glassShake = animator.currentState === "running" ?
    Math.sin(animator.time * 18) * s * 0.003 : 0;
  drawGlasses(ctx, s, headY + glassShake, headR, animator);

  // Expression-based mouth
  drawMouth(ctx, s, headY, headR, animator);

  // Ears
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * headR * 0.92, headY + headR * 0.05, headR * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "#e8b88a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(side * headR * 0.92, headY + headR * 0.05, headR * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = "#d4976a";
    ctx.fill();
  }
}

function drawHair(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.15, headR * 1.08, Math.PI * 0.85, Math.PI * 0.15, true);
  ctx.quadraticCurveTo(headR * 0.6, headY - headR * 1.3, 0, headY - headR * 1.2);
  ctx.quadraticCurveTo(-headR * 0.6, headY - headR * 1.3, -headR * 0.95, headY - headR * 0.1);
  ctx.closePath();
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-headR * 0.88, headY - headR * 0.35);
  ctx.quadraticCurveTo(-headR * 0.55, headY - headR * 0.22, -headR * 0.2, headY - headR * 0.28);
  ctx.quadraticCurveTo(headR * 0.1, headY - headR * 0.32, headR * 0.45, headY - headR * 0.26);
  ctx.quadraticCurveTo(headR * 0.7, headY - headR * 0.22, headR * 0.88, headY - headR * 0.35);
  ctx.lineTo(headR * 0.9, headY - headR * 0.8);
  ctx.quadraticCurveTo(0, headY - headR * 1.35, -headR * 0.9, headY - headR * 0.8);
  ctx.closePath();
  ctx.fillStyle = "#222222";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-headR * 0.15, headY - headR * 0.85, headR * 0.3, headR * 0.12, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(60, 60, 70, 0.5)";
  ctx.fill();

  ctx.restore();
}

function drawGlasses(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number, animator: MetalSonicAnimator) {
  const glassY = headY + headR * 0.0;
  const glassW = headR * 0.38;
  const glassH = headR * 0.3;
  const bridge = headR * 0.08;

  ctx.save();
  ctx.lineWidth = s * 0.04;
  ctx.strokeStyle = "#1a2a5a";

  // Left lens
  ctx.beginPath();
  ctx.roundRect(-glassW - bridge, glassY - glassH / 2, glassW, glassH, s * 0.03);
  ctx.fillStyle = "rgba(140, 170, 220, 0.35)";
  ctx.fill();
  ctx.stroke();

  // Right lens
  ctx.beginPath();
  ctx.roundRect(bridge, glassY - glassH / 2, glassW, glassH, s * 0.03);
  ctx.fillStyle = "rgba(140, 170, 220, 0.35)";
  ctx.fill();
  ctx.stroke();

  // Bridge
  ctx.beginPath();
  ctx.moveTo(-bridge, glassY);
  ctx.lineTo(bridge, glassY);
  ctx.stroke();

  // Temple arms
  ctx.beginPath();
  ctx.moveTo(-glassW - bridge, glassY);
  ctx.lineTo(-headR * 0.85, glassY - headR * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bridge + glassW, glassY);
  ctx.lineTo(headR * 0.85, glassY - headR * 0.05);
  ctx.stroke();

  // Eyes — expression-based
  const expr = animator.expression;
  for (const side of [-1, 1]) {
    const eyeX = side * (bridge + glassW / 2);

    if (expr === "hurt") {
      // X eyes
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = s * 0.025;
      const sz = s * 0.03;
      ctx.beginPath();
      ctx.moveTo(eyeX - sz, glassY - sz);
      ctx.lineTo(eyeX + sz, glassY + sz);
      ctx.moveTo(eyeX + sz, glassY - sz);
      ctx.lineTo(eyeX - sz, glassY + sz);
      ctx.stroke();
    } else if (expr === "determined") {
      // Squinting eyes (smaller)
      ctx.beginPath();
      ctx.ellipse(eyeX + s * 0.02, glassY + glassH * 0.05, s * 0.035, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a1a";
      ctx.fill();
      // Eyebrow (angled down)
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(eyeX - s * 0.04, glassY - glassH * 0.35);
      ctx.lineTo(eyeX + s * 0.04, glassY - glassH * 0.25 + side * s * 0.01);
      ctx.stroke();
    } else {
      // Normal eyes
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.02, glassY + glassH * 0.05, s * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a1a";
      ctx.fill();
      // Eye highlight
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.035, glassY - glassH * 0.05, s * 0.015, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  }

  // Lens glare
  ctx.beginPath();
  ctx.ellipse(bridge + glassW * 0.7, glassY - glassH * 0.2, s * 0.02, s * 0.01, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fill();

  ctx.restore();
}

function drawMouth(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number, animator: MetalSonicAnimator) {
  const mouthY = headY + headR * 0.45;
  const expr = animator.expression;

  ctx.save();

  if (expr === "hurt") {
    // Wavy worried mouth
    ctx.beginPath();
    ctx.moveTo(-headR * 0.2, mouthY);
    ctx.quadraticCurveTo(-headR * 0.1, mouthY + headR * 0.08, 0, mouthY);
    ctx.quadraticCurveTo(headR * 0.1, mouthY - headR * 0.08, headR * 0.2, mouthY);
    ctx.strokeStyle = "#8b1a1a";
    ctx.lineWidth = s * 0.025;
    ctx.stroke();
  } else if (expr === "determined") {
    // Gritted teeth / determined grin
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.25, headR * 0.1, 0, 0, Math.PI);
    ctx.fillStyle = "#cc3333";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.2, headR * 0.05, 0, 0, Math.PI, true);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.25, headR * 0.1, 0, 0, Math.PI);
    ctx.strokeStyle = "#8b1a1a";
    ctx.lineWidth = s * 0.015;
    ctx.stroke();
  } else {
    // Big open smile (default / happy)
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.35, headR * 0.2, 0, 0, Math.PI);
    ctx.fillStyle = "#cc3333";
    ctx.fill();

    // Teeth
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.3, headR * 0.08, 0, 0, Math.PI, true);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Tooth lines
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = s * 0.01;
    for (let i = -2; i <= 2; i++) {
      const tx = s * 0.02 + i * headR * 0.1;
      ctx.beginPath();
      ctx.moveTo(tx, mouthY - headR * 0.08);
      ctx.lineTo(tx, mouthY);
      ctx.stroke();
    }

    // Mouth outline
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.35, headR * 0.2, 0, 0, Math.PI);
    ctx.strokeStyle = "#8b1a1a";
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
  }

  ctx.restore();
}

// --- ARMS ---
function drawArm(ctx: CanvasRenderingContext2D, s: number, angle: number, isLeft: boolean) {
  const offsetX = isLeft ? -s * 0.42 : s * 0.42;
  const shoulderY = -s * 0.35;

  ctx.save();
  ctx.translate(offsetX, shoulderY);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.roundRect(-s * 0.05, 0, s * 0.1, s * 0.18, s * 0.04);
  ctx.fillStyle = "#e8b88a";
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(-s * 0.04, s * 0.18, s * 0.08, s * 0.16, s * 0.035);
  ctx.fillStyle = "#f0c89a";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, s * 0.36, s * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = "#f0c89a";
  ctx.fill();

  ctx.restore();
}

// --- LEGS ---
function drawLeg(ctx: CanvasRenderingContext2D, s: number, offsetX: number, angle: number) {
  const hipY = s * 0.15;

  ctx.save();
  ctx.translate(offsetX, hipY);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.roundRect(-s * 0.05, 0, s * 0.1, s * 0.22, s * 0.04);
  ctx.fillStyle = "#2c3e50";
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(-s * 0.045, s * 0.18, s * 0.09, s * 0.15, s * 0.03);
  ctx.fillStyle = "#34495e";
  ctx.fill();

  const footGrad = ctx.createLinearGradient(0, s * 0.33, 0, s * 0.42);
  footGrad.addColorStop(0, "#e8e8e8");
  footGrad.addColorStop(1, "#cccccc");
  ctx.beginPath();
  ctx.ellipse(s * 0.02, s * 0.39, s * 0.08, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = footGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(s * 0.02, s * 0.42, s * 0.07, s * 0.02, 0, 0, Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

// --- SPIN BALL ---
function drawSpinBall(ctx: CanvasRenderingContext2D, s: number, angle: number) {
  const radius = s * 0.45;

  const grad = ctx.createRadialGradient(
    -radius * 0.2, -radius * 0.2, radius * 0.1,
    0, 0, radius,
  );
  grad.addColorStop(0, "#f5d0a9");
  grad.addColorStop(0.3, "#8b2252");
  grad.addColorStop(0.7, "#6b1a3e");
  grad.addColorStop(1, "#3a0e22");

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.rotate(angle);
  ctx.strokeStyle = "rgba(240, 200, 160, 0.5)";
  ctx.lineWidth = s * 0.03;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, a, a + 0.8);
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(-radius * 0.15, -radius * 0.15, radius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();
}

/** Mini procedural preview for character select screen */
export function drawPedroLucasPreview(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
) {
  const s = size;

  ctx.save();
  ctx.translate(cx, cy);

  // Legs
  for (const offX of [-s * 0.1, s * 0.1]) {
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.035, s * 0.28, s * 0.07, s * 0.16, s * 0.03);
    ctx.fillStyle = "#2c3e50";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(offX + s * 0.01, s * 0.46, s * 0.05, s * 0.03, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#e0e0e0";
    ctx.fill();
  }

  // Body
  const bw = s * 0.30;
  const bh = s * 0.3;
  const bodyGrad = ctx.createLinearGradient(0, -s * 0.25, 0, s * 0.15);
  bodyGrad.addColorStop(0, "#8b2252");
  bodyGrad.addColorStop(0.55, "#6b1a3e");
  bodyGrad.addColorStop(0.56, "#f0f0f0");
  bodyGrad.addColorStop(1, "#e0e0e0");
  ctx.beginPath();
  ctx.ellipse(0, s * 0.02, bw, bh, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Head
  const headY = -s * 0.32;
  const headR = s * 0.22;

  const skinGrad = ctx.createRadialGradient(-headR * 0.2, headY - headR * 0.2, headR * 0.1, 0, headY, headR);
  skinGrad.addColorStop(0, "#f5d0a9");
  skinGrad.addColorStop(0.7, "#e8b88a");
  skinGrad.addColorStop(1, "#d4976a");
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = skinGrad;
  ctx.fill();

  // Hair
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.15, headR * 1.05, Math.PI * 0.85, Math.PI * 0.15, true);
  ctx.quadraticCurveTo(headR * 0.5, headY - headR * 1.25, 0, headY - headR * 1.15);
  ctx.quadraticCurveTo(-headR * 0.5, headY - headR * 1.25, -headR * 0.9, headY - headR * 0.1);
  ctx.closePath();
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  // Bangs
  ctx.beginPath();
  ctx.moveTo(-headR * 0.78, headY - headR * 0.32);
  ctx.quadraticCurveTo(-headR * 0.45, headY - headR * 0.18, -headR * 0.15, headY - headR * 0.24);
  ctx.quadraticCurveTo(headR * 0.1, headY - headR * 0.28, headR * 0.4, headY - headR * 0.22);
  ctx.quadraticCurveTo(headR * 0.6, headY - headR * 0.18, headR * 0.78, headY - headR * 0.32);
  ctx.lineTo(headR * 0.8, headY - headR * 0.7);
  ctx.quadraticCurveTo(0, headY - headR * 1.3, -headR * 0.8, headY - headR * 0.7);
  ctx.closePath();
  ctx.fillStyle = "#222222";
  ctx.fill();

  // Glasses
  const glassY = headY + headR * 0.0;
  const glassW = headR * 0.35;
  const glassH = headR * 0.28;
  const bridge = headR * 0.07;

  ctx.lineWidth = s * 0.025;
  ctx.strokeStyle = "#1a2a5a";
  ctx.beginPath();
  ctx.roundRect(-glassW - bridge, glassY - glassH / 2, glassW, glassH, s * 0.02);
  ctx.fillStyle = "rgba(140, 170, 220, 0.35)";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(bridge, glassY - glassH / 2, glassW, glassH, s * 0.02);
  ctx.fillStyle = "rgba(140, 170, 220, 0.35)";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-bridge, glassY);
  ctx.lineTo(bridge, glassY);
  ctx.stroke();

  // Eyes
  for (const side of [-1, 1]) {
    const eyeX = side * (bridge + glassW / 2);
    ctx.beginPath();
    ctx.arc(eyeX + s * 0.01, glassY + glassH * 0.05, s * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX + s * 0.02, glassY - glassH * 0.05, s * 0.01, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  // Smile
  const mouthY = headY + headR * 0.45;
  ctx.beginPath();
  ctx.ellipse(s * 0.01, mouthY, headR * 0.28, headR * 0.15, 0, 0, Math.PI);
  ctx.fillStyle = "#cc3333";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.01, mouthY, headR * 0.22, headR * 0.06, 0, 0, Math.PI, true);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}
