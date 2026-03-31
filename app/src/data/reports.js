// ═══════════════════════════════════════════════
// RICH REPORT DEFINITIONS
// Chart colors follow DA: lite-green → signal-blue → warm-orange
// ═══════════════════════════════════════════════

import { Activity, TrendingUp, Heart, AlertTriangle, Users, FileText, Calendar, Clock, Eye, Stethoscope, Building2 } from "lucide-react";

const C = {
  lite:   "#C8FF3C",
  signal: "#4A90B8",
  warm:   "#C45A32",
  warning:"#D4A03A",
  purple: "#8B7EC8",
  success:"#3A8A4A",
};

export const REPORTS = {
  sinistralite_globale: {
    id: "sinistralite_globale",
    title: "Rapport de sinistralité globale",
    subtitle: "Analyse P/C et équilibre technique du portefeuille collectif",
    icon: Activity,
    color: C.warm,
    objective: "Évaluer l'équilibre technique du portefeuille : ratio prestations/cotisations (P/C), évolution mensuelle, identification des postes de soins déficitaires et des entreprises à forte sinistralité.",
    kpis: [
      { label: "Ratio P/C global", value: "87.3%", trend: "+2.1pts", bad: true, icon: Activity },
      { label: "Cotisations encaissées", value: "14.2M €", trend: "+5.4%", bad: false, icon: TrendingUp },
      { label: "Prestations versées", value: "12.4M €", trend: "+8.1%", bad: true, icon: Heart },
      { label: "Marge technique", value: "1.8M €", trend: "-12.3%", bad: true, icon: AlertTriangle },
    ],
    sections: [
      {
        title: "Évolution mensuelle du ratio P/C",
        type: "composed",
        insight: "Le ratio P/C dépasse le seuil critique de 90% en juin et novembre, corrélé aux pics de consommation optique (rentrée) et hospitalisation (hiver). Tendance haussière sur 12 mois : +2.1 points.",
        data: [
          { mois:"Jan", cotisations:1150, prestations:980, ratio:85.2 },
          { mois:"Fév", cotisations:1150, prestations:920, ratio:80.0 },
          { mois:"Mar", cotisations:1180, prestations:1050, ratio:89.0 },
          { mois:"Avr", cotisations:1180, prestations:990, ratio:83.9 },
          { mois:"Mai", cotisations:1200, prestations:1020, ratio:85.0 },
          { mois:"Jun", cotisations:1200, prestations:1110, ratio:92.5 },
          { mois:"Jul", cotisations:1200, prestations:1080, ratio:90.0 },
          { mois:"Aoû", cotisations:1180, prestations:870, ratio:73.7 },
          { mois:"Sep", cotisations:1220, prestations:1100, ratio:90.2 },
          { mois:"Oct", cotisations:1220, prestations:1050, ratio:86.1 },
          { mois:"Nov", cotisations:1220, prestations:1130, ratio:92.6 },
          { mois:"Déc", cotisations:1250, prestations:1080, ratio:86.4 },
        ],
        config: {
          xKey:"mois",
          bars:[
            { key:"cotisations", color:C.signal, name:"Cotisations (k€)" },
            { key:"prestations", color:C.warm, name:"Prestations (k€)" },
          ],
          line:{ key:"ratio", color:C.warning, name:"Ratio P/C (%)" },
        },
      },
      {
        title: "Ratio P/C par poste de soins",
        type: "bar",
        insight: "L'optique (132%) et le dentaire (118%) sont les deux postes structurellement déficitaires. L'hospitalisation reste bien maîtrisée grâce au réseau de soins conventionné.",
        data: [
          { poste:"Hospitalisation", ratio:72 },
          { poste:"Consultations", ratio:81 },
          { poste:"Pharmacie", ratio:78 },
          { poste:"Dentaire", ratio:118 },
          { poste:"Optique", ratio:132 },
          { poste:"Analyses", ratio:64 },
        ],
        config: { xKey:"poste", yKeys:["ratio"], colors:[C.warm] },
      },
      {
        title: "Top 10 entreprises par sinistralité",
        type: "table",
        columns: [
          { key:"rang", label:"#", w:40 },
          { key:"entreprise", label:"Entreprise" },
          { key:"effectif", label:"Effectif", align:"right" },
          { key:"cotisations", label:"Cotisations", align:"right", fmt:"money" },
          { key:"prestations", label:"Prestations", align:"right", fmt:"money" },
          { key:"ratio", label:"P/C", align:"right", fmt:"pct", hl:true },
          { key:"poste_principal", label:"Poste n°1" },
        ],
        data: [
          { rang:1, entreprise:"Logistique Express SAS", effectif:342, cotisations:890000, prestations:1245000, ratio:139.9, poste_principal:"Hospitalisation" },
          { rang:2, entreprise:"BTP Gironde", effectif:567, cotisations:1450000, prestations:1890000, ratio:130.3, poste_principal:"Arrêts de travail" },
          { rang:3, entreprise:"Néo Digital", effectif:89, cotisations:245000, prestations:312000, ratio:127.3, poste_principal:"Optique" },
          { rang:4, entreprise:"Atelier du Meuble", effectif:45, cotisations:112000, prestations:138000, ratio:123.2, poste_principal:"Dentaire" },
          { rang:5, entreprise:"Vignobles Réunis", effectif:234, cotisations:580000, prestations:696000, ratio:120.0, poste_principal:"Pharmacie" },
          { rang:6, entreprise:"Trans Aquitaine", effectif:178, cotisations:456000, prestations:538000, ratio:118.0, poste_principal:"Hospitalisation" },
          { rang:7, entreprise:"Garage Dupont", effectif:23, cotisations:58000, prestations:67000, ratio:115.5, poste_principal:"Consultations" },
          { rang:8, entreprise:"Conseil & Co", effectif:156, cotisations:420000, prestations:479000, ratio:114.0, poste_principal:"Optique" },
          { rang:9, entreprise:"Média Plus", effectif:67, cotisations:178000, prestations:198000, ratio:111.2, poste_principal:"Dentaire" },
          { rang:10, entreprise:"Aéro Sud-Ouest", effectif:412, cotisations:1120000, prestations:1198000, ratio:107.0, poste_principal:"Pharmacie" },
        ],
      },
      {
        title: "Distribution des entreprises par tranche de ratio P/C",
        type: "bar",
        insight: "68% des entreprises ont un ratio P/C < 85%. 12% concentrent l'essentiel du déficit technique.",
        data: [
          { tranche:"< 50%", nb:45 },{ tranche:"50-70%", nb:89 },{ tranche:"70-85%", nb:124 },{ tranche:"85-100%", nb:67 },{ tranche:"100-120%", nb:32 },{ tranche:"> 120%", nb:14 },
        ],
        config: { xKey:"tranche", yKeys:["nb"], colors:[C.purple] },
      },
    ],
  },

  conso_sociodemographique: {
    id: "conso_sociodemographique",
    title: "Consommation par profil sociodémographique",
    subtitle: "Analyse croisée âge × sexe × CSP × poste de soins",
    icon: Users,
    color: C.purple,
    objective: "Comprendre les comportements de consommation de soins selon les caractéristiques sociodémographiques des bénéficiaires, pour ajuster les garanties et la tarification.",
    kpis: [
      { label: "Coût moyen / bénéf.", value: "1 847 €", trend: "+6.2%", bad: true, icon: Users },
      { label: "Bénéficiaires actifs", value: "6 720", trend: "+3.8%", bad: false, icon: Heart },
      { label: "Âge moyen", value: "41.2 ans", trend: "+0.8", bad: false, icon: Calendar },
      { label: "Taux de consommants", value: "78.4%", trend: "+1.2pts", bad: false, icon: Activity },
    ],
    sections: [
      {
        title: "Coût moyen par tranche d'âge et sexe",
        type: "grouped_bar",
        insight: "La tranche 50-59 ans concentre les coûts les plus élevés (2 890€/an). L'écart H/F est marqué sur les 25-39 ans (maternité) et les 60+ (hospitalisation masculine).",
        data: [
          { age:"18-24", hommes:820, femmes:950 },
          { age:"25-34", hommes:1120, femmes:1680 },
          { age:"35-44", hommes:1450, femmes:1720 },
          { age:"45-54", hommes:2340, femmes:2180 },
          { age:"55-59", hommes:2890, femmes:2650 },
          { age:"60+", hommes:3420, femmes:2890 },
        ],
        config: { xKey:"age", yKeys:["hommes","femmes"], colors:[C.signal,C.warm], names:["Hommes","Femmes"] },
      },
      {
        title: "Consommation par poste de soins et CSP",
        type: "table",
        columns: [
          { key:"csp", label:"CSP" },
          { key:"hospitalisation", label:"Hospi.", align:"right", fmt:"eur" },
          { key:"consultations", label:"Consult.", align:"right", fmt:"eur" },
          { key:"pharmacie", label:"Pharma.", align:"right", fmt:"eur" },
          { key:"optique", label:"Optique", align:"right", fmt:"eur" },
          { key:"dentaire", label:"Dentaire", align:"right", fmt:"eur" },
          { key:"total", label:"Total", align:"right", fmt:"eur", hl:true },
        ],
        data: [
          { csp:"Cadres", hospitalisation:580, consultations:420, pharmacie:310, optique:380, dentaire:290, total:1980 },
          { csp:"ETAM", hospitalisation:520, consultations:380, pharmacie:340, optique:310, dentaire:260, total:1810 },
          { csp:"Ouvriers", hospitalisation:680, consultations:350, pharmacie:390, optique:270, dentaire:220, total:1910 },
          { csp:"Apprentis", hospitalisation:180, consultations:290, pharmacie:210, optique:320, dentaire:150, total:1150 },
          { csp:"Conjoints", hospitalisation:490, consultations:410, pharmacie:360, optique:350, dentaire:310, total:1920 },
          { csp:"Enfants", hospitalisation:220, consultations:380, pharmacie:280, optique:290, dentaire:340, total:1510 },
        ],
      },
      {
        title: "Pyramide des âges vs poids dans les prestations",
        type: "composed",
        insight: "Les 45-59 ans représentent 28% des effectifs mais 41% des prestations. Le vieillissement du portefeuille (+0.8 an) explique 40% de la dérive des coûts.",
        data: [
          { tranche:"18-24", effectif:890, cout_moyen:885, pct_prestations:6 },
          { tranche:"25-34", effectif:1340, cout_moyen:1400, pct_prestations:15 },
          { tranche:"35-44", effectif:1680, cout_moyen:1585, pct_prestations:21 },
          { tranche:"45-54", effectif:1450, cout_moyen:2260, pct_prestations:26 },
          { tranche:"55-59", effectif:870, cout_moyen:2770, pct_prestations:19 },
          { tranche:"60+", effectif:490, cout_moyen:3155, pct_prestations:13 },
        ],
        config: {
          xKey:"tranche",
          bars:[
            { key:"effectif", color:C.signal, name:"Effectif" },
            { key:"cout_moyen", color:C.warning, name:"Coût moyen (€)" },
          ],
          line:{ key:"pct_prestations", color:C.warm, name:"% des prestations" },
        },
      },
      {
        title: "Analyse des forts consommateurs",
        type: "table",
        insight: "5% des bénéficiaires = 34% des prestations. Profil type : homme, 52 ans, ouvrier, poste principal hospitalisation.",
        columns: [
          { key:"percentile", label:"Percentile" },
          { key:"nb", label:"Nb bénéf.", align:"right" },
          { key:"pct_eff", label:"% effectif", align:"right" },
          { key:"cout", label:"Coût moyen", align:"right", fmt:"money" },
          { key:"pct_prest", label:"% prestations", align:"right", hl:true },
          { key:"poste", label:"Poste dominant" },
        ],
        data: [
          { percentile:"Top 1%", nb:67, pct_eff:"1%", cout:18450, pct_prest:"14.2%", poste:"Hospitalisation" },
          { percentile:"Top 5%", nb:336, pct_eff:"5%", cout:8920, pct_prest:"34.1%", poste:"Hospitalisation" },
          { percentile:"Top 10%", nb:672, pct_eff:"10%", cout:5680, pct_prest:"47.8%", poste:"Hospi. + Dentaire" },
          { percentile:"Top 25%", nb:1680, pct_eff:"25%", cout:3210, pct_prest:"72.3%", poste:"Mixte" },
          { percentile:"50% restants", nb:3360, pct_eff:"50%", cout:720, pct_prest:"18.9%", poste:"Consultations" },
        ],
      },
    ],
  },

  portefeuille_contrats: {
    id: "portefeuille_contrats",
    title: "Tableau de bord portefeuille contrats",
    subtitle: "Suivi des contrats collectifs, formules et renouvellements",
    icon: FileText,
    color: C.signal,
    objective: "Piloter le portefeuille : répartition par formule, taux de renouvellement, participation employeur, identifier les contrats à risque de résiliation.",
    kpis: [
      { label: "Contrats actifs", value: "371", trend: "+12", bad: false, icon: FileText },
      { label: "Prime moy./salarié", value: "148 €/mois", trend: "+4.8%", bad: false, icon: TrendingUp },
      { label: "Taux renouvellement", value: "91.2%", trend: "-1.8pts", bad: true, icon: Activity },
      { label: "Part employeur moy.", value: "58.4%", trend: "+0.6pts", bad: false, icon: Building2 },
    ],
    sections: [
      {
        title: "Répartition par formule et taille d'entreprise",
        type: "pie_multi",
        insight: "La formule « Équilibre » = 45% du portefeuille. Migration progressive de « Essentielle » vers « Confort » (+18% en 12 mois) — up-selling réussi.",
        data_sets: [
          { label:"Par formule", data:[{ name:"Essentielle", value:78 },{ name:"Équilibre", value:167 },{ name:"Confort", value:98 },{ name:"Premium", value:28 }] },
          { label:"Par taille", data:[{ name:"1-10 sal.", value:145 },{ name:"11-50 sal.", value:128 },{ name:"51-200 sal.", value:67 },{ name:"> 200 sal.", value:31 }] },
        ],
      },
      {
        title: "Évolution cotisations et bénéficiaires",
        type: "composed",
        insight: "Cotisations +5.4% en 12 mois, portées par l'augmentation des bénéficiaires (+3.8%) et la revalorisation tarifaire (+1.5%).",
        data: [
          { mois:"Jan", cotisations:1120, beneficiaires:6240 },{ mois:"Fév", cotisations:1125, beneficiaires:6280 },
          { mois:"Mar", cotisations:1140, beneficiaires:6350 },{ mois:"Avr", cotisations:1140, beneficiaires:6380 },
          { mois:"Mai", cotisations:1155, beneficiaires:6420 },{ mois:"Jun", cotisations:1160, beneficiaires:6450 },
          { mois:"Jul", cotisations:1160, beneficiaires:6480 },{ mois:"Aoû", cotisations:1165, beneficiaires:6500 },
          { mois:"Sep", cotisations:1180, beneficiaires:6580 },{ mois:"Oct", cotisations:1190, beneficiaires:6620 },
          { mois:"Nov", cotisations:1195, beneficiaires:6680 },{ mois:"Déc", cotisations:1210, beneficiaires:6720 },
        ],
        config: {
          xKey:"mois",
          bars:[{ key:"cotisations", color:C.signal, name:"Cotisations (k€)" }],
          line:{ key:"beneficiaires", color:C.lite, name:"Bénéficiaires" },
        },
      },
      {
        title: "Suivi individuel des contrats",
        type: "table",
        columns: [
          { key:"entreprise", label:"Entreprise" },
          { key:"formule", label:"Formule" },
          { key:"effectif", label:"Eff.", align:"right" },
          { key:"prime", label:"Prime/sal.", align:"right", fmt:"eur" },
          { key:"part_empl", label:"Part empl.", align:"right" },
          { key:"ratio", label:"P/C", align:"right", hl:true },
          { key:"echeance", label:"Échéance" },
          { key:"risque", label:"Risque" },
        ],
        data: [
          { entreprise:"Aéro Sud-Ouest", formule:"Premium", effectif:412, prime:210, part_empl:"65%", ratio:"107%", echeance:"Mar 2027", risque:"Moyen" },
          { entreprise:"BTP Gironde", formule:"Confort", effectif:567, prime:172, part_empl:"55%", ratio:"130%", echeance:"Jun 2026", risque:"Élevé" },
          { entreprise:"Néo Digital", formule:"Équilibre", effectif:89, prime:138, part_empl:"70%", ratio:"127%", echeance:"Jan 2027", risque:"Élevé" },
          { entreprise:"Vignobles Réunis", formule:"Confort", effectif:234, prime:156, part_empl:"52%", ratio:"120%", echeance:"Sep 2026", risque:"Moyen" },
          { entreprise:"Conseil & Co", formule:"Premium", effectif:156, prime:198, part_empl:"62%", ratio:"114%", echeance:"Déc 2026", risque:"Moyen" },
          { entreprise:"Logistique Express", formule:"Essentielle", effectif:342, prime:118, part_empl:"50%", ratio:"140%", echeance:"Mar 2026", risque:"Critique" },
        ],
      },
    ],
  },

  absenteisme: {
    id: "absenteisme",
    title: "Rapport arrêts de travail & absentéisme",
    subtitle: "Analyse des indemnités journalières et de la prévoyance",
    icon: Calendar,
    color: C.warning,
    objective: "Suivre les arrêts de travail, identifier les secteurs et profils les plus impactés, évaluer le coût prévoyance pour ajuster les garanties IJ.",
    kpis: [
      { label: "Arrêts indemnisés", value: "1 243", trend: "+8.7%", bad: true, icon: Calendar },
      { label: "Durée moyenne", value: "18.4 j", trend: "+2.1j", bad: true, icon: Clock },
      { label: "IJ versées", value: "2.8M €", trend: "+12.3%", bad: true, icon: TrendingUp },
      { label: "Taux absentéisme", value: "4.7%", trend: "+0.4pts", bad: true, icon: AlertTriangle },
    ],
    sections: [
      {
        title: "Évolution mensuelle des arrêts",
        type: "composed",
        insight: "Pic hivernal en janvier-février. Hausse structurelle de la durée moyenne (+2.1j sur 12 mois) portée par les arrêts longs (> 30 jours).",
        data: [
          { mois:"Jan", nb:142, duree:21.2, ij:310 },{ mois:"Fév", nb:128, duree:19.8, ij:280 },
          { mois:"Mar", nb:108, duree:17.4, ij:220 },{ mois:"Avr", nb:95, duree:16.8, ij:195 },
          { mois:"Mai", nb:88, duree:15.2, ij:175 },{ mois:"Jun", nb:82, duree:14.6, ij:160 },
          { mois:"Jul", nb:78, duree:13.8, ij:148 },{ mois:"Aoû", nb:72, duree:12.5, ij:132 },
          { mois:"Sep", nb:98, duree:16.2, ij:205 },{ mois:"Oct", nb:112, duree:18.6, ij:245 },
          { mois:"Nov", nb:118, duree:20.4, ij:268 },{ mois:"Déc", nb:122, duree:22.1, ij:292 },
        ],
        config: {
          xKey:"mois",
          bars:[{ key:"nb", color:C.warning, name:"Nb arrêts" }],
          line:{ key:"duree", color:C.warm, name:"Durée moy. (j)" },
        },
      },
      {
        title: "Arrêts par secteur d'activité",
        type: "table",
        columns: [
          { key:"secteur", label:"Secteur" },
          { key:"nb", label:"Arrêts", align:"right" },
          { key:"duree", label:"Durée moy.", align:"right" },
          { key:"taux", label:"Taux absent.", align:"right", hl:true },
          { key:"motif", label:"Motif n°1" },
          { key:"cout", label:"Coût IJ", align:"right", fmt:"money" },
        ],
        data: [
          { secteur:"BTP / Construction", nb:312, duree:"24.2j", taux:"7.2%", motif:"TMS / Accident", cout:890000 },
          { secteur:"Transport / Logistique", nb:245, duree:"19.8j", taux:"5.4%", motif:"TMS", cout:620000 },
          { secteur:"Industrie", nb:198, duree:"17.6j", taux:"4.8%", motif:"TMS / Maladie", cout:480000 },
          { secteur:"Services", nb:267, duree:"14.2j", taux:"3.6%", motif:"Burn-out", cout:445000 },
          { secteur:"Commerce", nb:134, duree:"13.8j", taux:"3.2%", motif:"Maladie", cout:230000 },
          { secteur:"Agriculture/Viti.", nb:87, duree:"21.4j", taux:"5.8%", motif:"TMS / Accident", cout:195000 },
        ],
      },
      {
        title: "Répartition par durée d'arrêt",
        type: "grouped_bar",
        insight: "Les arrêts > 30j = 15% des arrêts mais 58% du coût IJ total. Principal levier d'optimisation.",
        data: [
          { duree:"1-7 j", nb:412, pct_cout:8 },{ duree:"8-14 j", nb:298, pct_cout:14 },
          { duree:"15-30 j", nb:245, pct_cout:20 },{ duree:"31-60 j", nb:156, pct_cout:26 },
          { duree:"61-90 j", nb:78, pct_cout:16 },{ duree:"> 90 j", nb:54, pct_cout:16 },
        ],
        config: { xKey:"duree", yKeys:["nb","pct_cout"], colors:[C.warning,C.warm], names:["Nb arrêts","% coût IJ"] },
      },
    ],
  },

  optique_dentaire: {
    id: "optique_dentaire",
    title: "Focus Optique & Dentaire",
    subtitle: "Postes déficitaires — reste à charge et réseau de soins",
    icon: Eye,
    color: C.signal,
    objective: "Analyser en détail les deux postes déficitaires : consommation, reste à charge, réseau de soins, et leviers d'optimisation.",
    kpis: [
      { label: "Dépense optique moy.", value: "412 €", trend: "+7.8%", bad: true, icon: Eye },
      { label: "Dépense dentaire moy.", value: "387 €", trend: "+5.2%", bad: true, icon: Stethoscope },
      { label: "RAC optique moyen", value: "89 €", trend: "+12€", bad: true, icon: TrendingUp },
      { label: "Taux réseau soins", value: "34.2%", trend: "+4.1pts", bad: false, icon: Activity },
    ],
    sections: [
      {
        title: "Coût optique par type d'équipement",
        type: "grouped_bar",
        insight: "Les verres progressifs = 52% de la dépense optique. Le réseau de soins réduit le RAC de 38% en moyenne.",
        data: [
          { type:"Verres simples", depense:180, rac:32 },
          { type:"Verres progressifs", depense:520, rac:145 },
          { type:"Monture", depense:210, rac:65 },
          { type:"Lentilles", depense:340, rac:78 },
        ],
        config: { xKey:"type", yKeys:["depense","rac"], colors:[C.signal,C.warm], names:["Dépense moy.","RAC moyen"] },
      },
      {
        title: "Consommation dentaire par acte",
        type: "table",
        columns: [
          { key:"acte", label:"Acte" },
          { key:"volume", label:"Volume", align:"right" },
          { key:"cout", label:"Coût moy.", align:"right", fmt:"eur" },
          { key:"ro", label:"Remb. RO", align:"right" },
          { key:"rc", label:"Remb. RC", align:"right" },
          { key:"rac", label:"RAC", align:"right", fmt:"eur", hl:true },
        ],
        data: [
          { acte:"Soins conservateurs", volume:3420, cout:85, ro:"70%", rc:"30%", rac:0 },
          { acte:"Détartrage", volume:2890, cout:56, ro:"70%", rc:"30%", rac:0 },
          { acte:"Prothèse céramique", volume:678, cout:750, ro:"10%", rc:"55%", rac:262 },
          { acte:"Implant", volume:234, cout:1850, ro:"0%", rc:"35%", rac:1202 },
          { acte:"Orthodontie adulte", volume:156, cout:1200, ro:"5%", rc:"40%", rac:660 },
          { acte:"Couronne métallique", volume:890, cout:480, ro:"15%", rc:"60%", rac:120 },
        ],
      },
      {
        title: "Évolution mensuelle optique & dentaire",
        type: "area_multi",
        insight: "Pic optique en septembre (rentrée scolaire). Le dentaire montre une tendance haussière régulière.",
        data: [
          { mois:"Jan", optique:180, dentaire:165 },{ mois:"Fév", optique:165, dentaire:158 },
          { mois:"Mar", optique:195, dentaire:172 },{ mois:"Avr", optique:172, dentaire:168 },
          { mois:"Mai", optique:168, dentaire:175 },{ mois:"Jun", optique:210, dentaire:182 },
          { mois:"Jul", optique:185, dentaire:170 },{ mois:"Aoû", optique:145, dentaire:142 },
          { mois:"Sep", optique:280, dentaire:188 },{ mois:"Oct", optique:215, dentaire:195 },
          { mois:"Nov", optique:198, dentaire:190 },{ mois:"Déc", optique:178, dentaire:178 },
        ],
        config: { xKey:"mois", yKeys:["optique","dentaire"], colors:[C.signal,C.warm], names:["Optique (k€)","Dentaire (k€)"] },
      },
    ],
  },
};

