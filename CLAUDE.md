@../CLAUDE.md

# Pilot — CLAUDE.md
**REF-DS/CLAUDE/PILOT v1.0**

## Identité

- **Code agent :** AG001
- **Tier design :** T2 — Product
- **Couleur accent :** Amber `#C4872E` (`--color-amber`)
- **Périmètre :** Upload data → analyse → rapports via chatbot

## Stack technique

| Couche | Tech |
|--------|------|
| Frontend | React + Vite (`pilot/app/`) |
| Backend | Express.js (`pilot/server/`) |
| DB | LibSQL (Turso) |
| LLM | Anthropic SDK + Mistral |
| Build | Vite |

## Structure

```
pilot/
├── app/          ← Frontend React
│   ├── src/
│   │   ├── components/
│   │   ├── styles/tokens.css   ← À MIGRER vers @liteops/ds
│   │   └── ...
└── server/       ← API Express
```

## État de migration design

⚠️ **tokens.css actuel est LiteChange legacy** — tokens `--lc-*`, IBM Plex Mono, Source Serif 4.
Voir `@liteops/ds/tokens/colors.ts` → `legacyMapping` pour la table de correspondance.

### À faire lors de la migration
1. Remplacer `pilot/app/src/styles/tokens.css` par `import '@liteops/ds/tokens/all.css'`
2. Supprimer `IBM Plex Mono` et `Source Serif 4` des imports Google Fonts
3. Remplacer `--lc-*` → `--color-*` dans tous les composants
4. Remplacer `--font-data` → `var(--font-mono)`
5. Remplacer `--lc-lite-400` → `var(--color-green)` (et ajuster le ton)
6. Supprimer toute référence à `#4A90B8` (bleu signal)
7. Vérifier que les accents Pilot utilisent `--color-amber`

## Conventions spécifiques

- Les rapports générés portent un numéro REF : `REF-RPT/YYYYMMDD-XXX`
- Les modules Pilot sont préfixés : `AG001-RI` (Risques), `AG001-RH` (Data RH)
- L'interface chatbot suit le style T2 : bulles utilisateur sur fond `--color-dark`, réponses sur fond `--color-paper`
