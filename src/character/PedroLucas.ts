import { Renderer } from "../core/Renderer";
import { MetalSonicAnimator } from "./MetalSonicAnimator";

const BODY_HEIGHT = 40;
const SCALE = 0.025;

// Chibi proportions
const HEAD_RATIO = 0.38;
const BODY_RATIO = 0.32;
const LEG_RATIO = 0.30;

// Flat color palette — Sonic-inspired clothing tones
const COLORS = {
  skin: "#c68642",
  skinLight: "#d9a066",
  skinShadow: "#a56b35",
  hair: "#1a1a1a",
  hairHighlight: "#2a2a2a",
  glassesFrame: "#2a2a3a",
  glassesLens: "rgba(200,220,255,0.15)",
  shirtBurgundy: "#1560bd",    // Sonic cobalt blue (top half)
  shirtWhite: "#f5e6c8",       // Sonic peach/cream belly tone (bottom half)
  pants: "#0e3d8c",            // Darker Sonic blue
  pantsLight: "#1a4fa0",       // Slightly lighter Sonic blue
  belt: "#c8a832",             // Golden yellow (like Sonic's buckles)
  beltBuckle: "#ffd700",       // Bright gold buckle
  shoeDark: "#cc1520",         // Sonic's iconic red shoes
  shoeSole: "#f0f0f0",         // White sole
  shoeAccent: "#991010",       // Darker red accent
  shoeLace: "#ffffff",         // White laces (like Sonic's shoe stripe)
  mouthRed: "#cc3333",
  mouthDark: "#8b1a1a",
  teeth: "#ffffff",
  outline: "#111111",
};

// Super form color overrides (golden palette — all parts get yellow tint)
const SUPER_OVERRIDES: Partial<typeof COLORS> = {
  skin: "#e0c060",
  skinLight: "#eed080",
  skinShadow: "#c4a040",
  hair: "#8b7500",
  hairHighlight: "#a08800",
  glassesFrame: "#4a4020",
  shirtBurgundy: "#b8960e",
  shirtWhite: "#fff8d0",
  pants: "#8a7008",
  pantsLight: "#9a800a",
  belt: "#ddc040",
  beltBuckle: "#ffe830",
  shoeDark: "#a08000",
  shoeAccent: "#806000",
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
  superForm: boolean = false,
  superFade: number = 0,
) {
  if (invincible && !invincibilityFlicker && !superForm) return;

  // Temporarily apply super color overrides
  const savedColors = superForm ? { ...COLORS } : null;
  if (superForm) {
    Object.assign(COLORS, SUPER_OVERRIDES);
  }

  const ctx = r.ctx;
  const sx = r.worldToScreenX(x);
  const sy = r.worldToScreenY(y);
  const s = r.zoom * SCALE * BODY_HEIGHT;
  const dir = facingRight ? 1 : -1;

  ctx.save();
  ctx.translate(sx, sy);

  // Aura glow during super form or fade-out
  if (superForm || superFade > 0) {
    const now = performance.now();
    const auraAlpha = superForm ? 0.4 + Math.sin(now * 0.006) * 0.15 : superFade * 0.3;
    const auraRadius = s * 2.0 + Math.sin(now * 0.004) * s * 0.3;
    const gradient = ctx.createRadialGradient(0, -s * 0.2, s * 0.2, 0, -s * 0.2, auraRadius);
    gradient.addColorStop(0, `rgba(255, 220, 50, ${auraAlpha})`);
    gradient.addColorStop(0.4, `rgba(255, 200, 30, ${auraAlpha * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 180, 0, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // Golden sparkles orbiting the character
    if (superForm) {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + now * 0.003;
        const orbitR = s * 1.2 + Math.sin(now * 0.005 + i * 1.5) * s * 0.3;
        const sparkX = Math.cos(angle) * orbitR;
        const sparkY = -s * 0.2 + Math.sin(angle) * orbitR * 0.6;
        const sparkSize = s * 0.06 + Math.sin(now * 0.01 + i * 2) * s * 0.03;
        const sparkAlpha = 0.6 + Math.sin(now * 0.008 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 100, ${sparkAlpha})`;
        ctx.fill();
      }
    }
  }

  ctx.scale(dir, 1);

  if (isSpinning) {
    drawSpinBall(ctx, s, animator.spinAngle, animator);
    ctx.restore();
    if (savedColors) Object.assign(COLORS, savedColors);
    return;
  }

  if (!animator.flickerVisible) {
    ctx.restore();
    if (savedColors) Object.assign(COLORS, savedColors);
    return;
  }

  // [10] Ground shadow (drawn before lean/squash so it stays flat)
  ctx.beginPath();
  ctx.ellipse(0, s * 0.48, s * 0.35, s * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fill();

  const lean = animator.bodyLean;
  ctx.rotate(-lean * dir);

  // Apply squash/stretch
  const ss = animator.squashStretch;
  if (ss !== 1.0) {
    ctx.scale(1 / ss, ss);
  }

  drawLeg(ctx, s, 0.15 * s, animator.leftLegAngle);
  drawLeg(ctx, s, -0.15 * s, animator.rightLegAngle);
  drawPantsWaist(ctx, s);
  drawNeck(ctx, s);
  drawBody(ctx, s, animator);
  drawShirtTail(ctx, s, animator);
  drawShoulder(ctx, s, true);
  drawShoulder(ctx, s, false);
  drawArm(ctx, s, animator.leftArmAngle, true, animator);
  drawArm(ctx, s, animator.rightArmAngle, false, animator);
  drawHead(ctx, s, animator.breathOffset * s * 0.02, animator);

  ctx.restore();

  // Restore original colors
  if (savedColors) {
    Object.assign(COLORS, savedColors);
  }
}

