// ══ APP — noyau (state, phases, connect, launch, autodestruct) ══

// ── Thèmes par épreuve ─────────────────────────────────
const CHALLENGE_THEMES = [
  { bg:'#000',    accent:'#00ff41', glow:'rgba(0,255,65,.25)',   dim:'#006818', border:'#003a0d' },
  { bg:'#00091a', accent:'#00aaff', glow:'rgba(0,170,255,.25)',  dim:'#004d88', border:'#001a44' },
  { bg:'#180005', accent:'#ff3366', glow:'rgba(255,51,102,.25)', dim:'#880030', border:'#3a0015' },
  { bg:'#0d0020', accent:'#aa44ff', glow:'rgba(170,68,255,.25)', dim:'#550088', border:'#280044' },
  { bg:'#0d1400', accent:'#aaff00', glow:'rgba(170,255,0,.25)',  dim:'#557700', border:'#2a3800' },
];

function applyTheme(idx) {
  const t = CHALLENGE_THEMES[idx % CHALLENGE_THEMES.length];
  const r = document.documentElement;
  r.style.setProperty('--ch-accent', t.accent);
  r.style.setProperty('--ch-glow',   t.glow);
  r.style.setProperty('--ch-dim',    t.dim);
  r.style.setProperty('--ch-border', t.border);
  document.body.style.background = t.bg;
}

function resetTheme() {
  ['--ch-accent','--ch-glow','--ch-dim','--ch-border'].forEach(v =>
    document.documentElement.style.removeProperty(v));
  document.body.style.background = '';
}

// ── State ──────────────────────────────────────────────
let agents           = [];
let currentRealName  = '';
let currentProposals = [];
let draggedAgent     = null;
let currentChallenge = 0;
let revealedDigits   = [];
let countdownTimer   = null;
let secondsLeft      = cfg.duration;
let totalSeconds     = cfg.duration;
let missionStart     = 0;
let pinInput         = "";
let particleLoop     = null;
let scanTmr          = null;
let typewriterIdx    = 0;
let typewriterTmr    = null;
let hintTimer        = null;
let hintSeconds      = 0;
let adTimer          = null;
let adPostTmr        = null;
let adSeconds        = 30;
let currentPhase     = 'phase-splash';

