import { Renderer } from "../core/Renderer";
import { AudioManager } from "../core/AudioManager";

export class PauseMenu {
  private selectedIndex = 0;
  private items = ["CONTINUE", "QUIT TO TITLE"];
  private onResume: () => void;
  private onQuit: () => void;

  // Touch/click interaction
  private canvas: HTMLCanvasElement | null = null;
  private audio: AudioManager | null = null;
  private itemRects: { x: number; y: number; w: number; h: number }[] = [];
  private boundHandlePointer: ((e: MouseEvent | TouchEvent) => void) | null = null;

  constructor(onResume: () => void, onQuit: () => void) {
    this.onResume = onResume;
    this.onQuit = onQuit;
  }

  reset() {
    this.selectedIndex = 0;
  }

  activate(canvas: HTMLCanvasElement, audio: AudioManager) {
    this.canvas = canvas;
    this.audio = audio;
    this.deactivate(); // remove any stale listener

    this.boundHandlePointer = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      let cx: number, cy: number;
      if ("touches" in e && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        cx = t.clientX - rect.left;
        cy = t.clientY - rect.top;
      } else if ("clientX" in e) {
        const rect = canvas.getBoundingClientRect();
        cx = (e as MouseEvent).clientX - rect.left;
        cy = (e as MouseEvent).clientY - rect.top;
      } else {
        return;
      }

      for (let i = 0; i < this.itemRects.length; i++) {
        const r = this.itemRects[i];
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
          this.audio?.menuConfirm();
          if (i === 0) this.onResume();
          else this.onQuit();
          return;
        }
      }
    };

    canvas.addEventListener("touchend", this.boundHandlePointer, { passive: false });
    canvas.addEventListener("click", this.boundHandlePointer);
  }

  deactivate() {
    if (this.canvas && this.boundHandlePointer) {
      this.canvas.removeEventListener("touchend", this.boundHandlePointer);
      this.canvas.removeEventListener("click", this.boundHandlePointer);
      this.boundHandlePointer = null;
    }
  }

  handleKey(key: string, audio?: AudioManager) {
    if (key === "arrowup" || key === "w") {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      audio?.menuSelect();
    }
    if (key === "arrowdown" || key === "s") {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      audio?.menuSelect();
    }
    if (key === " " || key === "enter") {
      audio?.menuConfirm();
      if (this.selectedIndex === 0) this.onResume();
      else this.onQuit();
    }
    if (key === "escape" || key === "p") {
      this.onResume();
    }
  }

  render(r: Renderer) {
    const ctx = r.ctx;
    const w = r.width;
    const h = r.height;
    const centerX = w / 2;
    const small = r.isSmallScreen;

    // Darken background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.save();
    ctx.shadowColor = "#000088";
    ctx.shadowBlur = 12;
    r.drawScreenText("PAUSED", centerX, h * 0.3, "#4488ff", r.responsiveSize(48), "center", "#000044");
    ctx.restore();

    // Menu items — store rects for hit-testing
    this.itemRects = [];
    const startY = h * 0.48;
    const itemGap = r.responsiveSize(50);
    const selectedSize = r.responsiveSize(28);
    const normalSize = r.responsiveSize(22);
    for (let i = 0; i < this.items.length; i++) {
      const isSelected = i === this.selectedIndex;
      const y = startY + i * itemGap;
      const color = isSelected ? "#ffcc00" : "#888888";
      const size = isSelected ? selectedSize : normalSize;
      const prefix = isSelected ? "> " : "  ";
      r.drawScreenText(prefix + this.items[i], centerX, y, color, size, "center", "black");

      // Touch hit rect (generous, scales with screen)
      const itemW = Math.max(300, w * 0.4);
      const itemH = Math.max(44, itemGap * 0.9);
      this.itemRects.push({
        x: centerX - itemW / 2,
        y: y - 4,
        w: itemW,
        h: itemH,
      });
    }

    // Controls hint
    r.drawScreenText(
      small ? "TAP TO SELECT" : "UP/DOWN: Navigate  |  SPACE/ENTER/TAP: Select  |  ESC: Resume",
      centerX, h - r.responsiveSize(40),
      "#666666", r.responsiveSize(14), "center",
    );
  }
}
