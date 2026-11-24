// ───────────────────────────────────────────────
// Capa de partículas que vive por encima de todo:
// pétalos, confeti, destellos, corazones.
// ───────────────────────────────────────────────

import { hexA } from './flower.js';

const PETAL_COLORS = ['#ff8fb1', '#ffb36b', '#c78cff', '#fff1a8', '#ff5f8f', '#ffd9e6', '#8fe0ff'];

export class Fx {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.parts = [];
    this.rainRate = 0;
    this._rainAcc = 0;
    this.wind = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.max = this.reduced ? 160 : 520;
    this.resize();
    addEventListener('resize', () => this.resize());
    this.last = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.w = innerWidth;
    this.h = innerHeight;
    this.c.width = Math.floor(this.w * dpr);
    this.c.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _add(p) {
    if (this.parts.length > this.max) this.parts.shift();
    this.parts.push(p);
  }

  petal(x, y, { vx = 0, vy = 0, color, size, life = 6, kind = 'petal' } = {}) {
    this._add({
      kind,
      x, y,
      vx: vx + (Math.random() - .5) * 20,
      vy,
      size: size || 5 + Math.random() * 7,
      color: color || PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - .5) * 4,
      flip: .5 + Math.random(),
      drag: .6 + Math.random() * .5,
      life, maxLife: life
    });
  }

  burst(x, y, n = 18, colors = null) {
    n = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 190;
      this.petal(x, y, {
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        color: colors ? colors[Math.floor(Math.random() * colors.length)] : null,
        life: 2.6 + Math.random() * 2.4
      });
    }
  }

  confetti(x, y, n = 40) {
    n = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 2.2;
      const sp = 180 + Math.random() * 420;
      this._add({
        kind: 'confetti',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: 4 + Math.random() * 6,
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - .5) * 14,
        flip: .4 + Math.random(),
        drag: .9,
        life: 3 + Math.random() * 2, maxLife: 5
      });
    }
  }

  sparkles(x, y, n = 10, color = '#ffe3a8') {
    n = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 120;
      this._add({
        kind: 'spark',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        size: 1.6 + Math.random() * 2.6,
        color,
        rot: 0, vr: 0, flip: 1, drag: 1.6,
        life: .7 + Math.random() * .9, maxLife: 1.6
      });
    }
  }

  hearts(x, y, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 1.8;
      const sp = 90 + Math.random() * 230;
      this._add({
        kind: 'heart',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: 7 + Math.random() * 11,
        color: ['#ff5f8f', '#ff8fb1', '#ffd9e6'][i % 3],
        rot: (Math.random() - .5) * .6, vr: (Math.random() - .5) * 2,
        flip: 1, drag: .8,
        life: 2.2 + Math.random() * 1.6, maxLife: 3.8
      });
    }
  }

  fireworks(cx, cy) {
    const colors = PETAL_COLORS;
    for (let k = 0; k < 3; k++) {
      setTimeout(() => {
        const x = cx + (Math.random() - .5) * this.w * .6;
        const y = cy + (Math.random() - .5) * this.h * .25;
        this.sparkles(x, y, 34, colors[Math.floor(Math.random() * colors.length)]);
        this.burst(x, y, 16);
      }, k * 260);
    }
  }

  rain(rate = 0) { this.rainRate = this.reduced ? rate * .35 : rate; }

  _loop(now) {
    const dt = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // lluvia continua de pétalos
    if (this.rainRate > 0) {
      this._rainAcc += this.rainRate * dt;
      while (this._rainAcc >= 1) {
        this._rainAcc -= 1;
        this.petal(Math.random() * this.w, -20, { vy: 26 + Math.random() * 46, life: 14 });
      }
    }

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }

      const gravity = p.kind === 'spark' ? -14 : p.kind === 'confetti' ? 210 : 42;
      p.vy += gravity * dt;
      p.vx += (this.wind * 40 - p.vx * p.drag) * dt;
      if (p.kind === 'petal') p.vx += Math.sin(now / 700 + p.rot) * 16 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      if (p.y > this.h + 40 || p.x < -60 || p.x > this.w + 60) {
        this.parts.splice(i, 1);
        continue;
      }

      const fade = Math.min(1, p.life / Math.min(1.2, p.maxLife));
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      if (p.kind === 'confetti') {
        ctx.fillStyle = p.color;
        const sq = Math.abs(Math.cos(now / 260 + p.flip * 4));
        ctx.fillRect(-p.size / 2, -p.size * sq / 2, p.size, Math.max(1, p.size * sq));
      } else if (p.kind === 'spark') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'heart') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = hexA('#ff5f8f', .8);
        ctx.shadowBlur = 10;
        const s = p.size / 10;
        ctx.scale(s, s);
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.bezierCurveTo(-9, -3, -5, -11, 0, -6);
        ctx.bezierCurveTo(5, -11, 9, -3, 0, 4);
        ctx.fill();
      } else {
        // pétalo: elipse con "giro" simulado
        const squash = Math.abs(Math.cos(now / 420 * p.flip + p.rot));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * (.35 + squash * .65), p.size * 1.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade * .5;
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = .6;
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.2);
        ctx.lineTo(0, p.size * 1.2);
        ctx.stroke();
      }
      ctx.restore();
    }

    requestAnimationFrame(this._loop);
  }
}

export const fx = new Fx(document.getElementById('fx'));
export { PETAL_COLORS };
