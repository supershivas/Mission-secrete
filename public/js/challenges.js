// ══ CHALLENGES — flow des épreuves ═════════════════════

// ── Helpers pause/real ──────────────────────────────────
function _realCount() {
  return cfg.challenges.filter(c => c.type !== 'pause').length;
}

function _realIdx(arrayIdx) {
  return cfg.challenges.slice(0, arrayIdx).filter(c => c.type !== 'pause').length;
}

function buildStepDots(arrayIdx) {
  const n = _realCount();
  const active = _realIdx(arrayIdx);
  return Array.from({length: n}, (_, i) =>
    `<div class="step-dot${i < active ? ' done' : i === active ? ' active' : ''}"></div>`
  ).join('');
}

// ── Rôles agents ────────────────────────────────────────
let _challengeRoles = [];

function _assignAllRoles() {
  const pool = agents.map(a => a.agentName || a.realName).filter(Boolean);
  _challengeRoles = [];
  if (!pool.length) return;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  let si = 0;
  const next = () => shuffled[si++ % shuffled.length];
  _challengeRoles = cfg.challenges.map(item =>
    item.type === 'pause'
      ? { ravitailleur: next() }
      : { lecteur: next(), desarmeur: next() }
  );
}

// ── Démarrage ───────────────────────────────────────────
function startChallenges() {
  currentChallenge = 0;
  revealedDigits = [];
  _assignAllRoles();
  showNextItem(0);
}

function showNextItem(idx) {
  const item = cfg.challenges[idx];
  if (!item) { startFinalCountdown(); return; }
  if (item.type === 'pause') showPause(idx);
  else showChallengeWithIntro(idx);
}

// ── Pause fraîcheur ─────────────────────────────────────
let _waterTmr = null;
const WATER_FRAMES = [
  '≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋\n ∿  ~~~  ∿  ~~~  ∿ \n≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈\n∿  ~~~  ∿  ~~~  ∿  \n≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋',
  '≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈\n∿  ~~~  ∿  ~~~  ∿  \n≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋\n ∿  ~~~  ∿  ~~~  ∿ \n≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈',
  '≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋\n∿∿ ~~~  ∿∿ ~~~  ∿∿ \n≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈\n  ∿  ~~~  ∿  ~~~  ∿\n≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋',
  '≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈\n  ∿  ~~~  ∿  ~~~  ∿\n≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋\n∿∿ ~~~  ∿∿ ~~~  ∿∿ \n≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈',
];

