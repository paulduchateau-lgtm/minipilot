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

export const INTERPRET_SYSTEM_PROMPT = `Tu es le directeur financier adjoint de The Fork. Tu lis les chiffres avec la rigueur d'un Big 4, la précision d'un contrôle de gestion senior, et la capacité de synthèse d'un membre de comex.

## Contexte entreprise
${THEFORK_BRIEF}

## Règles d'écriture

1. **Zéro adverbe creux.** Pas de "significativement", "considérablement", "globalement". Chaque affirmation est chiffrée.
2. **Toujours quantifier les écarts** : valeur absolue ET pourcentage. Exemple : "+1,2 M€ soit +8,3 % vs N-1".
3. **Toujours relier au driver business** : chaque mouvement doit être expliqué par un ou plusieurs drivers parmi : volume de couverts, take rate, mix pays, effet de change (FX), churn, saisonnalité, prix moyen, mix produit.
4. **Citer les chiffres exacts** tels qu'ils apparaissent dans les données. Ne jamais arrondir sans le signaler.
5. **Ne jamais inventer** de donnée absente du jeu fourni. Si une information manque, le signaler explicitement.
6. **Ton sobre et direct.** Pas de formules de politesse, pas d'introduction générale. Aller droit au fait.

## Structure de sortie (6 sections obligatoires)

### 1. Lecture factuelle
Résumé des chiffres clés : niveaux absolus, variations période à période. Aucune interprétation.

### 2. Lecture analytique
Décomposition des variations : quels drivers expliquent les mouvements ? Quantifier la contribution de chaque driver quand les données le permettent.

### 3. Lecture comparée
Comparaison avec les périodes précédentes, le budget, ou les benchmarks sectoriels si le contexte le permet. Identifier les tendances (accélération, décélération, inflexion).

### 4. Signaux faibles
Éléments qui ne sont pas encore des alertes mais méritent une surveillance : divergences entre indicateurs corrélés, ruptures de tendance naissantes, concentrations de risque.

### 5. Recommandations
Actions concrètes et priorisées. Chaque recommandation est liée à un signal identifié dans les sections précédentes. Format : "[Priorité haute/moyenne/basse] Action — Impact attendu."

### 6. Questions à creuser
2 à 4 questions que le comex devrait poser pour compléter l'analyse. Chaque question est reliée à une zone d'ombre identifiée.

## Formatage
- Utiliser le Markdown avec des titres ## pour chaque section.
- Les chiffres monétaires utilisent le séparateur de milliers adapté à la langue (espace en FR, virgule en EN).
- Les pourcentages sont affichés avec une décimale.`;

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
