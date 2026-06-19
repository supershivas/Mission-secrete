// ══ APP — logique principale ═══════════════════════════

// ── State ──────────────────────────────────────────────
let agents           = []; // [{realName, agentName, team}]
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

// ── Names / Recrutement ────────────────────────────────
const ADJ_ALL = [
  "ACIER","AIGLE","ARGENT","BLIZZARD","BRONZE","COBRA","CYCLONE","DAUPHIN",
  "DRAGON","ÉCLAIR","FANTÔME","FURTIF","GLACIAL","GRIFFON","HIBOU","INVINCIBLE",
  "JADE","KRAKEN","LOUP","LYNX","MERCURE","MYSTÈRE","NOIR","OMBRE","PYTHON",
  "PUMA","RAPIDE","RENARD","ROUGE","SILENCIEUX","SPECTRE","TITAN","TORNADE",
  "URANIUM","VIPÈRE","ZÉNITH"
];

function normalizeChar(c) {
  return c.normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
}

function proposalsForLetter(letter) {
  const l = normalizeChar(letter);
  const matching = ADJ_ALL.filter(a => normalizeChar(a[0]) === l);
  const adjPool = matching.length >= 1
    ? [...matching.sort(() => Math.random()-.5), ...ADJ_ALL.filter(a => normalizeChar(a[0]) !== l).sort(() => Math.random()-.5)]
    : ADJ_ALL.slice().sort(() => Math.random()-.5);
  const used = new Set(agents.map(a => a.agentName));
  const result = [];
  let tries = 0;
  while (result.length < 3 && tries < 300) {
    tries++;
    const adj = adjPool[tries % adjPool.length];
    const name = `AGENT ${adj}`;
    if (!used.has(name) && !result.includes(name)) result.push(name);
  }
  return result;
}

function showProposals() {
  const input = document.getElementById('recruit-input');
  const name = input.value.trim();
  if (!name) return;
  currentRealName = name;
  currentProposals = proposalsForLetter(name[0]);
  const container = document.getElementById('recruit-proposals');
  document.getElementById('recruit-hint').textContent = 'Scan identité en cours…';
  if (scanTmr) { clearInterval(scanTmr); scanTmr = null; }
  container.innerHTML = `<div class="proposals-label">Analyse : <strong>${esc(name)}</strong></div><div class="scan-names" id="scan-names">—</div>`;
  let sc = 0; const max = 22;
  scanTmr = setInterval(() => {
    const adj = ADJ_ALL[Math.floor(Math.random()*ADJ_ALL.length)];
    const el = document.getElementById('scan-names'); if (el) el.textContent = `AGENT ${adj}`;
    playTypeSound(); sc++;
    if (sc >= max) {
      clearInterval(scanTmr); scanTmr = null;
      container.innerHTML = `<div class="proposals-label">Choisir un nom de code pour <strong>${esc(name)}</strong> :</div>` +
        currentProposals.map(p => `<button class="proposal-btn" onclick="pickProposal('${p}')">${p}</button>`).join('');
      document.getElementById('recruit-hint').textContent = 'Choisissez un nom de code.';
    }
  }, 72);
}

function pickProposal(agentName) {
  const realName = currentRealName;
  agents.push({ realName, agentName, team: null });
  resetRecruitForm();
  showAgentReveal(realName, agentName, () => {
    renderRecruitList();
    const badges = document.querySelectorAll('.recruit-badge');
    if (badges.length) badges[badges.length-1].classList.add('stamp-in');
  });
}

function showAgentReveal(realName, agentName, onDone) {
  let ov = document.getElementById('agent-reveal-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'agent-reveal-overlay';
    ov.innerHTML = '<div id="aro-badge">⬛ Agent recruté</div><div id="aro-name">—</div><div id="aro-sep"></div><div id="aro-real"></div>';
    document.body.appendChild(ov);
  }
  document.getElementById('aro-real').textContent = realName.toUpperCase();
  const nameEl = document.getElementById('aro-name');
  nameEl.textContent = '—';
  ov.classList.remove('show', 'fade-out');
  void ov.offsetWidth;
  ov.classList.add('show');
  playStampSound();
  setTimeout(() => matrixName(nameEl, agentName, () => playRevealSound()), 250);
  setTimeout(() => {
    ov.classList.add('fade-out');
    setTimeout(() => { ov.classList.remove('show', 'fade-out'); if (onDone) onDone(); }, 420);
  }, 2900);
}

function matrixName(el, finalName, onDone) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const len = finalName.length;
  let frame = 0; const total = 32;
  const tmr = setInterval(() => {
    let r = '';
    for (let i = 0; i < len; i++) {
      if (finalName[i] === ' ') { r += ' '; continue; }
      r += frame >= Math.floor(total * 0.45 + i * 0.85) ? finalName[i] : alpha[Math.floor(Math.random() * alpha.length)];
    }
    el.textContent = r; frame++;
    if (frame >= total + len) { clearInterval(tmr); el.textContent = finalName; if (onDone) onDone(); }
  }, 58);
}

