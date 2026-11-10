import { Renderer } from "../core/Renderer";
import { MetalSonicAnimator } from "./MetalSonicAnimator";

const BODY_HEIGHT = 40;
const SCALE = 0.025;

// Chibi proportions (same as other characters for consistency)
const HEAD_RATIO = 0.38;
const BODY_RATIO = 0.32;
const LEG_RATIO = 0.30;

// Flat color palette — Vasco da Gama uniform
const COLORS = {
  skin: "#d4a574",
  skinLight: "#e0b88a",
  skinShadow: "#b88a5a",
  hair: "#1a1a1a",
  hairFade: "#333333",
  beard: "#2a2a2a",
  shirtWhite: "#ffffff",       // Vasco white jersey
  shirtStripe: "#111111",      // Vasco black diagonal stripe (faixa)
  shirtCollar: "#111111",      // V-neck collar
  shorts: "#111111",           // Black shorts
  shortsLight: "#1a1a1a",     // Lighter for detail
  shortsStripe: "#ffffff",     // White side stripe
  socks: "#ffffff",            // White socks
  socksBand: "#111111",        // Black band at top of socks
  shoeDark: "#111111",         // Black boots
  shoeSole: "#e0e0e0",        // Light gray sole
  shoeAccent: "#222222",       // Dark accent
  shoeLace: "#ffffff",         // White laces
  mouthRed: "#cc4444",
  mouthDark: "#8b1a1a",
  teeth: "#ffffff",
  outline: "#111111",
  vascoRed: "#C4161C",        // Vasco cross red (accent detail)
};

