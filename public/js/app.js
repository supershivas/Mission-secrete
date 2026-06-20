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
let _adFi            = null;
let _adFl            = null;
let _adEndTmr        = null;
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
  btn.style.display = (TEAMS_PEEK_PHASES.includes(currentPhase) && agents.length > 0) ? 'flex' : 'none';
}

function toggleTeamsPeek() {
  const ov = document.getElementById('teams-peek-overlay');
  if (!ov) return;
  if (ov.classList.contains('show')) { ov.classList.remove('show'); return; }
  _renderPeekBody();
  ov.classList.add('show');
}

function _renderPeekBody() {
  const body = document.getElementById('teams-peek-body');
  const hasTeams = agents.some(a => a.team);
  const teamBlocks = ['ombre','cobra'].map(team => {
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
  const noTeam = agents.filter(a => !a.team);
  const noTeamBlock = noTeam.length ? `<div class="peek-team">
    <div class="peek-team-label" style="color:#888">Sans équipe</div>
    ${noTeam.map(a => `<div class="peek-agent-row">
      <span class="peek-code">${esc(a.agentName)}</span>
      <span class="peek-real">(${esc(a.realName)})</span>
    </div>`).join('')}
  </div>` : '';
  body.innerHTML = teamBlocks + noTeamBlock +
    `<div class="peek-add-wrap">
      <button class="peek-add-btn" onclick="_peekShowAddForm()">➕ Ajouter un agent</button>
    </div>`;
}

function _peekShowAddForm() {
  const body = document.getElementById('teams-peek-body');
  body.innerHTML = `
    <div class="peek-add-form">
      <div class="peek-add-title">Nouvel agent</div>
      <div class="peek-add-row">
        <input id="peek-name-input" class="peek-input" type="text" placeholder="Prénom…"
          maxlength="20" autocomplete="off" autocorrect="off" spellcheck="false"
          onkeydown="if(event.key==='Enter') _peekSearch()"
          oninput="this.value=this.value.slice(0,1).toUpperCase()+this.value.slice(1)">
        <button class="peek-btn" onclick="_peekSearch()">Chercher</button>
      </div>
      <div id="peek-proposals"></div>
      <button class="peek-cancel" onclick="_renderPeekBody()">← Retour</button>
    </div>`;
  setTimeout(() => document.getElementById('peek-name-input')?.focus(), 80);
}

function _peekSearch() {
  const input = document.getElementById('peek-name-input');
  const name = input?.value.trim();
  if (!name) return;
  const props = proposalsForLetter(name[0]);
  const container = document.getElementById('peek-proposals');
  container.innerHTML = `<div class="peek-props-label">Choisir un nom de code pour <strong>${esc(name)}</strong> :</div>` +
    props.map(p => `<button class="peek-prop-btn" onclick="_peekPickName('${esc(name)}','${p}')">${p}</button>`).join('');
}

function _peekPickName(realName, agentName) {
  const hasTeams = agents.some(a => a.team);
  const body = document.getElementById('teams-peek-body');
  body.innerHTML = `
    <div class="peek-add-form">
      <div class="peek-add-title">Équipe pour <span style="color:#00ff41">${esc(agentName)}</span></div>
      <div class="peek-add-sub">${esc(realName)}</div>
      <div class="peek-team-btns">
        ${hasTeams ? `
        <button class="peek-team-pick ombre" onclick="_peekConfirm('${esc(realName)}','${esc(agentName)}','ombre')">OMBRE</button>
        <button class="peek-team-pick cobra" onclick="_peekConfirm('${esc(realName)}','${esc(agentName)}','cobra')">COBRA</button>` : ''}
        <button class="peek-team-pick none" onclick="_peekConfirm('${esc(realName)}','${esc(agentName)}',null)">Sans équipe</button>
      </div>
      <button class="peek-cancel" onclick="_peekShowAddForm()">← Changer le nom</button>
    </div>`;
}

function _peekConfirm(realName, agentName, team) {
  agents.push({ realName, agentName, team: team || null });
  _pushMissionState();
  // Sync vers les autres appareils via runtimeAgents
  fetch('/api/config').then(r => r.ok ? r.json() : null).then(remoteCfg => {
    if (!remoteCfg) return;
    remoteCfg.runtimeAgents = agents;
    fetch('/api/config', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(remoteCfg) });
  }).catch(() => {});
  _updateTeamsPeekBtn();
  playTypeSound();
  _renderPeekBody();
}

// ── Splash ─────────────────────────────────────────────
function onSplashTap() {
  getAudioCtx();
  document.body.classList.remove('splash-tapped', 'hue-cycle');
  void document.body.offsetWidth;
  document.body.classList.add('splash-tapped');
  stopSplashRotation();
  triggerPhaseFlash();
  playRevealSound();
  setTimeout(() => showPhase('phase-connect'), 120);
}

// ── Écran connexion ────────────────────────────────────
let _connectTimers = [];
let _connectAnimInt = null;

const _CT_MATRIX_WORDS = ['DGSE','COBRA','AGENT','DELTA','SIGMA','OMEGA','ALPHA','GHOST','VIPER','CIPHER','DAKAR','DKR','BXL','ADDIS','MONTREUIL','ÉTHIOPIE','SÉNÉGAL','BELGIQUE','OMBRE','ZÉNITH'];
const _CT_MATRIX_SRC   = 'АБВГДЕЖЗИКЛМНОПРСТабвгдеж0123456789@#$%!?><';

function _ctRand(n) {
  return Array.from({length:n}, () => _CT_MATRIX_SRC[Math.random()*_CT_MATRIX_SRC.length|0]).join('');
}

function startConnect() {
  const el = document.getElementById('connect-terminal');
  el.innerHTML = '';
  _connectTimers.forEach(clearTimeout);
  _connectTimers = [];
  if (_connectAnimInt) { clearInterval(_connectAnimInt); _connectAnimInt = null; }

  let starPos   = 0;
  const STAR_W  = 34;
  let progressVal = 0;
  let counterVal  = 0;

  let showStar = true, showMatrix = false, showProgress = false, showCounter = false;
  let matrixTxt = '', counterTxt = '', progressTxt = '';
  const fixed = [];
  let terminated = false;

  function render() {
    if (terminated) return;
    const rows = [];
    if (showStar) {
      const trail = '·'.repeat(starPos) + '✦' + '·'.repeat(STAR_W - starPos);
      rows.push(`<span class="ct-star">${trail}</span>`);
    }
    if (showMatrix) rows.push(`<span class="ct-matrix">${matrixTxt}</span>`);
    rows.push(...fixed);
    if (showProgress) rows.push(`<span class="ct-prog">${progressTxt}</span>`);
    if (showCounter)  rows.push(`<span class="ct-cnt">${counterTxt}</span>`);
    el.innerHTML = rows.join('\n');
  }

  _connectAnimInt = setInterval(() => {
    if (terminated) return;
    if (showStar) starPos = (starPos + 1) % (STAR_W + 1);
    if (showMatrix) {
      const w = _CT_MATRIX_WORDS[Math.random()*_CT_MATRIX_WORDS.length|0];
      matrixTxt = `${_ctRand(5)} ${w} ${_ctRand(4)} ${_ctRand(6)}`;
    }
    if (showProgress && progressVal < 100) {
      progressVal = Math.min(100, progressVal + 5);
      const f = Math.round(progressVal / 100 * 22);
      progressTxt = `CHARGEMENT [${'█'.repeat(f)}${'░'.repeat(22-f)}] ${progressVal}%`;
    }
    if (showCounter && counterVal < 1247) {
      counterVal = Math.min(1247, counterVal + (Math.random()*55+20|0));
      counterTxt = `FICHIERS DÉCHIFFRÉS : ${String(counterVal).padStart(4,' ')} / 1247`;
    }
    render();
  }, 80);

  const sc = (ms, fn) => { const id = setTimeout(fn, ms); _connectTimers.push(id); };

  sc(  0, () => { /* star visible from start */ });
  sc(320, () => {
    showMatrix = true;
    fixed.push('<span class="ct-ok">CONNEXION RÉSEAU DGSE... ÉTABLIE</span>');
    fixed.push('SERVEUR : MONTREUIL-7  |  LIAISON CHIFFRÉE');
    fixed.push('NŒUDS RELAIS : DKR · BXL · ADD-ABEBA');
    fixed.push('──────────────────────────────────────');
    playTypeSound();
  });
  sc(620, () => {
    fixed.push('');
    fixed.push('INITIALISATION DU SYSTÈME...');
    showProgress = true; progressVal = 0;
  });
  sc(1750, () => {
    showProgress = false;
    fixed.push('<span class="ct-ok">PROTOCOLES DE SÉCURITÉ  ✓</span>');
    playTypeSound();
  });
  sc(1980, () => {
    fixed.push('PARE-FEU QUANTIQUE...');
    playTypeSound();
  });
  sc(2240, () => {
    fixed[fixed.length-1] = '<span class="ct-ok">PARE-FEU QUANTIQUE  ✓</span>';
    fixed.push('TUNNEL VPN NORDIQUE...');
    playTypeSound();
  });
  sc(2500, () => {
    fixed[fixed.length-1] = '<span class="ct-ok">TUNNEL VPN NORDIQUE  ✓</span>';
    fixed.push('AUTHENTIFICATION BIOMÉTRIQUE...');
    playTypeSound();
  });
  sc(2800, () => {
    fixed[fixed.length-1] = '<span class="ct-ok">AUTHENTIFICATION BIOMÉTRIQUE  ✓</span>';
    fixed.push('SCAN RÉTINIEN...');
    playTypeSound();
  });
  sc(3060, () => {
    fixed[fixed.length-1] = '<span class="ct-ok">SCAN RÉTINIEN  ✓</span>';
    fixed.push('LOCALISATION GPS SÉCURISÉE...');
    playTypeSound();
  });
  sc(3320, () => {
    fixed[fixed.length-1] = '<span class="ct-ok">LOCALISATION GPS SÉCURISÉE  ✓</span>';
    fixed.push(`NIVEAU D'ACCÈS : <span class="ct-ok">ALPHA-7</span>`);
    fixed.push('');
    showCounter = true; counterVal = 0;
    playTypeSound();
  });
  sc(4100, () => {
    showMatrix = false; showCounter = false;
    fixed.push('<span class="ct-ok">FICHIERS DÉCHIFFRÉS : 1247 / 1247  ✓</span>');
    fixed.push('');
    playTypeSound();
  });
  sc(4380, () => {
    fixed.push('<span class="ct-ok">DOSSIERS AGENTS  PRÊTS  ✓</span>');
    showStar = false;
    playTypeSound();
  });
  sc(4700, () => {
    fixed.push('');
    fixed.push('▶  ENRÔLEMENT DES AGENTS REQUIS');
    playTypeSound();
    render();
  });
  sc(5600, () => {
    terminated = true;
    clearInterval(_connectAnimInt);
    _connectAnimInt = null;
    showPhase('phase-names');
  });
}

function skipConnect() {
  _connectTimers.forEach(clearTimeout);
  _connectTimers = [];
  if (_connectAnimInt) { clearInterval(_connectAnimInt); _connectAnimInt = null; }
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
  adSeconds = 20;
  const wrap = document.getElementById('autodestruct-bar-wrap');
  const fill = document.getElementById('autodestruct-fill');
  const cd   = document.getElementById('ad-countdown');
  wrap.classList.add('visible');
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) { skipBtn.textContent = '⏭ lancer'; skipBtn.onclick = skipAutodestruct; }
  fill.style.transition = 'none'; fill.style.width = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transition = 'width 1s linear';
    fill.style.width = ((adSeconds-1)/20*100)+'%';
  }));
  cd.textContent = adSeconds;
  clearInterval(adTimer);
  adTimer = setInterval(() => {
    adSeconds--;
    cd.textContent = Math.max(0, adSeconds);
    fill.style.width = (adSeconds/20*100)+'%';
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

function _clearAdAnim() {
  clearInterval(_adFi); _adFi = null;
  clearInterval(_adFl); _adFl = null;
  clearTimeout(_adEndTmr); _adEndTmr = null;
  const overlay = document.getElementById('autodestruct-overlay');
  if (overlay) { overlay.classList.remove('active'); overlay.style.background = '#000'; }
  document.getElementById('autodestruct-bar-wrap')?.classList.remove('visible');
}

function launchAutodestructAnimation() {
  _clearAdAnim();
  const overlay  = document.getElementById('autodestruct-overlay');
  const staticEl = document.getElementById('ad-static');
  const progFill = document.getElementById('ad-progress-fill');
  const skipBtn  = document.getElementById('skip-btn');
  if (skipBtn) skipBtn.style.display = 'none';
  overlay.classList.add('active');
  progFill.style.transition = 'none'; progFill.style.width = '100%';
  let frame = 0, elapsed = 0;
  const totalMs = 2800;
  _adFi = setInterval(() => {
    staticEl.textContent = AD_FRAMES[frame % AD_FRAMES.length]; frame++;
    elapsed += 220;
    progFill.style.width = Math.max(0, (1-elapsed/totalMs)*100)+'%';
  }, 220);
  let flicker = 0;
  _adFl = setInterval(() => { overlay.style.background = flicker++%2===0 ? '#0a0000' : '#000'; }, 90);
  _adEndTmr = setTimeout(() => {
    _clearAdAnim();
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
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
  if (_connectAnimInt) { clearInterval(_connectAnimInt); _connectAnimInt = null; }
  _clearAdAnim();
  stopAmbientMusic(); stopChallengeDisplay(); stopChallengeAnim(); clearSession();
  document.getElementById('particles').innerHTML = '';
  document.body.classList.remove('time-danger');
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) { skipBtn.textContent = '⏭ passer'; skipBtn.onclick = skipTypewriter; skipBtn.style.display = ''; }
  agents=[]; currentRealName=''; currentProposals=[]; draggedAgent=null;
  revealedDigits=[]; currentChallenge=0; pinInput='';
  secondsLeft=cfg.duration; totalSeconds=cfg.duration;
  resetTheme();
  document.body.classList.remove('splash-tapped');
  document.body.classList.add('hue-cycle');
  renderRecruitList(); resetRecruitForm(); showPhase('phase-splash');
  stopBgArtefacts(); initBgArtefacts(); startSplashRotation();
}

// ── Appelée à chaque sync config ───────────────────────
function onCfgSync() {
  initTestMode();
  // Mise à jour agents/équipes injectée par l'admin en direct
  if (cfg.runtimeAgents && missionStart > 0) {
    agents = cfg.runtimeAgents;
    // Consume runtimeAgents so it doesn't persist across reloads
    delete cfg.runtimeAgents;
    try {
      const stored = JSON.parse(localStorage.getItem('agent_config') || '{}');
      delete stored.runtimeAgents;
      localStorage.setItem('agent_config', JSON.stringify(stored));
    } catch(e) {}
    _pushMissionState();
    if (['phase-challenge','phase-reveal','phase-countdown'].includes(currentPhase))
      _updateTeamsPeekBtn();
  }
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
  _clearAdAnim();
  stopAmbientMusic(); stopChallengeDisplay(); stopChallengeAnim(); clearSession();
  document.getElementById('particles').innerHTML = '';

  agents = names; revealedDigits = []; currentChallenge = 0; pinInput = '';
  document.body.classList.remove('time-danger');
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
