// ══ MAIN — init ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await pullConfigRemote();
  applyCfgToSplash();
  startSplashRotation();
  initBgArtefacts();
  tryResume();
});

function applyCfgToSplash() {
  const el = document.getElementById('splash-name');
  if (el) el.textContent = cfg.missionName || 'HELIE10';
}

// Poll remote toutes les 3s (hors mission active)
let _lastRemoteCfgHash = '';
setInterval(async () => {
  if (!['phase-splash', 'phase-names', 'phase-teams'].includes(currentPhase)) return;
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
    showAdminSyncBanner();
  } catch(e) {}
}, 3000);

window.addEventListener('storage', e => {
  if (e.key === 'agent_config') {
    reloadCfg();
    applyCfgToSplash();
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
