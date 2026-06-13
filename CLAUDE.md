# HELIE10 — Mission Agent Secret

PWA d'anniversaire pour enfants (~10 ans) sur thème espion soviétique.
Déployée sur Vercel, utilisée sur iPad en mode plein écran.

## Stack

Vanilla HTML/CSS/JS — zéro framework, zéro dépendance npm.
Sons générés via Web Audio API (pas de fichiers audio).
Persistance : `localStorage` (config) + `sessionStorage` (état de session).
PDF : généré via ReportLab Python (script `make_pdf.py` à la racine).

## Structure

```
public/
├── css/style.css          → tout le CSS
├── js/
│   ├── config.js          → DEFAULT_CFG + getCfg() — MODIFIER ICI pour changer épreuves/textes
│   ├── audio.js           → moteur sons (typewriter, reveal, error, tick, explosion, fanfare)
│   ├── artefacts.js       → 9 illustrations ASCII, rotation splash + dérive fond
│   ├── session.js         → save/load/clear sessionStorage, RESUMABLE_PHASES
│   ├── app.js             → toute la logique (phases, timer, pin, score, poison...)
│   └── main.js            → DOMContentLoaded init + service worker
├── index.html             → HTML pur (~170 lignes), charge les 6 scripts
├── admin.html             → backoffice config (thème clair, auth admin007)
├── sw.js                  → service worker PWA (cache agent-v2)
├── manifest.json          → PWA manifest (fullscreen, landscape)
├── carnet-mission.pdf     → carnet imprimable 5 pages (couverture, fiche agent, grilles, poison, notes)
└── icons/                 → icon-192.png, icon-512.png
vercel.json                → rewrites + headers sw.js
make_pdf.py                → script ReportLab pour régénérer le PDF
```

## Flux de l'app

```
Splash (Helie10 + artefacts ASCII rotatifs)
  → Générateur noms d'agents (autant qu'on veut, − supprimer)
  → "Lancer la mission" → timer global démarre en arrière-plan
  → Message machine à écrire + bouton skip discret (⏭)
  → Barre autodestruction 30s → animation glitch plein écran
  → Épreuve 1..N  (code découvert physiquement → saisi dans app → chiffre révélé)
  → Écran révélation (reste affiché jusqu'au tap "Épreuve suivante")
  → Compte à rebours final + pavé PIN 4 chiffres
  → Succès (fanfare + score ★★★) ou Explosion (particules + alarme)
```

## 4 épreuves par défaut

| # | Titre | Accessoire | Code défaut | Chiffre |
|---|-------|-----------|-------------|---------|
| 1 | Scène de crime | Lampe UV + scotch | TRAHISON | 3 |
| 2 | Couloir laser | Fils de laine rouge | COBRA | 7 |
| 3 | Jardin | Message caché dehors | JARDIN | 1 |
| 4 | Poison/Antidote | Sirops + fiche recette | ANTIDOTE | 9 |

PIN final = concaténation des 4 chiffres dans l'ordre → `3719` par défaut.

## Config (localStorage `agent_config`)

```js
{
  duration: 3600,        // secondes
  message: "...",        // texte machine à écrire
  challenges: [{
    title, brief,        // affiché dans l'app
    code,                // ce que les enfants tapent (insensible casse)
    digit,               // 1 chiffre du PIN final
    hint,                // indice après 3min de blocage (vide = désactivé)
    poison               // bool → active animation fiole ASCII
  }]
}
```

Modifiable via `/admin` (mot de passe : `admin007`).
⚠️ La config est stockée sur l'appareil — configurer depuis l'iPad utilisé le jour J.

## Session (sessionStorage `agent_mission_state`)

Sauvegarde toutes les 10s et à chaque changement de phase.
Au refresh : bannière "Reprendre / Abandonner" en bas d'écran.
Compensie automatiquement le temps écoulé pendant le refresh.
Effacée au succès ou à l'explosion.

## Déploiement Vercel

- Output directory : `public`
- Framework : Other
- Push GitHub → redéploiement auto ~20s
- URL admin : `https://ton-app.vercel.app/admin`

## Règles de développement

- Ne jamais toucher à `index.html` sauf pour ajouter une phase HTML
- Modifier uniquement le fichier concerné (CSS → style.css, sons → audio.js, etc.)
- Tester sur Safari iPad (PWA) — attention à l'AudioContext qui nécessite un geste utilisateur
- Le service worker cache les assets → incrémenter `CACHE = 'agent-vX'` dans sw.js après modif JS/CSS
- Pas de `localStorage` dans les artifacts Claude.ai — utiliser variables JS en mémoire pour les previews

## Prochaines améliorations possibles

- [ ] Mode spectateur (TV affiche le chrono en grand)
- [ ] Son ambiance spécifique par épreuve (jardin, labo)
- [ ] QR code comme variante d'épreuve
- [ ] Écran de score plus élaboré (podium, noms des agents)
- [ ] Icônes PWA personnalisées (chapeau ASCII → vrai PNG)