function resetRecruitForm() {
  currentRealName = '';
  currentProposals = [];
  document.getElementById('recruit-input').value = '';
  document.getElementById('recruit-proposals').innerHTML = '';
  document.getElementById('recruit-hint').textContent =
    agents.length === 0 ? 'Entrez un prénom pour générer des noms de code.' : 'Ajoutez un autre agent ou formez les équipes.';
  document.getElementById('recruit-input').blur();
}

function renderRecruitList() {
  const wrap = document.getElementById('recruit-list-wrap');
  const list = document.getElementById('recruit-list');
  if (agents.length === 0) { wrap.style.display = 'none'; }
  else {
    wrap.style.display = 'block';
    list.innerHTML = agents.map((a,i) =>
      `<div class="recruit-badge">
        <div class="badge-initial">${esc(a.realName[0].toUpperCase())}</div>
        <div class="badge-info">
          <div class="badge-real">${esc(a.realName)}</div>
          <div class="badge-agent">${esc(a.agentName)}</div>
        </div>
        <button class="recruit-del" onclick="removeAgent(${i})" title="Supprimer">✕</button>
      </div>`
    ).join('') + (agents.length >= 2
      ? `<div class="dossier-complet">✓ ${agents.length} agent${agents.length>1?'s':''} recrutés — dossier complet</div>`
      : '');
  }
  document.getElementById('add-agent-btn').style.display  = agents.length > 0 ? 'inline-block' : 'none';
  document.getElementById('form-teams-btn').style.display = agents.length >= 2 ? 'inline-block' : 'none';
}

function removeAgent(i) {
  agents.splice(i, 1);
  renderRecruitList();
}

// ── Teams ──────────────────────────────────────────────
function _activateTeamsPhase() {
  const shuffled = agents.slice().sort(() => Math.random() - .5);
  shuffled.forEach((a, i) => { a.team = i % 2 === 0 ? 'ombre' : 'cobra'; });
  _upgradeTeamHeaders();
  showTeamsFormationOverlay(() => {
    renderTeams();
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    document.getElementById('phase-teams').classList.add('active');
    currentPhase = 'phase-teams';
    animateTeamCards();
  });
}

function _upgradeTeamHeaders() {
  [['ombre','ÉQUIPE OMBRE','#00ff41'],['cobra','ÉQUIPE COBRA','#ff6b00']].forEach(([team, label, color]) => {
    const col = document.getElementById('team-' + team);
    if (!col || col.querySelector('.team-name')) return;
    const hdr = col.querySelector('.team-header');
    if (hdr) hdr.innerHTML = `<div class="team-name">${label}</div><div class="team-count" style="color:${color}">—</div>`;
  });
}

function showTeamsFormationOverlay(onDone) {
  let ov = document.getElementById('teams-formation-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'teams-formation-overlay';
    ov.innerHTML = `
      <div id="tfo-title">⬛ Formation des équipes</div>
      <div id="tfo-bar-track"><div id="tfo-bar-fill"></div></div>
      <div id="tfo-status">Assignation en cours…</div>`;
    document.body.appendChild(ov);
  }
  const fill = ov.querySelector('#tfo-bar-fill');
  const status = ov.querySelector('#tfo-status');
  fill.style.width = '0';
  ov.classList.remove('tfo-out');
  void ov.offsetWidth;
  ov.classList.add('show');
  // Animate bar
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = '100%'; }));
  const msgs = ['Analyse des profils…', 'Équilibrage des forces…', 'Assignation en cours…', 'Équipes constituées.'];
  let mi = 0;
  const mTmr = setInterval(() => { if (++mi < msgs.length) status.textContent = msgs[mi]; }, 380);
  setTimeout(() => {
    clearInterval(mTmr);
    status.textContent = '✓ Équipes prêtes.';
    setTimeout(() => {
      ov.classList.add('tfo-out');
      setTimeout(() => { ov.classList.remove('show', 'tfo-out'); onDone(); }, 380);
    }, 300);
  }, 1600);
}

function renderTeams() {
  ['ombre','cobra'].forEach(team => {
    const container = document.getElementById('cards-' + team);
    const teamAgents = agents.filter(a => a.team === team);
    // Update team header count
    const col = document.getElementById('team-' + team);
    const hdr = col && col.querySelector('.team-count');
    if (hdr) hdr.textContent = `${teamAgents.length} agent${teamAgents.length > 1 ? 's' : ''}`;
    container.innerHTML = teamAgents.map((a) => {
      const idx = agents.indexOf(a);
      return `<div class="agent-card" draggable="true"
        data-idx="${idx}"
        ondragstart="onDragStart(event,${idx})"
        ondragend="onDragEnd(event)"
        ontouchstart="onCardTouchStart(event,${idx})"
        ontouchmove="onCardTouchMove(event)"
        ontouchend="onCardTouchEnd(event,${idx})"
        onclick="onCardClick(event,${idx})">
        <div class="card-initial">${esc(a.realName[0].toUpperCase())}</div>
        <div class="card-info">
          <div class="card-real">${esc(a.realName)}</div>
          <div class="card-agent">${esc(a.agentName)}</div>
        </div>
      </div>`;
    }).join('');
  });
}

