// ───────────────────────────────────────────────
// Sonido generado 100% con WebAudio (sin archivos)
// ───────────────────────────────────────────────

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Pentatónica de La menor, para que todo lo aleatorio suene bien
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];
const PADS = [
  [45, 57, 60, 64],
  [43, 55, 59, 62],
  [41, 53, 57, 60],
  [43, 55, 60, 64]
];

// "Happy Birthday" (dominio público) en notas MIDI + duraciones en pulsos
const MELODY = [
  [67, .5], [67, .5], [69, 1], [67, 1], [72, 1], [71, 1.8],
  [67, .5], [67, .5], [69, 1], [67, 1], [74, 1], [72, 1.8],
  [67, .5], [67, .5], [79, 1], [76, 1], [72, 1], [71, 1], [69, 1.6],
  [77, .5], [77, .5], [76, 1], [72, 1], [74, 1], [72, 2.2]
];

class Sound {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.step = 0;
    this.padIndex = 0;
    this._ambientTimer = null;
  }

  /* ── arranque (requiere gesto del usuario) ── */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // compresor suave para que nada reviente
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.connect(this.master);
    this.bus = comp;

    // reverb con impulso sintético
    const rev = ctx.createConvolver();
    rev.buffer = this._impulse(2.6, 2.4);
    const revGain = ctx.createGain();
    revGain.gain.value = .5;
    rev.connect(revGain).connect(comp);
    this.reverb = rev;

    this.dry = ctx.createGain();
    this.dry.gain.value = .9;
    this.dry.connect(comp);
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  enable() {
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.on = true;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(.85, t + 1.2);
    this._ambient();
    return true;
  }

  disable() {
    if (!this.ctx) return;
    this.on = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(0, t + .5);
    clearTimeout(this._ambientTimer);
  }

  toggle() {
    if (this.on) { this.disable(); return false; }
    return this.enable();
  }

  /* ── voz básica ── */
  voice(midi, {
    dur = .9, type = 'sine', gain = .22, when = 0,
    attack = .012, wet = .5, detune = 0, glide = 0
  } = {}) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(mtof(midi), t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(mtof(midi + glide), t0 + dur);
    osc.detune.value = detune;

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(this.dry);
    const w = ctx.createGain();
    w.gain.value = wet;
    g.connect(w).connect(this.reverb);

    osc.start(t0);
    osc.stop(t0 + dur + .05);
  }

  noise({ dur = .5, when = 0, gain = .18, freq = 900, q = .7, type = 'bandpass' } = {}) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.dry);
    const w = ctx.createGain(); w.gain.value = .4;
    g.connect(w).connect(this.reverb);
    src.start(t0);
  }

  /* ── gestos sonoros del jardín ── */
  bloom() {
    const n = PENTA[this.step % PENTA.length];
    this.step++;
    this.voice(n, { dur: 2.2, type: 'sine', gain: .2, wet: .8 });
    this.voice(n + 12, { dur: 1.4, type: 'triangle', gain: .07, when: .04, wet: .9 });
    this.voice(n + 7, { dur: 1.8, type: 'sine', gain: .09, when: .09, wet: .9 });
  }

  grow(progress) {
    // pequeños chasquidos mientras el tallo sube
    this.noise({ dur: .07, gain: .05, freq: 500 + progress * 2200, q: 2 });
  }

  sparkle() {
    const n = PENTA[(PENTA.length - 1) - Math.floor(Math.random() * 4)] + 12;
    this.voice(n, { dur: .7, type: 'triangle', gain: .08, wet: 1 });
  }

  pop() {
    this.voice(76 + Math.floor(Math.random() * 7), { dur: .25, type: 'triangle', gain: .14, glide: 7 });
    this.noise({ dur: .12, gain: .07, freq: 2200, q: 1.2 });
  }

  catchPetal(combo = 0) {
    const n = PENTA[Math.min(PENTA.length - 1, 3 + combo)];
    this.voice(n, { dur: .5, type: 'sine', gain: .16, wet: .6 });
  }

  puff() {
    this.noise({ dur: .55, gain: .3, freq: 760, q: .4, type: 'lowpass' });
  }

  whoosh() {
    this.noise({ dur: 1.1, gain: .14, freq: 480, q: .3, type: 'lowpass' });
  }

  cheer() {
    [0, .08, .16, .26, .4].forEach((w, i) => {
      this.voice(PENTA[5 + i], { dur: 1.6, type: 'sine', gain: .16, when: w, wet: .8 });
    });
    this.noise({ dur: 1.6, gain: .1, freq: 3000, q: .6 });
  }

  /* ── melodía de cumpleaños ── */
  birthday(bpm = 118) {
    if (!this.on) return;
    const beat = 60 / bpm;
    let t = .15;
    MELODY.forEach(([m, d]) => {
      this.voice(m, { dur: d * beat * 1.25, type: 'triangle', gain: .17, when: t, wet: .55 });
      this.voice(m - 12, { dur: d * beat, type: 'sine', gain: .06, when: t, wet: .4 });
      t += d * beat;
    });
    return t;
  }

  /* ── fondo ambiental ── */
  _ambient() {
    clearTimeout(this._ambientTimer);
    const tick = () => {
      if (!this.on) return;
      const chord = PADS[this.padIndex % PADS.length];
      this.padIndex++;
      chord.forEach((m, i) => {
        this.voice(m, {
          dur: 6.5, type: i === 0 ? 'sine' : 'triangle',
          gain: i === 0 ? .07 : .035,
          when: i * .12, attack: 1.6, wet: 1
        });
      });
      if (Math.random() < .55) {
        this.voice(PENTA[6 + Math.floor(Math.random() * 5)] , {
          dur: 2.4, type: 'sine', gain: .05, when: 1 + Math.random() * 3, wet: 1
        });
      }
      this._ambientTimer = setTimeout(tick, 5600);
    };
    tick();
  }
}

export const sound = new Sound();
