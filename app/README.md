# ClaudeTools — l'app

Une plateforme web où l'on **discute directement** avec chaque outil ClaudeTools.
Chaque outil = un prompt système ; le serveur relaie la conversation vers l'API
Claude **en streaming**, et votre clé API ne quitte jamais le serveur.

## Démarrer en 3 étapes

```bash
cd app
npm install                       # installe express + @anthropic-ai/sdk
cp .env.example .env              # puis collez votre clé dans .env
npm run dev                       # lit .env automatiquement (Node ≥ 20.6)
```

Ouvrez **http://localhost:3000**, choisissez un outil, écrivez.

> Pas de fichier `.env` ? Exportez la variable et lancez `npm start` :
> ```bash
> export ANTHROPIC_API_KEY=sk-ant-...
> npm start
> ```
> Récupérez une clé sur https://console.anthropic.com/

## Comment ça marche

```
Navigateur ──POST /api/chat──▶ server.js ──messages.stream()──▶ API Claude
    ▲                              │
    └───────── SSE (texte) ◀───────┘
```

- `tools.js` — le **registre d'outils**. Chaque outil charge son prompt depuis
  `../prompts/*.md` (source de vérité unique avec la version « à copier »).
- `server.js` — sert l'interface, expose le catalogue, relaie le chat en SSE.
  La clé API est lue côté serveur uniquement.
- `public/` — l'interface (HTML/CSS/JS pur, sans framework).

Modèle utilisé : **`claude-opus-4-8`** (configurable via `CLAUDE_MODEL`).

## Ajouter un outil

1. Écrivez le prompt dans `prompts/mon-outil.md` (à la racine du repo).
2. Ajoutez une entrée dans le tableau `tools` de [`tools.js`](tools.js) :
   ```js
   {
     id: "mon-outil",
     name: "Mon outil",
     tagline: "Sous-titre court",
     icon: "✨",
     accent: "#c8f64e",
     description: "Ce que fait l'outil, en une phrase.",
     starters: ["Exemple de demande 1", "Exemple 2"],
     systemPrompt: loadPrompt("prompts/mon-outil.md"),
   }
   ```
3. Redémarrez. L'outil apparaît dans la barre latérale.

## Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | **Requis** pour le chat. |
| `CLAUDE_MODEL` | `claude-opus-4-8` | Modèle Claude. |
| `MAX_TOKENS` | `8192` | Longueur max d'une réponse. |
| `PORT` | `3000` | Port du serveur. |

## Notes

- `@anthropic-ai/sdk` est en `latest` dans `package.json` — épinglez une version
  si vous voulez des installs reproductibles.
- Pas de base de données : les conversations vivent dans l'onglet, le serveur est
  sans état. Rafraîchir = repartir de zéro.