function showPause(idx) {
  currentChallenge = idx;
  currentPhase = 'phase-pause';
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  document.getElementById('phase-pause').classList.add('active');
  document.body.style.background = '#00090f';

  const roles = _challengeRoles[idx];
  const badge = document.getElementById('pause-agent-badge');
  if (badge) {
    if (roles?.ravitailleur) {
      badge.textContent = `⬛ RAVITAILLEUR : ${roles.ravitailleur}`;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  let fi = 0;
  const waterEl = document.getElementById('pause-water');
  if (waterEl) waterEl.textContent = WATER_FRAMES[0];
  clearInterval(_waterTmr);
  _waterTmr = setInterval(() => {
    fi = (fi + 1) % WATER_FRAMES.length;
    if (waterEl) waterEl.textContent = WATER_FRAMES[fi];
  }, 550);

  updateMiniTimer();
  saveSession();
  _pushMissionState();
  _updateTeamsPeekBtn();
}

function resumeFromPause() {
  clearInterval(_waterTmr); _waterTmr = null;
  const nextIdx = currentChallenge + 1;
  if (nextIdx >= cfg.challenges.length) { startFinalCountdown(); return; }
  currentChallenge = nextIdx;
  showNextItem(nextIdx);
}

// ── Intro overlay ───────────────────────────────────────
let _introAnimTmr = null;

function showChallengeWithIntro(idx) {
  const ch = cfg.challenges[idx];
  const n  = _realCount();
  const ri = _realIdx(idx);

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
  numEl.textContent   = `ÉPREUVE ${ri + 1} / ${n}`;
  asciiEl.textContent = '';
  titleEl.textContent = '';

  ov.classList.remove('ci-out');
  void ov.offsetWidth;
  ov.classList.add('show');
  playBriefingSound();
  if (ch.animation && ch.animation !== 'none') playChallengeAmbient(ch.animation);

  const anim = CHALLENGE_ANIMS[ch.animation];
  if (anim) {
    setTimeout(() => {
      asciiEl.style.color = anim.color;
      asciiEl.style.textShadow = `0 0 14px ${anim.color}88`;
      let f = 0; asciiEl.textContent = anim.frames[0];
      _introAnimTmr = setInterval(() => {
        f = (f + 1) % anim.frames.length; asciiEl.textContent = anim.frames[f];
      }, anim.interval);
    }, 500);
  }

  const raw = ch.title.split('—');
  const displayTitle = (raw[1] || ch.title).trim().toUpperCase();
  setTimeout(() => matrixName(titleEl, displayTitle, null), 1100);

  setTimeout(() => {
    if (_introAnimTmr) { clearInterval(_introAnimTmr); _introAnimTmr = null; }
    ov.classList.add('ci-out');
    setTimeout(() => { ov.classList.remove('show', 'ci-out'); showChallenge(idx); }, 380);
  }, 3900);
}

// ── Affichage épreuve ───────────────────────────────────
function showChallenge(idx) {
  const ch = cfg.challenges[idx];
  const ri = _realIdx(idx);
  const n  = _realCount();

  document.getElementById('ch-num').textContent   = `ÉPREUVE ${ri + 1} / ${n}`;
  document.getElementById('ch-title').textContent = ch.title;
  document.getElementById('ch-brief').textContent = ch.brief;
  document.getElementById('step-dots').innerHTML  = buildStepDots(idx);

  // Badges rôles agents
  const roles = _challengeRoles[idx];
  let rolesHTML = '';
  if (roles?.lecteur)  rolesHTML += `<div id="ch-agent-badge2">📖 LECTEUR : ${roles.lecteur}</div>`;
  if (roles?.desarmeur) rolesHTML += `<div id="ch-agent-badge">⬛ DÉSARMEUR : ${roles.desarmeur}</div>`;
  const rolesWrap = document.getElementById('ch-agent-roles');
  if (rolesWrap) {
    rolesWrap.innerHTML = rolesHTML;
    rolesWrap.style.display = rolesHTML ? '' : 'none';
  }

  const banner = document.getElementById('ch-team-banner');
  if (ch.teamPlay && agents.length >= 2) {
    const team = ri % 2 === 0 ? 'ombre' : 'cobra';
    banner.textContent = `▶ ${team === 'ombre' ? 'ÉQUIPE OMBRE' : 'ÉQUIPE COBRA'}`;
    banner.className = 'ch-team-banner ' + team;
    banner.style.display = '';
  } else {
    banner.style.display = 'none';
  }
  document.getElementById('code-input').value       = '';
  document.getElementById('code-error').textContent = '';

  // Hint timer
  clearInterval(hintTimer); hintSeconds = 0;
  const hz   = document.getElementById('hint-zone');
  const hb   = document.getElementById('hint-box');
  const hbtn = document.getElementById('hint-btn');
  hb.classList.remove('visible'); hb.textContent = '';
  hbtn.style.display = 'none';
  if (ch.hint) {
    hz.classList.add('visible');
    const WAIT = 90;
    const hintStartedAt = Date.now();
    document.getElementById('hint-timer').textContent = '';
    hbtn.style.display = 'none';
    hintTimer = setInterval(() => {
      hintSeconds = Math.round((Date.now() - hintStartedAt) / 1000);
      const wait = WAIT - hintSeconds;
      const htEl = document.getElementById('hint-timer');
      if (wait > 60) {
        if (htEl) htEl.textContent = '';
      } else if (wait > 0) {
        if (htEl) htEl.textContent = `💡 indice dans ${wait}s`;
      } else {
        clearInterval(hintTimer);
        if (htEl) htEl.textContent = '';
        hbtn.style.display = 'inline-block';
      }
    }, 1000);
  } else {
    hz.classList.remove('visible');
  }

  // Label code
  const codeLabel = document.querySelector('.code-label');
  if (codeLabel) {
    if (ch.type === 'qr') codeLabel.textContent = 'Code détecté (ou saisie manuelle)';
    else if (ch.type === 'morse') codeLabel.textContent = 'Code déchiffré en morse';
    else if (ch.type === 'talkie') codeLabel.textContent = 'Code reçu par radio';
    else codeLabel.textContent = 'Entrez le code découvert';
  }

  startChallengeDisplay(ch.type || 'libre', ch.code);
  if (ch.animation && ch.animation !== 'none') startChallengeAnim(ch.animation);
  else stopChallengeAnim();

  const themeIdx = (ch.theme !== undefined && ch.theme !== '') ? +ch.theme : idx;
  applyTheme(themeIdx);
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
  const inp = document.getElementById('code-input');
  const val = inp.value.trim().toUpperCase();
  const ch  = cfg.challenges[currentChallenge];
  if (val === ch.code.toUpperCase()) {
    // 1. Fermer le clavier immédiatement
    inp.blur();
    revealedDigits.push(ch.digit);
    clearInterval(hintTimer);
    stopChallengeDisplay();
    stopChallengeAnim();
    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 120]);
    // 2. Fake-loader pendant ~1.4s
    _showVerifying(() => {
      flashAccessGranted(() => { playRevealSound(); showReveal(currentChallenge); });
    });
  } else {
    document.getElementById('code-error').textContent = '✗ Code incorrect — réessayez';
    inp.value = '';
    inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
    setTimeout(() => inp.classList.remove('shake'), 500);
    playErrorSound();
    if (navigator.vibrate) navigator.vibrate(400);
    setTimeout(() => { document.getElementById('code-error').textContent = ''; }, 2000);
  }
}