function animateTeamCards() {
  const PRE = 1800; // lecture des noms d'équipes
  const DELAY = 550;
  const cards = document.querySelectorAll('.agent-card');

  // Phase 1 : headers clignotent pendant PRE ms
  document.querySelectorAll('.team-header').forEach(h => h.classList.add('header-flash'));

  // Phase 2 : cartes tombent une par une
  cards.forEach((c, i) => {
    c.style.opacity = '0';
    setTimeout(() => {
      c.style.opacity = '';
      c.classList.add('dropping');
      playStampSound();
    }, PRE + i * DELAY);
  });

  // Phase 3 : fin — headers arrêtent de clignoter + son de révélation
  setTimeout(() => {
    document.querySelectorAll('.team-header').forEach(h => h.classList.remove('header-flash'));
    playRevealSound();
  }, PRE + cards.length * DELAY + 200);
}

// Drag & drop (mouse)
function onDragStart(e, idx) {
  draggedAgent = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.team-col').forEach(c => c.classList.remove('drag-over'));
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.team-col').forEach(c => c.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}
function onDrop(e, team) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (draggedAgent === null) return;
  agents[draggedAgent].team = team;
  draggedAgent = null;
  playTypeSound(); renderTeams();
}

// Touch drag & drop (iPad)
let touchStartX = 0, touchStartY = 0, touchMoved = false, touchDragIdx = null;
let touchGhost = null;

function onCardTouchStart(e, idx) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchMoved = false;
  touchDragIdx = idx;
  // create ghost after slight delay
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  touchGhost = card.cloneNode(true);
  touchGhost.style.cssText = `position:fixed;z-index:100;pointer-events:none;opacity:0.85;width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;transition:none`;
  touchGhost.classList.add('dragging');
  document.body.appendChild(touchGhost);
}
function onCardTouchMove(e) {
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
    touchMoved = true;
    e.preventDefault();
  }
  if (touchGhost) {
    touchGhost.style.left = (e.touches[0].clientX - touchGhost.offsetWidth/2) + 'px';
    touchGhost.style.top  = (e.touches[0].clientY - touchGhost.offsetHeight/2) + 'px';
  }
  // highlight column under finger
  document.querySelectorAll('.team-col').forEach(c => c.classList.remove('drag-over'));
  const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
  const col = el && el.closest('.team-col');
  if (col) col.classList.add('drag-over');
}
function onCardTouchEnd(e, idx) {
  if (touchGhost) { touchGhost.remove(); touchGhost = null; }
  document.querySelectorAll('.team-col').forEach(c => c.classList.remove('drag-over'));
  if (!touchMoved) return; // let click handle tap
  // find column under finger
  const touch = e.changedTouches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const col = el && el.closest('.team-col');
  if (col && touchDragIdx !== null) {
    agents[touchDragIdx].team = col.dataset.team;
    renderTeams();
  }
  touchDragIdx = null;
}
function onColTouchEnd(e, team) {
  // handled by card touch end
}

// Tap = toggle team
function onCardClick(e, idx) {
  if (touchMoved) return;
  agents[idx].team = agents[idx].team === 'ombre' ? 'cobra' : 'ombre';
  playTypeSound(); renderTeams();
}

// ── Mode test ──────────────────────────────────────────
function initTestMode() {
  const bar = document.getElementById('test-mode-bar');
  if (cfg.testMode) bar.style.display = 'flex';
  else bar.style.display = 'none';
}

