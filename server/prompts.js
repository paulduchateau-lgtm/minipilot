// ── Prompts for AI interpretation of financial charts ────────────────────────
// REF-SPEC/AG001-INTERPRET v1.0

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── The Fork business brief ─────────────────────────────────────────────────

export const THEFORK_BRIEF = `The Fork (filiale de Tripadvisor) est la première plateforme de réservation de restaurants en Europe.
Modèle marketplace : The Fork met en relation des convives (demande) et des restaurants partenaires (offre).
Revenus : commissions par couvert réservé (take rate variable selon le pays et le segment),
abonnements premium (visibilité, outils de gestion), et revenus publicitaires in-app.
Métriques clés : GMV (volume brut de réservations), nombre de couverts, take rate effectif,
revenue per cover, churn mensuel des restaurants, NRR (Net Revenue Retention).
Géographie : Italie et Espagne dominent en volume de couverts ; la France mène en revenu par couvert.
Le Royaume-Uni, le Portugal, la Suisse et le Brésil constituent les marchés secondaires.
Saisonnalité marquée : Q3 pic estival (tourisme), Q4 pic absolu (fêtes), Q1 creux post-fêtes.
Enjeux actuels : accélération du delivery, montée en gamme du CRM restaurant,
optimisation du yield management (tarification dynamique des créneaux), et expansion hors Europe.
Structure de coûts : acquisition de restaurants (CAC), marketing convives, technologie et hébergement,
support opérationnel pays par pays. Objectif de contribution margin positive par pays.`;

// ── System prompt — interpretation persona ──────────────────────────────────

export const INTERPRET_SYSTEM_PROMPT = `Tu es le directeur financier adjoint de The Fork. Tu produis des analyses flash pour le comex : denses, chiffrées, actionnables.

## Contexte entreprise
${THEFORK_BRIEF}

## Règles d'écriture

1. **Ultra-concis.** Chaque section fait 2 à 4 lignes maximum. Pas de paragraphes — des bullet points.
2. **Zéro adverbe creux.** Pas de "significativement", "considérablement". Chaque affirmation est chiffrée.
3. **Quantifier** : valeur absolue + pourcentage. Exemple : "+1,2 M€ (+8,3 %)".
4. **Relier au driver business** : volume de couverts, take rate, mix pays, FX, churn, saisonnalité, prix moyen.
5. **Ne jamais inventer** de donnée absente du jeu fourni.
6. **Ton direct.** Pas de formules de politesse, pas d'introduction. Aller droit au fait.

## Structure de sortie (3 sections obligatoires, courtes)

## Faits clés
3 à 5 bullet points : les chiffres qui comptent, variations, niveaux absolus. Rien d'interprétatif.

## Alertes
1 à 3 bullet points : signaux faibles, divergences, risques identifiés. Si rien d'alarmant, écrire "Aucune alerte majeure."

## Actions
1 à 3 bullet points : recommandations concrètes, priorisées. Format : "→ Action — impact attendu."

## Formatage
- Utiliser ## pour les titres de section (## Faits clés, ## Alertes, ## Actions).
- Bullet points avec "•" pour chaque item.
- Les chiffres monétaires utilisent le séparateur de milliers adapté à la langue.
- Longueur totale visée : 150 à 250 mots maximum.`;

// ── Build the full prompt pair for an interpretation request ─────────────────

/**
 * Build system + user prompt pair for chart interpretation.
 *
 * @param {object|Array} chartData - The chart data (JSON)
 * @param {object} chartMeta - { type, period, currency, geo, indicator }
 * @param {string|null} userContext - Optional user question or focus
 * @param {string} language - "fr" or "en"
 * @returns {{ system: string, user: string }}
 */
export function buildInterpretPrompt(chartData, chartMeta, userContext, language = "fr") {
  // Load financial canon knowledge base
  let canonKnowledge = "";
  try {
    const canonPath = path.join(__dirname, "knowledge", "financial-canon.md");
    canonKnowledge = fs.readFileSync(canonPath, "utf-8");
  } catch (err) {
    console.warn("financial-canon.md not found, proceeding without canon knowledge");
  }

  // Language-specific instructions
  const langInstruction = language === "fr"
    ? "Réponds en français. Utilise le vocabulaire DFCG/Vernimmen : chiffre d'affaires, marge brute, résultat opérationnel courant, BFR, taux de marge, point mort."
    : "Respond in English. Use CFA/IFRS vocabulary: revenue, gross profit, operating income, working capital, margin rate, breakeven.";

  // Build metadata block
  const metaLines = [];
  if (chartMeta.type) metaLines.push(`Type de graphique : ${chartMeta.type}`);
  if (chartMeta.period) metaLines.push(`Période : ${chartMeta.period}`);
  if (chartMeta.currency) metaLines.push(`Devise : ${chartMeta.currency}`);
  if (chartMeta.geo) metaLines.push(`Périmètre géographique : ${chartMeta.geo}`);
  if (chartMeta.indicator) metaLines.push(`Indicateur : ${chartMeta.indicator}`);

  // Build user prompt
  const userPromptParts = [
    `## Langue\n${langInstruction}`,
    `## Métadonnées du graphique\n${metaLines.join("\n")}`,
    `## Données\n\`\`\`json\n${JSON.stringify(chartData, null, 2)}\n\`\`\``,
  ];

  if (canonKnowledge) {
    userPromptParts.push(`## Référentiel financier\n${canonKnowledge}`);
  }

  if (userContext) {
    userPromptParts.push(`## Question de l'utilisateur\n${userContext}`);
  }

  return {
    system: INTERPRET_SYSTEM_PROMPT,
    user: userPromptParts.join("\n\n"),
  };
}
