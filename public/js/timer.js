// ══ TIMER — horloges de mission ════════════════════════

function globalTick() {
  secondsLeft = Math.max(0, secondsLeft - 1);
  updateMiniTimer(); syncRevealTimer(); syncPauseTimer();
  updateAmbientIntensity();
  if (secondsLeft <= 30 && secondsLeft > 0) playTick(secondsLeft <= 10);
  if (secondsLeft === 0) { clearInterval(countdownTimer); stopAmbientMusic(); triggerExplosion(); }
  if (secondsLeft % 10 === 0) saveSession();
}

function applyTimerStyle(el, pb, s) {
  const c = timerCls(s);
  if (el) { el.className = 't-' + c; el.textContent = timerText(s); }
  if (pb) { pb.style.width = (s/totalSeconds*100)+'%'; pb.className = 'bar-' + c; }
}
function updateMiniTimer()  { applyTimerStyle(document.getElementById('timer-sm'),      document.getElementById('progress-bar'),      secondsLeft); }
function syncRevealTimer()  { applyTimerStyle(document.getElementById('timer-sm-rev'),  document.getElementById('progress-bar-rev'),  secondsLeft); }
function syncPauseTimer()   { applyTimerStyle(document.getElementById('timer-sm-pause'),document.getElementById('progress-bar-pause'),secondsLeft); }

function startFinalCountdown() {
  clearInterval(countdownTimer);
  resetTheme();
  // Generate PIN dots based on actual challenge count
  const pinDotsEl = document.querySelector('.pin-dots');
  if (pinDotsEl) {
    pinDotsEl.innerHTML = Array.from({length: _realCount()}, (_, i) =>
      `<div class="pin-dot" id="d${i}"></div>`).join('');
  }
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
  if (secondsLeft >= 1 && secondsLeft <= 10) playVocalCountdown(secondsLeft);
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