export const SHARED_IDS = ["sinistralite_globale","portefeuille_contrats","conso_sociodemographique"];

// ═══════════════════════════════════════════════
// NL Query → Report matching
// ═══════════════════════════════════════════════
export function matchQuery(q) {
  q = q.toLowerCase();
  if (q.includes("sinistral") || q.includes("p/c") || q.includes("ratio") || q.includes("équilibre") || q.includes("equilibre")) return "sinistralite_globale";
  if (q.includes("socio") || q.includes("âge") || q.includes("age") || q.includes("sexe") || q.includes("csp") || q.includes("démograph") || q.includes("profil") || q.includes("consomm")) return "conso_sociodemographique";
  if (q.includes("contrat") || q.includes("portefeuille") || q.includes("formule") || q.includes("renouvell") || q.includes("cotisation") || q.includes("prime")) return "portefeuille_contrats";
  if (q.includes("arrêt") || q.includes("arret") || q.includes("absent") || q.includes("ij") || q.includes("prévoyance") || q.includes("indemnit")) return "absenteisme";
  if (q.includes("optique") || q.includes("dentaire") || q.includes("rac") || q.includes("reste") || q.includes("lunettes") || q.includes("dent")) return "optique_dentaire";
  if (q.includes("prestation") || q.includes("santé") || q.includes("soin")) return "conso_sociodemographique";
  return null;
}