// ── Helpers ────────────────────────────────────────────
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function pad(n) { return String(n).padStart(2, '0'); }
function timerText(s) {
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
function timerCls(s) {
  const r = s / totalSeconds;
  return r < 0.1 ? 'danger' : r < 0.25 ? 'warn' : '';
}

// ── Phase management ───────────────────────────────────
function showPhase(id) {
  if (id === 'phase-teams') { _activateTeamsPhase(); return; }
  triggerPhaseFlash(() => {
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    currentPhase = id;
    if (id === 'phase-connect') startConnect();
    if (RESUMABLE_PHASES.includes(id)) saveSession();
    _pushMissionState();
    _updateTeamsPeekBtn();
  });
}

function _pushMissionState() {
  if (!missionStart) return;
  const state = {
    phase: currentPhase,
    challengeIdx: currentChallenge,
    challengeTotal: cfg.challenges.length,
    challengeTitle: cfg.challenges[currentChallenge]?.title || '',
    missionName: cfg.missionName || 'MISSION',
    missionStart,
    duration: cfg.duration,
    agents: agents.map(a => ({ realName: a.realName, agentName: a.agentName, team: a.team })),
    revealedDigits
  };
  pushStateRemote(state);
}

// ── Mode test ──────────────────────────────────────────
function initTestMode() {
  const bar = document.getElementById('test-mode-bar');
  if (cfg.testMode) bar.style.display = 'flex';
  else bar.style.display = 'none';
}

function globalSkip() {
  switch (currentPhase) {
    case 'phase-connect':  skipConnect(); break;
    case 'phase-names':
      if (agents.length === 0) {
        agents.push({ realName: 'TEST', agentName: 'AGENT TEST', team: null });
        renderRecruitList();
      }
      launchMission(); break;
    case 'phase-message':
      if (document.getElementById('autodestruct-bar-wrap').classList.contains('visible'))
        skipAutodestruct();
      else skipTypewriter();
      break;
    case 'phase-challenge':
      document.getElementById('code-input').value = cfg.challenges[currentChallenge].code;
      submitCode(); break;
    case 'phase-reveal':   advanceFromReveal(); break;
    case 'phase-countdown':
      pinInput = revealedDigits.join('');
      checkPin(); break;
  }
}

// ── Bouton équipes flottant ────────────────────────────
const TEAMS_PEEK_PHASES = ['phase-challenge','phase-reveal','phase-countdown'];

function _updateTeamsPeekBtn() {
  const btn = document.getElementById('teams-peek-btn');
  if (!btn) return;
  btn.style.display = (TEAMS_PEEK_PHASES.includes(currentPhase) && agents.some(a => a.team)) ? 'flex' : 'none';
}

function toggleTeamsPeek() {
  const ov = document.getElementById('teams-peek-overlay');
  if (!ov) return;
  if (ov.classList.contains('show')) { ov.classList.remove('show'); return; }
  // Build content
  const body = document.getElementById('teams-peek-body');
  body.innerHTML = ['ombre','cobra'].map(team => {
    const members = agents.filter(a => a.team === team);
    if (!members.length) return '';
    const color = team === 'ombre' ? '#00ff41' : '#ff6b00';
    return `<div class="peek-team">
      <div class="peek-team-label" style="color:${color}">Équipe ${team.toUpperCase()}</div>
      ${members.map(a => `<div class="peek-agent-row">
        <span class="peek-code">${esc(a.agentName)}</span>
        <span class="peek-real">(${esc(a.realName)})</span>
      </div>`).join('')}
    </div>`;
  }).join('');
  ov.classList.add('show');
}

// ── Splash ─────────────────────────────────────────────
function onSplashTap() {
  getAudioCtx();
  stopSplashRotation();
  triggerPhaseFlash();
  playRevealSound();
  setTimeout(() => showPhase('phase-connect'), 120);
}

// ── Écran connexion ────────────────────────────────────
let _connectTimers = [];

const CONNECT_LINES = [
  { t:   0, txt: 'INITIALISATION DU SYSTÈME KGB...',     cls: '' },
  { t: 500, txt: 'PROTOCOLE DE CHIFFREMENT RSA-4096',     cls: 'pending' },
  { t: 900, txt: 'PROTOCOLE DE CHIFFREMENT RSA-4096  ✓', cls: 'ok' },
  { t:1100, txt: 'AUTHENTIFICATION BIOMÉTRIQUE',          cls: 'pending' },
  { t:1500, txt: 'AUTHENTIFICATION BIOMÉTRIQUE  ✓',       cls: 'ok' },
  { t:1700, txt: 'LOCALISATION SÉCURISÉE',                cls: 'pending' },
  { t:2000, txt: 'LOCALISATION SÉCURISÉE  ✓',            cls: 'ok' },
  { t:2300, txt: 'NIVEAU D\'ACCÈS : ALPHA',               cls: 'ok' },
  { t:2700, txt: '',                                       cls: '' },
  { t:2900, txt: '▶  ENRÔLEMENT DES AGENTS REQUIS',       cls: '' },
];

function startConnect() {
  const el = document.getElementById('connect-terminal');
  el.innerHTML = '';
  _connectTimers.forEach(clearTimeout);
  _connectTimers = [];
  let lines = [];

  CONNECT_LINES.forEach(({ t, txt, cls }) => {
    _connectTimers.push(setTimeout(() => {
      if (cls === 'ok' && lines.length) {
        lines[lines.length - 1] = _connectLine(txt, cls);
      } else {
        lines.push(_connectLine(txt, cls));
      }
      el.innerHTML = lines.join('\n');
      playTypeSound();
    }, t));
  });

  _connectTimers.push(setTimeout(() => showPhase('phase-names'), 3800));
}

function _connectLine(txt, cls) {
  if (!txt) return '';
  if (cls === 'ok')      return `<span class="connect-ok">${txt}</span>`;
  if (cls === 'pending') return `<span class="connect-pending">${txt}...</span>`;
  return txt;
}

function skipConnect() {
  _connectTimers.forEach(clearTimeout);
  _connectTimers = [];
  showPhase('phase-names');
}

// ── Launch ─────────────────────────────────────────────
function launchMission() {
  playLaunchSound();
  triggerPhaseFlash();
  setTimeout(() => {
    showPhase('phase-message');
    typewriterIdx = 0;
    document.getElementById('typewriter-text').innerHTML = '<span id="cursor"></span>';
    document.getElementById('autodestruct-bar-wrap').classList.remove('visible');
    secondsLeft  = cfg.duration;
    totalSeconds = cfg.duration;
    missionStart = Date.now();
    countdownTimer = setInterval(globalTick, 1000);
    startAmbientMusic();
    setTimeout(typeNext, 400);
  }, 200);
}

// ── Typewriter ─────────────────────────────────────────
function typeNext() {
  const el = document.getElementById('typewriter-text'), msg = cfg.message;
  if (typewriterIdx < msg.length) {
    const ch = msg[typewriterIdx];
    el.innerHTML = esc(msg.slice(0, typewriterIdx+1)).replace(/\n/g,'<br>') + '<span id="cursor"></span>';
    typewriterIdx++;
    if (ch !== '\n' && ch !== ' ') playTypeSound();
    const d = ch==='.'||ch==='…' ? 220 : ch===',' ? 140 : ch==='\n' ? 100 : 28;
    typewriterTmr = setTimeout(typeNext, d);
  } else {
    el.innerHTML = esc(msg).replace(/\n/g,'<br>');
    adPostTmr = setTimeout(startAutodestruct, 800);
  }
}

function skipTypewriter() {
  clearTimeout(typewriterTmr);
  clearTimeout(adPostTmr);
  typewriterIdx = cfg.message.length;
  document.getElementById('typewriter-text').innerHTML = esc(cfg.message).replace(/\n/g,'<br>');
  startAutodestruct();
}

function skipAutodestruct() {
  clearInterval(adTimer);
  document.getElementById('autodestruct-bar-wrap').classList.remove('visible');
  launchAutodestructAnimation();
}

// ── Autodestruction ────────────────────────────────────
function startAutodestruct() {
  adSeconds = 30;
  const wrap = document.getElementById('autodestruct-bar-wrap');
  const fill = document.getElementById('autodestruct-fill');
  const cd   = document.getElementById('ad-countdown');
  wrap.classList.add('visible');
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) { skipBtn.textContent = '⏭ lancer'; skipBtn.onclick = skipAutodestruct; }
  fill.style.transition = 'none'; fill.style.width = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transition = 'width 1s linear';
    fill.style.width = ((adSeconds-1)/30*100)+'%';
  }));
  cd.textContent = adSeconds;
  clearInterval(adTimer);
  adTimer = setInterval(() => {
    adSeconds--;
    cd.textContent = Math.max(0, adSeconds);
    fill.style.width = (adSeconds/30*100)+'%';
    if (adSeconds <= 0) { clearInterval(adTimer); launchAutodestructAnimation(); }
  }, 1000);
}

