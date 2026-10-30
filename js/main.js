// ───────────────────────────────────────────────
// Director de escena: une jardín, tarta, juego y ramo
// ───────────────────────────────────────────────

import { WISHES, LETTER, NAME, AGE } from './messages.js';
import { fx } from './fx.js';
import { sound } from './audio.js';
import { Garden, TARGET } from './garden.js';
import { Cake } from './cake.js';
import { Game, GOAL } from './game.js';
import { Bouquet } from './final.js';
import { rng } from './flower.js';

const $ = (s) => document.querySelector(s);
const SCENES = ['intro', 'garden', 'cake', 'game', 'final'];
const LABELS = ['Portada', 'El jardín', 'La tarta', 'Los pétalos', 'El ramo'];
const RING = 2 * Math.PI * 15.5;

const app = {
  scene: 'intro',
  unlocked: 1,
  garden: null,
  cake: null,
  game: null,
  bouquet: null,
  deckIndex: 0,
  letterShown: false
};

/* ── navegación ───────────────────────────────── */
function buildDots() {
  const box = $('#dots');
  box.innerHTML = '';
  SCENES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'dot';
    b.type = 'button';
    b.title = LABELS[i];
    b.setAttribute('aria-label', LABELS[i]);
    b.addEventListener('click', () => { if (i <= app.unlocked) go(s); });
    box.appendChild(b);
  });
  syncDots();
}

function syncDots() {
  [...$('#dots').children].forEach((d, i) => {
    d.classList.toggle('is-on', SCENES[i] === app.scene);
    d.disabled = i > app.unlocked;
  });
}

function unlock(i) {
  if (i > app.unlocked) {
    app.unlocked = i;
    syncDots();
  }
}

function go(name) {
  if (app.scene === name) return;
  const prev = app.scene;
  app.scene = name;
  document.body.dataset.scene = name;
  SCENES.forEach(s => $(`#scene-${s}`).classList.toggle('is-active', s === name));
  syncDots();
  onLeave(prev);
  onEnter(name);
}

function onLeave(name) {
  if (name === 'garden') app.garden?.stop();
  if (name === 'game') app.game?.stop();
  if (name === 'final') app.bouquet?.stop();
  if (name === 'cake') app.cake?.stopMic();
}

function onEnter(name) {
  switch (name) {
    case 'intro':
      fx.rain(1.4);
      break;
    case 'garden':
      fx.rain(app.garden?.completed ? 3 : 0.7);
      app.garden.start();
      break;
    case 'cake':
      fx.rain(1);
      break;
    case 'game':
      fx.rain(0);
      app.game.start();
      break;
    case 'final':
      fx.rain(5);
      buildBouquet();
      app.bouquet.start();
      sound.birthday();
      setTimeout(() => fx.fireworks(innerWidth / 2, innerHeight * .35), 600);
      if (!app.letterShown) {
        app.letterShown = true;
        setTimeout(openSheet, 2600);
      }
      break;
  }
}

/* ── susurros (texto animado palabra a palabra) ── */
function whisper(el, text, hold = 5200) {
  el.innerHTML = '';
  text.split(' ').forEach((wd, i) => {
    const s = document.createElement('span');
    s.textContent = wd + ' ';
    s.style.animationDelay = `${i * 55}ms`;
    el.appendChild(s);
  });
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.transition = 'opacity .8s';
    el.style.opacity = '0';
    setTimeout(() => { el.innerHTML = ''; el.style.opacity = '1'; }, 800);
  }, hold);
  el.style.opacity = '1';
}

/* ── escena 2 · jardín ───────────────────────── */
function setupGarden() {
  const countEl = $('#count');
  const ring = $('#ring-fg');
  const tip = $('#garden-tip');
  const whisperEl = $('#whisper');
  const next = $('#btn-to-cake');
  ring.style.strokeDasharray = RING;
  ring.style.strokeDashoffset = RING;

  app.garden = new Garden($('#garden'), {
    onPlant(count, f) {
      countEl.textContent = Math.min(count, TARGET);
      ring.style.strokeDashoffset = RING * (1 - Math.min(1, count / TARGET));
      whisper(whisperEl, WISHES[(count - 1) % WISHES.length]);
      if (count === 1) tip.textContent = 'Toca una flor abierta para sacudirla ✦ sigue sembrando';
      if (count === 3) tip.classList.add('is-dim');
      if (count === TARGET - 1) tip.textContent = 'Falta una…';
    },
    onPoke(f) {
      whisper(whisperEl, WISHES[f.index % WISHES.length], 4200);
    },
    onComplete() {
      tip.classList.remove('is-dim');
      tip.textContent = `${TARGET} flores para tus ${AGE} años`;
      whisper(whisperEl, 'El jardín está completo. Y aún queda tarta.', 9000);
      next.classList.remove('is-hidden');
      unlock(2);
    }
  });

  next.addEventListener('click', () => go('cake'));
}

