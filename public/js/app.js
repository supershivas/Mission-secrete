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
  triggerPhaseFlash();
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  currentPhase = id;
  if (RESUMABLE_PHASES.includes(id)) saveSession();
}

// ── Names / Recrutement ────────────────────────────────
const ADJ_ALL = [
  "ACIER","AIGLE","ARGENT","BLIZZARD","BRONZE","COBRA","CYCLONE","DAUPHIN",
  "DRAGON","ÉCLAIR","FANTÔME","FURTIF","GLACIAL","GRIFFON","HIBOU","INVINCIBLE",
  "JADE","KRAKEN","LOUP","LYNX","MERCURE","MYSTÈRE","NOIR","OMBRE","PYTHON",
  "PUMA","RAPIDE","RENARD","ROUGE","SILENCIEUX","SPECTRE","TITAN","TORNADE",
  "URANIUM","VIPÈRE","ZÉNITH"
];
const NOM_ALL = [
  "DELTA","SIGMA","ZÉRO","ALPHA","BRAVO","OMEGA","KILO","VICTOR","ZULU",
  "FOXTROT","SIERRA","TANGO","ROMEO","LIMA","INDIA","NOVEMBRE","PAPA","OSCAR","WHISKY","GOLF"
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
    const nom = NOM_ALL[Math.floor(Math.random() * NOM_ALL.length)];
    const name = `AGENT ${adj} ${nom}`;
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
  container.innerHTML = `<div class="proposals-label">Choisir un nom de code pour <strong>${esc(name)}</strong> :</div>` +
    currentProposals.map(p =>
      `<button class="proposal-btn" onclick="pickProposal('${p}')">${p}</button>`
    ).join('');
  document.getElementById('recruit-hint').textContent = 'Choisissez un nom de code.';
  playTypeSound();
}

function pickProposal(agentName) {
  agents.push({ realName: currentRealName, agentName, team: null });
  renderRecruitList();
  resetRecruitForm();
  playRevealSound();
}

function resetRecruitForm() {
  currentRealName = '';
  currentProposals = [];
  document.getElementById('recruit-input').value = '';
  document.getElementById('recruit-proposals').innerHTML = '';
  document.getElementById('recruit-hint').textContent =
    agents.length === 0 ? 'Entrez un prénom pour générer des noms de code.' : 'Ajoutez un autre agent ou formez les équipes.';
  document.getElementById('recruit-input').focus();
}

function renderRecruitList() {
  const wrap = document.getElementById('recruit-list-wrap');
  const list = document.getElementById('recruit-list');
  if (agents.length === 0) { wrap.style.display = 'none'; }
  else {
    wrap.style.display = 'block';
    list.innerHTML = agents.map((a,i) =>
      `<div class="recruit-badge">
        <span class="recruit-real">${esc(a.realName)}</span>
        <span class="recruit-arrow">→</span>
        <span class="recruit-agent">${esc(a.agentName)}</span>
        <button class="recruit-del" onclick="removeAgent(${i})" title="Supprimer">✕</button>
      </div>`
    ).join('');
  }
  document.getElementById('add-agent-btn').style.display   = agents.length > 0 ? 'inline-block' : 'none';
  document.getElementById('form-teams-btn').style.display  = agents.length >= 2 ? 'inline-block' : 'none';
}

function removeAgent(i) {
  agents.splice(i, 1);
  renderRecruitList();
}

// ── Teams ──────────────────────────────────────────────
function _activateTeamsPhase() {
  // distribute agents randomly into 2 teams
  const shuffled = agents.slice().sort(() => Math.random() - .5);
  shuffled.forEach((a, i) => { a.team = i % 2 === 0 ? 'ombre' : 'cobra'; });
  renderTeams();
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  document.getElementById('phase-teams').classList.add('active');
  currentPhase = 'phase-teams';
}

function renderTeams() {
  ['ombre','cobra'].forEach(team => {
    const container = document.getElementById('cards-' + team);
    const teamAgents = agents.filter(a => a.team === team);
    container.innerHTML = teamAgents.map((a, _) => {
      const idx = agents.indexOf(a);
      return `<div class="agent-card" draggable="true"
        data-idx="${idx}"
        ondragstart="onDragStart(event,${idx})"
        ondragend="onDragEnd(event)"
        ontouchstart="onCardTouchStart(event,${idx})"
        ontouchmove="onCardTouchMove(event)"
        ontouchend="onCardTouchEnd(event,${idx})"
        onclick="onCardClick(event,${idx})">
        <div class="card-real">${esc(a.realName)}</div>
        <div class="card-agent">${esc(a.agentName)}</div>
      </div>`;
    }).join('');
  });
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
  renderTeams();
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
  if (touchMoved) return; // was a drag
  agents[idx].team = agents[idx].team === 'ombre' ? 'cobra' : 'ombre';
  renderTeams();
}

// ── Splash ─────────────────────────────────────────────
function onSplashTap() { getAudioCtx(); stopSplashRotation(); showPhase('phase-names'); }