// --- NECK (connects head to body) ---
function drawNeck(ctx: CanvasRenderingContext2D, s: number) {
  const neckW = s * 0.14;
  const neckH = s * 0.10;
  const neckY = -s * 0.50;

  ctx.beginPath();
  ctx.roundRect(-neckW / 2, neckY, neckW, neckH, s * 0.03);
  fillAndStroke(ctx, s, COLORS.skin);
}

// --- BODY (bicolor shirt with outline + collar) ---
function drawBody(ctx: CanvasRenderingContext2D, s: number, animator: MetalSonicAnimator) {
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

  // [5] Collar / crew neckline at top of shirt
  const collarY = bodyTop + s * 0.015;
  const collarW = s * 0.16;
  ctx.beginPath();
  ctx.arc(0, collarY, collarW / 2, 0.15, Math.PI - 0.15);
  ctx.strokeStyle = COLORS.skinShadow;
  ctx.lineWidth = s * 0.02;
  ctx.lineCap = "round";
  ctx.stroke();
}

// --- SHIRT TAIL (subtle physics when running) ---
function drawShirtTail(ctx: CanvasRenderingContext2D, s: number, animator: MetalSonicAnimator) {
  if (animator.currentState !== "running" && animator.currentState !== "skidding") return;

  const bw = s * 0.52;
  const bodyBottom = -s * 0.45 + s * BODY_RATIO;
  const wave = Math.sin(animator.time * 12) * s * 0.012;
  const wave2 = Math.sin(animator.time * 15 + 1.5) * s * 0.008;

  ctx.beginPath();
  ctx.moveTo(-bw / 2 + s * 0.02, bodyBottom - s * 0.01);
  ctx.quadraticCurveTo(-bw / 4, bodyBottom + s * 0.025 + wave, 0, bodyBottom + s * 0.01 + wave2);
  ctx.quadraticCurveTo(bw / 4, bodyBottom + s * 0.025 - wave, bw / 2 - s * 0.02, bodyBottom - s * 0.01);
  ctx.closePath();
  ctx.fillStyle = COLORS.shirtWhite;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.012;
  ctx.lineJoin = "round";
  ctx.stroke();
}

