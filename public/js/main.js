// ══ MAIN — init ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const tapEl = document.getElementById('splash-tap');
  if (tapEl) { tapEl.textContent = '· chargement ·'; tapEl.style.animation = 'blink2 .6s step-end infinite'; }
  await pullConfigRemote();
  applyCfgToSplash();
  initTestMode();
  startSplashRotation();
  initBgArtefacts();
  if (tapEl) { tapEl.textContent = '▶ appuyer pour commencer'; tapEl.style.animation = ''; }
  tryResume();
  document.body.classList.add('hue-cycle');
});

function applyCfgToSplash() {
  const name = document.getElementById('splash-name');
  if (name) name.textContent = cfg.missionName || 'HELIE10';
  const dur = document.getElementById('splash-duration');
  if (dur) {
    const m = Math.round(cfg.duration / 60);
    dur.textContent = `Durée mission : ${m} min`;
  }
}

// Poll remote toutes les 3s (hors mission active)
let _lastRemoteCfgHash = '';
setInterval(async () => {
  if (currentPhase === 'phase-success' || currentPhase === 'phase-explosion') return;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const text = await res.text();
    if (text === _lastRemoteCfgHash) return;
    _lastRemoteCfgHash = text;
    const data = JSON.parse(text);
    if (!data?.challenges) return;
    localStorage.setItem('agent_config', JSON.stringify(data));
    reloadCfg();
    applyCfgToSplash();
    onCfgSync();
    showAdminSyncBanner();
  } catch(e) {}
}, 3000);

window.addEventListener('storage', e => {
  if (e.key === 'agent_config') {
    reloadCfg();
    applyCfgToSplash();
    onCfgSync();
    showAdminSyncBanner();
  }
});

function showAdminSyncBanner() {
  let b = document.getElementById('admin-sync-banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'admin-sync-banner';
    b.textContent = '⬛ Config mise à jour depuis le backoffice';
    document.body.appendChild(b);
  }
  b.classList.add('visible');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('visible'), 3000);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
