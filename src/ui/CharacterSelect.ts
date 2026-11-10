import { Renderer } from "../core/Renderer";
import { drawPedroLucasPreview } from "../character/PedroLucas";

export type CharacterChoice = "metal_sonic" | "pedro_lucas";
type PendingAction = "start" | "zone_select";

interface CharacterEntry {
  id: CharacterChoice;
  name: string;
  color: string;
}

const CHARACTERS: CharacterEntry[] = [
  { id: "metal_sonic", name: "METAL SONIC", color: "#4488ff" },
  { id: "pedro_lucas", name: "PEDRO LUCAS", color: "#cc4444" },
];

export class CharacterSelect {
  visible = false;
  private selectedIndex = 0;
  private time = 0;
  private onSelect: (character: CharacterChoice) => void;
  private pendingAction: PendingAction = "start";

  private keyHandler: (e: KeyboardEvent) => void;

  constructor(onSelect: (character: CharacterChoice) => void) {
    this.onSelect = onSelect;

    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.visible) return;

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % CHARACTERS.length;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this.confirm();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.visible = false;
      }
    };

    window.addEventListener("keydown", this.keyHandler);
  }

  get currentPendingAction(): PendingAction {
    return this.pendingAction;
  }

  show(pendingAction: PendingAction) {
    this.visible = true;
    this.pendingAction = pendingAction;
    this.time = 0;
  }

  hide() {
    this.visible = false;
  }

  private confirm() {
    this.visible = false;
    this.onSelect(CHARACTERS[this.selectedIndex].id);
  }

  update(dt: number) {
    if (!this.visible) return;
    this.time += dt;
  }

  render(r: Renderer) {
    if (!this.visible) return;

    const ctx = r.ctx;
    const w = r.width;
    const h = r.height;
    const centerX = w / 2;

    // Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.save();
    ctx.shadowColor = "#000088";
    ctx.shadowBlur = 12;
    r.drawScreenText("SELECT CHARACTER", centerX, h * 0.08, "#4488ff", 44, "center", "#000044");
    ctx.restore();

    // Character slots
    const slotSize = Math.min(200, w * 0.25);
    const gap = slotSize * 0.6;
    const totalWidth = CHARACTERS.length * slotSize + (CHARACTERS.length - 1) * gap;
    const startX = centerX - totalWidth / 2 + slotSize / 2;
    const slotY = h * 0.42;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const char = CHARACTERS[i];
      const cx = startX + i * (slotSize + gap);
      const isSelected = i === this.selectedIndex;

      // Selection glow
      if (isSelected) {
        const pulse = 0.6 + Math.sin(this.time * 4) * 0.4;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = char.color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = char.color;
        ctx.lineWidth = 3;
        const pad = 12;
        ctx.strokeRect(
          cx - slotSize / 2 - pad,
          slotY - slotSize / 2 - pad,
          slotSize + pad * 2,
          slotSize + pad * 2,
        );
        ctx.restore();
      }

      // Slot background
      ctx.fillStyle = isSelected ? "rgba(40, 40, 80, 0.9)" : "rgba(20, 20, 40, 0.7)";
      ctx.fillRect(cx - slotSize / 2, slotY - slotSize / 2, slotSize, slotSize);

      // Draw character preview
      if (char.id === "metal_sonic") {
        this.drawMetalSonicPreview(ctx, cx, slotY, slotSize * 0.6);
      } else {
        drawPedroLucasPreview(ctx, cx, slotY, slotSize * 0.75);
      }

      // Character name
      const nameColor = isSelected ? char.color : "#888888";
      r.drawScreenText(char.name, cx, slotY + slotSize / 2 + 15, nameColor, 20, "center", "black");

      // Arrow indicator for selected
      if (isSelected) {
        const arrowBob = Math.sin(this.time * 5) * 5;
        r.drawScreenText(
          "\u25B2",
          cx, slotY - slotSize / 2 - 30 + arrowBob,
          char.color, 22, "center",
        );
      }
    }

    // Controls hint
    const hintAlpha = 0.5 + Math.sin(this.time * 2) * 0.3;
    ctx.globalAlpha = hintAlpha;
    r.drawScreenText(
      "LEFT/RIGHT: Choose  |  SPACE/ENTER: Select  |  ESC: Back",
      centerX, h - 50,
      "#888888", 14, "center",
    );
    ctx.globalAlpha = 1;
  }

  /** Mini procedural Metal Sonic for the selection screen */
  private drawMetalSonicPreview(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    size: number,
  ) {
    const s = size;

    ctx.save();
    ctx.translate(cx, cy);

    // Body
    const bw = s * 0.3;
    const bh = s * 0.35;
    const bodyGrad = ctx.createRadialGradient(-bw * 0.15, -bh * 0.2, bw * 0.15, 0, 0, bh);
    bodyGrad.addColorStop(0, "#6699ff");
    bodyGrad.addColorStop(0.6, "#2255cc");
    bodyGrad.addColorStop(1, "#112266");
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, bw, bh, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Chest
    ctx.beginPath();
    ctx.ellipse(s * 0.03, s * 0.08, bw * 0.55, bh * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a3a";
    ctx.fill();

    // Head
    const headY = -s * 0.35;
    const headR = s * 0.22;
    const hGrad = ctx.createRadialGradient(-headR * 0.25, headY - headR * 0.3, headR * 0.1, 0, headY, headR);
    hGrad.addColorStop(0, "#5588ee");
    hGrad.addColorStop(0.7, "#2244aa");
    hGrad.addColorStop(1, "#111844");
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fillStyle = hGrad;
    ctx.fill();

    // Visor
    ctx.save();
    ctx.shadowColor = "#ff3333";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(headR * 0.15, headY, headR * 0.65, headR * 0.2, 0, -0.3, Math.PI * 0.6);
    ctx.lineWidth = s * 0.04;
    ctx.strokeStyle = "#ff2222";
    ctx.stroke();
    ctx.restore();

    // Eye
    ctx.beginPath();
    ctx.arc(headR * 0.2, headY - headR * 0.05, s * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Legs
    for (const offX of [-s * 0.1, s * 0.1]) {
      ctx.beginPath();
      ctx.roundRect(offX - s * 0.03, s * 0.3, s * 0.06, s * 0.15, s * 0.03);
      ctx.fillStyle = "#2255cc";
      ctx.fill();
      // Feet
      ctx.beginPath();
      ctx.ellipse(offX + s * 0.01, s * 0.47, s * 0.05, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#cc2222";
      ctx.fill();
    }

    ctx.restore();
  }
}
