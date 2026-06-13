// ══ MAIN — init ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  startSplashRotation();
  initBgArtefacts();
  tryResume();
});

window.addEventListener('storage', e => {
  if (e.key === 'agent_config') {
    reloadCfg();
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