// --- SHOULDER (connects body to arm) ---
function drawShoulder(ctx: CanvasRenderingContext2D, s: number, isLeft: boolean) {
  const side = isLeft ? -1 : 1;
  const bodyEdgeX = side * s * 0.26;  // body half-width
  const armX = side * s * 0.44;       // arm pivot
  const shoulderY = -s * 0.38;

  // Rounded shoulder pad bridging body edge to arm origin
  const cx = (bodyEdgeX + armX) / 2;
  const rx = Math.abs(armX - bodyEdgeX) / 2 + s * 0.04; // slightly wider than the gap
  const ry = s * 0.08;

  ctx.beginPath();
  ctx.ellipse(cx, shoulderY + s * 0.02, rx, ry, 0, 0, Math.PI * 2);
  fillAndStroke(ctx, s, COLORS.shirtBurgundy);
}

// --- HEAD (larger, flat skin, outline) ---
function drawHead(ctx: CanvasRenderingContext2D, s: number, breathY: number, animator: MetalSonicAnimator) {
  const headY = -s * 0.68 + breathY;
  const headR = s * HEAD_RATIO;

  // Skin - flat color with outline
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  fillAndStroke(ctx, s, COLORS.skin);

  // [8] Hair (natural messy style — with wind reactivity)
  drawHair(ctx, s, headY, headR, animator);

  // Glasses (with shake during running)
  const glassShake = animator.currentState === "running" ?
    Math.sin(animator.time * 18) * s * 0.003 : 0;
  drawGlasses(ctx, s, headY + glassShake, headR, animator);

  // [2] Nose (small subtle triangle between glasses and mouth)
  const noseY = headY + headR * 0.25;
  ctx.beginPath();
  ctx.moveTo(s * 0.01, noseY - headR * 0.05);
  ctx.lineTo(s * 0.04, noseY + headR * 0.03);
  ctx.lineTo(-s * 0.01, noseY + headR * 0.03);
  ctx.closePath();
  ctx.fillStyle = COLORS.skinShadow;
  ctx.fill();

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

// --- HAIR (natural messy/tousled style — with wind tilt when running) ---
function drawHair(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number, animator: MetalSonicAnimator) {
  ctx.save();

  // [8] Wind tilt when running — hair leans backward
  if (animator.currentState === "running" || animator.currentState === "skidding") {
    const tilt = animator.currentState === "skidding" ? 0.12 : -0.1;
    ctx.translate(0, headY);
    ctx.rotate(tilt);
    ctx.translate(0, -headY);
  }

  // Main hair mass covering the top of the head — natural, full coverage
  ctx.beginPath();
  ctx.moveTo(-headR * 0.95, headY + headR * 0.15);
  // Left side going up
  ctx.quadraticCurveTo(-headR * 1.05, headY - headR * 0.2, -headR * 0.85, headY - headR * 0.6);
  // Top-left tuft (subtle bump)
  ctx.quadraticCurveTo(-headR * 0.75, headY - headR * 0.95, -headR * 0.5, headY - headR * 0.85);
  // Center-left dip
  ctx.quadraticCurveTo(-headR * 0.35, headY - headR * 0.78, -headR * 0.2, headY - headR * 0.88);
  // Center tuft (slightly taller — the main messy tuft)
  ctx.quadraticCurveTo(-headR * 0.05, headY - headR * 1.08, headR * 0.1, headY - headR * 0.9);
  // Center-right dip
  ctx.quadraticCurveTo(headR * 0.2, headY - headR * 0.8, headR * 0.35, headY - headR * 0.88);
  // Right tuft
  ctx.quadraticCurveTo(headR * 0.55, headY - headR * 1.0, headR * 0.7, headY - headR * 0.78);
  // Far right going down
  ctx.quadraticCurveTo(headR * 0.9, headY - headR * 0.55, headR * 1.0, headY - headR * 0.15);
  // Right side down
  ctx.quadraticCurveTo(headR * 1.05, headY + headR * 0.05, headR * 0.95, headY + headR * 0.15);
  // Close across forehead (hair falls over forehead)
  ctx.quadraticCurveTo(headR * 0.5, headY - headR * 0.15, 0, headY - headR * 0.2);
  ctx.quadraticCurveTo(-headR * 0.5, headY - headR * 0.15, -headR * 0.95, headY + headR * 0.15);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Side hair tuft left (small strand hanging down)
  ctx.beginPath();
  ctx.moveTo(-headR * 0.85, headY - headR * 0.1);
  ctx.quadraticCurveTo(-headR * 1.05, headY + headR * 0.0, -headR * 0.92, headY + headR * 0.25);
  ctx.quadraticCurveTo(-headR * 0.85, headY + headR * 0.15, -headR * 0.8, headY + headR * 0.0);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Side hair tuft right (small strand)
  ctx.beginPath();
  ctx.moveTo(headR * 0.85, headY - headR * 0.1);
  ctx.quadraticCurveTo(headR * 1.05, headY + headR * 0.0, headR * 0.92, headY + headR * 0.25);
  ctx.quadraticCurveTo(headR * 0.85, headY + headR * 0.15, headR * 0.8, headY + headR * 0.0);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Small accent tufts on top for messy texture
  // Top-left small spike
  ctx.beginPath();
  ctx.moveTo(-headR * 0.6, headY - headR * 0.82);
  ctx.quadraticCurveTo(-headR * 0.55, headY - headR * 1.0, -headR * 0.4, headY - headR * 0.92);
  ctx.quadraticCurveTo(-headR * 0.45, headY - headR * 0.85, -headR * 0.6, headY - headR * 0.82);
  ctx.closePath();
  ctx.fillStyle = COLORS.hair;
  ctx.fill();

  // Top-right small spike
  ctx.beginPath();
  ctx.moveTo(headR * 0.45, headY - headR * 0.85);
  ctx.quadraticCurveTo(headR * 0.55, headY - headR * 1.05, headR * 0.65, headY - headR * 0.88);
  ctx.quadraticCurveTo(headR * 0.6, headY - headR * 0.82, headR * 0.45, headY - headR * 0.85);
  ctx.closePath();
  ctx.fillStyle = COLORS.hair;
  ctx.fill();

  // Subtle highlight for volume
  ctx.beginPath();
  ctx.moveTo(-headR * 0.3, headY - headR * 0.75);
  ctx.quadraticCurveTo(-headR * 0.1, headY - headR * 0.9, headR * 0.1, headY - headR * 0.75);
  ctx.quadraticCurveTo(0, headY - headR * 0.65, -headR * 0.3, headY - headR * 0.75);
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
      // Normal / happy eyes: brown dots with white highlight
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.02, glassY + glassH * 0.05, s * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = "#3a2518";
      ctx.fill();
      // Dark pupil center
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.02, glassY + glassH * 0.05, s * 0.025, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.arc(eyeX + s * 0.035, glassY - glassH * 0.05, s * 0.015, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // [3] Subtle eyebrow for normal/happy expression
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.02;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(eyeX - s * 0.035, glassY - glassH * 0.38);
      ctx.quadraticCurveTo(eyeX + s * 0.01, glassY - glassH * 0.45, eyeX + s * 0.04, glassY - glassH * 0.38);
      ctx.stroke();
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
    // Normal/happy: big wide grin showing teeth (matching reference)
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.35, headR * 0.2, 0, 0, Math.PI);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();

    // Teeth (upper row — wide, matching the big grin in reference)
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.3, headR * 0.1, 0, 0, Math.PI, true);
    ctx.fillStyle = COLORS.teeth;
    ctx.fill();

    // Tooth lines
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = s * 0.01;
    for (let i = -2; i <= 2; i++) {
      const tx = s * 0.02 + i * headR * 0.1;
      ctx.beginPath();
      ctx.moveTo(tx, mouthY - headR * 0.1);
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

  // Sleeve (burgundy shirt short sleeve)
  ctx.beginPath();
  ctx.roundRect(-s * 0.06, 0, s * 0.12, s * 0.13, s * 0.04);
  fillAndStroke(ctx, s, COLORS.shirtBurgundy);

  // Exposed upper arm below sleeve (skin)
  ctx.beginPath();
  ctx.roundRect(-s * 0.05, s * 0.10, s * 0.10, s * 0.10, s * 0.035);
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

// --- PANTS WAIST (connects shirt to legs + belt) ---
function drawPantsWaist(ctx: CanvasRenderingContext2D, s: number) {
  const bodyBottom = -s * 0.45 + s * BODY_RATIO; // where shirt ends
  const pantsTop = bodyBottom - s * 0.03; // overlap slightly under shirt
  const pantsBottom = s * 0.18; // overlap with leg tops
  const pantsH = pantsBottom - pantsTop;
  const topW = s * 0.50; // match body width at top
  const bottomW = s * 0.42; // taper toward legs

  // Main pants area
  ctx.beginPath();
  ctx.moveTo(-topW / 2, pantsTop);
  ctx.lineTo(topW / 2, pantsTop);
  ctx.lineTo(bottomW / 2, pantsBottom);
  ctx.lineTo(-bottomW / 2, pantsBottom);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.pants);

  // Inner leg seam / crotch line
  ctx.beginPath();
  ctx.moveTo(0, pantsTop + pantsH * 0.5);
  ctx.lineTo(0, pantsBottom);
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.015;
  ctx.lineCap = "round";
  ctx.stroke();

  // [4] Belt
  const beltY = pantsTop;
  const beltH = s * 0.03;
  ctx.beginPath();
  ctx.moveTo(-topW / 2, beltY);
  ctx.lineTo(topW / 2, beltY);
  ctx.lineTo(topW / 2, beltY + beltH);
  ctx.lineTo(-topW / 2, beltY + beltH);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.belt);

  // Belt buckle (small rectangle in center)
  const buckleW = s * 0.04;
  const buckleH = s * 0.035;
  ctx.beginPath();
  ctx.roundRect(-buckleW / 2, beltY - s * 0.002, buckleW, buckleH, s * 0.005);
  fillAndStroke(ctx, s, COLORS.beltBuckle);
}

