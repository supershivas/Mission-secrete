// ══ ARTEFACTS ASCII ════════════════════════════════════
const ARTEFACTS = [
  {art:`      _.---,._\n    /' _.--.<\n        o |\n       --.--'\n    ___| |___\n   /   | |   \\\n  /    | |    \\\n /_____|_|_____\\`},
  {art:`   _________\n  | .------. |\n  | |URGENT| |\n  | '------' |\n  |   _____  |\n  |  |     | |\n  |  |_____| |\n  |___________|\n  '-----------'`},
  {art:`  .-----------.\n  |  _________|\n  | | TOP     |\n  | | SECRET  |\n  | |_________|\n  |   _______  |\n  |  |_______| |\n  '-----------'`},
  {art:`    .-------.\n    |[=====]|\n    | .---. |\n    | |   | |\n    | '---' |\n    |  ___  |\n    | |___| |\n    '-------'\n      |   |\n    __|   |__`},
  {art:`   .---------.\n  /  .------. \\\n |  |  (  ) | |\n |  |   --  | |\n  \\  '------' /\n   '-----------'\n       | |\n     __|_|__`},
  {art:` .-----------.\n | 00:47:23  |\n |  ~~~~~~~~ |\n | [=======] |\n |   ARMED   |\n '-----------'\n  /  |   |  \\\n |###|   |###|`},
  {art:`  .----------.\n  |.---------|\n  ||  - - -  |\n  ||  - - -  |\n  ||  - - -  |\n  |'----...--'\n  '----...----'\n      |||||`},
  {art:`      ___\n     /   \\\n    | ( ) |\n     \\___/\n   .--|_|--.\n  /   | |   \\\n |____|   |___|\n     |   |\n    _|   |_\n   |_______|`},
  {art:`----*     *----\n    |     |\n    |     |\n*---'     '---*\n|             |\n*---,     ,---*\n    |     |\n    |     |\n----*     *----`},
];

// ── Splash rotation ────────────────────────────────────
let splashArtIdx = 0, splashArtTmr = null;

function startSplashRotation() {
  const el = document.getElementById('splash-artefact');
  if (!el) return;
  function show() {
    el.style.opacity = '0';
    setTimeout(() => { el.textContent = ARTEFACTS[splashArtIdx % ARTEFACTS.length].art; el.style.opacity = '1'; }, 420);
    splashArtIdx++;
    splashArtTmr = setTimeout(show, 2800);
  }
  el.textContent = ARTEFACTS[0].art; el.style.opacity = '1'; splashArtIdx = 1;
  splashArtTmr = setTimeout(show, 2800);
}

function stopSplashRotation() { clearTimeout(splashArtTmr); }

// ── Background drift ───────────────────────────────────
let bgArts = [], bgAnimFrame = null;

function initBgArtefacts() {
  const container = document.getElementById('bg-artefacts');
  if (!container) return;
  container.innerHTML = ''; bgArts = [];
  const pool = [...ARTEFACTS].sort(() => Math.random() - .5).slice(0, 6);
  const zones = [{x:[2,22],y:[2,30]},{x:[72,92],y:[2,30]},{x:[2,22],y:[62,88]},{x:[72,92],y:[62,88]},{x:[38,60],y:[2,18]},{x:[38,60],y:[76,92]}];
  pool.forEach((art, i) => {
    const el = document.createElement('pre'); el.className = 'bg-art'; el.textContent = art.art;
    container.appendChild(el);
    const z = zones[i];
    bgArts.push({ el, x: z.x[0] + Math.random() * (z.x[1] - z.x[0]), y: z.y[0] + Math.random() * (z.y[1] - z.y[0]),
      vx: (Math.random() - .5) * .016, vy: (Math.random() - .5) * .011,
      base: .05 + Math.random() * .04, phase: Math.random() * Math.PI * 2, freq: .0004 + Math.random() * .0003 });
  });
  if (bgAnimFrame) cancelAnimationFrame(bgAnimFrame);
  bgAnimFrame = requestAnimationFrame(tickBg);
}

function tickBg(now) {
  bgArts.forEach(s => {
    s.x += s.vx; s.y += s.vy;
    if (s.x < -5 || s.x > 92) s.vx *= -1;
    if (s.y < -5 || s.y > 92) s.vy *= -1;
    const op = s.base + Math.sin(now * s.freq + s.phase) * .018;
    s.el.style.cssText = `opacity:${op.toFixed(3)};left:${s.x.toFixed(2)}vw;top:${s.y.toFixed(2)}vh`;
  });
  bgAnimFrame = requestAnimationFrame(tickBg);
}

function stopBgArtefacts() {
  if (bgAnimFrame) { cancelAnimationFrame(bgAnimFrame); bgAnimFrame = null; }
}
