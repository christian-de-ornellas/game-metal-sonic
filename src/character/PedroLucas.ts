import { Renderer } from "../core/Renderer";
import { MetalSonicAnimator } from "./MetalSonicAnimator";

const BODY_HEIGHT = 40;
const SCALE = 0.025;

// Chibi proportions
const HEAD_RATIO = 0.38;
const BODY_RATIO = 0.32;
const LEG_RATIO = 0.30;

// Flat color palette
const COLORS = {
  skin: "#d4956a",
  skinLight: "#e8b88a",
  hair: "#1a1a1a",
  hairHighlight: "#333333",
  glassesFrame: "#1a2a5a",
  glassesLens: "rgba(200,220,255,0.2)",
  shirtBurgundy: "#8b2252",
  shirtWhite: "#f0f0f0",
  pants: "#2c3548",
  pantsLight: "#3a4560",
  shoeWhite: "#f0f0f0",
  shoeSole: "#2c3548",
  shoeAccent: "#3a4a6a",
  mouthRed: "#cc3333",
  mouthDark: "#8b1a1a",
  teeth: "#ffffff",
  outline: "#111111",
};

const OUTLINE_W = 0.035;

function fillAndStroke(ctx: CanvasRenderingContext2D, s: number, fillColor: string) {
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * OUTLINE_W;
  ctx.lineJoin = "round";
  ctx.stroke();
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

  const ctx = r.ctx;
  const sx = r.worldToScreenX(x);
  const sy = r.worldToScreenY(y);
  const s = r.zoom * SCALE * BODY_HEIGHT;
  const dir = facingRight ? 1 : -1;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(dir, 1);

  if (isSpinning) {
    drawSpinBall(ctx, s, animator.spinAngle, animator);
    ctx.restore();
    return;
  }

  if (!animator.flickerVisible) {
    ctx.restore();
    return;
  }

  const lean = animator.bodyLean;
  ctx.rotate(-lean * dir);

  // Apply squash/stretch
  const ss = animator.squashStretch;
  if (ss !== 1.0) {
    ctx.scale(1 / ss, ss);
  }

  drawLeg(ctx, s, 0.15 * s, animator.leftLegAngle);
  drawLeg(ctx, s, -0.15 * s, animator.rightLegAngle);
  drawBody(ctx, s);
  drawArm(ctx, s, animator.leftArmAngle, true, animator);
  drawArm(ctx, s, animator.rightArmAngle, false, animator);
  drawHead(ctx, s, animator.breathOffset * s * 0.02, animator);

  ctx.restore();
}

// --- BODY (bicolor shirt with outline) ---
function drawBody(ctx: CanvasRenderingContext2D, s: number) {
  const bw = s * 0.52;
  const bh = s * BODY_RATIO;
  const bodyTop = -s * 0.45;
  const cornerR = s * 0.08;

  ctx.beginPath();
  ctx.roundRect(-bw / 2, bodyTop, bw, bh, cornerR);

  // Clip and fill bicolor
  ctx.save();
  ctx.clip();

  // Top half: burgundy
  ctx.fillStyle = COLORS.shirtBurgundy;
  ctx.fillRect(-bw / 2, bodyTop, bw, bh * 0.55);

  // Bottom half: white
  ctx.fillStyle = COLORS.shirtWhite;
  ctx.fillRect(-bw / 2, bodyTop + bh * 0.55, bw, bh * 0.45);

  // Sharp dividing line
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.015;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, bodyTop + bh * 0.55);
  ctx.lineTo(bw / 2, bodyTop + bh * 0.55);
  ctx.stroke();

  ctx.restore();

  // Outline around entire torso
  ctx.beginPath();
  ctx.roundRect(-bw / 2, bodyTop, bw, bh, cornerR);
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * OUTLINE_W;
  ctx.lineJoin = "round";
  ctx.stroke();
}