const AD_FRAMES = [
`████████████████████\n█  AUTODESTRUCTION  █\n█  EN COURS...      █\n████████████████████`,
`▓▓▓▒▒▒░░░▒▒▒▓▓▓▒▒▒░\n░  MESSAGE DÉTRUIT  ░\n▒▒▒▓▓▓░░░▓▓▓▒▒▒░░░▓`,
`///  \\\\\\  ///  \\\\\\\n   EFFACEMENT      \n\\\\\\  ///  \\\\\\  ///`,
`* * * * * * * * * *\n  TRANSMISSION     \n  TERMINÉE...      \n* * * * * * * * * *`,
`░░░░░░░░░░░░░░░░░░░░`,
];

function launchAutodestructAnimation() {
  const overlay  = document.getElementById('autodestruct-overlay');
  const staticEl = document.getElementById('ad-static');
  const progFill = document.getElementById('ad-progress-fill');
  const skipBtn  = document.getElementById('skip-btn');
  if (skipBtn) skipBtn.style.display = 'none';
  overlay.classList.add('active');
  progFill.style.transition = 'none'; progFill.style.width = '100%';
  let frame = 0, elapsed = 0;
  const totalMs = 2800;
  const fi = setInterval(() => {
    staticEl.textContent = AD_FRAMES[frame % AD_FRAMES.length]; frame++;
    elapsed += 220;
    progFill.style.width = Math.max(0, (1-elapsed/totalMs)*100)+'%';
  }, 220);
  let flicker = 0;
  const fl = setInterval(() => { overlay.style.background = flicker++%2===0 ? '#0a0000' : '#000'; }, 90);
  setTimeout(() => {
    clearInterval(fi); clearInterval(fl);
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    overlay.classList.remove('active'); overlay.style.background = '#000';
    startChallenges();
  }, totalMs);
}