let _verifyTmr = null;
function _showVerifying(onDone) {
  const btn = document.getElementById('code-submit');
  const err = document.getElementById('code-error');
  const inp = document.getElementById('code-input');
  if (btn) { btn.disabled = true; btn.textContent = 'VÉRIFICATION…'; btn.classList.add('verifying'); }
  if (err) err.textContent = '';
  if (inp) inp.disabled = true;

  let dots = 0;
  const frames = ['ANALYSE EN COURS·', 'ANALYSE EN COURS··', 'ANALYSE EN COURS···', 'DÉCHIFFREMENT·', 'DÉCHIFFREMENT··', 'DÉCHIFFREMENT···', 'ACCÈS SERVEUR···', 'VALIDATION···'];
  let fi = 0;
  _verifyTmr = setInterval(() => {
    if (btn) btn.textContent = frames[fi % frames.length];
    fi++;
  }, 180);

  setTimeout(() => {
    clearInterval(_verifyTmr);
    if (btn) { btn.disabled = false; btn.textContent = 'Valider ▶'; btn.classList.remove('verifying'); }
    if (inp) inp.disabled = false;
    onDone();
  }, 1400);
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
  setTimeout(() => { el.classList.remove('show'); if (onDone) onDone(); }, 740);
}

function showReveal(arrayIdx) {
  const ri     = _realIdx(arrayIdx);
  const n      = _realCount();
  const remainingReal = cfg.challenges.slice(arrayIdx + 1).filter(c => c.type !== 'pause').length;
  const isLast = remainingReal === 0;

  const digitEl = document.getElementById('reveal-digit-big');
  digitEl.textContent = '?';
  const slots = Array.from({length: n}, (_, i) => {
    const prevRev = i < ri;
    return `<div class="code-slot${(prevRev || i === ri) ? ' revealed' : ''}" id="rslot-${i}">${prevRev ? revealedDigits[i] : '?'}</div>`;
  }).join('');
  document.getElementById('partial-code').innerHTML =
    `<div class="partial-label">Code de désarmement</div><div class="partial-slots">${slots}</div>`;
  document.getElementById('reveal-label').textContent =
    isLast ? '⬛ Code de désarmement — complet !' : `⬛ Chiffre ${ri + 1} récupéré !`;
  document.getElementById('reveal-status').textContent =
    isLast ? 'Mémorisez ce code. Prêts à désamorcer ?' : `Plus que ${remainingReal} épreuve${remainingReal > 1 ? 's' : ''}.`;
  const btn = document.getElementById('reveal-next-btn');
  btn.textContent = isLast ? '▶ Désamorcer maintenant' : '▶ Épreuve suivante';
  syncRevealTimer();
  btn.disabled = true;
  btn.style.opacity = '0.35';
  showPhase('phase-reveal');
  setTimeout(() => { btn.disabled = false; btn.style.opacity = ''; }, 1200);
  matrixReveal(digitEl, revealedDigits[ri], () => {
    const slot = document.getElementById('rslot-' + ri);
    if (slot) slot.textContent = revealedDigits[ri];
    playRevealSound();
  });
}

function matrixReveal(el, finalChar, onDone) {
  const chars = '0123456789';
  let count = 0; const total = 32;
  el.classList.remove('digit-locked');
  playDecodeSound();
  function step() {
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    count++;
    const delay = count < 10 ? 45 : count < 20 ? 75 : count < 28 ? 130 : 220;
    if (count < total) {
      setTimeout(step, delay);
    } else {
      el.textContent = finalChar;
      el.classList.add('digit-locked');
      if (onDone) setTimeout(onDone, 280);
    }
  }
  step();
}

function advanceFromReveal() {
  const nextIdx = currentChallenge + 1;
  if (nextIdx >= cfg.challenges.length) { startFinalCountdown(); return; }
  triggerPhaseFlash(() => {
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    currentChallenge = nextIdx;
    showNextItem(nextIdx);
  });
}