// --- HEAD (larger, flat skin, outline) ---
function drawHead(ctx: CanvasRenderingContext2D, s: number, breathY: number, animator: MetalSonicAnimator) {
  const headY = -s * 0.68 + breathY;
  const headR = s * HEAD_RATIO;

  // Skin - flat color with outline
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  fillAndStroke(ctx, s, COLORS.skin);

  // Hair (spiky)
  drawHair(ctx, s, headY, headR);

  // Glasses (with shake during running)
  const glassShake = animator.currentState === "running" ?
    Math.sin(animator.time * 18) * s * 0.003 : 0;
  drawGlasses(ctx, s, headY + glassShake, headR, animator);

  // Expression-based mouth
  drawMouth(ctx, s, headY, headR, animator);

  // Ears with outline
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * headR * 0.92, headY + headR * 0.05, headR * 0.14, 0, Math.PI * 2);
    fillAndStroke(ctx, s, COLORS.skinLight);
    ctx.beginPath();
    ctx.arc(side * headR * 0.92, headY + headR * 0.05, headR * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.skin;
    ctx.fill();
  }
}

// --- HAIR (spiky with individual spikes) ---
function drawHair(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number) {
  ctx.save();

  // Hair base covering top of head
  ctx.beginPath();
  ctx.arc(0, headY, headR * 1.05, Math.PI * 0.95, Math.PI * 0.05, true);
  ctx.lineTo(headR * 0.9, headY - headR * 0.3);
  ctx.lineTo(-headR * 0.9, headY - headR * 0.3);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Individual spikes

  // Spike 1: center-top, tall
  ctx.beginPath();
  ctx.moveTo(-headR * 0.15, headY - headR * 0.85);
  ctx.quadraticCurveTo(-headR * 0.05, headY - headR * 1.45, headR * 0.1, headY - headR * 1.35);
  ctx.quadraticCurveTo(headR * 0.15, headY - headR * 1.1, headR * 0.2, headY - headR * 0.85);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Spike 2: left-top
  ctx.beginPath();
  ctx.moveTo(-headR * 0.45, headY - headR * 0.8);
  ctx.quadraticCurveTo(-headR * 0.55, headY - headR * 1.3, -headR * 0.3, headY - headR * 1.2);
  ctx.quadraticCurveTo(-headR * 0.15, headY - headR * 1.05, -headR * 0.1, headY - headR * 0.8);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Spike 3: right-top
  ctx.beginPath();
  ctx.moveTo(headR * 0.2, headY - headR * 0.82);
  ctx.quadraticCurveTo(headR * 0.35, headY - headR * 1.35, headR * 0.5, headY - headR * 1.15);
  ctx.quadraticCurveTo(headR * 0.55, headY - headR * 0.95, headR * 0.55, headY - headR * 0.8);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Spike 4: far right
  ctx.beginPath();
  ctx.moveTo(headR * 0.6, headY - headR * 0.7);
  ctx.quadraticCurveTo(headR * 1.1, headY - headR * 1.0, headR * 1.05, headY - headR * 0.7);
  ctx.quadraticCurveTo(headR * 0.95, headY - headR * 0.55, headR * 0.75, headY - headR * 0.5);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Spike 5: right side
  ctx.beginPath();
  ctx.moveTo(headR * 0.7, headY - headR * 0.45);
  ctx.quadraticCurveTo(headR * 1.2, headY - headR * 0.6, headR * 1.1, headY - headR * 0.3);
  ctx.quadraticCurveTo(headR * 0.95, headY - headR * 0.2, headR * 0.8, headY - headR * 0.15);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Spike 6: left side
  ctx.beginPath();
  ctx.moveTo(-headR * 0.7, headY - headR * 0.55);
  ctx.quadraticCurveTo(-headR * 1.15, headY - headR * 0.85, -headR * 1.05, headY - headR * 0.45);
  ctx.quadraticCurveTo(-headR * 0.9, headY - headR * 0.3, -headR * 0.75, headY - headR * 0.25);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Spike 7: diagonal back-right
  ctx.beginPath();
  ctx.moveTo(headR * 0.4, headY - headR * 0.75);
  ctx.quadraticCurveTo(headR * 0.75, headY - headR * 1.2, headR * 0.8, headY - headR * 0.9);
  ctx.quadraticCurveTo(headR * 0.75, headY - headR * 0.7, headR * 0.6, headY - headR * 0.6);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Subtle highlight on center spike
  ctx.beginPath();
  ctx.moveTo(-headR * 0.05, headY - headR * 1.0);
  ctx.quadraticCurveTo(headR * 0.0, headY - headR * 1.25, headR * 0.08, headY - headR * 1.15);
  ctx.quadraticCurveTo(headR * 0.05, headY - headR * 1.05, headR * 0.02, headY - headR * 0.95);
  ctx.closePath();
  ctx.fillStyle = COLORS.hairHighlight;
  ctx.fill();

  ctx.restore();
}