// --- LEGS + DARK SHOES (matching reference + pocket detail) ---
function drawLeg(ctx: CanvasRenderingContext2D, s: number, offsetX: number, angle: number) {
  const hipY = s * 0.1;

  ctx.save();
  ctx.translate(offsetX, hipY);
  ctx.rotate(angle);

  // Upper leg (pants)
  ctx.beginPath();
  ctx.roundRect(-s * 0.055, 0, s * 0.11, s * 0.18, s * 0.04);
  fillAndStroke(ctx, s, COLORS.pants);

  // [6] Pocket outline on upper leg
  ctx.beginPath();
  ctx.moveTo(-s * 0.03, s * 0.03);
  ctx.lineTo(s * 0.02, s * 0.03);
  ctx.lineTo(s * 0.025, s * 0.075);
  ctx.lineTo(-s * 0.025, s * 0.075);
  ctx.closePath();
  ctx.strokeStyle = COLORS.pantsLight;
  ctx.lineWidth = s * 0.01;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Lower leg (pants lighter)
  ctx.beginPath();
  ctx.roundRect(-s * 0.05, s * 0.15, s * 0.1, s * 0.12, s * 0.03);
  fillAndStroke(ctx, s, COLORS.pantsLight);

  // [6] Knee seam
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, s * 0.155);
  ctx.lineTo(s * 0.04, s * 0.155);
  ctx.strokeStyle = COLORS.pants;
  ctx.lineWidth = s * 0.008;
  ctx.lineCap = "round";
  ctx.stroke();

  // Shoe (dark with light sole + laces)
  drawShoe(ctx, s);

  ctx.restore();
}

