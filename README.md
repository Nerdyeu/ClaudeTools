# ClaudeTools

Collection de prompts système et d'outils réutilisables pour Claude, plus une
**app web** pour les utiliser en chat.

## App — discuter avec les outils

| Dossier | Description |
| --- | --- |
| [`app/`](app/) | Plateforme web : on choisit un outil et on lui parle directement (chat en streaming via l'API Claude). La clé API reste côté serveur. Démarrage : `cd app && npm install && cp .env.example .env && npm run dev` → http://localhost:3000. Voir [`app/README.md`](app/README.md). |

## Prompts

| Fichier | Usage |
| --- | --- |
| [`prompts/studio-creation-mode-consultant.md`](prompts/studio-creation-mode-consultant.md) | Studio de création (mode consultant) — binôme directeur de création + stratège de contenu. Spécialités : vidéo, sites web / landing pages, idées & stratégie. Diagnostique avant de produire. À coller comme instruction système ou instructions d'un Projet Claude. |

## Sites

| Dossier | Description |
| --- | --- |
| [`site/`](site/) | **SIGNAL** — site vitrine du studio de création (dark premium, animé, responsive). Full-service vidéo · web · stratégie. HTML/CSS/JS pur, sans framework. Ouvre `site/index.html` dans un navigateur pour le prévisualiser. |

## Comment utiliser un prompt

1. Ouvre le fichier `.md` du prompt voulu.
2. Copie l'intégralité du contenu.
3. Colle-le dans les instructions système d'un Projet Claude (ou en début de conversation).
4. Lance l'outil en décrivant simplement ce que tu veux créer.