/* ── escena 3 · tarta ────────────────────────── */
function setupCake() {
  const sub = $('#cake-sub');
  app.cake = new Cake({
    cakeEl: $('#cake'),
    candlesEl: $('#candles'),
    subEl: sub,
    meterEl: $('#mic-meter'),
    onAllOut() {
      $('#wish').classList.remove('is-hidden');
      $('.cake-tools').classList.add('is-hidden');
      sub.textContent = 'Veintiocho apagadas de un soplo (o casi).';
      sound.birthday();
      unlock(3);
    }
  });

  $('#btn-mic').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Pidiendo permiso…';
    const res = await app.cake.startMic();
    btn.disabled = false;
    if (res === 'ok') {
      btn.textContent = '🎤 Escuchando… ¡sopla!';
      sub.textContent = 'Acércate y sopla fuerte. Las velas lo notan.';
    } else if (res === 'denegado') {
      btn.textContent = '🎤 Sin permiso';
      sub.textContent = 'No pasa nada: apágalas con el dedo arrastrando sobre las velas.';
    } else if (res === 'ya') {
      btn.textContent = '🎤 Escuchando… ¡sopla!';
    } else {
      btn.textContent = '🎤 No disponible';
      sub.textContent = 'Tu navegador no deja usar el micrófono aquí. Usa el dedo.';
    }
  });

  $('#btn-blow').addEventListener('click', () => app.cake.blowAll());
  $('#btn-to-game').addEventListener('click', () => go('game'));
}

/* ── escena 4 · minijuego ────────────────────── */
function setupGame() {
  const scoreEl = $('#score');
  const bar = $('#score-bar');
  const whisperEl = $('#game-whisper');
  const next = $('#btn-to-final');

  app.game = new Game($('#game'), {
    onScore(score, combo) {
      scoreEl.textContent = score;
      bar.style.width = `${(score / GOAL) * 100}%`;
      if (combo === 6) whisper(whisperEl, '¡Qué puntería!', 2600);
      if (combo === 12) whisper(whisperEl, 'Imparable.', 2600);
    },
    onWin() {
      whisper(whisperEl, 'Suficientes pétalos para un ramo entero.', 9000);
      next.classList.remove('is-hidden');
      unlock(4);
    }
  });

  next.addEventListener('click', () => go('final'));
}

/* ── escena 5 · ramo y carta ─────────────────── */
function buildBouquet() {
  const planted = app.garden.flowers.filter(f => f.bloom > .5);
  const seeds = planted.map(f => ({ seed: f.seed }));
  // si alguien llegó aquí con pocas flores, el ramo se completa solo
  const r = rng(20261021);
  while (seeds.length < TARGET) seeds.push({ seed: Math.floor(r() * 1e9) });
  app.bouquet.setFlowers(seeds);
}

function setupFinal() {
  $('#letter-body').textContent = LETTER;

  app.bouquet = new Bouquet($('#bouquet'), {
    onPick(index) {
      whisper($('#final-whisper'), WISHES[index % WISHES.length], 6000);
    }
  });

  $('#btn-letter').addEventListener('click', openSheet);
  $('#sheet-close').addEventListener('click', closeSheet);
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
  $('#btn-wishes').addEventListener('click', () => openDeck(0));
  $('#deck-close').addEventListener('click', closeDeck);
  $('#deck-prev').addEventListener('click', () => moveDeck(-1));
  $('#deck-next').addEventListener('click', () => moveDeck(1));
  $('#btn-replay').addEventListener('click', replay);

  // swipe en las tarjetas
  let sx = 0;
  const card = $('#deck-card');
  card.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  card.addEventListener('pointerup', (e) => {
    const d = e.clientX - sx;
    if (Math.abs(d) > 40) moveDeck(d < 0 ? 1 : -1);
  });
}