function globalSkip() {
  switch (currentPhase) {
    case 'phase-connect':
      skipConnect(); break;
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
    case 'phase-reveal':
      advanceFromReveal(); break;
    case 'phase-countdown':
      pinInput = revealedDigits.join('');
      checkPin(); break;
    default: break;
  }
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
let _connectTmr = null;

const CONNECT_LINES = [
  { t:   0, txt: 'INITIALISATION DU SYSTÈME KGB...',       cls: '' },
  { t: 500, txt: 'PROTOCOLE DE CHIFFREMENT RSA-4096',       cls: 'pending' },
  { t: 900, txt: 'PROTOCOLE DE CHIFFREMENT RSA-4096  ✓',   cls: 'ok' },
  { t:1100, txt: 'AUTHENTIFICATION BIOMÉTRIQUE',            cls: 'pending' },
  { t:1500, txt: 'AUTHENTIFICATION BIOMÉTRIQUE  ✓',         cls: 'ok' },
  { t:1700, txt: 'LOCALISATION SÉCURISÉE',                  cls: 'pending' },
  { t:2000, txt: 'LOCALISATION SÉCURISÉE  ✓',              cls: 'ok' },
  { t:2300, txt: 'NIVEAU D\'ACCÈS : ALPHA',                 cls: 'ok' },
  { t:2700, txt: '',                                         cls: '' },
  { t:2900, txt: '▶  ENRÔLEMENT DES AGENTS REQUIS',         cls: '' },
];

function startConnect() {
  const el = document.getElementById('connect-terminal');
  el.innerHTML = '';
  if (_connectTmr) clearTimeout(_connectTmr);
  let lines = [];

  // Remplace la dernière ligne "pending" par la version "ok" quand elle arrive
  CONNECT_LINES.forEach(({ t, txt, cls }) => {
    _connectTmr = setTimeout(() => {
      // Si la ligne précédente était "pending", la remplacer
      if (cls === 'ok' && lines.length) {
        lines[lines.length - 1] = _connectLine(txt, cls);
      } else {
        lines.push(_connectLine(txt, cls));
      }
      el.innerHTML = lines.join('\n');
      playTypeSound();
    }, t);
  });

  // Auto-avance vers le recrutement
  _connectTmr = setTimeout(() => showPhase('phase-names'), 3800);
}

function _connectLine(txt, cls) {
  if (!txt) return '';
  if (cls === 'ok')      return `<span class="connect-ok">${txt}</span>`;
  if (cls === 'pending') return `<span class="connect-pending">${txt}...</span>`;
  return txt;
}

function skipConnect() {
  if (_connectTmr) clearTimeout(_connectTmr);
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
    overlay.classList.remove('active'); overlay.style.background = '#000';
    startChallenges();
  }, totalMs);
}

// ── Challenges ─────────────────────────────────────────
function buildStepDots(active) {
  return Array.from({length: cfg.challenges.length}, (_, i) =>
    `<div class="step-dot${i<active?' done':i===active?' active':''}"></div>`
  ).join('');
}

function startChallenges() { currentChallenge = 0; revealedDigits = []; showChallengeWithIntro(0); }

let _introAnimTmr = null;

function showChallengeWithIntro(idx) {
  const ch = cfg.challenges[idx];
  const n  = cfg.challenges.length;

  // Build overlay
  let ov = document.getElementById('challenge-intro-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'challenge-intro-overlay';
    ov.innerHTML = '<div id="ci-num"></div><pre id="ci-ascii"></pre><div id="ci-title"></div>';
    document.body.appendChild(ov);
  }
  if (_introAnimTmr) { clearInterval(_introAnimTmr); _introAnimTmr = null; }

  const numEl   = document.getElementById('ci-num');
  const asciiEl = document.getElementById('ci-ascii');
  const titleEl = document.getElementById('ci-title');
  numEl.textContent   = `ÉPREUVE ${idx+1} / ${n}`;
  asciiEl.textContent = '';
  titleEl.textContent = '';

  ov.classList.remove('ci-out');
  void ov.offsetWidth;
  ov.classList.add('show');
  playBriefingSound();

  // t=0.5s : ASCII animation
  const anim = CHALLENGE_ANIMS[ch.animation];
  if (anim) {
    setTimeout(() => {
      asciiEl.style.color = anim.color;
      asciiEl.style.textShadow = `0 0 14px ${anim.color}88`;
      let f = 0; asciiEl.textContent = anim.frames[0];
      _introAnimTmr = setInterval(() => {
        f = (f+1) % anim.frames.length; asciiEl.textContent = anim.frames[f];
      }, anim.interval);
    }, 500);
  }

  // t=1.1s : Déchiffrage du titre
  const raw = ch.title.split('—');
  const displayTitle = (raw[1] || ch.title).trim().toUpperCase();
  setTimeout(() => matrixName(titleEl, displayTitle, null), 1100);

  // t=3.9s : fermeture + lancement épreuve
  setTimeout(() => {
    if (_introAnimTmr) { clearInterval(_introAnimTmr); _introAnimTmr = null; }
    ov.classList.add('ci-out');
    setTimeout(() => { ov.classList.remove('show','ci-out'); showChallenge(idx); }, 380);
  }, 3900);
}

