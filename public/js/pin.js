// ══ PIN — saisie du code + score + explosion ════════════

function pressPin(n) {
  const pinLen = cfg.challenges.length;
  if (pinInput.length >= pinLen) return;
  pinInput += n;
  if (navigator.vibrate) navigator.vibrate(28);
  updatePinDots();
  if (pinInput.length === pinLen) setTimeout(checkPin, 150);
}
function delPin() {
  pinInput = pinInput.slice(0, -1); updatePinDots();
  document.getElementById('pin-error').textContent = '';
}
function updatePinDots() {
  const pinLen = cfg.challenges.length;
  for (let i = 0; i < pinLen; i++) {
    const d = document.getElementById('d'+i);
    if (d) d.className = 'pin-dot' + (i < pinInput.length ? ' filled' : '');
  }
}
function checkPin() {
  const correct = revealedDigits.join('');
  const pinLen  = cfg.challenges.length;
  if (pinInput === correct) {
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 200]);
    clearInterval(countdownTimer); stopAmbientMusic();
    clearSession(); showScore(); playFanfare();
  } else {
    if (navigator.vibrate) navigator.vibrate(600);
    document.getElementById('pin-error').textContent = '✗ Code incorrect — accès refusé';
    for (let i = 0; i < pinLen; i++) {
      const d = document.getElementById('d'+i);
      if (d) d.className = 'pin-dot error';
    }
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

  ['score-stars','score-rank','score-time','score-msg'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent=''; el.style.opacity='0'; el.style.animation='none';
  });
  document.getElementById('score-stars').textContent = stars;
  document.getElementById('score-rank').textContent  = rank;
  document.getElementById('score-time').textContent  = `Temps restant : ${timerText(remaining)} — Durée : ${timerText(elapsed)}`;
  document.getElementById('score-msg').textContent   = msg;

  const podium = document.getElementById('score-agents');
  const hasTeams = agents.some(a => a.team);
  if (agents.length > 0) {
    if (hasTeams) {
      podium.innerHTML = ['ombre', 'cobra'].map(team => {
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

  const seq = [
    ['score-stars', 300,  'pop .7s cubic-bezier(.17,.67,.25,1.4) both'],
    ['score-rank',  900,  'pop .8s cubic-bezier(.17,.67,.2,1.5) both'],
    ['score-time',  1500, 'fadein .5s ease both'],
    ['score-msg',   1900, 'fadein .5s ease both'],
  ];
  seq.forEach(([id, delay, anim]) => {
    setTimeout(() => { const el = document.getElementById(id); el.style.opacity=''; el.style.animation=anim; }, delay);
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
