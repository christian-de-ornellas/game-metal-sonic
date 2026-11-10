const STORAGE_KEY = "mundo_pedro_save";

export interface SaveData {
  highScores: Record<string, number>;   // zone index → best score
  bestTimes: Record<string, number>;    // zone index → best time (seconds)
  lastCharacter: string;                // "metal_sonic" | "pedro_lucas"
  volume: number;
  muted: boolean;
  tutorialSeen: boolean;
}

const DEFAULT_SAVE: SaveData = {
  highScores: {},
  bestTimes: {},
  lastCharacter: "metal_sonic",
  volume: 0.5,
  muted: false,
  tutorialSeen: false,
};

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SAVE, ...parsed };
      }
    } catch { /* ignore corrupt data */ }
    return { ...DEFAULT_SAVE };
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { /* storage full or unavailable */ }
  }

  get tutorialSeen() { return this.data.tutorialSeen; }
  set tutorialSeen(v: boolean) { this.data.tutorialSeen = v; this.persist(); }

  get lastCharacter() { return this.data.lastCharacter; }
  set lastCharacter(v: string) { this.data.lastCharacter = v; this.persist(); }

  get volume() { return this.data.volume; }
  set volume(v: number) { this.data.volume = v; this.persist(); }

  get muted() { return this.data.muted; }
  set muted(v: boolean) { this.data.muted = v; this.persist(); }

  getHighScore(zoneIndex: number): number {
    return this.data.highScores[zoneIndex] ?? 0;
  }

  setHighScore(zoneIndex: number, score: number) {
    if (score > this.getHighScore(zoneIndex)) {
      this.data.highScores[zoneIndex] = score;
      this.persist();
    }
  }

  getBestTime(zoneIndex: number): number {
    return this.data.bestTimes[zoneIndex] ?? Infinity;
  }

  setBestTime(zoneIndex: number, time: number) {
    if (time < this.getBestTime(zoneIndex)) {
      this.data.bestTimes[zoneIndex] = time;
      this.persist();
    }
  }
}
