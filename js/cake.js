// ───────────────────────────────────────────────
// Escena 3 · La tarta: 28 velas que se apagan
// soplando al micrófono (o con el dedo).
// ───────────────────────────────────────────────

import { fx } from './fx.js';
import { sound } from './audio.js';

export class Cake {
  constructor({ cakeEl, candlesEl, subEl, meterEl, onAllOut }) {
    this.cake = cakeEl;
    this.box = candlesEl;
    this.sub = subEl;
    this.meter = meterEl;
    this.onAllOut = onAllOut || (() => { });
    this.total = 28;
    this.pressing = false;
    this.mic = null;
    this.rafMic = 0;
    this.build();
    this._bind();
  }

  build() {
    this.box.innerHTML = '';
    this.candles = [];
    for (let i = 0; i < this.total; i++) {
      const b = document.createElement('button');
      b.className = 'candle';
      b.type = 'button';
      b.setAttribute('aria-label', `Vela ${i + 1}`);
      const f = document.createElement('span');
      f.className = 'flame';
      f.style.animationDelay = `-${(Math.random() * .4).toFixed(2)}s`;
      b.appendChild(f);
      this.box.appendChild(b);
      this.candles.push({ el: b, out: false });
    }
    this.cake.classList.remove('is-dark');
  }

  get lit() { return this.candles.filter(c => !c.out); }

  _bind() {
    const hitAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const cand = el?.closest?.('.candle');
      if (cand) this.out(this.candles.find(c => c.el === cand));
    };

    this.box.addEventListener('pointerdown', (e) => {
      this.pressing = true;
      hitAt(e.clientX, e.clientY);
    });
    this.box.addEventListener('pointermove', (e) => {
      if (!this.pressing) return;
      hitAt(e.clientX, e.clientY);
    });
    addEventListener('pointerup', () => { this.pressing = false; });
    addEventListener('pointercancel', () => { this.pressing = false; });
  }

  out(c) {
    if (!c || c.out) return;
    c.out = true;
    c.el.classList.add('is-out');
    c.el.classList.remove('is-weak');
    const smoke = document.createElement('i');
    smoke.className = 'smoke';
    c.el.appendChild(smoke);
    setTimeout(() => smoke.remove(), 1500);

    const r = c.el.getBoundingClientRect();
    fx.sparkles(r.left + r.width / 2, r.top - 6, 5, '#ffcf8a');
    sound.pop();

    if (this.lit.length === 0) this._done();
  }

  weaken(on) {
    this.candles.forEach(c => {
      if (!c.out) c.el.classList.toggle('is-weak', on);
    });
  }

  blowAll(stagger = 55) {
    sound.puff();
    const lit = this.lit;
    lit.forEach((c, i) => setTimeout(() => this.out(c), i * stagger));
  }

  _done() {
    this.cake.classList.add('is-dark');
    this.stopMic();
    sound.whoosh();
    const r = this.cake.getBoundingClientRect();
    setTimeout(() => {
      sound.cheer();
      fx.confetti(r.left + r.width / 2, r.top + r.height * .2, 70);
      fx.hearts(r.left + r.width / 2, r.top + r.height * .3, 14);
    }, 700);
    setTimeout(() => this.onAllOut(), 900);
  }

  reset() {
    this.build();
    this.weaken(false);
  }

  /* ── micrófono: soplar de verdad ── */
  async startMic() {
    if (this.mic) return 'ya';
    if (!navigator.mediaDevices?.getUserMedia) return 'no-soportado';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      an.smoothingTimeConstant = .72;
      src.connect(an);
      this.mic = { stream, ctx, an, data: new Uint8Array(an.fftSize) };
      this.meter?.classList.remove('is-hidden');
      this._listen();
      return 'ok';
    } catch (err) {
      return err?.name === 'NotAllowedError' ? 'denegado' : 'error';
    }
  }

  stopMic() {
    if (!this.mic) return;
    this.mic.stream.getTracks().forEach(t => t.stop());
    this.mic.ctx.close?.();
    this.mic = null;
    cancelAnimationFrame(this.rafMic);
    this.meter?.classList.add('is-hidden');
    this.weaken(false);
  }

  _listen() {
    let acc = 0;
    const tick = () => {
      if (!this.mic) return;
      const { an, data } = this.mic;
      an.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);          // 0 … ~0.5
      const level = Math.min(1, rms * 6);
      if (this.meter) this.meter.firstElementChild.style.width = `${level * 100}%`;

      const blowing = level > .34;
      this.weaken(blowing);
      if (blowing) {
        acc += level;
        if (acc > 1.1) {
          acc = 0;
          const lit = this.lit;
          const n = Math.max(1, Math.round(level * 3));
          for (let i = 0; i < n; i++) {
            const c = lit[Math.floor(Math.random() * lit.length)];
            this.out(c);
          }
        }
      } else {
        acc = Math.max(0, acc - .02);
      }
      this.rafMic = requestAnimationFrame(tick);
    };
    tick();
  }
}