// ── Reset ──────────────────────────────────────────────
function resetApp() {
  clearInterval(countdownTimer); clearInterval(particleLoop);
  clearInterval(hintTimer); clearInterval(adTimer);
  if (scanTmr) { clearInterval(scanTmr); scanTmr = null; }
  clearTimeout(typewriterTmr); clearTimeout(adPostTmr);
  _connectTimers.forEach(clearTimeout); _connectTimers = [];
  stopAmbientMusic(); stopChallengeDisplay(); stopChallengeAnim(); clearSession();
  document.getElementById('particles').innerHTML = '';
  document.getElementById('autodestruct-overlay').classList.remove('active');
  document.body.classList.remove('time-danger');
  document.getElementById('autodestruct-bar-wrap').classList.remove('visible');
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) { skipBtn.textContent = '⏭ passer'; skipBtn.onclick = skipTypewriter; skipBtn.style.display = ''; }
  agents=[]; currentRealName=''; currentProposals=[]; draggedAgent=null;
  revealedDigits=[]; currentChallenge=0; pinInput='';
  secondsLeft=cfg.duration; totalSeconds=cfg.duration;
  resetTheme();
  renderRecruitList(); resetRecruitForm(); showPhase('phase-splash');
  stopBgArtefacts(); initBgArtefacts(); startSplashRotation();
}

// ── Appelée à chaque sync config ───────────────────────
function onCfgSync() {
  initTestMode();
  if (missionStart > 0 && countdownTimer) {
    const elapsed = Math.round((Date.now() - missionStart) / 1000);
    totalSeconds  = cfg.duration;
    secondsLeft   = Math.max(0, cfg.duration - elapsed);
    updateMiniTimer();
    syncRevealTimer();
    if (currentPhase === 'phase-countdown') updateBigTimer();
  }
  if (currentPhase === 'phase-challenge') {
    const ch = cfg.challenges[currentChallenge];
    if (!ch) return;
    document.getElementById('ch-title').textContent = ch.title;
    document.getElementById('ch-brief').textContent = ch.brief;
    startChallengeDisplay(ch.type || 'libre', ch.code);
    if (ch.animation && ch.animation !== 'none') startChallengeAnim(ch.animation);
    else stopChallengeAnim();
    const banner = document.getElementById('ch-team-banner');
    if (ch.teamPlay && agents.length >= 2) {
      const team = currentChallenge % 2 === 0 ? 'ombre' : 'cobra';
      banner.textContent = `▶ ÉQUIPE ${team.toUpperCase()}`;
      banner.className = 'ch-team-banner ' + team;
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }
}

// ── Debug simulation ───────────────────────────────────
function debugSim() {
  const names = [
    { realName: 'Alice',   agentName: 'AGENT OMBRE DELTA',  team: 'ombre' },
    { realName: 'Bob',     agentName: 'AGENT ACIER SIGMA',  team: 'ombre' },
    { realName: 'Camille', agentName: 'AGENT NOIR ALPHA',   team: 'ombre' },
    { realName: 'Dylan',   agentName: 'AGENT ROUGE ZÉRO',   team: 'cobra' },
    { realName: 'Emma',    agentName: 'AGENT COBRA VICTOR', team: 'cobra' },
    { realName: 'Félix',   agentName: 'AGENT JADE OMEGA',   team: 'cobra' },
  ];
  clearInterval(countdownTimer); clearInterval(particleLoop);
  clearInterval(hintTimer); clearInterval(adTimer);
  if (scanTmr) { clearInterval(scanTmr); scanTmr = null; }
  clearTimeout(typewriterTmr); clearTimeout(adPostTmr);
  stopAmbientMusic(); stopChallengeDisplay(); stopChallengeAnim(); clearSession();
  document.getElementById('autodestruct-overlay').classList.remove('active');
  document.getElementById('autodestruct-bar-wrap').classList.remove('visible');
  document.getElementById('particles').innerHTML = '';

  agents = names; revealedDigits = []; currentChallenge = 0; pinInput = '';
  secondsLeft = cfg.duration; totalSeconds = cfg.duration;
  missionStart = Date.now();
  countdownTimer = setInterval(globalTick, 1000);
  startAmbientMusic();
  showChallenge(0);
  console.log('%c[DEBUG] Simulation lancée — 2 équipes de 3', 'color:#00ff41;font-weight:bold');
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); debugSim(); }
});
