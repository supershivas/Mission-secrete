# 🕵️ Mission Secrète — App anniversaire agent secret

## Structure des fichiers

```
agent-secret/
├── public/
│   ├── index.html      ← App principale (l'enfant voit ça)
│   ├── admin.html      ← Backoffice de configuration
│   ├── sw.js           ← Service Worker (PWA offline)
│   ├── manifest.json   ← Manifest PWA
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── vercel.json         ← Config Vercel
└── README.md
```

## Personnalisation

### Mot de passe admin
Dans `admin.html`, ligne ~120 :
```js
const ADMIN_PASSWORD = "admin007";  // ← changer ici
```

### Code secret par défaut
Dans `index.html` et `admin.html` :
```js
const DEFAULT_CONFIG = { code: "1234", ... }
```

### Mot "Helie10" sur l'écran d'accueil
Dans `index.html`, `<div id="splash-name">Helie10</div>`

## Déploiement sur Vercel

### Prérequis
- Compte Vercel (vercel.com)
- Git installé
- Node.js installé (pour `npm i -g vercel`)

### Étapes

**1. Créer un dépôt GitHub**
```bash
cd agent-secret
git init
git add .
git commit -m "Mission secrète — initial"
```
Créer un repo sur github.com, puis :
```bash
git remote add origin https://github.com/TON_USER/agent-secret.git
git push -u origin main
```

**2. Déployer sur Vercel**
Option A — Interface web (recommandé) :
- Aller sur vercel.com → "Add New Project"
- Importer le repo GitHub
- Root Directory : laisser vide (ou `/`)
- Framework : "Other"
- Output Directory : `public`
- Cliquer "Deploy"

Option B — CLI :
```bash
npm i -g vercel
cd agent-secret
vercel --prod
# Répondre : public/ comme output directory
```

**3. Domaine personnalisé (optionnel)**
Dans Vercel → Settings → Domains → ajouter ton domaine.

## Utilisation en PWA sur iPad

1. Ouvrir l'URL dans **Safari** sur iPad
2. Appuyer sur l'icône **Partager** (carré avec flèche)
3. Choisir **"Sur l'écran d'accueil"**
4. Nommer "Mission Secrète" → Ajouter
5. L'app se lance en **plein écran** sans barre Safari ✓

## Backoffice

Accéder à `/admin` (ex: `https://ton-app.vercel.app/admin`)
- Mot de passe : `admin007` (à changer dans le code)
- Modifier le message, le code PIN, la durée
- Les réglages sont sauvegardés localement sur l'appareil

⚠️  Le backoffice utilise localStorage — configurer depuis l'iPad
    qui sera utilisé pour l'anniversaire.