function drawShoe(ctx: CanvasRenderingContext2D, s: number) {
  const shoeTop = s * 0.26;
  const shoeW = s * 0.14;
  const shoeH = s * 0.08;

  // Sole (light-colored, slightly wider and lower)
  ctx.beginPath();
  ctx.roundRect(-s * 0.04, shoeTop + shoeH * 0.6, shoeW + s * 0.01, shoeH * 0.5, s * 0.015);
  fillAndStroke(ctx, s, COLORS.shoeSole);

  // Upper (dark shoe body with curved toe)
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, shoeTop + shoeH * 0.7);
  ctx.lineTo(-s * 0.04, shoeTop);
  ctx.quadraticCurveTo(-s * 0.04, shoeTop - s * 0.02, s * 0.0, shoeTop - s * 0.02);
  ctx.quadraticCurveTo(shoeW * 0.7, shoeTop - s * 0.02, shoeW + s * 0.01, shoeTop + shoeH * 0.3);
  ctx.lineTo(shoeW + s * 0.01, shoeTop + shoeH * 0.7);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.shoeDark);

  // Subtle accent line on shoe
  ctx.beginPath();
  ctx.moveTo(s * 0.03, shoeTop + shoeH * 0.1);
  ctx.quadraticCurveTo(shoeW * 0.6, shoeTop, shoeW, shoeTop + shoeH * 0.4);
  ctx.strokeStyle = COLORS.shoeAccent;
  ctx.lineWidth = s * 0.012;
  ctx.lineCap = "round";
  ctx.stroke();

  // [7] Shoe laces (small horizontal lines)
  ctx.strokeStyle = COLORS.shoeLace;
  ctx.lineWidth = s * 0.007;
  ctx.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const laceY = shoeTop + shoeH * (0.05 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(s * 0.005, laceY);
    ctx.lineTo(s * 0.04, laceY);
    ctx.stroke();
  }
  // Lace knot (small dot)
  ctx.beginPath();
  ctx.arc(s * 0.022, shoeTop - s * 0.005, s * 0.008, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shoeLace;
  ctx.fill();
}

