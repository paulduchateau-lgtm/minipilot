// ═══════════════════════════════════════════════
// DATABASE SCHEMA
// ═══════════════════════════════════════════════

export const DB_SCHEMA = {
  name: "mutuelle_entreprise_db",
  engine: "PostgreSQL 16",
  tables: [
    {
      name: "entreprises",
      columns: ["id","raison_sociale","siret","secteur_activite","effectif","ville","region","date_adhesion","convention_collective"],
    },
    {
      name: "contrats_collectifs",
      columns: ["id","entreprise_id","formule","niveau_couverture","prime_mensuelle_par_salarie","nb_beneficiaires","date_effet","date_fin","statut","taux_participation_employeur"],
    },
    {
      name: "beneficiaires",
      columns: ["id","contrat_id","entreprise_id","nom","prenom","date_naissance","sexe","lien_parente","csp","anciennete_mois","ville","code_postal"],
    },
    {
      name: "prestations",
      columns: ["id","beneficiaire_id","contrat_id","date_soin","poste_soin","acte","montant_depense","base_remboursement_ro","montant_ro","montant_complementaire","reste_a_charge","praticien_secteur"],
    },
    {
      name: "arrets_travail",
      columns: ["id","beneficiaire_id","contrat_id","date_debut","date_fin","motif","nb_jours","ij_versees"],
    },
    {
      name: "cotisations",
      columns: ["id","contrat_id","mois","annee","montant_part_employeur","montant_part_salarie","montant_total","statut_paiement"],
    },
  ],
};
