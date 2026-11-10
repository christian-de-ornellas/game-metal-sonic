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

    // Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.save();
    ctx.shadowColor = "#000088";
    ctx.shadowBlur = 12;
    r.drawScreenText("ZONE SELECT", centerX, h * 0.12, "#4488ff", 48, "center", "#000044");
    ctx.restore();

    // Zone list
    const entryHeight = 80;
    const startY = h * 0.25;
    const entryWidth = Math.min(500, w * 0.7);

    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      const y = startY + i * (entryHeight + 15);
      const isSelected = i === this.selectedIndex;

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
        centerX - entryWidth / 2 + 20, y + 15,
        isSelected ? zone.color : "#aaaaaa", 26, "left", "black"
      );

      // Description
      r.drawScreenText(
        zone.description,
        centerX - entryWidth / 2 + 20, y + 48,
        isSelected ? "#cccccc" : "#666666", 16, "left"
      );

      // Arrow indicator
      if (isSelected) {
        const arrowX = centerX + entryWidth / 2 - 30;
        const arrowBlink = Math.sin(this.time * 5) > 0;
        if (arrowBlink) {
          r.drawScreenText(">", arrowX, y + 25, zone.color, 28, "center");
        }
      }
    }

    // Controls hint
    const hintAlpha = 0.5 + Math.sin(this.time * 2) * 0.3;
    ctx.globalAlpha = hintAlpha;
    r.drawScreenText(
      "UP/DOWN: Navigate  |  SPACE/ENTER: Select  |  ESC: Back",
      centerX, h - 50,
      "#888888", 14, "center"
    );
    ctx.globalAlpha = 1;
  }
}
