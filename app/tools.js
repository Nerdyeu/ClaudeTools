// Registre des outils.
//
// Un "outil" = un prompt système + des métadonnées d'affichage.
// Le prompt vit dans le dossier prompts/ à la racine du repo : une seule
// source de vérité, partagée entre la version "à copier" et la version "chat".
//
// Pour AJOUTER un outil :
//   1. Créez votre prompt dans prompts/mon-outil.md
//   2. Ajoutez une entrée dans le tableau `tools` ci-dessous
//   3. Redémarrez le serveur. C'est tout.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function loadPrompt(relPath) {
  return readFileSync(join(repoRoot, relPath), "utf8");
}

export const tools = [
  {
    id: "studio-creation",
    name: "Studio de création",
    tagline: "Vidéo · Web · Stratégie",
    icon: "🎬",
    accent: "#c8f64e",
    description:
      "Un binôme directeur de création + stratège. Diagnostique avant de produire : scripts vidéo, landing pages, concepts et plans d'action.",
    starters: [
      "Un script de Short pour lancer mon produit",
      "Une landing page pour vendre ma formation",
      "3 angles de marque pour me différencier",
    ],
    systemPrompt: loadPrompt("prompts/studio-creation-mode-consultant.md"),
  },
];

const PUBLIC_FIELDS = [
  "id",
  "name",
  "tagline",
  "icon",
  "accent",
  "description",
  "starters",
];

export function publicMeta(tool) {
  const out = {};
  for (const f of PUBLIC_FIELDS) out[f] = tool[f];
  return out;
}

export function getTool(id) {
  return tools.find((t) => t.id === id);
}
