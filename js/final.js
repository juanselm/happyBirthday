// ───────────────────────────────────────────────
// Escena 5 · El ramo: todas las flores sembradas,
// atadas con un lazo. Toca una y te dice su deseo.
// ───────────────────────────────────────────────

import { Flower } from './flower.js';
import { fx } from './fx.js';
import { sound } from './audio.js';

export class Bouquet {
  constructor(canvas, { onPick } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.onPick = onPick || (() => { });
    this.flowers = [];
    this.spread = 0;
    this.spreadTarget = 0;
    this.t = 0;
    this.running = false;
    this.pointer = { x: -999, y: -999, down: false };
    this.bokeh = [];
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this._bind();
    this._loop = this._loop.bind(this);
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.c.clientWidth || innerWidth;
    const h = this.c.clientHeight || innerHeight;
    this.w = w; this.h = h;
    this.c.width = Math.floor(w * dpr);
    this.c.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // el ramo se apoya justo encima de la barra de botones
    this.base = { x: w / 2, y: h - Math.max(104, h * .15) };
    this.len = Math.min(h * .6, w * .8, 360);
    if (!this.bokeh.length) {
      for (let i = 0; i < 26; i++) {
        this.bokeh.push({
          x: Math.random(), y: Math.random(),
          r: 10 + Math.random() * 46,
          a: .03 + Math.random() * .07,
          p: Math.random() * 6.28,
          c: ['#ff8fb1', '#ffd79a', '#c78cff', '#8fe0ff'][Math.floor(Math.random() * 4)]
        });
      }
    }
    this._layout();
  }

  /* ── construir el ramo a partir de las semillas sembradas ── */
  setFlowers(seedList) {
    this.seeds = seedList.slice(0, 28);
    this.flowers = this.seeds.map((s, i) => new Flower({
      x: 0, groundY: 0, seed: s.seed, maxH: this.len, index: i, instant: true
    }));
    this._layout();
  }

  _layout() {
    const n = this.flowers.length || 1;
    // la apertura del abanico se adapta al ancho disponible
    const maxSpread = Math.min(.92, Math.asin(Math.min(.92, (this.w * .42) / this.len)));
    this.flowers.forEach((f, i) => {
      const u = n === 1 ? .5 : i / (n - 1);
      const row = i % 3;
      f._a = (u - .5) * 2 * maxSpread;              // abanico
      f._depth = row;                                // tres profundidades
      f._len = this.len * (row === 0 ? .96 : row === 1 ? .8 : .66) * (.9 + (f.seed % 100) / 500);
      f.h = f.targetH = f._len;
    });
    // dibuja primero las de atrás
    this.order = this.flowers.map((f, i) => i).sort((a, b) =>
      this.flowers[a]._depth - this.flowers[b]._depth);
  }

  _bind() {
    const pos = (e) => {
      const r = this.c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    this.c.addEventListener('pointerdown', (e) => {
      const { x, y } = pos(e);
      this.pointer.down = true;
      this.pointer.lastX = x;
      const f = [...this.flowers].reverse().find(fl => fl.screen &&
        Math.hypot(fl.screen.x - x, fl.screen.y - y) < fl.headR * 2 + 10);
      if (f) {
        f.poke();
        fx.burst(f.screen.x, f.screen.y, 12, [f.pal.out, f.pal.in, f.pal.core]);
        sound.bloom();
        this.onPick(f.index);
      } else {
        fx.sparkles(x, y, 10);
        sound.sparkle();
      }
    });
    this.c.addEventListener('pointermove', (e) => {
      const { x, y } = pos(e);
      this.pointer.x = x; this.pointer.y = y;
      if (this.pointer.down) {
        const dx = x - (this.pointer.lastX ?? x);
        this.pointer.lastX = x;
        this.spreadTarget = Math.max(-.5, Math.min(.5, this.spreadTarget + dx * .004));
      }
    });
    const up = () => { this.pointer.down = false; };
    this.c.addEventListener('pointerup', up);
    this.c.addEventListener('pointerleave', up);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  }
  stop() { this.running = false; }

  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.spreadTarget *= Math.pow(.35, dt);
    this.spread += (this.spreadTarget - this.spread) * Math.min(1, dt * 4);
    this.flowers.forEach(f => f.update(dt, false));
    this._draw();
    requestAnimationFrame(this._loop);
  }

  _draw() {
    const ctx = this.ctx, w = this.w, h = this.h;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#150a28');
    g.addColorStop(.5, '#2b1143');
    g.addColorStop(1, '#55214f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // bokeh suave
    this.bokeh.forEach(b => {
      const x = b.x * w + Math.sin(this.t * .25 + b.p) * 18;
      const y = b.y * h + Math.cos(this.t * .2 + b.p) * 14;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      rg.addColorStop(0, b.c);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = b.a * (.6 + .4 * Math.sin(this.t * .6 + b.p));
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    const bx = this.base.x, by = this.base.y;
    const breeze = Math.sin(this.t * .6) * .035;
    const px = this.pointer.x > 0 ? (this.pointer.x / w - .5) * .12 : 0;

    // papel del ramo
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(breeze * .5 + px * .3);
    ctx.beginPath();
    ctx.moveTo(-this.len * .34, -this.len * .36);
    ctx.lineTo(this.len * .34, -this.len * .36);
    ctx.lineTo(this.len * .1, 18);
    ctx.lineTo(-this.len * .1, 18);
    ctx.closePath();
    const pg = ctx.createLinearGradient(0, -this.len * .36, 0, 0);
    pg.addColorStop(0, 'rgba(255,245,235,.18)');
    pg.addColorStop(1, 'rgba(255,214,228,.32)');
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.restore();

    // flores
    this.order.forEach(i => {
      const f = this.flowers[i];
      const a = f._a * (1 + this.spread) + breeze + px + (f._depth - 1) * .04;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a);
      if (f._depth === 0) ctx.globalAlpha = .82;
      f.x = 0; f.y = 0;
      f.draw(ctx, this.t + i, Math.sin(this.t * .7 + i) * .12);
      ctx.globalAlpha = 1;
      ctx.restore();
      // posición de la cabeza en pantalla (para poder tocarla)
      const cos = Math.cos(a), sin = Math.sin(a);
      f.screen = {
        x: bx + f.head.x * cos - f.head.y * sin,
        y: by + f.head.x * sin + f.head.y * cos
      };
    });

    // lazo
    ctx.save();
    ctx.translate(bx, by - this.len * .22);
    ctx.rotate(breeze * .5 + px * .3);
    ctx.fillStyle = '#e0507f';
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.len * .13, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    [-1, 1].forEach(s => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(s * 34, -26, s * 46, 8, 0, 4);
      ctx.fillStyle = s < 0 ? '#ff7fa8' : '#e0507f';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.bezierCurveTo(s * 16, 22, s * 26, 40, s * 12, 52);
      ctx.strokeStyle = s < 0 ? '#ff7fa8' : '#e0507f';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
    });
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd79a';
    ctx.fill();
    ctx.restore();

    const vg = ctx.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .35, w / 2, h * .45, Math.max(w, h) * .8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(5,2,12,.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}
