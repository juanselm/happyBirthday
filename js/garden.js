// ───────────────────────────────────────────────
// Escena 2 · El jardín: siembra 28 flores
// ───────────────────────────────────────────────

import { Flower, hexA } from './flower.js';
import { fx } from './fx.js';
import { sound } from './audio.js';

const TARGET = 28;

export class Garden {
  constructor(canvas, { onPlant, onPoke, onComplete } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.onPlant = onPlant || (() => { });
    this.onPoke = onPoke || (() => { });
    this.onComplete = onComplete || (() => { });

    this.flowers = [];
    this.fireflies = [];
    this.butterflies = [];
    this.stars = [];
    this.grass = [];
    this.sprout = null;
    this.wind = 0;
    this.windTarget = 0;
    this.pointer = { x: -999, y: -999, down: false, moved: 0 };
    this.t = 0;
    this.running = false;
    this.completed = false;
    this.seedBase = Math.floor(Math.random() * 1e6);

    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas);
    this._bind();
    this._loop = this._loop.bind(this);
  }

  /* ── dimensiones y decorado ── */
  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.c.clientWidth || innerWidth;
    const h = this.c.clientHeight || innerHeight;
    this.w = w; this.h = h;
    this.c.width = Math.floor(w * dpr);
    this.c.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.groundBase = h * (h < 520 ? 0.82 : 0.84);
    this.maxH = Math.min(230, Math.max(110, h * 0.34));

    if (!this.stars.length) {
      for (let i = 0; i < 110; i++) {
        this.stars.push({
          x: Math.random(), y: Math.random() * 0.72,
          r: 0.4 + Math.random() * 1.3,
          p: Math.random() * Math.PI * 2,
          s: 0.6 + Math.random() * 1.6
        });
      }
    }
    this.grass = [];
    for (let i = 0; i < Math.floor(w / 9); i++) {
      const x = Math.random() * w;
      this.grass.push({
        x, y: this.groundY(x) + Math.random() * 10,
        hh: 8 + Math.random() * 22,
        lean: (Math.random() - .5) * .7,
        p: Math.random() * 6.28,
        c: ['#2c5f3c', '#39774a', '#255134'][Math.floor(Math.random() * 3)]
      });
    }
    // reposiciona flores existentes al nuevo suelo
    this.flowers.forEach(f => { f.y = this.groundY(f.x); });
  }

  groundY(x) {
    return this.groundBase
      + Math.sin(x / 260) * 10
      + Math.sin(x / 83 + 1.6) * 4;
  }

  /* ── entrada ── */
  _bind() {
    const pos = (e) => {
      const r = this.c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    this.c.addEventListener('pointerdown', (e) => {
      if (!this.running) return;
      this.c.setPointerCapture?.(e.pointerId);
      const { x, y } = pos(e);
      this.pointer.x = x; this.pointer.y = y; this.pointer.down = true;

      // ¿tocó una flor ya abierta? → la sacude
      const hit = [...this.flowers].reverse().find(f => f.bloom > .6 && f.hit(x, y));
      if (hit) {
        this._poke(hit);
        return;
      }
      if (y < this.groundBase - this.maxH - 30) {
        // tocó el cielo: una estrella fugaz de destellos
        fx.sparkles(x, y, 12);
        sound.sparkle();
        return;
      }
      this._startSprout(x);
    });

    this.c.addEventListener('pointermove', (e) => {
      const { x, y } = pos(e);
      const dx = x - this.pointer.x;
      this.pointer.x = x; this.pointer.y = y;
      this.windTarget = Math.max(-1, Math.min(1, this.windTarget + dx * 0.006));
      if (this.sprout) this.sprout.x = Math.max(16, Math.min(this.w - 16, this.sprout.x));
    });

    const end = () => {
      this.pointer.down = false;
      this._releaseSprout();
    };
    this.c.addEventListener('pointerup', end);
    this.c.addEventListener('pointercancel', end);
    this.c.addEventListener('pointerleave', end);
  }

  _startSprout(x) {
    if (this.sprout) return;
    const seed = this.seedBase + this.flowers.length * 7919 + Math.floor(Math.random() * 999);
    const f = new Flower({
      x: Math.max(18, Math.min(this.w - 18, x)),
      groundY: this.groundY(x),
      seed,
      maxH: this.maxH,
      index: this.flowers.length
    });
    f.targetH = this.maxH * 1.05;   // el límite real lo pone la mano del usuario
    this.sprout = f;
    this.flowers.push(f);
    this._growAcc = 0;
    fx.sparkles(f.x, f.y - 4, 6, '#9ff0b7');
  }

  _releaseSprout() {
    const f = this.sprout;
    if (!f) return;
    this.sprout = null;
    if (f.h < 26) {                 // toque demasiado corto: no cuenta
      this.flowers = this.flowers.filter(x => x !== f);
      fx.sparkles(f.x, f.y, 5, '#9ff0b7');
      return;
    }
    f.release();
    const count = this.flowers.length;
    fx.burst(f.head.x, f.head.y, 16, [f.pal.out, f.pal.in, f.pal.core]);
    fx.sparkles(f.head.x, f.head.y, 14, f.pal.core);
    sound.bloom();
    this.onPlant(count, f);
    this._spawnLife(count);
    if (count >= TARGET && !this.completed) {
      this.completed = true;
      setTimeout(() => this._celebrate(), 450);
    }
  }

  _poke(f) {
    f.poke();
    fx.burst(f.head.x, f.head.y, 9, [f.pal.out, f.pal.in]);
    sound.pop();
    this.onPoke(f);
  }

  _spawnLife(count) {
    if (count % 4 === 0 && this.butterflies.length < 6) {
      this.butterflies.push({
        x: Math.random() * this.w, y: this.h * (0.3 + Math.random() * 0.3),
        tx: Math.random() * this.w, ty: this.h * 0.45,
        vx: 0, vy: 0, p: Math.random() * 6.28,
        hue: ['#ffd79a', '#ff9ed2', '#8fe0ff', '#fff1a8'][Math.floor(Math.random() * 4)],
        size: 7 + Math.random() * 5
      });
    }
    for (let i = 0; i < 2; i++) {
      if (this.fireflies.length > 60) break;
      this.fireflies.push({
        x: Math.random() * this.w,
        y: this.groundBase - Math.random() * this.maxH * 1.3,
        p: Math.random() * 6.28,
        s: .3 + Math.random() * .8,
        r: .8 + Math.random() * 1.8
      });
    }
  }

  _celebrate() {
    sound.cheer();
    fx.confetti(this.w * .5, this.h * .62, 90);
    fx.rain(16);
    this.flowers.forEach((f, i) => setTimeout(() => {
      f.poke();
      fx.sparkles(f.head.x, f.head.y, 6, f.pal.core);
    }, i * 55));
    setTimeout(() => fx.rain(3), 6000);
    this.onComplete();
  }

  /* ── ciclo de vida ── */
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  }
  stop() { this.running = false; }

  reset() {
    this.flowers = [];
    this.butterflies = [];
    this.fireflies = [];
    this.sprout = null;
    this.completed = false;
    this.seedBase = Math.floor(Math.random() * 1e6);
    fx.rain(0);
  }

  get count() { return this.flowers.length; }

  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this._update(dt);
    this._draw();
    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    // viento con inercia
    this.windTarget *= Math.pow(.2, dt);
    this.wind += (this.windTarget + Math.sin(this.t * .35) * .22 - this.wind) * Math.min(1, dt * 3);
    fx.wind = this.wind * .6;

    // crecimiento del brote
    if (this.sprout && this.pointer.down) {
      const p = this.sprout.push(dt, 128);
      this._growAcc += dt;
      if (this._growAcc > .085) {
        this._growAcc = 0;
        sound.grow(p);
        fx.sparkles(this.sprout.head.x, this.sprout.head.y, 1, '#bdf5cf');
      }
      if (this.sprout.h >= this.sprout.targetH) this._releaseSprout();
    }

    const px = this.pointer.x, py = this.pointer.y;
    this.flowers.forEach(f => f.update(dt, f !== this.sprout && f.bloom > .6 && f.hit(px, py)));

    // mariposas
    this.butterflies.forEach(b => {
      if (Math.hypot(b.tx - b.x, b.ty - b.y) < 24 || Math.random() < dt * .35) {
        if (Math.random() < .45 && px > 0) { b.tx = px + (Math.random() - .5) * 90; b.ty = py + (Math.random() - .5) * 90; }
        else {
          const f = this.flowers[Math.floor(Math.random() * this.flowers.length)];
          if (f && f.bloom > .5) { b.tx = f.head.x; b.ty = f.head.y - 10; }
          else { b.tx = Math.random() * this.w; b.ty = this.h * (.25 + Math.random() * .4); }
        }
      }
      const ax = (b.tx - b.x) * 1.6, ay = (b.ty - b.y) * 1.6;
      b.vx += (ax - b.vx * 2.2) * dt;
      b.vy += (ay - b.vy * 2.2) * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.p += dt * (14 + Math.abs(b.vx) * .05);
    });

    this.fireflies.forEach(ff => {
      ff.p += dt * ff.s;
      ff.x += Math.sin(ff.p * .7) * 10 * dt + this.wind * 14 * dt;
      ff.y += Math.cos(ff.p * .5) * 8 * dt;
    });
  }

  /* ── dibujo ── */
  _draw() {
    const ctx = this.ctx, w = this.w, h = this.h;

    // cielo
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#190d2d');
    sky.addColorStop(.42, '#2a1443');
    sky.addColorStop(.7, '#45215a');
    sky.addColorStop(1, '#6b2f55');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // estrellas
    this.stars.forEach(s => {
      const a = .35 + .65 * Math.abs(Math.sin(this.t * s.s + s.p));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff6e8';
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // luna
    const mx = w * .82, my = h * .14, mr = Math.min(58, w * .07);
    const mg = ctx.createRadialGradient(mx, my, mr * .2, mx, my, mr * 4);
    mg.addColorStop(0, 'rgba(255,226,180,.3)');
    mg.addColorStop(1, 'rgba(255,226,180,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffeec9';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,222,180,.5)';
    [[.3, -.2, .18], [-.25, .25, .13], [.1, .4, .1]].forEach(([a, b, c]) => {
      ctx.beginPath(); ctx.arc(mx + a * mr, my + b * mr, c * mr, 0, Math.PI * 2); ctx.fill();
    });

    // colinas lejanas
    this._hill(h * .72, '#2b1540', 180, 0.9);
    this._hill(h * .78, '#201033', 120, 1.6);

    // resplandor del horizonte
    const hg = ctx.createRadialGradient(w * .5, this.groundBase, 0, w * .5, this.groundBase, w * .7);
    hg.addColorStop(0, 'rgba(255,143,177,.16)');
    hg.addColorStop(1, 'rgba(255,143,177,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);

    // luciérnagas
    this.fireflies.forEach(ff => {
      const a = .25 + .75 * Math.abs(Math.sin(ff.p));
      ctx.globalAlpha = a;
      ctx.shadowColor = '#ffe9a0';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(ff.x, ff.y, ff.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // suelo
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, this.groundY(0));
    for (let x = 0; x <= w; x += 12) ctx.lineTo(x, this.groundY(x));
    ctx.lineTo(w, h);
    ctx.closePath();
    const gg = ctx.createLinearGradient(0, this.groundBase - 10, 0, h);
    gg.addColorStop(0, '#2f6340');
    gg.addColorStop(.25, '#24482f');
    gg.addColorStop(1, '#140d1c');
    ctx.fillStyle = gg;
    ctx.fill();

    // hierba
    this.grass.forEach(g => {
      const sway = Math.sin(this.t * 1.1 + g.p) * 3 + this.wind * 9;
      ctx.strokeStyle = g.c;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.quadraticCurveTo(g.x + g.lean * 6 + sway * .5, g.y - g.hh * .6, g.x + g.lean * 12 + sway, g.y - g.hh);
      ctx.stroke();
    });

    // flores (altas detrás)
    [...this.flowers].sort((a, b) => b.targetH - a.targetH).forEach(f => f.draw(ctx, this.t, this.wind));

    // mariposas
    this.butterflies.forEach(b => this._butterfly(b));

    // guía del brote
    if (this.sprout && this.pointer.down) {
      ctx.globalAlpha = .5;
      ctx.strokeStyle = hexA('#ffffff', .4);
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(this.sprout.x, this.sprout.y);
      ctx.lineTo(this.sprout.x, this.sprout.y - this.maxH * 1.05);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // viñeta
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .42, w / 2, h / 2, Math.max(w, h) * .78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(5,2,12,.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  _hill(y, color, amp, freq) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(0, this.h);
    for (let x = 0; x <= this.w; x += 16) {
      const yy = y + Math.sin(x / (this.w / (3 * freq)) + freq) * (amp * .08) + Math.sin(x / 140) * 8;
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(this.w, this.h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  _butterfly(b) {
    const ctx = this.ctx;
    const flap = Math.sin(b.p);
    const dir = b.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.max(-.4, Math.min(.4, b.vy * .002)));
    ctx.scale(dir, 1);
    ctx.shadowColor = b.hue;
    ctx.shadowBlur = 10;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(1, 1);
      const sq = .35 + Math.abs(flap) * .75;
      ctx.beginPath();
      ctx.ellipse(s * b.size * .62 * sq, -b.size * .3, b.size * .62 * sq, b.size * .52, s * .35, 0, Math.PI * 2);
      ctx.fillStyle = b.hue;
      ctx.globalAlpha = .92;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * b.size * .5 * sq, b.size * .34, b.size * .46 * sq, b.size * .38, s * -.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#3a2340';
    ctx.beginPath();
    ctx.ellipse(0, 0, b.size * .13, b.size * .6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export { TARGET };
