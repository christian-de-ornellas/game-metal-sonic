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
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // AudioContext not available (e.g. blocked by browser policy)
      this.ctx = null;
      this.masterGain = null;
    }
  }

  /** Resume AudioContext after user gesture */
  resume() {
    this.ensure();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  /** Check if audio is available */
  private get ready() {
    return this.ctx !== null && this.masterGain !== null;
  }

  // ---- Sound Effects ----

  jump() {
    this.ensure();
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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
    if (!this.ready) return;
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

  superTransform() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;

    // Ascending sweep (sawtooth)
    const g1 = this.makeGain(0.2, 0.8);
    const o1 = c.createOscillator();
    o1.type = "sawtooth";
    o1.frequency.setValueAtTime(200, t);
    o1.frequency.exponentialRampToValueAtTime(1200, t + 0.6);
    o1.connect(g1);
    o1.start(t);
    o1.stop(t + 0.8);

    // Harmony (triangle, staggered start)
    const g2 = this.makeGain(0.15, 0.7);
    const o2 = c.createOscillator();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(400, t + 0.05);
    o2.frequency.exponentialRampToValueAtTime(2400, t + 0.65);
    o2.connect(g2);
    o2.start(t + 0.05);
    o2.stop(t + 0.75);

    // Shimmer (sine, staggered)
    const g3 = this.makeGain(0.1, 0.6);
    const o3 = c.createOscillator();
    o3.type = "sine";
    o3.frequency.setValueAtTime(800, t + 0.1);
    o3.frequency.exponentialRampToValueAtTime(3000, t + 0.7);
    o3.connect(g3);
    o3.start(t + 0.1);
    o3.stop(t + 0.7);
  }

  // ---- Boss Music ----

  private bossMusicNodes: OscillatorNode[] = [];
  private bossMusicGains: GainNode[] = [];
  private bossMusicBassInterval: ReturnType<typeof setInterval> | null = null;
  private bossMusicLeadInterval: ReturnType<typeof setInterval> | null = null;
  private bossMusicPhase = 0;
  private bossMusicPlaying = false;

  startBossMusic(phase: number = 1) {
    this.ensure();
    if (!this.ready) return;
    if (this.bossMusicPlaying) {
      this.setBossMusicIntensity(phase);
      return;
    }
    this.bossMusicPlaying = true;
    this.bossMusicPhase = phase;
    this._startBossMusicLoop(phase);
  }

  stopBossMusic() {
    this.bossMusicPlaying = false;
    if (this.bossMusicBassInterval) { clearInterval(this.bossMusicBassInterval); this.bossMusicBassInterval = null; }
    if (this.bossMusicLeadInterval) { clearInterval(this.bossMusicLeadInterval); this.bossMusicLeadInterval = null; }
    for (const g of this.bossMusicGains) {
      try { g.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.5); } catch {}
    }
    setTimeout(() => {
      for (const o of this.bossMusicNodes) { try { o.stop(); } catch {} }
      this.bossMusicNodes = [];
      this.bossMusicGains = [];
    }, 600);
  }

  setBossMusicIntensity(phase: number) {
    if (!this.bossMusicPlaying || phase === this.bossMusicPhase) return;
    this.stopBossMusic();
    this.bossMusicPlaying = true;
    this.bossMusicPhase = phase;
    setTimeout(() => {
      if (this.bossMusicPlaying) this._startBossMusicLoop(phase);
    }, 300);
  }

  private _startBossMusicLoop(phase: number) {
    if (!this.ready) return;
    const c = this.ctx!;

    // Bass line - pulsating square wave
    const bassGain = c.createGain();
    bassGain.gain.value = 0;
    bassGain.connect(this.masterGain!);
    this.bossMusicGains.push(bassGain);

    const bassOsc = c.createOscillator();
    bassOsc.type = "square";
    bassOsc.frequency.value = 110;
    bassOsc.connect(bassGain);
    bassOsc.start();
    this.bossMusicNodes.push(bassOsc);

    const bpm = phase === 3 ? 180 : phase === 2 ? 160 : 140;
    const beatMs = 60000 / bpm;
    const bassVol = phase === 3 ? 0.12 : phase === 2 ? 0.10 : 0.08;
    const bassNotes = phase === 3 ? [110, 110, 138.59, 110, 146.83, 110, 130.81, 110]
      : phase === 2 ? [110, 130.81, 110, 146.83, 110, 130.81]
      : [110, 130.81, 110, 110];
    let bassIdx = 0;

    this.bossMusicBassInterval = setInterval(() => {
      if (!this.bossMusicPlaying || !this.ready) return;
      const t = c.currentTime;
      bassOsc.frequency.setValueAtTime(bassNotes[bassIdx % bassNotes.length], t);
      bassGain.gain.setValueAtTime(bassVol, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + beatMs / 1200);
      bassIdx++;
    }, beatMs / 2);

    // Lead melody - chiptune square wave
    const leadGain = c.createGain();
    leadGain.gain.value = 0;
    leadGain.connect(this.masterGain!);
    this.bossMusicGains.push(leadGain);

    const leadOsc = c.createOscillator();
    leadOsc.type = "square";
    leadOsc.frequency.value = 440;
    leadOsc.connect(leadGain);
    leadOsc.start();
    this.bossMusicNodes.push(leadOsc);

    const leadVol = phase === 3 ? 0.07 : phase === 2 ? 0.06 : 0.05;
    const leadNotes = phase === 3
      ? [659, 698, 784, 698, 659, 587, 622, 659, 554, 587, 659, 784, 740, 659, 587, 554]
      : phase === 2
      ? [523, 587, 659, 587, 523, 494, 523, 587, 659, 784, 659, 523]
      : [440, 523, 587, 523, 440, 494, 440, 523];
    let leadIdx = 0;

    this.bossMusicLeadInterval = setInterval(() => {
      if (!this.bossMusicPlaying || !this.ready) return;
      const t = c.currentTime;
      leadOsc.frequency.setValueAtTime(leadNotes[leadIdx % leadNotes.length], t);
      leadGain.gain.setValueAtTime(leadVol, t);
      leadGain.gain.exponentialRampToValueAtTime(0.001, t + beatMs / 600);
      leadIdx++;
    }, beatMs);

    // Phase 2+: counter melody
    if (phase >= 2) {
      const counterGain = c.createGain();
      counterGain.gain.value = 0;
      counterGain.connect(this.masterGain!);
      this.bossMusicGains.push(counterGain);

      const counterOsc = c.createOscillator();
      counterOsc.type = phase === 3 ? "sawtooth" : "triangle";
      counterOsc.frequency.value = 330;
      counterOsc.connect(counterGain);
      counterOsc.start();
      this.bossMusicNodes.push(counterOsc);

      const counterNotes = phase === 3
        ? [330, 349, 392, 349, 330, 294, 330, 370]
        : [262, 294, 330, 294, 262, 330];
      let counterIdx = 0;
      const counterVol = phase === 3 ? 0.05 : 0.04;

      const counterInterval = setInterval(() => {
        if (!this.bossMusicPlaying || !this.ready) { clearInterval(counterInterval); return; }
        const t = c.currentTime;
        counterOsc.frequency.setValueAtTime(counterNotes[counterIdx % counterNotes.length], t);
        counterGain.gain.setValueAtTime(counterVol, t);
        counterGain.gain.exponentialRampToValueAtTime(0.001, t + beatMs / 800);
        counterIdx++;
      }, beatMs * 0.75);
    }

    // Phase 3: noise percussion hits on strong beats
    if (phase === 3) {
      let percIdx = 0;
      const percInterval = setInterval(() => {
        if (!this.bossMusicPlaying || !this.ready) { clearInterval(percInterval); return; }
        if (percIdx % 2 === 0) this.noiseHit(0.08, 0.05);
        percIdx++;
      }, beatMs);
    }
  }

  // ---- Boss Sound Effects ----

  bossRoar() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    // Noise burst
    this.noiseHit(0.25, 0.6);
    // Descending oscillator
    const g = this.makeGain(0.2, 0.6);
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.6);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.6);
  }

  laserCharge() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.15, 0.8);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(2000, t + 0.8);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.8);
  }

  laserFire() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    this.noiseHit(0.2, 0.5);
    const g = this.makeGain(0.2, 0.5);
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.5);
  }

  bombDrop() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.15, 0.15);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(600, t);
    o.frequency.exponentialRampToValueAtTime(100, t + 0.15);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.15);
  }

  bossImpact() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    this.noiseHit(0.25, 0.3);
    const g = this.makeGain(0.2, 0.3);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.3);
  }

  private fireBreathNode: OscillatorNode | null = null;
  private fireBreathGain: GainNode | null = null;

  fireBreath() {
    this.ensure();
    if (!this.ready) return;
    if (this.fireBreathNode) return; // already playing
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.value = 0.12;
    // Bandpass filter for crackling fire sound
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 1.5;
    g.connect(this.masterGain!);
    filter.connect(g);
    // Noise source
    const bufLen = c.sampleRate * 2;
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(filter);
    src.start();
    this.fireBreathNode = src as unknown as OscillatorNode;
    this.fireBreathGain = g;
  }

  stopFireBreath() {
    if (this.fireBreathNode) {
      try { (this.fireBreathNode as unknown as AudioBufferSourceNode).stop(); } catch {}
      this.fireBreathNode = null;
    }
    if (this.fireBreathGain) {
      try { this.fireBreathGain.disconnect(); } catch {}
      this.fireBreathGain = null;
    }
  }

  private shellSpinNode: OscillatorNode | null = null;
  private shellSpinGain: GainNode | null = null;

  shellSpin() {
    this.ensure();
    if (!this.ready) return;
    if (this.shellSpinNode) return;
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.value = 0.1;
    g.connect(this.masterGain!);
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 200;
    o.connect(g);
    o.start();
    this.shellSpinNode = o;
    this.shellSpinGain = g;
    // Cycle pitch rapidly
    const cycle = () => {
      if (!this.shellSpinNode) return;
      const t = c.currentTime;
      o.frequency.setValueAtTime(150, t);
      o.frequency.linearRampToValueAtTime(400, t + 0.1);
      o.frequency.linearRampToValueAtTime(150, t + 0.2);
      setTimeout(cycle, 200);
    };
    cycle();
  }

  stopShellSpin() {
    if (this.shellSpinNode) {
      try { this.shellSpinNode.stop(); } catch {}
      this.shellSpinNode = null;
    }
    if (this.shellSpinGain) {
      try { this.shellSpinGain.disconnect(); } catch {}
      this.shellSpinGain = null;
    }
  }

  hammerThrow() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.12, 0.1);
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(500, t + 0.1);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.1);
  }

  phaseTransition() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    // Dramatic sustained chord: 3 notes
    const notes = [196, 247, 330]; // G3, B3, E4
    for (const freq of notes) {
      const g = c.createGain();
      g.gain.setValueAtTime(0.08, t);
      g.gain.setValueAtTime(0.08, t + 1.0);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      g.connect(this.masterGain!);
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      o.start(t);
      o.stop(t + 1.5);
    }
  }

  bossDefeat() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.2, 3);
    const o = c.createOscillator();
    o.type = "square";
    // Victory fanfare expanded
    const melody = [523, 659, 784, 1047, 784, 1047, 1319, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      o.frequency.setValueAtTime(freq, t + i * 0.28);
    });
    o.connect(g);
    o.start(t);
    o.stop(t + 3);
    // Harmony
    const g2 = this.makeGain(0.1, 3);
    const o2 = c.createOscillator();
    o2.type = "triangle";
    const harmony = [262, 330, 392, 523, 392, 523, 659, 523, 659, 784];
    harmony.forEach((freq, i) => {
      o2.frequency.setValueAtTime(freq, t + i * 0.28);
    });
    o2.connect(g2);
    o2.start(t);
    o2.stop(t + 3);
  }

  bossIntro() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    // Deep sustained note with crescendo
    const g = c.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 1.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    g.connect(this.masterGain!);
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(55, t);
    o.frequency.linearRampToValueAtTime(82, t + 2.0);
    o.connect(g);
    o.start(t);
    o.stop(t + 2.0);
    // High tension note
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.exponentialRampToValueAtTime(0.08, t + 1.0);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    g2.connect(this.masterGain!);
    const o2 = c.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(220, t);
    o2.frequency.linearRampToValueAtTime(440, t + 2.0);
    o2.connect(g2);
    o2.start(t);
    o2.stop(t + 2.0);
  }

  warningAlarm() {
    this.ensure();
    if (!this.ready) return;
    const c = this.ctx!;
    const t = c.currentTime;
    const g = this.makeGain(0.1, 0.4);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(800, t);
    o.frequency.setValueAtTime(1000, t + 0.1);
    o.frequency.setValueAtTime(800, t + 0.2);
    o.frequency.setValueAtTime(1000, t + 0.3);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.4);
  }

  /** Stop all looping boss SFX (fire breath, shell spin) */
  stopAllBossLoops() {
    this.stopFireBreath();
    this.stopShellSpin();
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
