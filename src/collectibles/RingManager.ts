import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";
import { RingData, createRing, createScatteredRing, checkRingCollect, updateScatteredRing, drawRing } from "./Ring";
import { RING_SCATTER_MAX } from "../constants";

export class RingManager {
  private rings: RingData[] = [];
  private scatteredRings: RingData[] = [];
  private time = 0;

  constructor(private gameState: GameState) {}

  addRing(x: number, y: number) {
    this.rings.push(createRing(x, y));
  }

  addLine(x1: number, y1: number, x2: number, y2: number, count: number) {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      this.addRing(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    }
  }

  /** Add an arc of rings (for loops and springs) */
  addArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, count: number) {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = startAngle + (endAngle - startAngle) * t;
      this.addRing(
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius,
      );
    }
  }

  scatterRings(x: number, y: number, count: number) {
    const toScatter = Math.min(count, RING_SCATTER_MAX);
    for (let i = 0; i < toScatter; i++) {
      this.scatteredRings.push(createScatteredRing(x, y));
    }
  }

  /** Returns true when a ring is collected this frame (for effects) */
  update(dt: number, playerX: number, playerY: number): boolean {
    this.time += dt;
    let collected = false;

    for (const ring of this.rings) {
      if (!ring.active || ring.collected) continue;
      if (checkRingCollect(ring, playerX, playerY)) {
        ring.collected = true;
        ring.active = false;
        this.gameState.addRings(1);
        collected = true;
      }
    }

    for (let i = this.scatteredRings.length - 1; i >= 0; i--) {
      const ring = this.scatteredRings[i];
      if (!updateScatteredRing(ring, dt)) {
        this.scatteredRings.splice(i, 1);
        continue;
      }

      // Recollectable after brief delay
      if (ring.scatterTimer < 3) {
        if (checkRingCollect(ring, playerX, playerY)) {
          ring.collected = true;
          ring.active = false;
          this.scatteredRings.splice(i, 1);
          this.gameState.addRings(1);
          collected = true;
        }
      }
    }

    return collected;
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();

    for (const ring of this.rings) {
      if (!ring.active || ring.collected) continue;
      if (ring.x < bounds.left - 2 || ring.x > bounds.right + 2) continue;
      if (ring.y < bounds.bottom - 2 || ring.y > bounds.top + 2) continue;
      drawRing(r, ring, this.time);
    }

    for (const ring of this.scatteredRings) {
      drawRing(r, ring, this.time);
    }
  }

  buildDefaultLayout(getHeight: (x: number) => number) {
    // Intro rings
    this.addLine(5, 1, 25, 1, 8);

    // Hill section
    for (let x = 35; x < 110; x += 6) {
      const y = getHeight(x) + 1.2;
      this.addRing(x, y);
    }

    // Before loop
    this.addLine(115, 1, 145, 1, 10);

    // Arc around first loop (x=135, center y=8, radius=8)
    this.addArc(135, 8, 10, Math.PI * 0.3, Math.PI * 0.7, 5);

    // Vertical column above red spring at x=160
    for (let i = 0; i < 5; i++) {
      this.addRing(160, 2 + i * 1.8);
    }

    // Bridge section (above water)
    this.addLine(185, -1, 225, -1, 12);

    // Post-bridge hills
    for (let x = 265; x < 300; x += 5) {
      const y = getHeight(x) + 1.2;
      this.addRing(x, y);
    }

    // Arc around second loop (x=310, center y=8, radius=7)
    this.addArc(310, 8, 9, Math.PI * 0.3, Math.PI * 0.7, 5);

    // High line over spring at x=280 (reward for using spring)
    this.addLine(275, 6, 285, 6, 5);

    // Final sprint with zigzag
    for (let i = 0; i < 20; i++) {
      const x = 345 + i * 2.5;
      const zigzag = (i % 2 === 0) ? 1 : 2.5;
      this.addRing(x, zigzag);
    }
  }
}
