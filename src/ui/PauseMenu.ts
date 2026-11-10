import { Renderer } from "../core/Renderer";
import { AudioManager } from "../core/AudioManager";

export class PauseMenu {
  private selectedIndex = 0;
  private items = ["CONTINUE", "QUIT TO TITLE"];
  private onResume: () => void;
  private onQuit: () => void;

  constructor(onResume: () => void, onQuit: () => void) {
    this.onResume = onResume;
    this.onQuit = onQuit;
  }

  reset() {
    this.selectedIndex = 0;
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

    // Darken background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.save();
    ctx.shadowColor = "#000088";
    ctx.shadowBlur = 12;
    r.drawScreenText("PAUSED", centerX, h * 0.3, "#4488ff", 48, "center", "#000044");
    ctx.restore();

    // Menu items
    const startY = h * 0.48;
    const itemGap = 50;
    for (let i = 0; i < this.items.length; i++) {
      const isSelected = i === this.selectedIndex;
      const y = startY + i * itemGap;
      const color = isSelected ? "#ffcc00" : "#888888";
      const size = isSelected ? 28 : 22;
      const prefix = isSelected ? "> " : "  ";
      r.drawScreenText(prefix + this.items[i], centerX, y, color, size, "center", "black");
    }

    // Controls hint
    r.drawScreenText(
      "UP/DOWN: Navigate  |  SPACE/ENTER: Select  |  ESC: Resume",
      centerX, h - 40,
      "#666666", 14, "center",
    );
  }
}
