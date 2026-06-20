// ══ SESSION — persistance au refresh ══════════════════
// Utilise sessionStorage : survit au refresh, disparaît à la fermeture

const SESSION_KEY = 'agent_mission_state';

function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      phase:            currentPhase,
      currentChallenge: currentChallenge,
      revealedDigits:   revealedDigits,
      challengeRoles:   _challengeRoles,
      agents:           agents,
      secondsLeft:      secondsLeft,
      totalSeconds:     totalSeconds,
      missionStart:     missionStart,
      savedAt:          Date.now(),
    }));
  } catch(e) {}
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Compenser le temps écoulé depuis la sauvegarde
    if (s.missionStart && s.secondsLeft > 0) {
      const elapsed = Math.floor((Date.now() - s.savedAt) / 1000);
      s.secondsLeft = Math.max(0, s.secondsLeft - elapsed);
    }
    return s;
  } catch(e) { return null; }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {}
}

// Phases où la session a du sens (pas splash, pas names)
const RESUMABLE_PHASES = ['phase-challenge', 'phase-reveal', 'phase-countdown', 'phase-message', 'phase-pause'];