// Super form color overrides (golden palette)
const SUPER_OVERRIDES: Partial<typeof COLORS> = {
  hair: "#8b7500",
  hairFade: "#a08800",
  beard: "#6b5500",
  shirtWhite: "#fff8d0",
  shirtStripe: "#b8960e",
  shorts: "#8a7008",
  shortsLight: "#9a800a",
  socks: "#fff8d0",
  socksBand: "#b8960e",
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

export function drawChristian(
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
    const auraAlpha = superForm ? 0.3 + Math.sin(performance.now() * 0.006) * 0.1 : superFade * 0.3;
    const auraRadius = s * 1.8 + Math.sin(performance.now() * 0.004) * s * 0.2;
    const gradient = ctx.createRadialGradient(0, -s * 0.2, s * 0.2, 0, -s * 0.2, auraRadius);
    gradient.addColorStop(0, `rgba(255, 220, 50, ${auraAlpha})`);
    gradient.addColorStop(0.5, `rgba(255, 200, 30, ${auraAlpha * 0.4})`);
    gradient.addColorStop(1, `rgba(255, 180, 0, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, auraRadius, 0, Math.PI * 2);
    ctx.fill();
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

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, s * 0.48, s * 0.35, s * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fill();

  const lean = animator.bodyLean;
  ctx.rotate(-lean * dir);

  const ss = animator.squashStretch;
  if (ss !== 1.0) {
    ctx.scale(1 / ss, ss);
  }

  drawLeg(ctx, s, 0.15 * s, animator.leftLegAngle);
  drawLeg(ctx, s, -0.15 * s, animator.rightLegAngle);
  drawShortsWaist(ctx, s);
  drawNeck(ctx, s);
  drawBody(ctx, s, animator);
  drawShirtTail(ctx, s, animator);
  drawShoulder(ctx, s, true);
  drawShoulder(ctx, s, false);
  drawArm(ctx, s, animator.leftArmAngle, true, animator);
  drawArm(ctx, s, animator.rightArmAngle, false, animator);
  drawHead(ctx, s, animator.breathOffset * s * 0.02, animator);

  ctx.restore();

  if (savedColors) {
    Object.assign(COLORS, savedColors);
  }
}

// --- NECK ---
function drawNeck(ctx: CanvasRenderingContext2D, s: number) {
  const neckW = s * 0.14;
  const neckH = s * 0.10;
  const neckY = -s * 0.50;

  ctx.beginPath();
  ctx.roundRect(-neckW / 2, neckY, neckW, neckH, s * 0.03);
  fillAndStroke(ctx, s, COLORS.skin);
}

// --- BODY (white shirt with diagonal black stripe — Vasco da Gama) ---
function drawBody(ctx: CanvasRenderingContext2D, s: number, _animator: MetalSonicAnimator) {
  const bw = s * 0.52;
  const bh = s * BODY_RATIO;
  const bodyTop = -s * 0.45;
  const cornerR = s * 0.08;

  ctx.beginPath();
  ctx.roundRect(-bw / 2, bodyTop, bw, bh, cornerR);

  // Clip and fill
  ctx.save();
  ctx.clip();

  // White base
  ctx.fillStyle = COLORS.shirtWhite;
  ctx.fillRect(-bw / 2, bodyTop, bw, bh);

  // Diagonal black stripe (faixa do Vasco)
  // Goes from upper-right to lower-left (viewer perspective: right shoulder to left hip)
  const stripeW = bw * 0.32;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.1 - stripeW / 2, bodyTop - s * 0.02);
  ctx.lineTo(-bw * 0.1 + stripeW / 2, bodyTop - s * 0.02);
  ctx.lineTo(bw * 0.35 + stripeW / 2, bodyTop + bh + s * 0.02);
  ctx.lineTo(bw * 0.35 - stripeW / 2, bodyTop + bh + s * 0.02);
  ctx.closePath();
  ctx.fillStyle = COLORS.shirtStripe;
  ctx.fill();

  // Vasco red cross (simplified small Maltese cross on stripe)
  const crossX = bw * 0.05;
  const crossY = bodyTop + bh * 0.38;
  const crossSize = s * 0.04;
  ctx.fillStyle = COLORS.vascoRed;
  // Vertical bar
  ctx.fillRect(crossX - crossSize * 0.3, crossY - crossSize, crossSize * 0.6, crossSize * 2);
  // Horizontal bar
  ctx.fillRect(crossX - crossSize, crossY - crossSize * 0.3, crossSize * 2, crossSize * 0.6);

  ctx.restore();

  // Outline
  ctx.beginPath();
  ctx.roundRect(-bw / 2, bodyTop, bw, bh, cornerR);
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * OUTLINE_W;
  ctx.lineJoin = "round";
  ctx.stroke();

  // V-neck collar
  const collarY = bodyTop + s * 0.01;
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, collarY);
  ctx.lineTo(0, collarY + s * 0.06);
  ctx.lineTo(s * 0.08, collarY);
  ctx.strokeStyle = COLORS.shirtCollar;
  ctx.lineWidth = s * 0.025;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

// --- SHIRT TAIL (subtle flutter when running) ---
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

// --- SHOULDER ---
function drawShoulder(ctx: CanvasRenderingContext2D, s: number, isLeft: boolean) {
  const side = isLeft ? -1 : 1;
  const bodyEdgeX = side * s * 0.26;
  const armX = side * s * 0.44;
  const shoulderY = -s * 0.38;

  const cx = (bodyEdgeX + armX) / 2;
  const rx = Math.abs(armX - bodyEdgeX) / 2 + s * 0.04;
  const ry = s * 0.08;

  ctx.beginPath();
  ctx.ellipse(cx, shoulderY + s * 0.02, rx, ry, 0, 0, Math.PI * 2);
  fillAndStroke(ctx, s, COLORS.shirtWhite);
}

// --- HEAD ---
function drawHead(ctx: CanvasRenderingContext2D, s: number, breathY: number, animator: MetalSonicAnimator) {
  const headY = -s * 0.68 + breathY;
  const headR = s * HEAD_RATIO;

  // Skin
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  fillAndStroke(ctx, s, COLORS.skin);

  // Hair (short fade cut)
  drawHair(ctx, s, headY, headR, animator);

  // Eyebrows
  drawEyebrows(ctx, s, headY, headR, animator);

  // Eyes (no glasses — direct on face)
  drawEyes(ctx, s, headY, headR, animator);

  // Nose
  const noseY = headY + headR * 0.25;
  ctx.beginPath();
  ctx.moveTo(s * 0.01, noseY - headR * 0.05);
  ctx.lineTo(s * 0.04, noseY + headR * 0.03);
  ctx.lineTo(-s * 0.01, noseY + headR * 0.03);
  ctx.closePath();
  ctx.fillStyle = COLORS.skinShadow;
  ctx.fill();

  // Beard / stubble
  drawBeard(ctx, s, headY, headR);

  // Mouth
  drawMouth(ctx, s, headY, headR, animator);

  // Ears
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

// --- HAIR (short fade cut — shorter on sides, slightly longer on top) ---
function drawHair(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number, animator: MetalSonicAnimator) {
  ctx.save();

  // Subtle wind effect when running
  if (animator.currentState === "running" || animator.currentState === "skidding") {
    const tilt = animator.currentState === "skidding" ? 0.06 : -0.04;
    ctx.translate(0, headY);
    ctx.rotate(tilt);
    ctx.translate(0, -headY);
  }

  // Main hair mass — short, neat, covering top of head
  // Longer on top, faded on sides
  ctx.beginPath();
  // Start from left side (low — fade starts low)
  ctx.moveTo(-headR * 0.88, headY + headR * 0.05);
  // Left side going up (tight to head — fade)
  ctx.quadraticCurveTo(-headR * 0.92, headY - headR * 0.15, -headR * 0.82, headY - headR * 0.45);
  // Transition to top (volume increases)
  ctx.quadraticCurveTo(-headR * 0.75, headY - headR * 0.72, -headR * 0.5, headY - headR * 0.78);
  // Top — slightly styled, neat volume
  ctx.quadraticCurveTo(-headR * 0.25, headY - headR * 0.88, 0, headY - headR * 0.85);
  ctx.quadraticCurveTo(headR * 0.25, headY - headR * 0.86, headR * 0.5, headY - headR * 0.75);
  // Right side transition (back down to fade)
  ctx.quadraticCurveTo(headR * 0.7, headY - headR * 0.6, headR * 0.82, headY - headR * 0.4);
  // Right fade (tight to head)
  ctx.quadraticCurveTo(headR * 0.92, headY - headR * 0.15, headR * 0.88, headY + headR * 0.05);
  // Close across forehead (clean hairline)
  ctx.quadraticCurveTo(headR * 0.5, headY - headR * 0.25, 0, headY - headR * 0.28);
  ctx.quadraticCurveTo(-headR * 0.5, headY - headR * 0.25, -headR * 0.88, headY + headR * 0.05);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.hair);

  // Fade gradient on sides (lighter tone to show the short fade)
  // Left fade
  ctx.beginPath();
  ctx.moveTo(-headR * 0.88, headY + headR * 0.05);
  ctx.quadraticCurveTo(-headR * 0.92, headY - headR * 0.1, -headR * 0.85, headY - headR * 0.3);
  ctx.quadraticCurveTo(-headR * 0.78, headY - headR * 0.15, -headR * 0.75, headY + headR * 0.0);
  ctx.quadraticCurveTo(-headR * 0.8, headY + headR * 0.05, -headR * 0.88, headY + headR * 0.05);
  ctx.closePath();
  ctx.fillStyle = COLORS.hairFade;
  ctx.fill();

  // Right fade
  ctx.beginPath();
  ctx.moveTo(headR * 0.88, headY + headR * 0.05);
  ctx.quadraticCurveTo(headR * 0.92, headY - headR * 0.1, headR * 0.85, headY - headR * 0.3);
  ctx.quadraticCurveTo(headR * 0.78, headY - headR * 0.15, headR * 0.75, headY + headR * 0.0);
  ctx.quadraticCurveTo(headR * 0.8, headY + headR * 0.05, headR * 0.88, headY + headR * 0.05);
  ctx.closePath();
  ctx.fillStyle = COLORS.hairFade;
  ctx.fill();

  // Subtle top highlight for volume
  ctx.beginPath();
  ctx.moveTo(-headR * 0.3, headY - headR * 0.7);
  ctx.quadraticCurveTo(-headR * 0.05, headY - headR * 0.82, headR * 0.2, headY - headR * 0.7);
  ctx.quadraticCurveTo(headR * 0.05, headY - headR * 0.65, -headR * 0.3, headY - headR * 0.7);
  ctx.closePath();
  ctx.fillStyle = "#2a2a2a";
  ctx.fill();

  ctx.restore();
}

// --- BEARD (short goatee/stubble) ---
function drawBeard(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number) {
  ctx.save();

  // Jaw shadow / stubble area (subtle darker skin region)
  ctx.beginPath();
  ctx.moveTo(-headR * 0.55, headY + headR * 0.35);
  ctx.quadraticCurveTo(-headR * 0.65, headY + headR * 0.55, -headR * 0.45, headY + headR * 0.75);
  ctx.quadraticCurveTo(-headR * 0.2, headY + headR * 0.88, 0, headY + headR * 0.9);
  ctx.quadraticCurveTo(headR * 0.2, headY + headR * 0.88, headR * 0.45, headY + headR * 0.75);
  ctx.quadraticCurveTo(headR * 0.65, headY + headR * 0.55, headR * 0.55, headY + headR * 0.35);
  ctx.quadraticCurveTo(headR * 0.3, headY + headR * 0.3, 0, headY + headR * 0.32);
  ctx.quadraticCurveTo(-headR * 0.3, headY + headR * 0.3, -headR * 0.55, headY + headR * 0.35);
  ctx.closePath();
  ctx.fillStyle = "rgba(30,30,30,0.12)";
  ctx.fill();

  // Goatee (denser stubble on chin)
  ctx.beginPath();
  ctx.moveTo(-headR * 0.2, headY + headR * 0.55);
  ctx.quadraticCurveTo(-headR * 0.25, headY + headR * 0.75, -headR * 0.12, headY + headR * 0.85);
  ctx.quadraticCurveTo(0, headY + headR * 0.92, headR * 0.12, headY + headR * 0.85);
  ctx.quadraticCurveTo(headR * 0.25, headY + headR * 0.75, headR * 0.2, headY + headR * 0.55);
  ctx.quadraticCurveTo(headR * 0.1, headY + headR * 0.5, 0, headY + headR * 0.52);
  ctx.quadraticCurveTo(-headR * 0.1, headY + headR * 0.5, -headR * 0.2, headY + headR * 0.55);
  ctx.closePath();
  ctx.fillStyle = "rgba(30,30,30,0.2)";
  ctx.fill();

  // Stubble dots for texture (scattered small dots)
  ctx.fillStyle = COLORS.beard;
  const stubblePositions = [
    [-0.35, 0.45], [-0.25, 0.50], [-0.15, 0.55], [-0.05, 0.58],
    [0.05, 0.58], [0.15, 0.55], [0.25, 0.50], [0.35, 0.45],
    [-0.30, 0.55], [-0.20, 0.62], [-0.08, 0.68], [0.0, 0.72],
    [0.08, 0.68], [0.20, 0.62], [0.30, 0.55],
    [-0.15, 0.75], [-0.05, 0.80], [0.05, 0.80], [0.15, 0.75],
    [0.0, 0.85], [-0.08, 0.82], [0.08, 0.82],
    // Mustache area
    [-0.12, 0.40], [-0.06, 0.42], [0.0, 0.43], [0.06, 0.42], [0.12, 0.40],
  ];
  for (const [px, py] of stubblePositions) {
    ctx.beginPath();
    ctx.arc(headR * px, headY + headR * py, s * 0.007, 0, Math.PI * 2);
    ctx.globalAlpha = 0.25;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

// --- EYEBROWS ---
function drawEyebrows(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number, animator: MetalSonicAnimator) {
  const expr = animator.expression;
  const browY = headY - headR * 0.1;

  ctx.save();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.025;
  ctx.lineCap = "round";

  for (const side of [-1, 1]) {
    const browX = side * headR * 0.28;

    ctx.beginPath();
    if (expr === "determined") {
      // Angled / furrowed
      ctx.moveTo(browX - side * s * 0.05, browY - s * 0.02);
      ctx.lineTo(browX + side * s * 0.04, browY + s * 0.015);
    } else if (expr === "scared") {
      // Raised and curved
      ctx.moveTo(browX - side * s * 0.04, browY + s * 0.01);
      ctx.quadraticCurveTo(browX, browY - s * 0.04, browX + side * s * 0.04, browY + s * 0.005);
    } else if (expr === "cocky") {
      if (side === 1) {
        // Raised
        ctx.moveTo(browX - s * 0.04, browY);
        ctx.lineTo(browX + s * 0.04, browY - s * 0.025);
      } else {
        // Flat
        ctx.moveTo(browX - s * 0.04, browY);
        ctx.lineTo(browX + s * 0.04, browY);
      }
    } else if (expr === "hurt") {
      // Pinched upward in center
      ctx.moveTo(browX - side * s * 0.04, browY);
      ctx.lineTo(browX + side * s * 0.04, browY - s * 0.02);
    } else {
      // Normal — slight arch
      ctx.moveTo(browX - side * s * 0.04, browY);
      ctx.quadraticCurveTo(browX, browY - s * 0.02, browX + side * s * 0.04, browY);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// --- EYES (no glasses — direct on face) ---
function drawEyes(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number, animator: MetalSonicAnimator) {
  const expr = animator.expression;
  const eyeY = headY + headR * 0.05;

  for (const side of [-1, 1]) {
    const eyeX = side * headR * 0.28;

    if (expr === "hurt") {
      // X eyes
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.03;
      ctx.lineCap = "round";
      const sz = s * 0.04;
      ctx.beginPath();
      ctx.moveTo(eyeX - sz, eyeY - sz);
      ctx.lineTo(eyeX + sz, eyeY + sz);
      ctx.moveTo(eyeX + sz, eyeY - sz);
      ctx.lineTo(eyeX - sz, eyeY + sz);
      ctx.stroke();
    } else if (expr === "determined") {
      // Squinted
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY + s * 0.01, s * 0.04, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
      // White highlight
      ctx.beginPath();
      ctx.arc(eyeX + side * s * 0.015, eyeY - s * 0.005, s * 0.01, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    } else if (expr === "excited") {
      // Star eyes
      const starX = eyeX;
      const starY = eyeY;
      const outerR = s * 0.045;
      const innerR = s * 0.018;
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
      ctx.arc(eyeX, eyeY, s * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.015;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeX, eyeY + s * 0.01, s * 0.015, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
    } else if (expr === "sleeping") {
      // Closed eyes (curved lines)
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.025;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(eyeX, eyeY + s * 0.01, s * 0.035, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else if (expr === "cocky") {
      // Half-lidded confident look
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, s * 0.04, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#3a2518";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, s * 0.025, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeX + side * s * 0.015, eyeY - s * 0.01, s * 0.012, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    } else {
      // Normal / happy: brown eyes with highlight
      // White sclera
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, s * 0.045, s * 0.04, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = s * 0.012;
      ctx.stroke();
      // Iris
      ctx.beginPath();
      ctx.arc(eyeX + side * s * 0.008, eyeY, s * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = "#3a2518";
      ctx.fill();
      // Pupil
      ctx.beginPath();
      ctx.arc(eyeX + side * s * 0.008, eyeY, s * 0.018, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.arc(eyeX + side * s * 0.02, eyeY - s * 0.015, s * 0.012, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  }
}

// --- MOUTH (8 expressions) ---
function drawMouth(ctx: CanvasRenderingContext2D, s: number, headY: number, headR: number, animator: MetalSonicAnimator) {
  const mouthY = headY + headR * 0.5;
  const expr = animator.expression;

  ctx.save();

  if (expr === "hurt") {
    ctx.beginPath();
    ctx.moveTo(-headR * 0.2, mouthY);
    ctx.quadraticCurveTo(-headR * 0.1, mouthY + headR * 0.08, 0, mouthY);
    ctx.quadraticCurveTo(headR * 0.1, mouthY - headR * 0.08, headR * 0.2, mouthY);
    ctx.strokeStyle = COLORS.mouthDark;
    ctx.lineWidth = s * 0.03;
    ctx.lineCap = "round";
    ctx.stroke();
  } else if (expr === "determined") {
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.2, headR * 0.08, 0, 0, Math.PI);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.15, headR * 0.04, 0, 0, Math.PI, true);
    ctx.fillStyle = COLORS.teeth;
    ctx.fill();
  } else if (expr === "excited") {
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.35, headR * 0.22, 0, 0, Math.PI);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.3, headR * 0.08, 0, 0, Math.PI, true);
    ctx.fillStyle = COLORS.teeth;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = s * 0.01;
    for (let i = -3; i <= 3; i++) {
      const tx = s * 0.02 + i * headR * 0.08;
      ctx.beginPath();
      ctx.moveTo(tx, mouthY - headR * 0.08);
      ctx.lineTo(tx, mouthY);
      ctx.stroke();
    }
  } else if (expr === "scared") {
    ctx.beginPath();
    ctx.ellipse(s * 0.01, mouthY + headR * 0.05, headR * 0.1, headR * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.mouthDark;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();
  } else if (expr === "sleeping") {
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
    ctx.beginPath();
    ctx.moveTo(-headR * 0.15, mouthY + headR * 0.02);
    ctx.quadraticCurveTo(headR * 0.05, mouthY + headR * 0.12, headR * 0.25, mouthY - headR * 0.02);
    ctx.quadraticCurveTo(headR * 0.15, mouthY + headR * 0.05, -headR * 0.15, mouthY + headR * 0.02);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(headR * 0.08, mouthY + headR * 0.02);
    ctx.lineTo(headR * 0.15, mouthY + headR * 0.02);
    ctx.lineTo(headR * 0.15, mouthY + headR * 0.07);
    ctx.lineTo(headR * 0.08, mouthY + headR * 0.07);
    ctx.closePath();
    ctx.fillStyle = COLORS.teeth;
    ctx.fill();
  } else {
    // Normal/happy: wide grin
    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.3, headR * 0.18, 0, 0, Math.PI);
    ctx.fillStyle = COLORS.mouthRed;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * OUTLINE_W;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(s * 0.02, mouthY, headR * 0.25, headR * 0.08, 0, 0, Math.PI, true);
    ctx.fillStyle = COLORS.teeth;
    ctx.fill();

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

// --- ARMS (white sleeve + skin) ---
function drawArm(ctx: CanvasRenderingContext2D, s: number, angle: number, isLeft: boolean, animator: MetalSonicAnimator) {
  const offsetX = isLeft ? -s * 0.44 : s * 0.44;
  const shoulderY = -s * 0.38;
  const isFist = animator.currentState === "running" || animator.currentState === "attack" ||
                 animator.currentState === "spinning" || animator.currentState === "skidding";

  ctx.save();
  ctx.translate(offsetX, shoulderY);
  ctx.rotate(angle);

  // Sleeve (white shirt)
  ctx.beginPath();
  ctx.roundRect(-s * 0.06, 0, s * 0.12, s * 0.13, s * 0.04);
  fillAndStroke(ctx, s, COLORS.shirtWhite);

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
    ctx.beginPath();
    ctx.roundRect(-s * 0.045, s * 0.33, s * 0.09, s * 0.08, s * 0.03);
    fillAndStroke(ctx, s, COLORS.skin);
  } else {
    ctx.beginPath();
    ctx.arc(0, s * 0.36, s * 0.05, 0, Math.PI * 2);
    fillAndStroke(ctx, s, COLORS.skin);
  }

  ctx.restore();
}

// --- SHORTS WAIST (connects shirt to legs — replaces pantsWaist) ---
function drawShortsWaist(ctx: CanvasRenderingContext2D, s: number) {
  const bodyBottom = -s * 0.45 + s * BODY_RATIO;
  const shortsTop = bodyBottom - s * 0.03;
  const shortsBottom = s * 0.18;
  const shortsH = shortsBottom - shortsTop;
  const topW = s * 0.50;
  const bottomW = s * 0.44;

  // Main shorts area
  ctx.beginPath();
  ctx.moveTo(-topW / 2, shortsTop);
  ctx.lineTo(topW / 2, shortsTop);
  ctx.lineTo(bottomW / 2, shortsBottom);
  ctx.lineTo(-bottomW / 2, shortsBottom);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.shorts);

  // Inner leg seam
  ctx.beginPath();
  ctx.moveTo(0, shortsTop + shortsH * 0.5);
  ctx.lineTo(0, shortsBottom);
  ctx.strokeStyle = COLORS.shortsLight;
  ctx.lineWidth = s * 0.015;
  ctx.lineCap = "round";
  ctx.stroke();

  // White side stripes (classic Vasco shorts detail)
  for (const side of [-1, 1]) {
    const sx = side * topW / 2;
    const bx = side * bottomW / 2;
    ctx.beginPath();
    ctx.moveTo(sx, shortsTop + shortsH * 0.15);
    ctx.lineTo(bx, shortsBottom);
    ctx.strokeStyle = COLORS.shortsStripe;
    ctx.lineWidth = s * 0.02;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Elastic waistband
  const waistH = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(-topW / 2, shortsTop);
  ctx.lineTo(topW / 2, shortsTop);
  ctx.lineTo(topW / 2, shortsTop + waistH);
  ctx.lineTo(-topW / 2, shortsTop + waistH);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.shortsLight);
}

// --- LEGS (shorts top + socks + shoes) ---
function drawLeg(ctx: CanvasRenderingContext2D, s: number, offsetX: number, angle: number) {
  const hipY = s * 0.1;

  ctx.save();
  ctx.translate(offsetX, hipY);
  ctx.rotate(angle);

  // Upper leg (shorts)
  ctx.beginPath();
  ctx.roundRect(-s * 0.055, 0, s * 0.11, s * 0.10, s * 0.04);
  fillAndStroke(ctx, s, COLORS.shorts);

  // Socks (white, below shorts)
  ctx.beginPath();
  ctx.roundRect(-s * 0.05, s * 0.08, s * 0.10, s * 0.17, s * 0.03);
  fillAndStroke(ctx, s, COLORS.socks);

  // Sock band (black stripe at top of sock)
  ctx.beginPath();
  ctx.roundRect(-s * 0.05, s * 0.08, s * 0.10, s * 0.025, [s * 0.03, s * 0.03, 0, 0]);
  fillAndStroke(ctx, s, COLORS.socksBand);

  // Shin guard bump (subtle)
  ctx.beginPath();
  ctx.ellipse(0, s * 0.16, s * 0.035, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(200,200,200,0.15)";
  ctx.fill();

  // Shoe
  drawShoe(ctx, s);

  ctx.restore();
}

function drawShoe(ctx: CanvasRenderingContext2D, s: number) {
  const shoeTop = s * 0.24;
  const shoeW = s * 0.14;
  const shoeH = s * 0.08;

  // Sole
  ctx.beginPath();
  ctx.roundRect(-s * 0.04, shoeTop + shoeH * 0.6, shoeW + s * 0.01, shoeH * 0.5, s * 0.015);
  fillAndStroke(ctx, s, COLORS.shoeSole);

  // Upper (black boot body)
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, shoeTop + shoeH * 0.7);
  ctx.lineTo(-s * 0.04, shoeTop);
  ctx.quadraticCurveTo(-s * 0.04, shoeTop - s * 0.02, s * 0.0, shoeTop - s * 0.02);
  ctx.quadraticCurveTo(shoeW * 0.7, shoeTop - s * 0.02, shoeW + s * 0.01, shoeTop + shoeH * 0.3);
  ctx.lineTo(shoeW + s * 0.01, shoeTop + shoeH * 0.7);
  ctx.closePath();
  fillAndStroke(ctx, s, COLORS.shoeDark);

  // Accent line
  ctx.beginPath();
  ctx.moveTo(s * 0.03, shoeTop + shoeH * 0.1);
  ctx.quadraticCurveTo(shoeW * 0.6, shoeTop, shoeW, shoeTop + shoeH * 0.4);
  ctx.strokeStyle = COLORS.shoeAccent;
  ctx.lineWidth = s * 0.012;
  ctx.lineCap = "round";
  ctx.stroke();

  // Laces
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
  ctx.beginPath();
  ctx.arc(s * 0.022, shoeTop - s * 0.005, s * 0.008, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shoeLace;
  ctx.fill();
}

// --- SPIN BALL ---
function drawSpinBall(ctx: CanvasRenderingContext2D, s: number, angle: number, animator: MetalSonicAnimator) {
  const radius = s * 0.45;

  // White ball base (Vasco shirt)
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shirtWhite;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * OUTLINE_W * 1.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Color segments
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius - s * 0.01, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(angle);

  // Diagonal stripe visible during spin
  const stripeW = radius * 0.6;
  ctx.beginPath();
  ctx.moveTo(-stripeW / 2, -radius);
  ctx.lineTo(stripeW / 2, -radius);
  ctx.lineTo(radius, radius);
  ctx.lineTo(radius - stripeW, radius);
  ctx.closePath();
  ctx.fillStyle = COLORS.shirtStripe;
  ctx.globalAlpha = 0.5;
  ctx.fill();

  // Alternating segments
  const segCount = 4;
  const segColors = [COLORS.shorts, COLORS.skin, COLORS.socks, COLORS.shorts];
  for (let i = 0; i < segCount; i++) {
    const segAngle = (i / segCount) * Math.PI * 2;
    const segWidth = Math.PI / segCount * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, segAngle, segAngle + segWidth);
    ctx.closePath();
    ctx.fillStyle = segColors[i];
    ctx.globalAlpha = 0.3;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Shoe glimpse
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
  ctx.beginPath();
  ctx.ellipse(shoeX + radius * 0.06, shoeY + radius * 0.04, radius * 0.06, radius * 0.03, shoeAngle, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shoeSole;
  ctx.fill();

  ctx.restore();

  // Hair tufts (shorter than Pedro's — subtle bumps)
  ctx.save();
  ctx.rotate(angle);

  const tuftCount = 5;
  for (let i = 0; i < tuftCount; i++) {
    const a = (i / tuftCount) * Math.PI * 2;
    const baseR = radius * 0.9;
    const tipR = radius * 1.06;
    const sideAngle = 0.15;

    ctx.beginPath();
    ctx.moveTo(Math.cos(a - sideAngle) * baseR, Math.sin(a - sideAngle) * baseR);
    ctx.quadraticCurveTo(
      Math.cos(a) * tipR * 1.03, Math.sin(a) * tipR * 1.03,
      Math.cos(a) * tipR, Math.sin(a) * tipR,
    );
    ctx.quadraticCurveTo(
      Math.cos(a) * tipR * 1.03, Math.sin(a) * tipR * 1.03,
      Math.cos(a + sideAngle) * baseR, Math.sin(a + sideAngle) * baseR,
    );
    ctx.closePath();
    fillAndStroke(ctx, s, COLORS.hair);
  }

  ctx.restore();

  // Motion lines
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
export function drawChristianPreview(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
) {
  const s = size;

  ctx.save();
  ctx.translate(cx, cy);

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, s * 0.48, s * 0.28, s * 0.04, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();

  // Legs with socks and black shoes
  for (const offX of [-s * 0.1, s * 0.1]) {
    // Shorts
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.04, s * 0.22, s * 0.08, s * 0.08, s * 0.03);
    ctx.fillStyle = COLORS.shorts;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.025;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Socks (white)
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.035, s * 0.29, s * 0.07, s * 0.10, s * 0.025);
    ctx.fillStyle = COLORS.socks;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.018;
    ctx.stroke();

    // Sock band
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.035, s * 0.29, s * 0.07, s * 0.02, [s * 0.025, s * 0.025, 0, 0]);
    ctx.fillStyle = COLORS.socksBand;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.012;
    ctx.stroke();

    // Shoe upper (black)
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.03, s * 0.39, s * 0.1, s * 0.05, s * 0.02);
    ctx.fillStyle = COLORS.shoeDark;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.02;
    ctx.stroke();

    // Shoe lace
    ctx.strokeStyle = COLORS.shoeLace;
    ctx.lineWidth = s * 0.006;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(offX - s * 0.005, s * 0.395);
    ctx.lineTo(offX + s * 0.025, s * 0.395);
    ctx.stroke();

    // Shoe sole
    ctx.beginPath();
    ctx.roundRect(offX - s * 0.03, s * 0.43, s * 0.1, s * 0.025, s * 0.01);
    ctx.fillStyle = COLORS.shoeSole;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.stroke();
  }

  // Shorts waist
  {
    const pwTop = s * 0.04;
    const pwBottom = s * 0.26;
    const pwTopW = s * 0.30;
    const pwBottomW = s * 0.28;

    ctx.beginPath();
    ctx.moveTo(-pwTopW / 2, pwTop);
    ctx.lineTo(pwTopW / 2, pwTop);
    ctx.lineTo(pwBottomW / 2, pwBottom);
    ctx.lineTo(-pwBottomW / 2, pwBottom);
    ctx.closePath();
    ctx.fillStyle = COLORS.shorts;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.02;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Crotch seam
    ctx.beginPath();
    ctx.moveTo(0, pwTop + (pwBottom - pwTop) * 0.5);
    ctx.lineTo(0, pwBottom);
    ctx.strokeStyle = COLORS.shortsLight;
    ctx.lineWidth = s * 0.01;
    ctx.lineCap = "round";
    ctx.stroke();

    // Side stripes
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * pwTopW / 2, pwTop + (pwBottom - pwTop) * 0.15);
      ctx.lineTo(side * pwBottomW / 2, pwBottom);
      ctx.strokeStyle = COLORS.shortsStripe;
      ctx.lineWidth = s * 0.012;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Waistband
    const waistH = s * 0.018;
    ctx.beginPath();
    ctx.rect(-pwTopW / 2, pwTop, pwTopW, waistH);
    ctx.fillStyle = COLORS.shortsLight;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.012;
    ctx.stroke();
  }

  // Neck
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

  // Body (white shirt with diagonal stripe)
  const bw = s * 0.32;
  const bh = s * 0.28;
  const bodyTop = -s * 0.22;
  const cornerR = s * 0.05;

  ctx.beginPath();
  ctx.roundRect(-bw / 2, bodyTop, bw, bh, cornerR);
  ctx.save();
  ctx.clip();

  // White base
  ctx.fillStyle = COLORS.shirtWhite;
  ctx.fillRect(-bw / 2, bodyTop, bw, bh);

  // Diagonal stripe
  const stripeW = bw * 0.32;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.1 - stripeW / 2, bodyTop - s * 0.01);
  ctx.lineTo(-bw * 0.1 + stripeW / 2, bodyTop - s * 0.01);
  ctx.lineTo(bw * 0.3 + stripeW / 2, bodyTop + bh + s * 0.01);
  ctx.lineTo(bw * 0.3 - stripeW / 2, bodyTop + bh + s * 0.01);
  ctx.closePath();
  ctx.fillStyle = COLORS.shirtStripe;
  ctx.fill();

  // Vasco cross on stripe
  const crossX = bw * 0.04;
  const crossY = bodyTop + bh * 0.38;
  const crossSize = s * 0.025;
  ctx.fillStyle = COLORS.vascoRed;
  ctx.fillRect(crossX - crossSize * 0.3, crossY - crossSize, crossSize * 0.6, crossSize * 2);
  ctx.fillRect(crossX - crossSize, crossY - crossSize * 0.3, crossSize * 2, crossSize * 0.6);

  ctx.restore();

  // Body outline
  ctx.beginPath();
  ctx.roundRect(-bw / 2, bodyTop, bw, bh, cornerR);
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.025;
  ctx.lineJoin = "round";
  ctx.stroke();

  // V-neck collar
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, bodyTop + s * 0.008);
  ctx.lineTo(0, bodyTop + s * 0.04);
  ctx.lineTo(s * 0.05, bodyTop + s * 0.008);
  ctx.strokeStyle = COLORS.shirtCollar;
  ctx.lineWidth = s * 0.018;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Shoulders + arms
  for (const side of [-1, 1]) {
    const bodyEdge = side * bw / 2;
    const armPivotX = side * s * 0.28;
    const shoulderCx = (bodyEdge + armPivotX) / 2;
    const shoulderY = bodyTop + s * 0.04;

    // Shoulder pad (white)
    ctx.beginPath();
    ctx.ellipse(shoulderCx, shoulderY, s * 0.06, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.shirtWhite;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.018;
    ctx.stroke();

    // Sleeve (white)
    ctx.beginPath();
    ctx.roundRect(armPivotX - s * 0.04, shoulderY - s * 0.01, s * 0.08, s * 0.09, s * 0.025);
    ctx.fillStyle = COLORS.shirtWhite;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Arm (skin)
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

  // Head
  const headY = -s * 0.36;
  const headR = s * 0.24;

  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.skin;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.025;
  ctx.stroke();

  // Hair — short fade cut
  ctx.beginPath();
  ctx.moveTo(-headR * 0.88, headY + headR * 0.05);
  ctx.quadraticCurveTo(-headR * 0.92, headY - headR * 0.15, -headR * 0.82, headY - headR * 0.45);
  ctx.quadraticCurveTo(-headR * 0.75, headY - headR * 0.72, -headR * 0.5, headY - headR * 0.78);
  ctx.quadraticCurveTo(-headR * 0.25, headY - headR * 0.88, 0, headY - headR * 0.85);
  ctx.quadraticCurveTo(headR * 0.25, headY - headR * 0.86, headR * 0.5, headY - headR * 0.75);
  ctx.quadraticCurveTo(headR * 0.7, headY - headR * 0.6, headR * 0.82, headY - headR * 0.4);
  ctx.quadraticCurveTo(headR * 0.92, headY - headR * 0.15, headR * 0.88, headY + headR * 0.05);
  ctx.quadraticCurveTo(headR * 0.5, headY - headR * 0.25, 0, headY - headR * 0.28);
  ctx.quadraticCurveTo(-headR * 0.5, headY - headR * 0.25, -headR * 0.88, headY + headR * 0.05);
  ctx.closePath();
  ctx.fillStyle = COLORS.hair;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.02;
  ctx.stroke();

  // Fade sides (lighter)
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * headR * 0.88, headY + headR * 0.05);
    ctx.quadraticCurveTo(side * headR * 0.92, headY - headR * 0.1, side * headR * 0.85, headY - headR * 0.3);
    ctx.quadraticCurveTo(side * headR * 0.78, headY - headR * 0.15, side * headR * 0.75, headY + headR * 0.0);
    ctx.quadraticCurveTo(side * headR * 0.8, headY + headR * 0.05, side * headR * 0.88, headY + headR * 0.05);
    ctx.closePath();
    ctx.fillStyle = COLORS.hairFade;
    ctx.fill();
  }

  // Eyes (direct — no glasses)
  for (const side of [-1, 1]) {
    const eyeX = side * headR * 0.28;
    const eyeY = headY + headR * 0.05;
    // Sclera
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, s * 0.032, s * 0.028, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.008;
    ctx.stroke();
    // Iris
    ctx.beginPath();
    ctx.arc(eyeX + side * s * 0.005, eyeY, s * 0.02, 0, Math.PI * 2);
    ctx.fillStyle = "#3a2518";
    ctx.fill();
    // Pupil
    ctx.beginPath();
    ctx.arc(eyeX + side * s * 0.005, eyeY, s * 0.012, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.outline;
    ctx.fill();
    // Highlight
    ctx.beginPath();
    ctx.arc(eyeX + side * s * 0.015, eyeY - s * 0.01, s * 0.008, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Eyebrow
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = s * 0.015;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(eyeX - side * s * 0.025, headY - headR * 0.1);
    ctx.quadraticCurveTo(eyeX, headY - headR * 0.14, eyeX + side * s * 0.025, headY - headR * 0.1);
    ctx.stroke();
  }

  // Nose
  const noseY = headY + headR * 0.25;
  ctx.beginPath();
  ctx.moveTo(s * 0.005, noseY - headR * 0.04);
  ctx.lineTo(s * 0.03, noseY + headR * 0.02);
  ctx.lineTo(-s * 0.01, noseY + headR * 0.02);
  ctx.closePath();
  ctx.fillStyle = COLORS.skinShadow;
  ctx.fill();

  // Beard stubble on preview (simplified)
  ctx.beginPath();
  ctx.arc(0, headY + headR * 0.7, headR * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(30,30,30,0.15)";
  ctx.fill();
  // Jaw shadow
  ctx.beginPath();
  ctx.ellipse(0, headY + headR * 0.55, headR * 0.4, headR * 0.25, 0, 0.3, Math.PI - 0.3);
  ctx.fillStyle = "rgba(30,30,30,0.08)";
  ctx.fill();

  // Smile
  const mouthY = headY + headR * 0.5;
  ctx.beginPath();
  ctx.ellipse(s * 0.01, mouthY, headR * 0.22, headR * 0.12, 0, 0, Math.PI);
  ctx.fillStyle = COLORS.mouthRed;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = s * 0.02;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(s * 0.01, mouthY, headR * 0.18, headR * 0.05, 0, 0, Math.PI, true);
  ctx.fillStyle = COLORS.teeth;
  ctx.fill();

  ctx.restore();
}
