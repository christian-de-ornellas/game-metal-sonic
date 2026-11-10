import { Renderer } from "../core/Renderer";

interface ZoneEntry {
  name: string;
  description: string;
  color: string;
  bgColor: string;
}

export class ZoneSelect {
  visible = false;
  private selectedIndex = 0;
  private time = 0;
  private onSelect: (index: number) => void;

  private zones: ZoneEntry[] = [
    { name: "EMERALD HILL", description: "Green hills, loops, and bridges", color: "#44cc44", bgColor: "#115511" },
    { name: "CHEMICAL PLANT", description: "Industrial factory with toxic water", color: "#8866cc", bgColor: "#332255" },
    { name: "CASINO NIGHT", description: "Neon lights, bumpers, and flippers", color: "#ff4488", bgColor: "#551133" },
  ];

  private keyHandler: (e: KeyboardEvent) => void;
  private entryRects: { x: number; y: number; w: number; h: number; index: number }[] = [];

  constructor(onSelect: (index: number) => void) {
    this.onSelect = onSelect;

    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.visible) return;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.zones.length) % this.zones.length;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.zones.length;
      }
      if (e.key === " " || e.key === "Enter" || e.key === "z" || e.key === "Z") {
        e.preventDefault();
        this.select();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.visible = false;
      }
    };

    window.addEventListener("keydown", this.keyHandler);

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (!this.visible) return;
      const target = e.target as HTMLElement;
      const canvas = target.closest("canvas") ?? (target.tagName === "CANVAS" ? target : null);
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      let cx: number, cy: number;
      if ("changedTouches" in e && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        cx = t.clientX - rect.left;
        cy = t.clientY - rect.top;
      } else if ("clientX" in e) {
        cx = (e as MouseEvent).clientX - rect.left;
        cy = (e as MouseEvent).clientY - rect.top;
      } else {
        return;
      }

      for (const entry of this.entryRects) {
        if (cx >= entry.x && cx <= entry.x + entry.w && cy >= entry.y && cy <= entry.y + entry.h) {
          this.selectedIndex = entry.index;
          this.select();
          return;
        }
      }
    };

    window.addEventListener("click", handlePointer);
    window.addEventListener("touchend", handlePointer, { passive: true });
  }

  show() {
    this.visible = true;
    this.selectedIndex = 0;
  }

  hide() {
    this.visible = false;
  }

  private select() {
    this.visible = false;
    this.onSelect(this.selectedIndex);
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
    const small = r.isSmallScreen;

    // Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.save();
    ctx.shadowColor = "#000088";
    ctx.shadowBlur = 12;
    r.drawScreenText("ZONE SELECT", centerX, h * 0.08, "#4488ff", r.responsiveSize(48), "center", "#000044");
    ctx.restore();

    // Zone list — scale entry height/width with screen
    const entryHeight = r.responsiveSize(80);
    const entryGap = r.responsiveSize(15);
    const startY = h * 0.22;
    const entryWidth = Math.min(r.responsiveSize(500), w * 0.8);

    this.entryRects = [];
    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      const y = startY + i * (entryHeight + entryGap);
      const isSelected = i === this.selectedIndex;
      this.entryRects.push({ x: centerX - entryWidth / 2, y, w: entryWidth, h: entryHeight, index: i });

      // Selection highlight
      if (isSelected) {
        const pulse = 0.8 + Math.sin(this.time * 4) * 0.2;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = zone.color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - entryWidth / 2 - 5, y - 5, entryWidth + 10, entryHeight + 10);
        ctx.restore();
      }

      // Entry background
      ctx.fillStyle = isSelected ? zone.bgColor : "rgba(20, 20, 40, 0.8)";
      ctx.fillRect(centerX - entryWidth / 2, y, entryWidth, entryHeight);

      // Color bar on left
      ctx.fillStyle = zone.color;
      ctx.fillRect(centerX - entryWidth / 2, y, 6, entryHeight);

      // Zone name
      r.drawScreenText(
        zone.name,
        centerX - entryWidth / 2 + r.responsiveSize(20), y + entryHeight * 0.22,
        isSelected ? zone.color : "#aaaaaa", r.responsiveSize(26), "left", "black",
      );

      // Description
      r.drawScreenText(
        zone.description,
        centerX - entryWidth / 2 + r.responsiveSize(20), y + entryHeight * 0.62,
        isSelected ? "#cccccc" : "#666666", r.responsiveSize(16), "left",
      );

      // Arrow indicator
      if (isSelected) {
        const arrowX = centerX + entryWidth / 2 - r.responsiveSize(30);
        const arrowBlink = Math.sin(this.time * 5) > 0;
        if (arrowBlink) {
          r.drawScreenText(">", arrowX, y + entryHeight * 0.3, zone.color, r.responsiveSize(28), "center");
        }
      }
    }

    // Controls hint
    const hintAlpha = 0.5 + Math.sin(this.time * 2) * 0.3;
    ctx.globalAlpha = hintAlpha;
    r.drawScreenText(
      small ? "TAP TO SELECT" : "UP/DOWN or TAP: Navigate  |  SPACE/ENTER: Select  |  ESC: Back",
      centerX, h - r.responsiveSize(50),
      "#888888", r.responsiveSize(14), "center",
    );
    ctx.globalAlpha = 1;
  }
}