// --- SPIN BALL (improved with color segments and shoe glimpse) ---
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

  // [11] Alternating color segments (shirt white, pants, skin visible during spin)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius - s * 0.01, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(angle);

  const segCount = 5;
  const segColors = [COLORS.shirtWhite, COLORS.pants, COLORS.skin, COLORS.shirtWhite, COLORS.pants];
  for (let i = 0; i < segCount; i++) {
    const segAngle = (i / segCount) * Math.PI * 2;
    const segWidth = Math.PI / segCount * 0.7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, segAngle, segAngle + segWidth);
    ctx.closePath();
    ctx.fillStyle = segColors[i];
    ctx.globalAlpha = 0.4;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Shoe glimpse rotating
  const shoeAngle = Math.PI * 0.75;
  const shoeX = Math.cos(shoeAngle) * radius * 0.6;
  const shoeY = Math.sin(shoeAngle) * radius * 0.6;
  ctx.beginPath();
  ctx.ellipse(shoeX, shoeY, radius * 0.12, radius * 0.08, shoeAngle, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shoeDark;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.012;
  ctx.stroke();
  // Sole accent
  ctx.beginPath();
  ctx.ellipse(shoeX + radius * 0.06, shoeY + radius * 0.04, radius * 0.06, radius * 0.03, shoeAngle, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shoeSole;
  ctx.fill();

  ctx.restore();

  // Rotating elements (on top of ball)
  ctx.save();
  ctx.rotate(angle);

  // Hair tufts visible around the ball (softer than before)
  const tuftCount = 6;
  for (let i = 0; i < tuftCount; i++) {
    const a = (i / tuftCount) * Math.PI * 2;
    const baseR = radius * 0.88;
    const tipR = radius * 1.12;
    const sideAngle = 0.2;

    ctx.beginPath();
    ctx.moveTo(Math.cos(a - sideAngle) * baseR, Math.sin(a - sideAngle) * baseR);
    ctx.quadraticCurveTo(
      Math.cos(a) * tipR * 1.05, Math.sin(a) * tipR * 1.05,
      Math.cos(a) * tipR, Math.sin(a) * tipR,
    );
    ctx.quadraticCurveTo(
      Math.cos(a) * tipR * 1.05, Math.sin(a) * tipR * 1.05,
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

  // [10] Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, s * 0.48, s * 0.28, s * 0.04, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();

  // Legs with dark shoes
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

    // [6] Pocket line on preview pants
    ctx.beginPath();
    ctx.moveTo(offX - s * 0.02, s * 0.28);
    ctx.lineTo(offX + s * 0.01, s * 0.28);
    ctx.lineTo(offX + s * 0.012, s * 0.32);
    ctx.lineTo(offX - s * 0.018, s * 0.32);
    ctx.closePath();
    ctx.strokeStyle = COLORS.pantsLight;
    ctx.lineWidth = s * 0.008;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Shoe upper (dark)
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.03, s * 0.39, s * 0.1, s * 0.05, s * 0.02);
    ctx.fillStyle = COLORS.shoeDark;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.02;
    ctx.stroke();

    // [7] Shoe lace on preview
    ctx.strokeStyle = COLORS.shoeLace;
    ctx.lineWidth = s * 0.006;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(offX - s * 0.005, s * 0.395);
    ctx.lineTo(offX + s * 0.025, s * 0.395);
    ctx.stroke();

    // Shoe sole (light)
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.03, s * 0.43, s * 0.1, s * 0.025, s * 0.01);
    ctx.fillStyle = COLORS.shoeSole;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.stroke();
  }

  // Pants waist (fills gap between shirt and legs)
  {
    const pwTop = s * 0.04;
    const pwBottom = s * 0.30;
    const pwTopW = s * 0.30;
    const pwBottomW = s * 0.26;

    ctx.beginPath();
    ctx.moveTo(-pwTopW / 2, pwTop);
    ctx.lineTo(pwTopW / 2, pwTop);
    ctx.lineTo(pwBottomW / 2, pwBottom);
    ctx.lineTo(-pwBottomW / 2, pwBottom);
    ctx.closePath();
    ctx.fillStyle = COLORS.pants;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.02;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Crotch seam
    ctx.beginPath();
    ctx.moveTo(0, pwTop + (pwBottom - pwTop) * 0.5);
    ctx.lineTo(0, pwBottom);
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.01;
    ctx.lineCap = "round";
    ctx.stroke();

    // [4] Belt on preview
    const beltH = s * 0.025;
    ctx.beginPath();
    ctx.rect(-pwTopW / 2, pwTop, pwTopW, beltH);
    ctx.fillStyle = COLORS.belt;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.012;
    ctx.stroke();

    // Belt buckle
    const buckleW = s * 0.03;
    const buckleH = s * 0.028;
    ctx.beginPath();
    ctx.roundRect(-buckleW / 2, pwTop - s * 0.002, buckleW, buckleH, s * 0.004);
    ctx.fillStyle = COLORS.beltBuckle;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.008;
    ctx.stroke();
  }

  // [1] Neck on preview
  {
    const neckW = s * 0.10;
    const neckH = s * 0.06;
    const neckY = -s * 0.25;
    ctx.beginPath();
    ctx.roundRect(-neckW / 2, neckY, neckW, neckH, s * 0.02);
    ctx.fillStyle = COLORS.skin;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.lineJoin = "round";
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

  // [5] Collar on preview
  const collarY = bodyTop + s * 0.01;
  const collarW = s * 0.12;
  ctx.beginPath();
  ctx.arc(0, collarY, collarW / 2, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = COLORS.skinShadow;
  ctx.lineWidth = s * 0.015;
  ctx.lineCap = "round";
  ctx.stroke();

  // Shoulders + arms on preview
  for (const side of [-1, 1]) {
    const bodyEdge = side * bw / 2;
    const armPivotX = side * s * 0.28;
    const shoulderCx = (bodyEdge + armPivotX) / 2;
    const shoulderY = bodyTop + s * 0.04;

    // Shoulder pad
    ctx.beginPath();
    ctx.ellipse(shoulderCx, shoulderY, s * 0.06, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.shirtBurgundy;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.018;
    ctx.stroke();

    // Sleeve
    ctx.beginPath();
    ctx.roundRect(armPivotX - s * 0.04, shoulderY - s * 0.01, s * 0.08, s * 0.09, s * 0.025);
    ctx.fillStyle = COLORS.shirtBurgundy;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Exposed arm (skin)
    ctx.beginPath();
    ctx.roundRect(armPivotX - s * 0.035, shoulderY + s * 0.07, s * 0.07, s * 0.08, s * 0.025);
    ctx.fillStyle = COLORS.skinLight;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.012;
    ctx.stroke();

    // Hand
    ctx.beginPath();
    ctx.arc(armPivotX, shoulderY + s * 0.18, s * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.skin;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.012;
    ctx.stroke();
  }

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

  // Hair — natural messy style (matching main character)
  ctx.beginPath();
  ctx.moveTo(-headR * 0.95, headY + headR * 0.15);
  ctx.quadraticCurveTo(-headR * 1.05, headY - headR * 0.2, -headR * 0.85, headY - headR * 0.6);
  ctx.quadraticCurveTo(-headR * 0.75, headY - headR * 0.95, -headR * 0.5, headY - headR * 0.85);
  ctx.quadraticCurveTo(-headR * 0.35, headY - headR * 0.78, -headR * 0.2, headY - headR * 0.88);
  ctx.quadraticCurveTo(-headR * 0.05, headY - headR * 1.08, headR * 0.1, headY - headR * 0.9);
  ctx.quadraticCurveTo(headR * 0.2, headY - headR * 0.8, headR * 0.35, headY - headR * 0.88);
  ctx.quadraticCurveTo(headR * 0.55, headY - headR * 1.0, headR * 0.7, headY - headR * 0.78);
  ctx.quadraticCurveTo(headR * 0.9, headY - headR * 0.55, headR * 1.0, headY - headR * 0.15);
  ctx.quadraticCurveTo(headR * 1.05, headY + headR * 0.05, headR * 0.95, headY + headR * 0.15);
  ctx.quadraticCurveTo(headR * 0.5, headY - headR * 0.15, 0, headY - headR * 0.2);
  ctx.quadraticCurveTo(-headR * 0.5, headY - headR * 0.15, -headR * 0.95, headY + headR * 0.15);
  ctx.closePath();
  ctx.fillStyle = COLORS.hair;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.02;
  ctx.stroke();

  // Side tufts
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * headR * 0.85, headY - headR * 0.1);
    ctx.quadraticCurveTo(side * headR * 1.05, headY + headR * 0.0, side * headR * 0.92, headY + headR * 0.25);
    ctx.quadraticCurveTo(side * headR * 0.85, headY + headR * 0.15, side * headR * 0.8, headY + headR * 0.0);
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

  // Eyes with eyebrows
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

    // [3] Eyebrow on preview
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(eyeX - s * 0.025, glassY - glassH * 0.38);
    ctx.quadraticCurveTo(eyeX + s * 0.005, glassY - glassH * 0.44, eyeX + s * 0.03, glassY - glassH * 0.38);
    ctx.stroke();
  }

  // [2] Nose on preview
  const noseY = headY + headR * 0.25;
  ctx.beginPath();
  ctx.moveTo(s * 0.005, noseY - headR * 0.04);
  ctx.lineTo(s * 0.03, noseY + headR * 0.02);
  ctx.lineTo(-s * 0.01, noseY + headR * 0.02);
  ctx.closePath();
  ctx.fillStyle = COLORS.skinShadow;
  ctx.fill();

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
