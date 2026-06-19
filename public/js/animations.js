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

const MORSE_TABLE = {
  A:'·─',B:'─···',C:'─·─·',D:'─··',E:'·',F:'··─·',G:'──·',H:'····',
  I:'··',J:'·───',K:'─·─',L:'·─··',M:'──',N:'─·',O:'───',P:'·──·',
  Q:'──·─',R:'·─·',S:'···',T:'─',U:'··─',V:'···─',W:'·──',X:'─··─',
  Y:'─·──',Z:'──··',
  '0':'─────','1':'·────','2':'··───','3':'···──','4':'····─',
  '5':'·····','6':'─····','7':'──···','8':'───··','9':'────·'
};

function wordToMorse(word) {
  return word.toUpperCase().split('').map(c => MORSE_TABLE[c] || '').filter(Boolean).join('   ');
}

let _animTmr = null;
let _displayTmr = null;
let _morseWord = '';

// ── Template display (driven by ch.type) ──────────────────
function startChallengeDisplay(type, code) {
  stopChallengeDisplay();
  const steps = document.getElementById('recipe-steps');
  if (!steps) return;

  if (type === 'morse') {
    _morseWord = (code || '').toUpperCase();
    const el   = document.getElementById('potion-ascii');
    const wrap = document.getElementById('poison-visual');
    if (el && wrap) {
      wrap.classList.add('active');
      el.style.color = '#00ff41';
      el.style.textShadow = '0 0 14px rgba(0,255,65,.5)';
      el.style.fontSize = 'clamp(18px,4vw,28px)';
      el.style.letterSpacing = '.3em';
      el.style.lineHeight = '2.2';
      el.style.animation = 'none';
      el.textContent = _morseWord.split('').map(c => MORSE_TABLE[c] || '?').join('   ');
      let blink = true;
      _displayTmr = setInterval(() => { blink = !blink; el.style.opacity = blink ? '1' : '.65'; }, 900);
    }
    const REF = [
      ['A','·─'],['B','─···'],['C','─·─·'],['D','─··'],['E','·'],['F','··─·'],
      ['G','──·'],['H','····'],['I','··'],['J','·───'],['K','─·─'],['L','·─··'],
      ['M','──'],['N','─·'],['O','───'],['P','·──·'],['Q','──·─'],['R','·─·'],
      ['S','···'],['T','─'],['U','··─'],['V','···─'],['W','·──'],['X','─··─'],
      ['Y','─·──'],['Z','──··'],
      ['0','─────'],['1','·────'],['2','··───'],['3','···──'],['4','····─'],
      ['5','·····'],['6','─····'],['7','──···'],['8','───··'],['9','────·']
    ];
    const rows = REF.map(([l,m]) => `<span class="mref-cell"><b>${l}</b>${m}</span>`).join('');
    steps.innerHTML =
      `<button class="btn morse-listen-btn" onclick="playMorse('${_morseWord}')">▶ Écouter le signal</button>` +
      `<div class="morse-ref-label">Table de référence :</div>` +
      `<div class="morse-ref">${rows}</div>`;
    return;
  }

  if (type === 'talkie') {
    steps.innerHTML =
      `<div class="talkie-card">
        <div class="talkie-title">📻 PROTOCOLE TALKIE-WALKIE</div>
        <div class="talkie-line">Canal : <strong>ALPHA-7</strong></div>
        <div class="talkie-line">Phrase d'authentification :</div>
        <div class="talkie-phrase">"Le renard sort à minuit"</div>
        <div class="talkie-line">Réponse attendue :</div>
        <div class="talkie-phrase">"La lune est rousse"</div>
      </div>`;
    return;
  }

  // type === 'libre' → nothing extra
  steps.innerHTML = '';
}

function stopChallengeDisplay() {
  clearInterval(_displayTmr); _displayTmr = null;
  const steps = document.getElementById('recipe-steps');
  if (steps) steps.innerHTML = '';
  // Reset morse visuals if active
  const el = document.getElementById('potion-ascii');
  if (el) { el.style.opacity = '1'; el.style.animation = ''; }
}

// ── Visual animation (driven by ch.animation) ─────────────
function startChallengeAnim(name) {
  stopChallengeAnim();
  const el   = document.getElementById('potion-ascii');
  const wrap = document.getElementById('poison-visual');
  if (!el || !wrap) return;

  const anim = CHALLENGE_ANIMS[name];
  if (!anim) return;
  wrap.classList.add('active');
  el.style.color = anim.color;
  el.style.textShadow = `0 0 12px ${anim.color}66`;
  el.style.fontSize = '';
  el.style.letterSpacing = '';
  el.style.animation = '';
  el.style.opacity = '1';
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
  const el = document.getElementById('potion-ascii');
  if (el) { el.style.opacity = '1'; el.style.animation = ''; }
}

// ── Transition de phase ─────────────────────────────────
function triggerPhaseFlash(onPeak) {
  let el = document.getElementById('phase-transition');
  if (!el) {
    el = document.createElement('div');
    el.id = 'phase-transition';
    document.body.appendChild(el);
  }
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  if (onPeak) setTimeout(onPeak, 0);
}