function openSheet() {
  $('#sheet').classList.remove('is-hidden');
  sound.sparkle();
}
function closeSheet() {
  $('#sheet').classList.add('is-hidden');
  whisper($('#final-whisper'), 'Toca una flor: cada una guarda un deseo.', 6000);
}

function openDeck(i) {
  app.deckIndex = i;
  renderDeck();
  $('#deck').classList.remove('is-hidden');
  sound.sparkle();
}
function closeDeck() { $('#deck').classList.add('is-hidden'); }

function moveDeck(dir) {
  app.deckIndex = (app.deckIndex + dir + WISHES.length) % WISHES.length;
  renderDeck();
  sound.pop();
}

function renderDeck() {
  const i = app.deckIndex;
  $('#deck-num').textContent = String(i + 1).padStart(2, '0');
  $('#deck-text').textContent = WISHES[i];
  $('#deck-of').textContent = `${i + 1} / ${WISHES.length}`;
  const card = $('#deck-card');
  card.classList.remove('is-flip');
  void card.offsetWidth;
  card.classList.add('is-flip');
}

function replay() {
  app.garden.reset();
  app.game.reset();
  app.cake.reset();
  app.unlocked = 1;
  $('#count').textContent = '0';
  $('#ring-fg').style.strokeDashoffset = RING;
  $('#score').textContent = '0';
  $('#score-bar').style.width = '0%';
  $('#btn-to-cake').classList.add('is-hidden');
  $('#btn-to-final').classList.add('is-hidden');
  $('#wish').classList.add('is-hidden');
  $('.cake-tools').classList.remove('is-hidden');
  $('#garden-tip').textContent = 'Mantén presionado sobre la tierra ✦ suéltalo para florecer';
  $('#garden-tip').classList.remove('is-dim');
  $('#cake-sub').textContent = 'Sopla al micrófono, o apágalas con el dedo. Tú eliges la magia.';
  $('#btn-mic').textContent = '🎤 Soplar de verdad';
  closeDeck();
  $('#sheet').classList.add('is-hidden');
  app.letterShown = false;
  fx.rain(1.4);
  go('intro');
}

/* ── controles globales ──────────────────────── */
function setupChrome() {
  const sBtn = $('#btn-sound');
  sBtn.addEventListener('click', () => {
    const on = sound.toggle();
    sBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    sBtn.querySelector('.ico').textContent = on ? '♪' : '✕';
  });

  $('#btn-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => { });
  });

  $('#btn-start').addEventListener('click', () => {
    const on = sound.enable();
    if (on) {
      sBtn.setAttribute('aria-pressed', 'true');
      sBtn.querySelector('.ico').textContent = '♪';
    }
    fx.rain(0.7);
    fx.confetti(innerWidth / 2, innerHeight * .62, 36);
    unlock(1);
    go('garden');
  });

  // atajos
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeDeck(); closeSheet(); }
    if (app.scene === 'final' && !$('#deck').classList.contains('is-hidden')) {
      if (e.key === 'ArrowRight') moveDeck(1);
      if (e.key === 'ArrowLeft') moveDeck(-1);
    }
    if (e.key === ' ' && app.scene === 'intro') {
      e.preventDefault();
      $('#btn-start').click();
    }
  });

  // easter egg: escribe "johana"
  let buf = '';
  addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-12);
    if (buf.endsWith('johana')) {
      buf = '';
      const egg = $('#egg');
      egg.textContent = '💐';
      egg.classList.remove('is-on');
      void egg.offsetWidth;
      egg.classList.add('is-on');
      sound.cheer();
      for (let i = 0; i < 4; i++) {
        setTimeout(() => fx.hearts(innerWidth * (.2 + Math.random() * .6), innerHeight * .8, 14), i * 180);
      }
      fx.confetti(innerWidth / 2, innerHeight * .7, 60);
    }
  });

  // ahorra batería al salir de la pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.garden?.stop(); app.game?.stop(); app.bouquet?.stop();
    } else {
      if (app.scene === 'garden') app.garden.start();
      if (app.scene === 'game') app.game.start();
      if (app.scene === 'final') app.bouquet.start();
    }
  });
}

/* ── arranque ────────────────────────────────── */
document.title = `El jardín de ${NAME} · ${AGE}`;
buildDots();
setupGarden();
setupCake();
setupGame();
setupFinal();
setupChrome();
fx.rain(1.4);
