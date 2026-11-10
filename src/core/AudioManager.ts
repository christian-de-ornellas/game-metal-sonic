/** Synthesized sound effects using Web Audio API — no external assets needed */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _volume = 0.5;
  private _muted = false;

  get volume() { return this._volume; }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this._muted ? 0 : this._volume;
  }

  get muted() { return this._muted; }
  set muted(m: boolean) {
    this._muted = m;
    if (this.masterGain) this.masterGain.gain.value = m ? 0 : this._volume;
  }

  private ensure() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._muted ? 0 : this._volume;
    this.masterGain.connect(this.ctx.destination);
  }

  /** Resume AudioContext after user gesture */
  resume() {
    this.ensure();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  // ---- Sound Effects ----

  jump() {
    this.ensure();
    const c = this.ctx!;
    const g = this.makeGain(0.25, 0.15);
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(300, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.12);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.15);
  }

  ring() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.15, 0.2);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(1200, t);
    o.frequency.setValueAtTime(1500, t + 0.06);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.2);
  }

  spinDashCharge() {
    this.ensure();
    const c = this.ctx!;
    const g = this.makeGain(0.15, 0.1);
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(150, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.08);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.1);
  }

  spinDashRelease() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.3, 0.3);
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.1);
    o.frequency.exponentialRampToValueAtTime(100, t + 0.3);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.3);
  }

  enemyDestroy() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.2, 0.3);
    // Pop + rising tone
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.3);
    // Noise burst
    this.noiseHit(0.15, 0.1);
  }

  spring() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.2, 0.25);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.25);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.25);
  }

  damage() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.3, 0.4);
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.35);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.4);
    this.noiseHit(0.25, 0.15);
  }

  lifeUp() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.25, 0.6);
    const o = c.createOscillator();
    o.type = "sine";
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      o.frequency.setValueAtTime(freq, t + i * 0.12);
    });
    o.connect(g);
    o.start(t);
    o.stop(t + 0.6);
  }

  actClear() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.2, 1.5);
    const o = c.createOscillator();
    o.type = "square";
    // Victory jingle
    const melody = [523, 659, 784, 659, 784, 1047];
    melody.forEach((freq, i) => {
      o.frequency.setValueAtTime(freq, t + i * 0.2);
    });
    o.connect(g);
    o.start(t);
    o.stop(t + 1.5);
  }

  gameOver() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.25, 1.2);
    const o = c.createOscillator();
    o.type = "triangle";
    // Descending sad melody
    const melody = [523, 440, 349, 262];
    melody.forEach((freq, i) => {
      o.frequency.setValueAtTime(freq, t + i * 0.3);
    });
    o.connect(g);
    o.start(t);
    o.stop(t + 1.2);
  }

  bumper() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.2, 0.15);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(1600, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.15);
  }

  checkpoint() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.2, 0.4);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(660, t);
    o.frequency.setValueAtTime(880, t + 0.15);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.4);
  }

  menuSelect() {
    this.ensure();
    const c = this.ctx!;
    const g = this.makeGain(0.12, 0.1);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(800, c.currentTime);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.08);
  }

  menuConfirm() {
    this.ensure();
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.15, 0.2);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(600, t);
    o.frequency.setValueAtTime(900, t + 0.08);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.2);
  }

  // ---- Helpers ----

  private makeGain(vol: number, duration: number): GainNode {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    g.connect(this.masterGain!);
    return g;
  }

  private noiseHit(vol: number, duration: number) {
    const c = this.ctx!;
    const t = c.currentTime;
    const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / data.length);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = this.makeGain(vol, duration);
    src.connect(g);
    src.start(t);
    src.stop(t + duration);
  }
}
