import { Zone } from "./Zone";
import { GameState } from "../core/GameState";

export type GamePhase = "title" | "playing" | "act_clear" | "zone_select" | "character_select" | "game_over" | "boss_robo_tinic" | "boss_bowser" | "ending";

export type ZoneFactory = (gs: GameState) => Zone;

export class ZoneManager {
  private zoneFactories: ZoneFactory[] = [];
  private currentZoneIndex = 0;
  private currentZone: Zone | null = null;

  constructor(private gameState: GameState) {}

  registerZone(factory: ZoneFactory) {
    this.zoneFactories.push(factory);
  }

  get zoneCount(): number {
    return this.zoneFactories.length;
  }

  get zoneIndex(): number {
    return this.currentZoneIndex;
  }

  get zone(): Zone | null {
    return this.currentZone;
  }

  loadZone(index: number): Zone {
    this.currentZoneIndex = index;
    this.gameState.zoneIndex = index;
    // GC the previous zone by replacing
    this.currentZone = this.zoneFactories[index](this.gameState);
    this.currentZone.build();
    return this.currentZone;
  }

  advanceToNextZone(): Zone | null {
    const nextIndex = this.currentZoneIndex + 1;
    if (nextIndex >= this.zoneFactories.length) {
      return null; // No more zones - game complete
    }
    this.gameState.resetForNewZone();
    return this.loadZone(nextIndex);
  }

  hasNextZone(): boolean {
    return this.currentZoneIndex + 1 < this.zoneFactories.length;
  }

  getZoneNames(): string[] {
    // Create temporary instances to get names, then discard
    return this.zoneFactories.map((factory, i) => {
      const temp = factory(this.gameState);
      return temp.config.name;
    });
  }
}