// --- GLASSES (thick rectangular frames) ---
function drawGlasses(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number, animator: MetalSonicAnimator) {
  const glassY = headY + headR * 0.0;
  const glassW = headR * 0.42;
  const glassH = headR * 0.32;
  const bridge = headR * 0.09;
  const frameWidth = s * 0.055;

  ctx.save();
  ctx.lineWidth = frameWidth;
  ctx.strokeStyle = COLORS.glassesFrame;
  ctx.lineJoin = "round";

  // Left lens
  ctx.beginPath();
  ctx.roundRect(-glassW - bridge, glassY - glassH / 2, glassW, glassH, s * 0.03);
  ctx.fillStyle = COLORS.glassesLens;
  ctx.fill();
  ctx.stroke();

  // Right lens
  ctx.beginPath();
  ctx.roundRect(bridge, glassY - glassH / 2, glassW, glassH, s * 0.03);
  ctx.fillStyle = COLORS.glassesLens;
  ctx.fill();
  ctx.stroke();

  // Bridge (thicker)
  ctx.lineWidth = frameWidth * 0.8;
  ctx.beginPath();
  ctx.moveTo(-bridge, glassY);
  ctx.lineTo(bridge, glassY);
  ctx.stroke();

  // Temple arms (thicker)
  ctx.lineWidth = frameWidth * 0.7;
  ctx.beginPath();
  ctx.moveTo(-glassW - bridge, glassY);
  ctx.lineTo(-headR * 0.88, glassY - headR * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bridge + glassW, glassY);
  ctx.lineTo(headR * 0.88, glassY - headR * 0.05);
  ctx.stroke();

  // Eyes — expression-based (8 expressions)
  drawEyes(ctx, s, glassY, glassW, glassH, bridge, headR, headY, animator);

  // Lens glare
  ctx.beginPath();
  ctx.ellipse(bridge + glassW * 0.7, glassY - glassH * 0.2, s * 0.02, s * 0.01, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fill();

  ctx.restore();
}

function drawEyes(
  ctx: CanvasRenderingContext2D, s: number,
  glassY: number, glassW: number, glassH: number,
  bridge: number, headR: number, headY: number,
  animator: MetalSonicAnimator,
) {
  const expr = animator.expression;

  for (const side of [-1, 1]) {
    const eyeX = side * (bridge + glassW / 2);

    if (expr === "hurt") {
      // X eyes
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.03;
      ctx.lineCap = "round";
      const sz = s * 0.035;
      ctx.beginPath();
      ctx.moveTo(eyeX - sz, glassY - sz);
      ctx.lineTo(eyeX + sz, glassY + sz);
      ctx.moveTo(eyeX + sz, glassY - sz);
      ctx.lineTo(eyeX - sz, glassY + sz);
      ctx.stroke();
    } else if (expr === "determined") {
      // Squinted eyes with angled eyebrows
      ctx.beginPath();
      ctx.ellipse(eyeX + s * 0.02, glassY + glassH * 0.05, s * 0.035, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
      // Angled eyebrow
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.03;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(eyeX - s * 0.045, glassY - glassH * 0.4);
      ctx.lineTo(eyeX + s * 0.045, glassY - glassH * 0.28 + side * s * 0.01);
      ctx.stroke();
    } else if (expr === "excited") {
      // Star eyes (4-pointed stars, gold)
      const starX = eyeX + s * 0.01;
      const starY = glassY + glassH * 0.02;
      const outerR = s * 0.04;
      const innerR = s * 0.015;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        if (i === 0) ctx.moveTo(starX + Math.cos(a) * r, starY + Math.sin(a) * r);
        else ctx.lineTo(starX + Math.cos(a) * r, starY + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = "#ffcc00";
      ctx.fill();
      ctx.strokeStyle = "#cc9900";
      ctx.lineWidth = s * 0.01;
      ctx.stroke();
    } else if (expr === "scared") {
      // Wide white eyes with tiny pupils
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.01, glassY + glassH * 0.02, s * 0.045, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.015;
      ctx.stroke();
      // Tiny pupil
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.01, glassY + glassH * 0.05, s * 0.012, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
    } else if (expr === "sleeping") {
      // Closed eyes (curved lines)
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.025;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.01, glassY + glassH * 0.05, s * 0.03, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else if (expr === "cocky") {
      // One eyebrow raised, other normal
      // Normal eye
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.02, glassY + glassH * 0.05, s * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.035, glassY - glassH * 0.05, s * 0.015, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      // Eyebrow: raised on right side, flat on left
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.025;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (side === 1) {
        // Raised eyebrow
        ctx.moveTo(eyeX - s * 0.04, glassY - glassH * 0.35);
        ctx.lineTo(eyeX + s * 0.04, glassY - glassH * 0.5);
      } else {
        // Normal/flat eyebrow
        ctx.moveTo(eyeX - s * 0.04, glassY - glassH * 0.35);
        ctx.lineTo(eyeX + s * 0.04, glassY - glassH * 0.35);
      }
      ctx.stroke();
    } else {
      // Normal / happy eyes: black dots with white highlight
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.02, glassY + glassH * 0.05, s * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.035, glassY - glassH * 0.05, s * 0.015, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  }
}

// --- MOUTH (8 expressions) ---
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
    ctx.strokeStyle = COLORS.mouthDark;
    ctx.lineWidth = s * 0.03;
    ctx.lineCap = "round";
    ctx.stroke();
  } else if (expr === "determined") {
    // Clenched grin with teeth
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.25, headR * 0.1, 0, 0, Math.PI);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();
    // Teeth
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.2, headR * 0.05, 0, 0, Math.PI, true);
    ctx.fillStyle = COLORS.teeth;
    ctx.fill();
  } else if (expr === "excited") {
    // Wide open mouth with teeth (wider than normal)
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.4, headR * 0.25, 0, 0, Math.PI);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();
    // Teeth (upper)
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.35, headR * 0.1, 0, 0, Math.PI, true);
    ctx.fillStyle = COLORS.teeth;
    ctx.fill();
    // Tooth lines
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = s * 0.01;
    for (let i = -3; i <= 3; i++) {
      const tx = s * 0.02 + i * headR * 0.08;
      ctx.beginPath();
      ctx.moveTo(tx, mouthY - headR * 0.1);
      ctx.lineTo(tx, mouthY);
      ctx.stroke();
    }
  } else if (expr === "scared") {
    // Small "O" mouth
    ctx.beginPath();
    ctx.ellipse(s * 0.01, mouthY + headR * 0.05, headR * 0.1, headR * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.mouthDark;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();
  } else if (expr === "sleeping") {
    // Subtle curved line
    ctx.beginPath();
    ctx.arc(s * 0.02, mouthY + headR * 0.05, headR * 0.1, 0.3, Math.PI - 0.3);
    ctx.strokeStyle = COLORS.mouthDark;
    ctx.lineWidth = s * 0.02;
    ctx.lineCap = "round";
    ctx.stroke();

    // Floating "Zzz"
    const zPhase = animator.sleepZzz;
    const zAlpha = Math.min(1, (zPhase % 3) / 0.5);
    const zY = mouthY - headR * 0.3 - (zPhase % 3) * headR * 0.4;
    ctx.globalAlpha = Math.max(0, 1 - (zPhase % 3) / 3) * zAlpha;
    ctx.font = `bold ${s * 0.12}px monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.strokeText("Z", headR * 0.6, zY);
    ctx.fillText("Z", headR * 0.6, zY);

    const z2Y = mouthY - headR * 0.3 - ((zPhase + 1) % 3) * headR * 0.4;
    ctx.globalAlpha = Math.max(0, 1 - ((zPhase + 1) % 3) / 3);
    ctx.font = `bold ${s * 0.09}px monospace`;
    ctx.strokeText("z", headR * 0.75, z2Y);
    ctx.fillText("z", headR * 0.75, z2Y);

    const z3Y = mouthY - headR * 0.3 - ((zPhase + 2) % 3) * headR * 0.4;
    ctx.globalAlpha = Math.max(0, 1 - ((zPhase + 2) % 3) / 3);
    ctx.font = `bold ${s * 0.07}px monospace`;
    ctx.strokeText("z", headR * 0.9, z3Y);
    ctx.fillText("z", headR * 0.9, z3Y);

    ctx.globalAlpha = 1;
  } else if (expr === "cocky") {
    // Asymmetric half-smile with one tooth showing
    ctx.beginPath();
    ctx.moveTo(-headR * 0.15, mouthY + headR * 0.02);
    ctx.quadraticCurveTo(headR * 0.05, mouthY + headR * 0.15, headR * 0.25, mouthY - headR * 0.02);
    ctx.quadraticCurveTo(headR * 0.15, mouthY + headR * 0.05, -headR * 0.15, mouthY + headR * 0.02);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();
    // Single tooth
    ctx.beginPath();
    ctx.moveTo(headR * 0.08, mouthY + headR * 0.02);
    ctx.lineTo(headR * 0.15, mouthY + headR * 0.02);
    ctx.lineTo(headR * 0.15, mouthY + headR * 0.08);
    ctx.lineTo(headR * 0.08, mouthY + headR * 0.08);
    ctx.closePath();
    ctx.fillStyle = COLORS.teeth;
    ctx.fill();
  } else {
    // Normal/happy: big open smile with teeth and outline
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.35, headR * 0.2, 0, 0, Math.PI);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();

    // Teeth
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.3, headR * 0.08, 0, 0, Math.PI, true);
    ctx.fillStyle = COLORS.teeth;
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
  }

  ctx.restore();
}

// --- ARMS (with outline and variable hand) ---
function drawArm(ctx: CanvasRenderingContext2D, s: number, angle: number, isLeft: boolean, animator: MetalSonicAnimator) {
  const offsetX = isLeft ? -s * 0.44 : s * 0.44;
  const shoulderY = -s * 0.38;
  const isFist = animator.currentState === "running" || animator.currentState === "attack" ||
                 animator.currentState === "spinning" || animator.currentState === "skidding";

  ctx.save();
  ctx.translate(offsetX, shoulderY);
  ctx.rotate(angle);

  // Upper arm (skin-toned sleeve area)
  ctx.beginPath();
  ctx.roundRect(-s * 0.055, 0, s * 0.11, s * 0.18, s * 0.04);
  fillAndStroke(ctx, s, COLORS.skinLight);

  // Forearm
  ctx.beginPath();
  ctx.roundRect(-s * 0.045, s * 0.18, s * 0.09, s * 0.16, s * 0.035);
  fillAndStroke(ctx, s, COLORS.skin);

  // Hand
  if (isFist) {
    // Fist (rounded square)
    ctx.beginPath();
    ctx.roundRect(-s * 0.045, s * 0.33, s * 0.09, s * 0.08, s * 0.03);
    fillAndStroke(ctx, s, COLORS.skin);
  } else {
    // Open hand (circle)
    ctx.beginPath();
    ctx.arc(0, s * 0.36, s * 0.05, 0, Math.PI * 2);
    fillAndStroke(ctx, s, COLORS.skin);
  }

  ctx.restore();
}

// --- LEGS + SNEAKERS ---
function drawLeg(ctx: CanvasRenderingContext2D, s: number, offsetX: number, angle: number) {
  const hipY = s * 0.1;

  ctx.save();
  ctx.translate(offsetX, hipY);
  ctx.rotate(angle);

  // Upper leg (pants)
  ctx.beginPath();
  ctx.roundRect(-s * 0.055, 0, s * 0.11, s * 0.18, s * 0.04);
  fillAndStroke(ctx, s, COLORS.pants);

  // Lower leg (pants lighter)
  ctx.beginPath();
  ctx.roundRect(-s * 0.05, s * 0.15, s * 0.1, s * 0.12, s * 0.03);
  fillAndStroke(ctx, s, COLORS.pantsLight);

  // Sneaker
  drawSneaker(ctx, s);

  ctx.restore();
}

function drawSneaker(ctx: CanvasRenderingContext2D, s: number) {
  const shoeTop = s * 0.26;
  const shoeW = s * 0.14;
  const shoeH = s * 0.08;

  // Sole (dark, slightly wider and lower)
  ctx.beginPath();
  ctx.roundRect(-s * 0.04, shoeTop + shoeH * 0.6, shoeW + s * 0.01, shoeH * 0.5, s * 0.015);
  fillAndStroke(ctx, s, COLORS.shoeSole);

  // Upper (white shoe body with curved toe)
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, shoeTop + shoeH * 0.7);
  ctx.lineTo(-s * 0.04, shoeTop);
  ctx.quadraticCurveTo(-s * 0.04, shoeTop - s * 0.02, s * 0.0, shoeTop - s * 0.02);
  ctx.quadraticCurveTo(shoeW * 0.7, shoeTop - s * 0.02, shoeW + s * 0.01, shoeTop + shoeH * 0.3);
  ctx.lineTo(shoeW + s * 0.01, shoeTop + shoeH * 0.7);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.shoeWhite);

  // Accent line on toe cap
  ctx.beginPath();
  ctx.moveTo(s * 0.03, shoeTop + shoeH * 0.1);
  ctx.quadraticCurveTo(shoeW * 0.6, shoeTop, shoeW, shoeTop + shoeH * 0.4);
  ctx.strokeStyle = COLORS.shoeAccent;
  ctx.lineWidth = s * 0.015;
  ctx.lineCap = "round";
  ctx.stroke();
}

// --- SPIN BALL (cartoon style with hair spikes and glasses) ---
function drawSpinBall(ctx: CanvasRenderingContext2D, s: number, angle: number, animator: MetalSonicAnimator) {
  const radius = s * 0.45;

  // Flat burgundy ball with thick outline
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shirtBurgundy;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * OUTLINE_W * 1.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Rotating elements
  ctx.save();
  ctx.rotate(angle);

  // Hair spikes visible around the ball
  const spikeCount = 5;
  for (let i = 0; i < spikeCount; i++) {
    const a = (i / spikeCount) * Math.PI * 2;
    const baseR = radius * 0.85;
    const tipR = radius * 1.2;
    const sideAngle = 0.25;

    ctx.beginPath();
    ctx.moveTo(Math.cos(a - sideAngle) * baseR, Math.sin(a - sideAngle) * baseR);
    ctx.quadraticCurveTo(
      Math.cos(a) * tipR * 1.1, Math.sin(a) * tipR * 1.1,
      Math.cos(a) * tipR, Math.sin(a) * tipR,
    );
    ctx.quadraticCurveTo(
      Math.cos(a) * tipR * 1.1, Math.sin(a) * tipR * 1.1,
      Math.cos(a + sideAngle) * baseR, Math.sin(a + sideAngle) * baseR,
    );
    ctx.closePath();
    fillAndStroke(ctx, s, COLORS.hair);
  }

  // Glasses silhouette visible on ball
  const gW = radius * 0.3;
  const gH = radius * 0.22;
  const gBridge = radius * 0.06;
  ctx.lineWidth = s * 0.03;
  ctx.strokeStyle = COLORS.glassesFrame;
  ctx.beginPath();
  ctx.roundRect(-gW - gBridge, -gH / 2, gW, gH, s * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(gBridge, -gH / 2, gW, gH, s * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-gBridge, 0);
  ctx.lineTo(gBridge, 0);
  ctx.stroke();

  ctx.restore();

  // Motion lines (arcs around the ball)
  ctx.save();
  ctx.rotate(angle * 0.5);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = s * 0.02;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + animator.time * 8;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.3, a, a + 0.5);
    ctx.stroke();
  }
  ctx.restore();
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

  // Legs with sneakers
  for (const offX of [-s * 0.1, s * 0.1]) {
    // Pants
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.04, s * 0.26, s * 0.08, s * 0.14, s * 0.03);
    ctx.fillStyle = COLORS.pants;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.025;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Sneaker upper
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.03, s * 0.39, s * 0.1, s * 0.05, s * 0.02);
    ctx.fillStyle = COLORS.shoeWhite;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.02;
    ctx.stroke();

    // Sneaker sole
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.03, s * 0.43, s * 0.1, s * 0.025, s * 0.01);
    ctx.fillStyle = COLORS.shoeSole;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.stroke();
  }

  // Body (bicolor with outline)
  const bw = s * 0.32;
  const bh = s * 0.28;
  const bodyTop = -s * 0.22;
  const cornerR = s * 0.05;

  ctx.beginPath();
  ctx.roundRect(-bw / 2, bodyTop, bw, bh, cornerR);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = COLORS.shirtBurgundy;
  ctx.fillRect(-bw / 2, bodyTop, bw, bh * 0.55);
  ctx.fillStyle = COLORS.shirtWhite;
  ctx.fillRect(-bw / 2, bodyTop + bh * 0.55, bw, bh * 0.45);
  ctx.restore();

  ctx.beginPath();
  ctx.roundRect(-bw / 2, bodyTop, bw, bh, cornerR);
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.025;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Head (larger for chibi)
  const headY = -s * 0.36;
  const headR = s * 0.24;

  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.skin;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.025;
  ctx.stroke();

  // Hair base
  ctx.beginPath();
  ctx.arc(0, headY, headR * 1.05, Math.PI * 0.95, Math.PI * 0.05, true);
  ctx.lineTo(headR * 0.8, headY - headR * 0.3);
  ctx.lineTo(-headR * 0.8, headY - headR * 0.3);
  ctx.closePath();
  ctx.fillStyle = COLORS.hair;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.02;
  ctx.stroke();

  // Spikes (simplified for preview)
  const spikes = [
    { x: 0, y: -1.35, cx: 0.05, cy: -1.5 },
    { x: -0.35, y: -1.2, cx: -0.4, cy: -1.4 },
    { x: 0.35, y: -1.15, cx: 0.45, cy: -1.35 },
    { x: 0.7, y: -0.7, cx: 0.95, cy: -0.95 },
    { x: -0.65, y: -0.55, cx: -0.9, cy: -0.8 },
  ];
  for (const spike of spikes) {
    ctx.beginPath();
    ctx.moveTo(spike.x * headR * 0.6 - headR * 0.1, headY + spike.y * headR * 0.55 + headR * 0.2);
    ctx.quadraticCurveTo(
      spike.cx * headR, headY + spike.cy * headR * 0.6,
      spike.x * headR * 0.6 + headR * 0.1, headY + spike.y * headR * 0.55 + headR * 0.2,
    );
    ctx.closePath();
    ctx.fillStyle = COLORS.hair;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.stroke();
  }

  // Glasses (thick frames)
  const glassY = headY + headR * 0.0;
  const glassW = headR * 0.38;
  const glassH = headR * 0.3;
  const bridge = headR * 0.07;

  ctx.lineWidth = s * 0.035;
  ctx.strokeStyle = COLORS.glassesFrame;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect(-glassW - bridge, glassY - glassH / 2, glassW, glassH, s * 0.02);
  ctx.fillStyle = COLORS.glassesLens;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(bridge, glassY - glassH / 2, glassW, glassH, s * 0.02);
  ctx.fillStyle = COLORS.glassesLens;
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
    ctx.fillStyle = COLORS.outline;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX + s * 0.02, glassY - glassH * 0.05, s * 0.01, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  // Smile with outline
  const mouthY = headY + headR * 0.45;
  ctx.beginPath();
  ctx.ellipse(s * 0.01, mouthY, headR * 0.28, headR * 0.15, 0, 0, Math.PI);
  ctx.fillStyle = COLORS.mouthRed;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.02;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(s * 0.01, mouthY, headR * 0.22, headR * 0.06, 0, 0, Math.PI, true);
  ctx.fillStyle = COLORS.teeth;
  ctx.fill();

  ctx.restore();
}
