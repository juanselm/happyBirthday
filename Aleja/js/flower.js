// ───────────────────────────────────────────────
// Flores procedurales dibujadas en canvas 2D.
// Cada flor es única: semilla → especie, pétalos, color y balanceo.
// ───────────────────────────────────────────────

export function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PALETTES = [
  { out: '#ff7fa8', in: '#ffd9e6', core: '#ffcf5c', glow: '#ff8fb1' }, // rosa
  { out: '#ffa15c', in: '#ffe6c4', core: '#ff6d4a', glow: '#ffb36b' }, // coral
  { out: '#c78cff', in: '#efdcff', core: '#ffd77a', glow: '#bb8bff' }, // lila
  { out: '#fff1a8', in: '#fffbe4', core: '#ffa23d', glow: '#ffe08a' }, // crema
  { out: '#ff5f8f', in: '#ffc0d4', core: '#ffe6a3', glow: '#ff4f86' }, // fucsia
  { out: '#7fd6ff', in: '#dcf4ff', core: '#ffd77a', glow: '#8fe0ff' }, // celeste
  { out: '#ff9ed2', in: '#ffe4f3', core: '#f7f0a0', glow: '#ff9ed2' }, // orquídea
  { out: '#ffd36b', in: '#fff3cf', core: '#d9603a', glow: '#ffc24d' }  // girasol
];

const SPECIES = ['daisy', 'tulip', 'rose', 'poppy', 'star'];

export class Flower {
  constructor({ x, groundY, seed, maxH = 190, index = 0, instant = false }) {
    const r = rng(seed);
    this.seed = seed;
    this.index = index;
    this.x = x;
    this.y = groundY;

    this.species = SPECIES[Math.floor(r() * SPECIES.length)];
    this.pal = PALETTES[Math.floor(r() * PALETTES.length)];
    this.targetH = maxH * (0.52 + r() * 0.48);
    this.h = instant ? this.targetH : 8;
    this.headR = (10 + r() * 9) * (0.8 + this.targetH / maxH * 0.45);
    this.petals = this.species === 'tulip' ? 5 + Math.floor(r() * 2)
      : this.species === 'poppy' ? 4 + Math.floor(r() * 3)
        : this.species === 'star' ? 6 + Math.floor(r() * 3)
          : 8 + Math.floor(r() * 6);
    this.lean = (r() - 0.5) * 0.9;
    this.phase = r() * Math.PI * 2;
    this.swaySpeed = 0.5 + r() * 0.55;
    this.swayAmp = 5 + r() * 9;
    this.spin = (r() - 0.5) * 0.35;
    this.layers = this.species === 'rose' ? 3 + Math.floor(r() * 2) : 2;
    this.leaves = [
      { at: 0.3 + r() * 0.12, side: r() < 0.5 ? -1 : 1, size: 0.8 + r() * 0.5 },
      { at: 0.52 + r() * 0.14, side: r() < 0.5 ? -1 : 1, size: 0.65 + r() * 0.5 }
    ];
    if (r() < 0.45) this.leaves.push({ at: 0.72, side: r() < 0.5 ? -1 : 1, size: 0.5 + r() * 0.3 });

    this.bloom = instant ? 1 : 0;
    this.growing = !instant;
    this.alive = true;
    this.hover = 0;
    this.pulse = 0;
    this.head = { x, y: groundY - this.h };
  }

  /* crece mientras se mantiene pulsado */
  push(dt, speed = 150) {
    this.h = Math.min(this.targetH, this.h + speed * dt);
    return this.h / this.targetH;
  }

  release() {
    this.growing = false;
    this.targetH = this.h;
  }