function showChallenge(idx) {
  const ch = cfg.challenges[idx];
  document.getElementById('ch-num').textContent   = `ÉPREUVE ${idx+1} / ${cfg.challenges.length}`;
  document.getElementById('ch-title').textContent = ch.title;
  document.getElementById('ch-brief').textContent = ch.brief;
  document.getElementById('step-dots').innerHTML  = buildStepDots(idx);

  // team banner
  const banner = document.getElementById('ch-team-banner');
  if (ch.teamPlay && agents.length >= 2) {
    const team = idx % 2 === 0 ? 'ombre' : 'cobra';
    const label = team === 'ombre' ? 'ÉQUIPE OMBRE' : 'ÉQUIPE COBRA';
    banner.textContent = `▶ ${label}`;
    banner.className = 'ch-team-banner ' + team;
    banner.style.display = '';
  } else {
    banner.style.display = 'none';
  }
  document.getElementById('code-input').value     = '';
  document.getElementById('code-error').textContent = '';

  // hint
  clearInterval(hintTimer); hintSeconds = 0;
  const hz   = document.getElementById('hint-zone');
  const hb   = document.getElementById('hint-box');
  const hbtn = document.getElementById('hint-btn');
  hb.classList.remove('visible'); hb.textContent = '';
  hbtn.style.display = 'none';
  if (ch.hint) {
    hz.classList.add('visible');
    const WAIT = 180;
    document.getElementById('hint-timer').innerHTML =
      `<div class="hint-bar-label">indice disponible dans 3:00</div><div class="hint-bar-track"><div class="hint-bar-fill" id="hint-bar-fill"></div></div>`;
    hintTimer = setInterval(() => {
      hintSeconds++;
      const wait = WAIT - hintSeconds;
      const fill = document.getElementById('hint-bar-fill');
      if (fill) fill.style.width = (hintSeconds/WAIT*100)+'%';
      if (wait > 0) {
        const lbl = document.querySelector('.hint-bar-label');
        if (lbl) lbl.textContent = `indice disponible dans ${Math.floor(wait/60)}:${String(wait%60).padStart(2,'0')}`;
      } else {
        clearInterval(hintTimer);
        document.getElementById('hint-timer').innerHTML = `<div class="hint-bar-label" style="color:#ff9900;animation:blink2 .8s step-end infinite">⚡ Indice disponible !</div>`;
        hbtn.style.display = 'inline-block';
      }
    }, 1000);
  } else {
    hz.classList.remove('visible');
  }

  // animation
  ch.animation && ch.animation !== 'none'
    ? startChallengeAnim(ch.animation, ch.code)
    : stopChallengeAnim();

  updateMiniTimer();
  showPhase('phase-challenge');
}

function showHint() {
  const ch = cfg.challenges[currentChallenge];
  const hb = document.getElementById('hint-box');
  hb.textContent = ch.hint; hb.classList.add('visible');
  document.getElementById('hint-btn').style.display = 'none';
}

function submitCode() {
  const val = document.getElementById('code-input').value.trim().toUpperCase();
  const ch  = cfg.challenges[currentChallenge];
  if (val === ch.code.toUpperCase()) {
    revealedDigits.push(ch.digit);
    clearInterval(hintTimer);
    stopChallengeAnim();
    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 120]);
    flashAccessGranted(() => { playRevealSound(); showReveal(currentChallenge); });
  } else {
    document.getElementById('code-error').textContent = '✗ Code incorrect — réessayez';
    document.getElementById('code-input').value = '';
    playErrorSound();
    if (navigator.vibrate) navigator.vibrate(400);
    setTimeout(() => { document.getElementById('code-error').textContent = ''; }, 2000);
  }
}

function flashAccessGranted(onDone) {
  let el = document.getElementById('access-granted-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'access-granted-overlay';
    el.innerHTML = '✓ ACCÈS ACCORDÉ<div class="ag-sub">code validé</div>';
    document.body.appendChild(el);
  }
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  playAccessGranted();
  // Déclenche avant que l'animation ne revienne à opacity:0 (80% = 760ms)
  setTimeout(() => { el.classList.remove('show'); if (onDone) onDone(); }, 740);
}

// ── Reveal ─────────────────────────────────────────────
function showReveal(idx) {
  const isLast = idx === cfg.challenges.length - 1;
  const n = cfg.challenges.length;
  const digitEl = document.getElementById('reveal-digit-big');
  digitEl.textContent = '?';
  document.getElementById('partial-code').innerHTML =
    Array.from({length: n}, (_, i) => {
      const prevRev = i < idx;
      return `<div class="code-slot${(prevRev||i===idx)?' revealed':''}" id="rslot-${i}">${prevRev ? revealedDigits[i] : '?'}</div>`;
    }).join('');
  document.getElementById('reveal-label').textContent =
    isLast ? '⬛ Code de désarmement — complet !' : `⬛ Chiffre ${idx+1} récupéré !`;
  document.getElementById('reveal-status').textContent =
    isLast ? 'Mémorisez ce code. Prêts à désamorcer ?' : `Plus que ${n-idx-1} épreuve${n-idx-1>1?'s':''}.`;
  const btn = document.getElementById('reveal-next-btn');
  btn.textContent = isLast ? '▶ Désamorcer maintenant' : '▶ Épreuve suivante';
  syncRevealTimer();
  showPhase('phase-reveal');
  matrixReveal(digitEl, revealedDigits[idx], () => {
    const slot = document.getElementById('rslot-'+idx);
    if (slot) slot.textContent = revealedDigits[idx];
    playRevealSound();
  });
}

