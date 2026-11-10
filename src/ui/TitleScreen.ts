import { Renderer } from "../core/Renderer";

export class TitleScreen {
  visible = true;
  private onStart: (zoneIndex: number) => void;
  private onZoneSelect: () => void;
  private time = 0;
  private isGameOver = false;
  private started = false;
  private linkBounds = { x: 0, y: 0, w: 0, h: 0 };
  private canvas: HTMLCanvasElement | null = null;

  constructor(onStart: (zoneIndex: number) => void, onZoneSelect: () => void) {
    this.onStart = onStart;
    this.onZoneSelect = onZoneSelect;

    window.addEventListener("keydown", (e) => {
      if (!this.visible) return;

      if (e.key === " " && this.visible) {
        e.preventDefault();
        this.start();
      }
      if ((e.key === "z" || e.key === "Z" || e.key === "Enter") && this.visible && !this.isGameOver) {
        e.preventDefault();
        this.openZoneSelect();
      }
    });

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (!this.visible) return;

      // Check if click/tap is on the website link
      if (this.canvas && !this.isGameOver) {
        let cx: number, cy: number;
        if ("changedTouches" in e && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          const rect = this.canvas.getBoundingClientRect();
          cx = t.clientX - rect.left;
          cy = t.clientY - rect.top;
        } else if ("clientX" in e) {
          const rect = this.canvas.getBoundingClientRect();
          cx = (e as MouseEvent).clientX - rect.left;
          cy = (e as MouseEvent).clientY - rect.top;
        } else {
          this.start();
          return;
        }
        const b = this.linkBounds;
        if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
          window.open("https://possidonio.com", "_blank");
          return;
        }
      }

      this.start();
    };

    window.addEventListener("click", handlePointer);
    window.addEventListener("touchend", handlePointer, { passive: true });
  }

  private start() {
    if (this.started) return;
    this.started = true;
    this.visible = false;
    this.onStart(0);
  }

  private openZoneSelect() {
    if (this.started) return;
    this.started = true;
    this.visible = false;
    this.onZoneSelect();
  }

  showGameOver() {
    this.visible = true;
    this.isGameOver = true;
    this.started = false;
  }

  /** Called when returning to title from pause menu */
  showReturnToTitle() {
    this.visible = true;
    this.isGameOver = false;
    this.started = false;
    this.time = 0;
  }

  update(dt: number) {
    this.time += dt;
  }

  render(r: Renderer) {
    if (!this.visible) return;

    const ctx = r.ctx;
    const w = r.width;
    const h = r.height;
    const small = r.isSmallScreen;

    // Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;

    if (this.isGameOver) {
      ctx.save();
      ctx.shadowColor = "#880000";
      ctx.shadowBlur = 10;
      r.drawScreenText("GAME OVER", centerX, centerY - r.responsiveSize(60), "#ff4444", r.responsiveSize(56), "center", "#440000");
      ctx.restore();

      const blinkAlpha = 0.5 + Math.sin(this.time * 3) * 0.5;
      ctx.globalAlpha = blinkAlpha;
      r.drawScreenText(
        small ? "TAP TO RETRY" : "PRESS SPACE TO RETRY",
        centerX, centerY + r.responsiveSize(20),
        "white", r.responsiveSize(22), "center", "black",
      );
      ctx.globalAlpha = 1;
    } else {
      ctx.save();
      ctx.shadowColor = "#000088";
      ctx.shadowBlur = 15;
      r.drawScreenText("O MUNDO DE PEDRO", centerX, centerY - r.responsiveSize(100), "#4488ff", r.responsiveSize(56), "center", "#000066");
      ctx.restore();

      const blinkAlpha = 0.5 + Math.sin(this.time * 3) * 0.5;
      ctx.globalAlpha = blinkAlpha;
      r.drawScreenText(
        small ? "TAP TO START" : "PRESS SPACE, CLICK OR TAP TO START",
        centerX, centerY - r.responsiveSize(10),
        "white", r.responsiveSize(22), "center", "black",
      );
      ctx.globalAlpha = 1;

      r.drawScreenText(
        small ? "HOLD FOR ZONE SELECT" : "PRESS Z OR ENTER FOR ZONE SELECT",
        centerX, centerY + r.responsiveSize(30),
        "#88aaff", r.responsiveSize(18), "center", "black",
      );

      // Controls (hide on very small screens — touch controls are self-explanatory)
      if (!small) {
        r.drawScreenText(
          "ARROWS/WASD: Move  |  SPACE/Z: Jump  |  DOWN + JUMP: Spin Dash",
          centerX, centerY + r.responsiveSize(80),
          "#aaaaaa", r.responsiveSize(16), "center",
        );
        r.drawScreenText("ESC/P: Pause", centerX, centerY + r.responsiveSize(105), "#888888", r.responsiveSize(14), "center");
      }

      // Credits
      r.drawScreenText(
        "Created by Christian Possidonio & Pedro Lucas Possidonio",
        centerX, h - r.responsiveSize(60),
        "#6688bb", r.responsiveSize(14), "center",
      );
      r.drawScreenText("possidonio.com", centerX, h - r.responsiveSize(38), "#4488ff", r.responsiveSize(14), "center");

      this.canvas = ctx.canvas;
      const linkFontSize = r.responsiveSize(14);
      ctx.font = `${linkFontSize}px monospace`;
      const linkW = ctx.measureText("possidonio.com").width;
      this.linkBounds = { x: centerX - linkW / 2, y: h - r.responsiveSize(52), w: linkW, h: 20 };
    }
  }
}