  update(dt, hovering = false) {
    if (!this.growing && this.bloom < 1) this.bloom = Math.min(1, this.bloom + dt * 1.6);
    this.hover += ((hovering ? 1 : 0) - this.hover) * Math.min(1, dt * 8);
    if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 1.8);
  }

  poke() { this.pulse = 1; }

  /* geometría del tallo en el instante t */
  geom(t, wind) {
    const g = this.h;
    const sway = Math.sin(t * this.swaySpeed + this.phase) * this.swayAmp + wind * 26;
    const tipX = this.x + this.lean * g * 0.18 + sway * (0.4 + g / 240);
    const tipY = this.y - g;
    const cx = this.x + (tipX - this.x) * 0.3;
    const cy = this.y - g * 0.62;
    return { tipX, tipY, cx, cy };
  }

  draw(ctx, t, wind) {
    const { tipX, tipY, cx, cy } = this.geom(t, wind);
    this.head.x = tipX;
    this.head.y = tipY;

    const ease = this.bloom < 1 ? this.bloom * this.bloom * (3 - 2 * this.bloom) : 1;
    const pop = 1 + this.pulse * 0.18 + this.hover * 0.07;

    // ── tallo (polígono con grosor decreciente) ──
    const N = 14;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const px = (1 - u) * (1 - u) * this.x + 2 * (1 - u) * u * cx + u * u * tipX;
      const py = (1 - u) * (1 - u) * this.y + 2 * (1 - u) * u * cy + u * u * tipY;
      pts.push([px, py]);
    }
    const base = Math.max(1.6, 3.4 * (this.h / 200) + 1.4);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const w = base * (1 - i / N * 0.72);
      const [px, py] = pts[i];
      const [qx, qy] = pts[Math.min(N, i + 1)];
      const a = Math.atan2(qy - py, qx - px) + Math.PI / 2;
      ctx.lineTo(px + Math.cos(a) * w, py + Math.sin(a) * w);
    }
    for (let i = N; i >= 0; i--) {
      const w = base * (1 - i / N * 0.72);
      const [px, py] = pts[i];
      const [qx, qy] = pts[Math.min(N, i + 1)];
      const a = Math.atan2(qy - py, qx - px) + Math.PI / 2;
      ctx.lineTo(px - Math.cos(a) * w, py - Math.sin(a) * w);
    }
    ctx.closePath();
    const sg = ctx.createLinearGradient(this.x, this.y, tipX, tipY);
    sg.addColorStop(0, '#2c5c3a');
    sg.addColorStop(1, '#67a86a');
    ctx.fillStyle = sg;
    ctx.fill();

    // ── hojas ──
    this.leaves.forEach((lf, k) => {
      const u = lf.at;
      if (this.h < 40) return;
      const i = Math.floor(u * N);
      const [px, py] = pts[i];
      const [qx, qy] = pts[Math.min(N, i + 1)];
      const stemA = Math.atan2(qy - py, qx - px);
      const wob = Math.sin(t * (0.9 + k * 0.3) + this.phase + k) * 0.12;
      const size = Math.min(1, this.h / 110) * lf.size * (18 + this.headR * 0.5);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(stemA + lf.side * (0.75 + wob));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size * 0.45, -size * 0.42, size * 0.9, -size * 0.2, size * 1.15, 0);
      ctx.bezierCurveTo(size * 0.9, size * 0.2, size * 0.45, size * 0.42, 0, 0);
      const lg = ctx.createLinearGradient(0, 0, size * 1.15, 0);
      lg.addColorStop(0, '#2f6b43');
      lg.addColorStop(1, '#79c177');
      ctx.fillStyle = lg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,60,30,.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 1.1, 0);
      ctx.stroke();
      ctx.restore();
    });

    // ── capullo mientras crece ──
    const tipA = Math.atan2(tipY - pts[N - 1][1], tipX - pts[N - 1][0]) + Math.PI / 2;
    if (this.bloom < 0.999) {
      const r = this.headR * (0.35 + 0.3 * this.bloom);
      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(tipA);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.4, r * 0.62, r * 1.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.pal.out;
      ctx.globalAlpha = 0.55 + this.bloom * 0.45;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, r * 0.66, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3f7d4d';
      ctx.fill();
      ctx.restore();
      if (this.bloom === 0) return;
    }

    // ── cabeza de la flor ──
    const R = this.headR * ease * pop;
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(tipA * 0.55 + this.spin * ease);

    // resplandor
    const glowR = R * (2.4 + this.hover * 0.8 + this.pulse);
    const gg = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, glowR);
    gg.addColorStop(0, hexA(this.pal.glow, 0.32 + this.hover * 0.22 + this.pulse * 0.2));
    gg.addColorStop(1, hexA(this.pal.glow, 0));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    switch (this.species) {
      case 'rose': this._rose(ctx, R); break;
      case 'tulip': this._tulip(ctx, R); break;
      case 'poppy': this._poppy(ctx, R); break;
      case 'star': this._star(ctx, R); break;
      default: this._daisy(ctx, R);
    }
    ctx.restore();
  }

  _petalPath(ctx, len, wid, sharp = 0.35) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.3, wid * sharp, -len * 0.92, 0, -len);
    ctx.bezierCurveTo(-wid * sharp, -len * 0.92, -wid, -len * 0.3, 0, 0);
    ctx.closePath();
  }

  _fillPetal(ctx, len) {
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, this.pal.in);
    g.addColorStop(0.55, this.pal.out);
    g.addColorStop(1, hexA(this.pal.out, 0.88));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = hexA('#ffffff', 0.22);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  _daisy(ctx, R) {
    for (let layer = this.layers - 1; layer >= 0; layer--) {
      const k = 1 - layer * 0.26;
      const off = layer * Math.PI / this.petals;
      for (let i = 0; i < this.petals; i++) {
        const a = (i / this.petals) * Math.PI * 2 + off;
        ctx.save();
        ctx.rotate(a);
        this._petalPath(ctx, R * 2.05 * k, R * 0.52 * k);
        this._fillPetal(ctx, R * 2.05 * k);
        ctx.restore();
      }
    }
    this._core(ctx, R * 0.62, true);
  }

  _star(ctx, R) {
    for (let i = 0; i < this.petals; i++) {
      const a = (i / this.petals) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      this._petalPath(ctx, R * 2.3, R * 0.34, 0.12);
      this._fillPetal(ctx, R * 2.3);
      ctx.restore();
    }
    this._core(ctx, R * 0.5, false);
  }

  _poppy(ctx, R) {
    for (let i = 0; i < this.petals; i++) {
      const a = (i / this.petals) * Math.PI * 2 + 0.2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(R * 1.5, -R * 0.5, R * 1.1, -R * 1.9, 0, -R * 1.75);
      ctx.bezierCurveTo(-R * 1.1, -R * 1.9, -R * 1.5, -R * 0.5, 0, 0);
      this._fillPetal(ctx, R * 1.75);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = '#4a1f33';
    ctx.fill();
    this._core(ctx, R * 0.3, true);
  }

  _tulip(ctx, R) {
    for (let i = 0; i < this.petals; i++) {
      const a = -0.5 + (i / (this.petals - 1)) * 1.0;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, R * 0.5);
      ctx.bezierCurveTo(R * 0.95, R * 0.2, R * 0.75, -R * 1.5, 0, -R * 1.85);
      ctx.bezierCurveTo(-R * 0.75, -R * 1.5, -R * 0.95, R * 0.2, 0, R * 0.5);
      this._fillPetal(ctx, R * 1.85);
      ctx.restore();
    }
  }

  _rose(ctx, R) {
    for (let layer = this.layers; layer >= 1; layer--) {
      const k = layer / this.layers;
      const n = 4 + layer * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + layer * 0.5;
        ctx.save();
        ctx.rotate(a);
        ctx.translate(0, -R * 0.18 * k);
        this._petalPath(ctx, R * 1.75 * k, R * 0.78 * k, 0.72);
        const g = ctx.createLinearGradient(0, 0, 0, -R * 1.75 * k);
        g.addColorStop(0, shade(this.pal.out, -0.18));
        g.addColorStop(1, mix(this.pal.in, this.pal.out, 1 - k));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = hexA('#ffffff', 0.18);
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = shade(this.pal.out, -0.3);
    ctx.fill();
  }

  _core(ctx, r, stamens) {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(0.5, this.pal.core);
    g.addColorStop(1, shade(this.pal.core, -0.32));
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    if (!stamens) return;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, Math.max(0.7, r * 0.11), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fill();
    }
  }

  hit(px, py) {
    const dx = px - this.head.x, dy = py - this.head.y;
    return Math.hypot(dx, dy) < this.headR * 2.1 + 8;
  }
}

/* ── utilidades de color ── */
export function hexA(hex, a) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function hexRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(hex, amt) {
  const [r, g, b] = hexRgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
export function mix(a, b, k) {
  const A = hexRgb(a), B = hexRgb(b);
  const f = (i) => Math.round(A[i] + (B[i] - A[i]) * k);
  return `rgb(${f(0)},${f(1)},${f(2)})`;
}
