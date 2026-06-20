// ══ RESUME — reprise de session ════════════════════════

function tryResume() {
  const s = loadSession();
  if (!s || !RESUMABLE_PHASES.includes(s.phase)) return;
  agents           = s.agents || [];
  currentChallenge = s.currentChallenge || 0;
  revealedDigits   = s.revealedDigits || [];
  secondsLeft      = s.secondsLeft || cfg.duration;
  totalSeconds     = s.totalSeconds || cfg.duration;
  missionStart     = s.missionStart || Date.now();
  document.getElementById('resume-text').textContent =
    `Mission en cours — Épreuve ${currentChallenge+1} — ${timerText(secondsLeft)} restant`;
  document.getElementById('resume-banner').classList.add('visible');
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
  // Restore challenge theme immediately to avoid flash of default green
  if (['phase-challenge','phase-reveal'].includes(s.phase)) {
    const ch = cfg.challenges[currentChallenge];
    const themeIdx = (ch?.theme !== undefined && ch?.theme !== '') ? +ch.theme : currentChallenge;
    applyTheme(themeIdx);
  }
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