function matrixReveal(el, finalChar, onDone) {
  const chars = '0123456789';
  let count = 0; const max = 20;
  playDecodeSound();
  const tmr = setInterval(() => {
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    count++;
    if (count >= max) { clearInterval(tmr); el.textContent = finalChar; if (onDone) onDone(); }
  }, 65);
}

function advanceFromReveal() {
  const isLast = currentChallenge === cfg.challenges.length - 1;
  if (isLast) { startFinalCountdown(); return; }
  // Couvrir l'écran avant de désactiver la phase reveal, pour éviter tout flash
  triggerPhaseFlash(() => {
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    showChallengeWithIntro(++currentChallenge);
  });
}

// ── Timers ─────────────────────────────────────────────
function globalTick() {
  secondsLeft = Math.max(0, secondsLeft - 1);
  updateMiniTimer(); syncRevealTimer();
  if (secondsLeft <= 30 && secondsLeft > 0) playTick(secondsLeft <= 10);
  if (secondsLeft === 0) { clearInterval(countdownTimer); stopAmbientMusic(); triggerExplosion(); }
  if (secondsLeft % 10 === 0) saveSession(); // save toutes les 10s
}

function applyTimerStyle(el, pb, s) {
  const c = timerCls(s);
  if (el) { el.className = 't-' + c; el.textContent = timerText(s); }
  if (pb) { pb.style.width = (s/totalSeconds*100)+'%'; pb.className = 'bar-' + c; }
}
function updateMiniTimer() { applyTimerStyle(document.getElementById('timer-sm'), document.getElementById('progress-bar'), secondsLeft); }
function syncRevealTimer() { applyTimerStyle(document.getElementById('timer-sm-rev'), document.getElementById('progress-bar-rev'), secondsLeft); }

// ── Final countdown ────────────────────────────────────
function startFinalCountdown() {
  clearInterval(countdownTimer);
  showPhase('phase-countdown');
  updateBigTimer();
  countdownTimer = setInterval(finalTick, 1000);
}
function finalTick() {
  secondsLeft = Math.max(0, secondsLeft - 1);
  updateBigTimer();
  updateCountdownBg();
  if (secondsLeft <= 60) document.body.classList.add('time-danger');
  if (secondsLeft <= 30 && secondsLeft > 0) playTick(secondsLeft <= 10);
  if (secondsLeft === 0) { clearInterval(countdownTimer); stopAmbientMusic(); triggerExplosion(); }
  if (secondsLeft % 10 === 0) saveSession();
}

function updateCountdownBg() {
  const ratio = secondsLeft / totalSeconds;
  const intensity = Math.max(0, Math.min(1, (0.4 - ratio) / 0.4));
  document.body.style.background = intensity > 0.02 ? `rgb(${Math.round(intensity*22)},0,0)` : '';
}
function updateBigTimer() {
  const el = document.getElementById('big-timer'), pb = document.getElementById('progress-bar-cd');
  el.textContent = timerText(secondsLeft); el.className = timerCls(secondsLeft);
  pb.style.width = (secondsLeft/totalSeconds*100)+'%'; pb.className = 'bar-' + timerCls(secondsLeft);
}

// ── PIN ────────────────────────────────────────────────
function pressPin(n) {
  if (pinInput.length >= 4) return;
  pinInput += n;
  if (navigator.vibrate) navigator.vibrate(28);
  updatePinDots();
  if (pinInput.length === 4) setTimeout(checkPin, 150);
}
function delPin() {
  pinInput = pinInput.slice(0, -1); updatePinDots();
  document.getElementById('pin-error').textContent = '';
}
function updatePinDots() {
  for (let i = 0; i < 4; i++)
    document.getElementById('d'+i).className = 'pin-dot' + (i < pinInput.length ? ' filled' : '');
}
function checkPin() {
  const correct = revealedDigits.join('');
  if (pinInput === correct) {
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 200]);
    clearInterval(countdownTimer); stopAmbientMusic();
    clearSession(); showScore(); playFanfare();
  } else {
    if (navigator.vibrate) navigator.vibrate(600);
    document.getElementById('pin-error').textContent = '✗ Code incorrect — accès refusé';
    for (let i = 0; i < 4; i++) document.getElementById('d'+i).className = 'pin-dot error';
    playErrorSound();
    setTimeout(() => { pinInput = ''; updatePinDots(); document.getElementById('pin-error').textContent = ''; }, 900);
  }
}

