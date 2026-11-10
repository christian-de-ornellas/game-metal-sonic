import { Renderer } from "../../core/Renderer";

interface PalmTree {
  x: number;
  baseY: number;
  height: number;
  lean: number;
  leafCount: number;
  seed: number;
}

export class PalmTreeBuilder {
  private trees: PalmTree[] = [];

  addTree(x: number, baseY: number, height: number = 6) {
    this.trees.push({
      x,
      baseY,
      height,
      lean: (Math.random() - 0.5) * 0.15,
      leafCount: 5 + Math.floor(Math.random() * 2),
      seed: Math.random() * 100,
    });
  }

  addTreeLine(startX: number, endX: number, count: number, getHeight: (x: number) => number) {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = startX + (endX - startX) * t + (Math.random() - 0.5) * 3;
      const y = getHeight(x);
      const h = 5 + Math.random() * 3;
      this.addTree(x, y, h);
    }
  }

  render(r: Renderer, time: number = 0) {
    const bounds = r.getVisibleBounds();
    const ctx = r.ctx;

    for (const tree of this.trees) {
      if (tree.x < bounds.left - 5 || tree.x > bounds.right + 5) continue;

      const baseX = r.worldToScreenX(tree.x);
      const baseScreenY = r.worldToScreenY(tree.baseY);
      const h = tree.height * r.zoom;

      // Trunk sway
      const trunkSway = Math.sin(time * 0.8 + tree.seed) * 0.02;

      ctx.save();
      ctx.translate(baseX, baseScreenY);
      ctx.rotate(-tree.lean + trunkSway);

      // Trunk
      const trunkW = 0.3 * r.zoom;
      const trunkGrad = ctx.createLinearGradient(-trunkW, 0, trunkW, 0);
      trunkGrad.addColorStop(0, "#5a3a18");
      trunkGrad.addColorStop(0.5, "#8B6B3E");
      trunkGrad.addColorStop(1, "#5a3a18");

      ctx.beginPath();
      ctx.moveTo(-trunkW * 1.2, 0);
      ctx.lineTo(-trunkW * 0.6, -h);
      ctx.lineTo(trunkW * 0.6, -h);
      ctx.lineTo(trunkW * 1.2, 0);
      ctx.closePath();
      ctx.fillStyle = trunkGrad;
      ctx.fill();

      // Trunk segments
      ctx.strokeStyle = "#4a2a10";
      ctx.lineWidth = Math.max(0.5, 0.03 * r.zoom);
      for (let i = 1; i < 6; i++) {
        const segY = -h * (i / 6);
        const segW = trunkW * (1.2 - i * 0.1);
        ctx.beginPath();
        ctx.moveTo(-segW, segY);
        ctx.lineTo(segW, segY);
        ctx.stroke();
      }

      // Leaves with sway
      const topY = -h;
      const leafSway = Math.sin(time * 1.2 + tree.seed) * 0.05;

      for (let i = 0; i < tree.leafCount; i++) {
        const angle = (i / tree.leafCount) * Math.PI * 2 + tree.seed;
        const leafLen = (2 + Math.sin(tree.seed + i) * 0.5) * r.zoom;
        const droopAngle = angle + Math.PI / 6;

        ctx.save();
        ctx.translate(0, topY);
        ctx.rotate(-droopAngle + Math.PI / 2 + leafSway * Math.sin(i * 1.7));

        const leafGrad = ctx.createLinearGradient(0, 0, leafLen, 0);
        leafGrad.addColorStop(0, "#22aa11");
        leafGrad.addColorStop(1, "#118808");

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(leafLen * 0.5, -leafLen * 0.15, leafLen, leafLen * 0.1);
        ctx.quadraticCurveTo(leafLen * 0.5, leafLen * 0.15, 0, 0);
        ctx.fillStyle = leafGrad;
        ctx.fill();

        ctx.restore();
      }

      // Coconuts
      const coconutR = 0.12 * r.zoom;
      ctx.fillStyle = "#8B6914";
      for (let i = 0; i < 3; i++) {
        const cx = Math.cos(tree.seed + i * 2.1) * 0.2 * r.zoom;
        const cy = topY + Math.sin(tree.seed + i * 2.1) * 0.15 * r.zoom;
        ctx.beginPath();
        ctx.arc(cx, cy, coconutR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
