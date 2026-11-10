import { Renderer } from "../core/Renderer";
import { Badnik } from "../enemies/Badnik";
import { RingManager } from "../collectibles/RingManager";
import { Spring } from "./terrain/SpringBuilder";
import { MetalSonicController } from "../character/MetalSonicController";
import { PowerUpMonitor } from "../collectibles/PowerUpMonitor";

export interface ZoneConfig {
  name: string;
  act: number;
  levelLength: number;
  startPosition: { x: number; y: number };
  cameraBounds: { left: number; right: number; bottom: number; top: number };
}

export interface LevelEvents {
  ringCollected: boolean;
  springHit: Spring | null;
  goalReached: boolean;
  conveyorForce?: number;
  bumperHit?: { x: number; y: number; score: number } | null;
}

export interface Zone {
  readonly config: ZoneConfig;
  readonly enemies: Badnik[];
  readonly ringManager: RingManager;
  readonly goalReached: boolean;
  powerUps: PowerUpMonitor | null;
  build(): void;
  update(dt: number, playerX: number, playerY: number, controller: MetalSonicController): LevelEvents;
  render(renderer: Renderer): void;
  getEffectiveHeight(x: number, y: number, vy: number): number;
  getStartPosition(): { x: number; y: number };
  getTime(): number;
}
