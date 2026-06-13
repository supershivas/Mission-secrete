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

// Poll remote toutes les 30s (hors mission active)
setInterval(async () => {
  if (['phase-splash', 'phase-names', 'phase-teams'].includes(currentPhase)) {
    const updated = await pullConfigRemote();
    if (updated) { applyCfgToSplash(); showAdminSyncBanner(); }
  }
}, 30000);

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