// ── Score ──────────────────────────────────────────────
function showScore() {
  const elapsed   = Math.round((Date.now() - missionStart) / 1000);
  const remaining = secondsLeft;
  const ratio     = remaining / totalSeconds;
  let stars, rank, msg;
  if (ratio >= 0.6)       { stars='★★★'; rank='LÉGENDAIRE'; msg='Temps record. Le QG est stupéfait.\nVous êtes les meilleurs agents de l\'organisation.'; }
  else if (ratio >= 0.35) { stars='★★☆'; rank='EXCELLENCE'; msg='Mission accomplie avec brio.\nVos noms entreront dans les archives secrètes.'; }
  else if (ratio >= 0.15) { stars='★☆☆'; rank='ACCOMPLIE';  msg='Mission réussie de justesse.\nLa prochaine fois, faites plus vite.'; }
  else                    { stars='☆☆☆'; rank='LIMITE';     msg='Le dispositif était sur le point d\'exploser.\nEntraînez-vous, agents.'; }

  // Reset animations
  ['score-stars','score-rank','score-time','score-msg'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent=''; el.style.opacity='0'; el.style.animation='none';
  });

  document.getElementById('score-stars').textContent = stars;
  document.getElementById('score-rank').textContent  = rank;
  document.getElementById('score-time').textContent  = `Temps restant : ${timerText(remaining)} — Durée : ${timerText(elapsed)}`;
  document.getElementById('score-msg').textContent   = msg;

  // Podium agents
  const podium = document.getElementById('score-agents');
  const hasTeams = agents.some(a => a.team);
  if (agents.length > 0) {
    if (hasTeams) {
      const teams = ['ombre', 'cobra'];
      podium.innerHTML = teams.map(team => {
        const members = agents.filter(a => a.team === team);
        if (!members.length) return '';
        return `<div class="podium-team">
          <div class="podium-team-label">Équipe ${team.toUpperCase()}</div>
          ${members.map(a => `<div class="podium-agent">
            <span class="podium-real">${esc(a.realName)}</span>
            <span class="podium-code">${esc(a.agentName)}</span>
          </div>`).join('')}
        </div>`;
      }).join('');
    } else {
      podium.innerHTML = `<div class="podium-solo">${agents.map(a => `
        <div class="podium-agent">
          <span class="podium-real">${esc(a.realName)}</span>
          <span class="podium-code">${esc(a.agentName)}</span>
        </div>`).join('')}
      </div>`;
    }
    podium.style.display = 'flex';
  } else {
    podium.style.display = 'none';
  }

  showPhase('phase-success');
  spawnSuccessConfetti();

  // Anime les éléments un par un
  const seq = [
    ['score-stars', 300,  'pop .7s cubic-bezier(.17,.67,.25,1.4) both'],
    ['score-rank',  900,  'pop .8s cubic-bezier(.17,.67,.2,1.5) both'],
    ['score-time',  1500, 'fadein .5s ease both'],
    ['score-msg',   1900, 'fadein .5s ease both'],
  ];
  seq.forEach(([id, delay, anim]) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      el.style.opacity=''; el.style.animation=anim;
    }, delay);
  });
  setTimeout(() => {
    const p = document.getElementById('score-agents');
    p.style.opacity='0'; p.style.animation='none';
    setTimeout(() => { p.style.opacity=''; p.style.animation='fadein .5s ease both'; }, 2300);
  }, 0);
}

function spawnSuccessConfetti() {
  const chars = ['★','✦','▲','•','◆','*','✓'];
  const c = document.getElementById('particles');
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div'); p.className = 'particle-ascii';
    p.textContent = chars[Math.floor(Math.random()*chars.length)];
    const x = 2 + Math.random()*96, fall = 1.6 + Math.random()*2.4, delay = Math.random()*2.2, sz = 12+Math.random()*22;
    p.style.cssText = `left:${x}vw;font-size:${sz}px;color:#00ff41;opacity:${(.35+Math.random()*.65).toFixed(2)};animation-duration:${fall.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s`;
    c.appendChild(p); setTimeout(() => p.remove(), (fall+delay)*1000+300);
  }
}

// ── Explosion ──────────────────────────────────────────
function triggerExplosion() {
  clearSession();
  // Flash rouge intense avant l'écran
  let fl = document.getElementById('explosion-flash');
  if (!fl) { fl=document.createElement('div'); fl.id='explosion-flash'; document.body.appendChild(fl); }
  fl.classList.remove('active'); void fl.offsetWidth; fl.classList.add('active');
  playExplosion();
  if (navigator.vibrate) navigator.vibrate([200,100,200,100,400]);
  setTimeout(() => {
    fl.classList.remove('active');
    showPhase('phase-explosion');
    spawnBurst(90); spawnBurst(90);
    particleLoop = setInterval(() => spawnBurst(70), 1400);
  }, 350);
}
function spawnBurst(count = 55) {
  const c = document.getElementById('particles');
  const cols = ['#ff0024','#ff6b00','#ffcc00','#ff3300','#ff9900','#ffffff'];
  const cx = window.innerWidth/2, cy = window.innerHeight/2;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const sz=3+Math.random()*14, ang=Math.random()*Math.PI*2, dist=100+Math.random()*420;
    p.style.cssText=`width:${sz}px;height:${sz}px;background:${cols[Math.floor(Math.random()*cols.length)]};left:${cx}px;top:${cy}px;--tx:${Math.cos(ang)*dist}px;--ty:${Math.sin(ang)*dist}px;--dur:${(.6+Math.random()*1.1).toFixed(2)}s;animation-delay:${(Math.random()*.3).toFixed(2)}s`;
    c.appendChild(p); setTimeout(() => p.remove(), 2500);
  }
}

