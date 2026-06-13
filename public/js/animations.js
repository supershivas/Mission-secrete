// ══ CHALLENGE ANIMATIONS ═══════════════════════════════

const CHALLENGE_ANIMS = {

  skull: {
    label: 'Crâne',
    color: '#ff0024',
    interval: 550,
    frames: [
`   .-----.
  /  X   X \\
 |   _____  |
 |  ( ___ ) |
  \\_______/
    |||||
   /|||||\\`,
`   .-----.
  /  o   o \\
 |   _____  |
 |  (     ) |
  \\_______/
    |||||
   /|||||\\`,
`   .-----.
  /  *   * \\
 |   _____  |
 |  ( === ) |
  \\_______/
    |||||
   /|||||\\`,
    ],
  },

  laser: {
    label: 'Laser',
    color: '#ff0024',
    interval: 280,
    frames: [
`|              |
| ═══════════> |
|              |
| <═══════════ |
|              |`,
`|              |
|  ═══════════>|
|              |
|<═══════════  |
|              |`,
`|              |
|<═══════════  |
|              |
|  ═══════════>|
|              |`,
    ],
  },

  radar: {
    label: 'Radar',
    color: '#00ff41',
    interval: 500,
    frames: [
`  . · o O O ·
 ·  ·  ◉/   ·
  O · o · · .
 · . O · o ·
  · o · O . ·`,
`  · o O . · o
 ·  ·  ◉─  ·
  o · . O · .
 O . · o · O
  · . o · O ·`,
`  O . · o · o
 ·  ·  ◉\\  ·
  · o O · . ·
 o · . · O .
  O · o . · ·`,
    ],
  },

  safe: {
    label: 'Coffre',
    color: '#ffcc00',
    interval: 380,
    frames: [
` ┌────────┐
 │ ┌────┐ │
 │ │ 12 │ │
 │ └────┘ │
 │  [██]  │
 └────────┘`,
` ┌────────┐
 │ ┌────┐ │
 │ │  3 │ │
 │ └────┘ │
 │  [██]  │
 └────────┘`,
` ┌────────┐
 │ ┌────┐ │
 │ │  6 │ │
 │ └────┘ │
 │  [██]  │
 └────────┘`,
` ┌────────┐
 │ ┌────┐ │
 │ │  9 │ │
 │ └────┘ │
 │  [██]  │
 └────────┘`,
    ],
  },

  garden: {
    label: 'Jardin',
    color: '#00cc35',
    interval: 650,
    frames: [
`  \\ | /  \\ | /
 ───\\|/────\\|/─
    |||    |||
    |||    |||
   _|||_  _|||_
  /     \\/     \\`,
`  / | \\  / | \\
 ───/|\\────/|\\─
    |||    |||
    |||    |||
   _|||_  _|||_
  /     \\/     \\`,
`   \\|/    \\|/
 ───|||────|||─
    |||    |||
    |||    |||
   _|||_  _|||_
  /     \\/     \\`,
    ],
  },

  lab: {
    label: 'Labo',
    color: '#00aaff',
    interval: 700,
    frames: [
`  |T|  |T|
  | |  | |
  |   ·· |
  | ·    |
   \\    /
    \\  /
     \\/
   ══════`,
`  |T|  |T|
  |~~~~~~|
  |  ·   |
  |   ·  |
   \\    /
    \\  /
     \\/
   ══════`,
`  |T|  |T|
  | |  | |
  |~~~~~~~~|
  |        |
   \\      /
    \\    /
     \\  /
   ══════`,
    ],
  },

  poison: {
    label: 'Antidote',
    color: '#00ff41',
    interval: 700,
    frames: [
`    ___
   /   \\
  | o o |
  |  ~  |
   \\___/
  /|||||\\
 ( bubble )`,
`    ___
   /   \\
  | · · |
  | ~~~ |
   \\___/
  /|||||\\
 ( glou~ )`,
`    ___
   /   \\
  | ° ° |
  |~~~~~|
   \\___/
  /|||||\\
 (ANTIDO)`,
    ],
  },

};

let _animTmr = null;

function startChallengeAnim(name) {
  stopChallengeAnim();
  const anim = CHALLENGE_ANIMS[name];
  const el   = document.getElementById('potion-ascii');
  const wrap = document.getElementById('poison-visual');
  if (!anim || !el || !wrap) return;
  wrap.classList.add('active');
  el.style.color = anim.color;
  el.style.textShadow = `0 0 12px ${anim.color}66`;
  let f = 0;
  el.textContent = anim.frames[0];
  _animTmr = setInterval(() => {
    f = (f + 1) % anim.frames.length;
    el.textContent = anim.frames[f];
  }, anim.interval);
}

function stopChallengeAnim() {
  clearInterval(_animTmr); _animTmr = null;
  const wrap = document.getElementById('poison-visual');
  if (wrap) wrap.classList.remove('active');
}

// ── Transition de phase ─────────────────────────────────
function triggerPhaseFlash() {
  let el = document.getElementById('phase-transition');
  if (!el) {
    el = document.createElement('div');
    el.id = 'phase-transition';
    document.body.appendChild(el);
  }
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}