// ── Launch ─────────────────────────────────────────────
function launchMission() {
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

// ── Autodestruction ────────────────────────────────────
function startAutodestruct() {
  adSeconds = 30;
  const wrap = document.getElementById('autodestruct-bar-wrap');
  const fill = document.getElementById('autodestruct-fill');
  const cd   = document.getElementById('ad-countdown');
  wrap.classList.add('visible');
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

function startChallenges() { currentChallenge = 0; revealedDigits = []; showChallenge(0); }

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
    hintTimer = setInterval(() => {
      hintSeconds++;
      const wait = 180 - hintSeconds;
      if (wait > 0) {
        document.getElementById('hint-timer').textContent =
          `Indice disponible dans ${Math.floor(wait/60)}:${String(wait%60).padStart(2,'0')}`;
      } else {
        clearInterval(hintTimer);
        document.getElementById('hint-timer').textContent = 'Indice disponible';
        hbtn.style.display = 'inline-block';
      }
    }, 1000);
  } else {
    hz.classList.remove('visible');
  }

  // animation
  ch.animation && ch.animation !== 'none'
    ? startChallengeAnim(ch.animation)
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
    playRevealSound();
    showReveal(currentChallenge);
  } else {
    document.getElementById('code-error').textContent = '✗ Code incorrect — réessayez';
    document.getElementById('code-input').value = '';
    playErrorSound();
    setTimeout(() => { document.getElementById('code-error').textContent = ''; }, 2000);
  }
}

// ── Reveal ─────────────────────────────────────────────
function showReveal(idx) {
  const isLast = idx === cfg.challenges.length - 1;
  const n = cfg.challenges.length;
  document.getElementById('reveal-digit-big').textContent = revealedDigits[idx];
  document.getElementById('partial-code').innerHTML =
    Array.from({length: n}, (_, i) => {
      const rev = i <= idx;
      return `<div class="code-slot${rev?' revealed':''}">${rev ? revealedDigits[i] : '?'}</div>`;
    }).join('');
  document.getElementById('reveal-label').textContent =
    isLast ? '⬛ Code de désarmement — complet !' : `⬛ Chiffre ${idx+1} récupéré !`;
  document.getElementById('reveal-status').textContent =
    isLast ? 'Mémorisez ce code. Prêts à désamorcer ?' : `Plus que ${n-idx-1} épreuve${n-idx-1>1?'s':''}.`;
  const btn = document.getElementById('reveal-next-btn');
  btn.textContent = isLast ? '▶ Désamorcer maintenant' : '▶ Épreuve suivante';
  syncRevealTimer();
  showPhase('phase-reveal');
}

function advanceFromReveal() {
  const isLast = currentChallenge === cfg.challenges.length - 1;
  isLast ? startFinalCountdown() : showChallenge(++currentChallenge);
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
  if (secondsLeft <= 30 && secondsLeft > 0) playTick(secondsLeft <= 10);
  if (secondsLeft === 0) { clearInterval(countdownTimer); stopAmbientMusic(); triggerExplosion(); }
  if (secondsLeft % 10 === 0) saveSession();
}
function updateBigTimer() {
  const el = document.getElementById('big-timer'), pb = document.getElementById('progress-bar-cd');
  el.textContent = timerText(secondsLeft); el.className = timerCls(secondsLeft);
  pb.style.width = (secondsLeft/totalSeconds*100)+'%'; pb.className = 'bar-' + timerCls(secondsLeft);
}

// ── PIN ────────────────────────────────────────────────
function pressPin(n) {
  if (pinInput.length >= 4) return;
  pinInput += n; updatePinDots();
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
    clearInterval(countdownTimer); stopAmbientMusic();
    clearSession(); showScore(); playFanfare();
  } else {
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
}

// ── Explosion ──────────────────────────────────────────
function triggerExplosion() {
  clearSession();
  showPhase('phase-explosion');
  spawnBurst();
  particleLoop = setInterval(spawnBurst, 1600);
  playExplosion();
}
function spawnBurst() {
  const c = document.getElementById('particles');
  const cols = ['#ff0024','#ff6b00','#ffcc00','#ff3300','#ff9900'];
  const cx = window.innerWidth/2, cy = window.innerHeight/2;
  for (let i = 0; i < 55; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const sz=4+Math.random()*12, ang=Math.random()*Math.PI*2, dist=150+Math.random()*350;
    p.style.cssText=`width:${sz}px;height:${sz}px;background:${cols[Math.floor(Math.random()*cols.length)]};left:${cx}px;top:${cy}px;--tx:${Math.cos(ang)*dist}px;--ty:${Math.sin(ang)*dist}px;--dur:${(.7+Math.random()*.9).toFixed(2)}s;animation-delay:${(Math.random()*.25).toFixed(2)}s`;
    c.appendChild(p); setTimeout(() => p.remove(), 2200);
  }
}

// ── Reset ──────────────────────────────────────────────
function resetApp() {
  clearInterval(countdownTimer); clearInterval(particleLoop);
  clearInterval(hintTimer); clearInterval(adTimer);
  clearTimeout(typewriterTmr); clearTimeout(adPostTmr);
  stopAmbientMusic(); stopChallengeAnim(); clearSession();
  document.getElementById('particles').innerHTML = '';
  document.getElementById('autodestruct-overlay').classList.remove('active');
  document.getElementById('autodestruct-bar-wrap').classList.remove('visible');
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
      ? startChallengeAnim(ch.animation)
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