// ── Reset ──────────────────────────────────────────────
function resetApp() {
  clearInterval(countdownTimer); clearInterval(particleLoop);
  clearInterval(hintTimer); clearInterval(adTimer);
  if (scanTmr) { clearInterval(scanTmr); scanTmr = null; }
  clearTimeout(typewriterTmr); clearTimeout(adPostTmr);
  stopAmbientMusic(); stopChallengeAnim(); clearSession();
  document.getElementById('particles').innerHTML = '';
  document.getElementById('autodestruct-overlay').classList.remove('active');
  document.body.classList.remove('time-danger'); document.body.style.background = '';
  document.getElementById('autodestruct-bar-wrap').classList.remove('visible');
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) { skipBtn.textContent = '⏭ passer'; skipBtn.onclick = skipTypewriter; skipBtn.style.display = ''; }
  agents=[]; currentRealName=''; currentProposals=[]; draggedAgent=null;
  revealedDigits=[]; currentChallenge=0; pinInput='';
  secondsLeft=cfg.duration; totalSeconds=cfg.duration;
  renderRecruitList(); resetRecruitForm(); showPhase('phase-splash');
  stopBgArtefacts(); initBgArtefacts(); startSplashRotation();
}

// ── Resume from session ────────────────────────────────
function tryResume() {
  const s = loadSession();
  if (!s || !RESUMABLE_PHASES.includes(s.phase)) return;

  // Restore state
  agents           = s.agents || [];
  currentChallenge = s.currentChallenge || 0;
  revealedDigits   = s.revealedDigits || [];
  secondsLeft      = s.secondsLeft || cfg.duration;
  totalSeconds     = s.totalSeconds || cfg.duration;
  missionStart     = s.missionStart || Date.now();

  // Show banner
  const banner = document.getElementById('resume-banner');
  const ch     = cfg.challenges[currentChallenge];
  document.getElementById('resume-text').textContent =
    `Mission en cours — Épreuve ${currentChallenge+1} — ${timerText(secondsLeft)} restant`;
  banner.classList.add('visible');
}

function resumeMission() {
  const s = loadSession();
  if (!s) return;
  document.getElementById('resume-banner').classList.remove('visible');

  agents           = s.agents || [];
  currentChallenge = s.currentChallenge || 0;
  revealedDigits   = s.revealedDigits || [];
  secondsLeft      = s.secondsLeft || cfg.duration;
  totalSeconds     = s.totalSeconds || cfg.duration;
  missionStart     = s.missionStart || Date.now();

  startAmbientMusic();

  if (s.phase === 'phase-challenge' || s.phase === 'phase-reveal') {
    countdownTimer = setInterval(globalTick, 1000);
    showChallenge(currentChallenge);
  } else if (s.phase === 'phase-countdown') {
    countdownTimer = setInterval(finalTick, 1000);
    showPhase('phase-countdown');
    updateBigTimer();
  } else if (s.phase === 'phase-message') {
    countdownTimer = setInterval(globalTick, 1000);
    showPhase('phase-message');
    document.getElementById('typewriter-text').innerHTML = esc(cfg.message).replace(/\n/g,'<br>');
    startAutodestruct();
  }
}

function dismissResume() {
  clearSession();
  document.getElementById('resume-banner').classList.remove('visible');
}

// ── Appelée à chaque sync config (main.js) ─────────────
function onCfgSync() {
  initTestMode();
  // 1. Recalcule le timer si une mission est en cours
  if (missionStart > 0 && countdownTimer) {
    const elapsed = Math.round((Date.now() - missionStart) / 1000);
    totalSeconds  = cfg.duration;
    secondsLeft   = Math.max(0, cfg.duration - elapsed);
    updateMiniTimer();
    syncRevealTimer();
    if (currentPhase === 'phase-countdown') updateBigTimer();
  }

  // 2. Rafraîchit l'épreuve active
  if (currentPhase === 'phase-challenge') {
    const ch = cfg.challenges[currentChallenge];
    if (!ch) return;
    document.getElementById('ch-title').textContent = ch.title;
    document.getElementById('ch-brief').textContent = ch.brief;

    ch.animation && ch.animation !== 'none'
      ? startChallengeAnim(ch.animation, ch.code)
      : stopChallengeAnim();

    // team banner
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

// ── Debug simulation (console: debugSim() ou Ctrl+Shift+D) ──
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
  stopAmbientMusic(); stopChallengeAnim(); clearSession();
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
