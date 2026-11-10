import { Renderer } from "../core/Renderer";
import { MetalSonicAnimator } from "./MetalSonicAnimator";

const BODY_HEIGHT = 40;
const SCALE = 0.025;

export function drawMetalSonic(
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

  drawJetEngine(ctx, s, animator.jetParticlePhase);
  drawLeg(ctx, s, 0.15 * s, animator.leftLegAngle);
  drawLeg(ctx, s, -0.15 * s, animator.rightLegAngle);
  drawBody(ctx, s);
  drawArm(ctx, s, animator.leftArmAngle, true);
  drawArm(ctx, s, animator.rightArmAngle, false);
  drawHead(ctx, s, animator.breathOffset * s * 0.02);

  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, s: number) {
  const bw = s * 0.45;
  const bh = s * 0.5;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.2, bw, bh, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2255cc";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(s * 0.05, -s * 0.15, bw * 0.55, bh * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a3a";
  ctx.fill();
}

function drawHead(ctx: CanvasRenderingContext2D, s: number, breathY: number) {
  const headY = -s * 0.65 + breathY;
  const headR = s * 0.32;

  // Head - flat color
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = "#2244aa";
  ctx.fill();

  // Visor - no shadow, flat color
  ctx.beginPath();
  ctx.ellipse(headR * 0.15, headY, headR * 0.7, headR * 0.22, 0, -0.3, Math.PI * 0.6);
  ctx.lineWidth = s * 0.06;
  ctx.strokeStyle = "#ff3333";
  ctx.stroke();

  // Eye highlight
  ctx.beginPath();
  ctx.arc(headR * 0.2, headY - headR * 0.05, s * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Spikes
  drawSpike(ctx, s, headY, -headR * 0.3, -0.5, s * 0.5);
  drawSpike(ctx, s, headY, -headR * 0.2, -0.35, s * 0.6);
  drawSpike(ctx, s, headY, -headR * 0.1, -0.55, s * 0.55);
}

function drawSpike(ctx: CanvasRenderingContext2D, s: number, headY: number, offsetY: number, angle: number, length: number) {
  ctx.save();
  ctx.translate(-s * 0.15, headY + offsetY);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0, -s * 0.04);
  ctx.lineTo(-length, 0);
  ctx.lineTo(0, s * 0.04);
  ctx.closePath();
  ctx.fillStyle = "#ddaa11";
  ctx.fill();
  ctx.restore();
}

function drawArm(ctx: CanvasRenderingContext2D, s: number, angle: number, isLeft: boolean) {
  const offsetX = isLeft ? -s * 0.4 : s * 0.4;
  const shoulderY = -s * 0.35;

  ctx.save();
  ctx.translate(offsetX, shoulderY);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.roundRect(-s * 0.04, 0, s * 0.08, s * 0.2, s * 0.04);
  ctx.fillStyle = "#2255cc";
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(-s * 0.035, s * 0.2, s * 0.07, s * 0.18, s * 0.035);
  ctx.fillStyle = "#333344";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, s * 0.38, s * 0.045, 0, Math.PI * 2);
  ctx.fillStyle = "#555566";
  ctx.fill();

  ctx.restore();
}

function drawLeg(ctx: CanvasRenderingContext2D, s: number, offsetX: number, angle: number) {
  const hipY = s * 0.15;

  ctx.save();
  ctx.translate(offsetX, hipY);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.roundRect(-s * 0.045, 0, s * 0.09, s * 0.2, s * 0.04);
  ctx.fillStyle = "#2255cc";
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(-s * 0.04, s * 0.2, s * 0.08, s * 0.18, s * 0.04);
  ctx.fillStyle = "#333344";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(s * 0.02, s * 0.42, s * 0.08, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#cc1111";
  ctx.fill();

  ctx.restore();
}

function drawJetEngine(ctx: CanvasRenderingContext2D, s: number, phase: number) {
  const jetX = -s * 0.2;
  const jetY = -s * 0.05;
  const jetR = s * 0.12;

  ctx.beginPath();
  ctx.arc(jetX, jetY, jetR, 0, Math.PI * 2);
  ctx.fillStyle = "#444455";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(jetX, jetY, jetR * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "#666677";
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const px = jetX - s * 0.1 - Math.sin(phase + i * 2) * s * 0.1;
    const py = jetY + Math.cos(phase * 1.3 + i * 1.5) * s * 0.06;
    const pr = s * 0.02 * (0.5 + Math.sin(phase + i) * 0.5);
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100,200,255,${0.3 + Math.sin(phase + i) * 0.3})`;
    ctx.fill();
  }
}

function drawSpinBall(ctx: CanvasRenderingContext2D, s: number, angle: number) {
  const radius = s * 0.45;

  // Flat blue ball
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#2244aa";
  ctx.fill();

  // Spin lines
  ctx.save();
  ctx.rotate(angle);
  ctx.strokeStyle = "rgba(150,200,255,0.5)";
  ctx.lineWidth = s * 0.03;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, a, a + 0.8);
    ctx.stroke();
  }
  ctx.restore();
}
