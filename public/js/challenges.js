// ══ CHALLENGES — flow des épreuves ═════════════════════

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
  if (ch.animation && ch.animation !== 'none') playChallengeAmbient(ch.animation);

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

  const raw = ch.title.split('—');
  const displayTitle = (raw[1] || ch.title).trim().toUpperCase();
  setTimeout(() => matrixName(titleEl, displayTitle, null), 1100);

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

  const banner = document.getElementById('ch-team-banner');
  if (ch.teamPlay && agents.length >= 2) {
    const team = idx % 2 === 0 ? 'ombre' : 'cobra';
    banner.textContent = `▶ ${team === 'ombre' ? 'ÉQUIPE OMBRE' : 'ÉQUIPE COBRA'}`;
    banner.className = 'ch-team-banner ' + team;
    banner.style.display = '';
  } else {
    banner.style.display = 'none';
  }
  document.getElementById('code-input').value      = '';
  document.getElementById('code-error').textContent = '';

  // hint — wall-clock based for background resistance
  clearInterval(hintTimer); hintSeconds = 0;
  const hz   = document.getElementById('hint-zone');
  const hb   = document.getElementById('hint-box');
  const hbtn = document.getElementById('hint-btn');
  hb.classList.remove('visible'); hb.textContent = '';
  hbtn.style.display = 'none';
  if (ch.hint) {
    hz.classList.add('visible');
    const WAIT = 180;
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

  startChallengeDisplay(ch.type || 'libre', ch.code);
  if (ch.animation && ch.animation !== 'none') startChallengeAnim(ch.animation);
  else stopChallengeAnim();

  // thème : priorité à ch.theme si défini, sinon auto par index
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
  const val = document.getElementById('code-input').value.trim().toUpperCase();
  const ch  = cfg.challenges[currentChallenge];
  if (val === ch.code.toUpperCase()) {
    revealedDigits.push(ch.digit);
    clearInterval(hintTimer);
    stopChallengeDisplay();
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
  setTimeout(() => { el.classList.remove('show'); if (onDone) onDone(); }, 740);
}

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
  btn.disabled = true;
  btn.style.opacity = '0.35';
  showPhase('phase-reveal');
  setTimeout(() => { btn.disabled = false; btn.style.opacity = ''; }, 2500);
  matrixReveal(digitEl, revealedDigits[idx], () => {
    const slot = document.getElementById('rslot-'+idx);
    if (slot) slot.textContent = revealedDigits[idx];
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
  const isLast = currentChallenge === cfg.challenges.length - 1;
  if (isLast) { startFinalCountdown(); return; }
  triggerPhaseFlash(() => {
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    showChallengeWithIntro(++currentChallenge);
  });
}
