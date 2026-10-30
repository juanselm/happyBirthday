// ───────────────────────────────────────────────
// Escena 4 · Minijuego: atrapa 28 pétalos
// ───────────────────────────────────────────────

import { fx, PETAL_COLORS } from './fx.js';
import { sound } from './audio.js';

const GOAL = 28;

export class Game {
  constructor(canvas, { onScore, onWin } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.onScore = onScore || (() => { });
    this.onWin = onWin || (() => { });

    this.items = [];
    this.score = 0;
    this.combo = 0;
    this.t = 0;
    this.spawnAcc = 0;
    this.running = false;
    this.won = false;
    this.keys = { left: false, right: false };
    this.basket = { x: 0, y: 0, w: 92, vx: 0 };

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
    if (!this.stars) {
      this.stars = Array.from({ length: 70 }, () => ({
        x: Math.random(), y: Math.random() * .85,
        r: .4 + Math.random() * 1.2, p: Math.random() * 6.28, s: .5 + Math.random() * 1.5
      }));
    }
    this.basket.w = Math.max(70, Math.min(120, w * 0.17));
    this.basket.y = h - Math.max(70, h * 0.13);
    if (!this.basket.x) this.basket.x = w / 2;
    this.target = this.basket.x;
  }

  _bind() {
    const pos = (e) => e.clientX - this.c.getBoundingClientRect().left;
    this.c.addEventListener('pointermove', (e) => { this.target = pos(e); });
    this.c.addEventListener('pointerdown', (e) => { this.target = pos(e); });
    addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = true;
      if (e.key === 'ArrowRight') this.keys.right = true;
    });
    addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = false;
      if (e.key === 'ArrowRight') this.keys.right = false;
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  }
  stop() { this.running = false; }

  reset() {
    this.items = [];
    this.score = 0;
    this.combo = 0;
    this.won = false;
    this.spawnAcc = 0;
    this.onScore(0, 0);
  }

  _spawn() {
    const r = Math.random();
    const kind = r < .08 ? 'gold' : r < .2 ? 'heart' : 'petal';
    const speed = 70 + this.score * 5.5 + Math.random() * 90;
    this.items.push({
      kind,
      x: 20 + Math.random() * (this.w - 40),
      y: -24,
      vx: (Math.random() - .5) * 42,
      vy: speed * (kind === 'gold' ? 1.35 : 1),
      r: kind === 'heart' ? 10 : 8 + Math.random() * 5,
      rot: Math.random() * 6.28,
      vr: (Math.random() - .5) * 3.4,
      color: kind === 'gold' ? '#ffd36b' : kind === 'heart' ? '#ff5f8f'
        : PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      value: kind === 'gold' ? 3 : kind === 'heart' ? 2 : 1,
      caught: false,
      fade: 1
    });
  }

  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;

    // cesta
    const kb = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (kb) this.target = Math.max(0, Math.min(this.w, this.target + kb * 620 * dt));
    const prev = this.basket.x;
    this.basket.x += (this.target - this.basket.x) * Math.min(1, dt * 11);
    this.basket.x = Math.max(this.basket.w * .4, Math.min(this.w - this.basket.w * .4, this.basket.x));
    this.basket.vx = (this.basket.x - prev) / Math.max(dt, .001);

    // aparición
    if (!this.won) {
      this.spawnAcc += dt * (0.85 + this.score * 0.075);
      while (this.spawnAcc >= 1) { this.spawnAcc -= 1; this._spawn(); }
    }

    // caída y capturas
    const bx = this.basket.x, by = this.basket.y, bw = this.basket.w;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.caught) {
        it.fade -= dt * 3;
        if (it.fade <= 0) this.items.splice(i, 1);
        continue;
      }
      it.vy += 32 * dt;
      it.vx += (Math.sin(this.t * 1.6 + it.rot) * 26 - it.vx * .6) * dt;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.rot += it.vr * dt;

      const inX = Math.abs(it.x - bx) < bw * .5;
      const inY = it.y > by - 14 && it.y < by + 26;
      if (inX && inY) {
        it.caught = true;
        this.combo++;
        this.score += it.value;
        sound.catchPetal(Math.min(8, this.combo));
        fx.sparkles(it.x, it.y, it.kind === 'gold' ? 14 : 7, it.color);
        if (it.kind === 'heart') fx.hearts(it.x, it.y, 4);
        this.onScore(Math.min(GOAL, this.score), this.combo);
        if (this.score >= GOAL && !this.won) this._win();
        continue;
      }
      if (it.y > this.h + 30) {
        this.items.splice(i, 1);
        this.combo = 0;
      }
    }

    this._draw();
    requestAnimationFrame(this._loop);
  }

  _win() {
    this.won = true;
    sound.cheer();
    fx.confetti(this.w / 2, this.h * .5, 100);
    fx.rain(10);
    setTimeout(() => fx.rain(2), 5000);
    this.onWin();
  }

  _draw() {
    const ctx = this.ctx, w = this.w, h = this.h;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#15092a');
    g.addColorStop(.55, '#2a1245');
    g.addColorStop(1, '#4b2152');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    this.stars.forEach(st => {
      ctx.globalAlpha = .3 + .6 * Math.abs(Math.sin(this.t * st.s + st.p));
      ctx.fillStyle = '#fff3e2';
      ctx.beginPath(); ctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // guirnalda de luces
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const y = 54 + Math.sin(x / w * Math.PI) * 40;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i <= 14; i++) {
      const x = (i / 14) * w;
      const y = 54 + Math.sin(x / w * Math.PI) * 40 + 7;
      const a = .4 + .6 * Math.abs(Math.sin(this.t * 1.6 + i));
      ctx.globalAlpha = a;
      ctx.fillStyle = ['#ffd79a', '#ff8fb1', '#8fe0ff'][i % 3];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // silueta de jardín al fondo
    ctx.fillStyle = '#190c2b';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 14) {
      ctx.lineTo(x, h - 46 - Math.abs(Math.sin(x / 90)) * 26 - Math.sin(x / 33) * 6);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // objetos que caen
    this.items.forEach(it => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, it.fade);
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      if (it.kind === 'heart') {
        ctx.fillStyle = it.color;
        ctx.shadowColor = it.color; ctx.shadowBlur = 14;
        const s = it.r / 9;
        ctx.scale(s, s);
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(-9, -3, -5, -11, 0, -6);
        ctx.bezierCurveTo(5, -11, 9, -3, 0, 5);
        ctx.fill();
      } else {
        if (it.kind === 'gold') { ctx.shadowColor = '#ffcf5c'; ctx.shadowBlur = 18; }
        // pétalo en forma de gota, con giro simulado sobre su eje
        const squash = .3 + Math.abs(Math.cos(this.t * 3 + it.rot)) * .7;
        const L = it.r * 1.8, W = it.r * .95 * squash;
        const pg = ctx.createLinearGradient(0, L * .4, 0, -L);
        pg.addColorStop(0, 'rgba(255,255,255,.6)');
        pg.addColorStop(.45, it.color);
        pg.addColorStop(1, it.color);
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(0, L * .45);
        ctx.bezierCurveTo(W, L * .1, W * .72, -L * .78, 0, -L);
        ctx.bezierCurveTo(-W * .72, -L * .78, -W, L * .1, 0, L * .45);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.4)';
        ctx.lineWidth = .7;
        ctx.beginPath(); ctx.moveTo(0, L * .35); ctx.lineTo(0, -L * .8); ctx.stroke();
      }
      ctx.restore();
    });

    this._drawBasket();

    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .4, w / 2, h / 2, Math.max(w, h) * .8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(5,2,12,.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  _drawBasket() {
    const ctx = this.ctx;
    const { x, y, w } = this.basket;
    const tilt = Math.max(-.16, Math.min(.16, -this.basket.vx * .0005));
    const hgt = w * .52;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    // halo de captura
    const hg = ctx.createRadialGradient(0, 0, w * .1, 0, 0, w * .9);
    hg.addColorStop(0, 'rgba(255,215,154,.22)');
    hg.addColorStop(1, 'rgba(255,215,154,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, w * .9, 0, Math.PI * 2); ctx.fill();

    // flores que asoman
    const colors = ['#ff8fb1', '#ffd36b', '#c78cff'];
    colors.forEach((c, i) => {
      const px = (i - 1) * w * .24;
      const bob = Math.sin(this.t * 2 + i) * 2;
      ctx.strokeStyle = '#4e9163';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px * .6, 0);
      ctx.quadraticCurveTo(px * .9, -hgt * .5, px, -hgt * .72 + bob);
      ctx.stroke();
      ctx.save();
      ctx.translate(px, -hgt * .72 + bob);
      for (let k = 0; k < 6; k++) {
        ctx.rotate(Math.PI * 2 / 6);
        ctx.beginPath();
        ctx.ellipse(0, -5, 3.2, 5.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff3c4'; ctx.fill();
      ctx.restore();
    });

    // cesta
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w * .36, hgt);
    ctx.quadraticCurveTo(0, hgt * 1.2, -w * .36, hgt);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, 0, 0, hgt);
    bg.addColorStop(0, '#c98f55');
    bg.addColorStop(1, '#7d4f2c');
    ctx.fillStyle = bg;
    ctx.fill();

    // trenzado
    ctx.strokeStyle = 'rgba(60,32,14,.45)';
    ctx.lineWidth = 1.4;
    for (let i = 1; i < 4; i++) {
      const yy = (i / 4) * hgt;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + i * 2.5, yy);
      ctx.lineTo(w / 2 - i * 2.5, yy);
      ctx.stroke();
    }
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w * .16, 2);
      ctx.lineTo(i * w * .12, hgt - 2);
      ctx.stroke();
    }
    // borde
    ctx.fillStyle = '#e0a767';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export { GOAL };
