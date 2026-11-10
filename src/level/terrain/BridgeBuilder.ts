import { Renderer } from "../../core/Renderer";

interface BridgeSegment {
  x: number;
  restY: number;
  currentY: number;
  velocity: number;
  width: number;
}

export interface Bridge {
  startX: number;
  endX: number;
  segments: BridgeSegment[];
}

export class BridgeBuilder {
  private bridges: Bridge[] = [];

  addBridge(startX: number, y: number, segmentCount: number, segmentWidth: number = 2) {
    const segments: BridgeSegment[] = [];
    for (let i = 0; i < segmentCount; i++) {
      segments.push({
        x: startX + i * segmentWidth + segmentWidth / 2,
        restY: y,
        currentY: y,
        velocity: 0,
        width: segmentWidth,
      });
    }
    this.bridges.push({
      startX,
      endX: startX + segmentCount * segmentWidth,
      segments,
    });
  }

  isOnBridge(x: number, y: number): boolean {
    for (const bridge of this.bridges) {
      if (x >= bridge.startX && x <= bridge.endX) {
        // Check if player is near the bridge height
        const seg = this.getClosestSegment(bridge, x);
        if (seg && Math.abs(y - seg.currentY) < 1.5) {
          return true;
        }
      }
    }
    return false;
  }

  getBridgeHeight(x: number): number | null {
    for (const bridge of this.bridges) {
      if (x >= bridge.startX && x <= bridge.endX) {
        const seg = this.getClosestSegment(bridge, x);
        if (seg) return seg.currentY;
      }
    }
    return null;
  }

  private getClosestSegment(bridge: Bridge, x: number): BridgeSegment | null {
    let closest: BridgeSegment | null = null;
    let minDist = Infinity;
    for (const seg of bridge.segments) {
      const d = Math.abs(x - seg.x);
      if (d < minDist) {
        minDist = d;
        closest = seg;
      }
    }
    return closest;
  }

  update(dt: number, playerX: number, playerY: number) {
    for (const bridge of this.bridges) {
      const onThisBridge = playerX >= bridge.startX && playerX <= bridge.endX;

      for (const seg of bridge.segments) {
        if (onThisBridge) {
          const dist = Math.abs(playerX - seg.x);
          if (dist < 3) {
            const influence = Math.cos((dist / 3) * Math.PI / 2);
            const targetSag = seg.restY - influence * 1.2;
            seg.velocity += (targetSag - seg.currentY) * 480 * dt;
          } else {
            seg.velocity += (seg.restY - seg.currentY) * 240 * dt;
          }
        } else {
          seg.velocity += (seg.restY - seg.currentY) * 360 * dt;
        }

        seg.velocity *= Math.pow(0.006, dt);
        seg.currentY += seg.velocity * dt;
      }
    }
  }

  render(r: Renderer) {
    const ctx = r.ctx;
    const bounds = r.getVisibleBounds();

    for (const bridge of this.bridges) {
      if (bridge.endX < bounds.left || bridge.startX > bounds.right) continue;

      // Draw rope lines
      ctx.strokeStyle = "#6B4226";
      ctx.lineWidth = Math.max(1, 0.08 * r.zoom);
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        for (let i = 0; i < bridge.segments.length; i++) {
          const seg = bridge.segments[i];
          const sx = r.worldToScreenX(seg.x);
          const sy = r.worldToScreenY(seg.currentY + 0.5);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Draw segments
      for (const seg of bridge.segments) {
        const sx = r.worldToScreenX(seg.x - seg.width * 0.475);
        const sy = r.worldToScreenY(seg.currentY + 0.15);
        const sw = seg.width * 0.95 * r.zoom;
        const sh = 0.3 * r.zoom;

        // Segment body
        ctx.fillStyle = "#9B6B3E";
        ctx.fillRect(sx, sy, sw, sh);

        // Plank lines
        ctx.strokeStyle = "#5a3418";
        ctx.lineWidth = Math.max(0.5, 0.02 * r.zoom);
        const midSx = sx + sw / 2;
        ctx.beginPath();
        ctx.moveTo(midSx, sy);
        ctx.lineTo(midSx, sy + sh);
        ctx.stroke();
      }

      // Pillars at ends
      const pillarW = 0.4 * r.zoom;
      const pillarH = 3 * r.zoom;
      ctx.fillStyle = "#6B4226";

      for (const xPos of [bridge.startX - 0.5, bridge.endX + 0.5]) {
        const px = r.worldToScreenX(xPos) - pillarW / 2;
        const py = r.worldToScreenY(bridge.segments[0].restY + 2);
        ctx.fillRect(px, py, pillarW, pillarH);
      }
    }
  }
}
