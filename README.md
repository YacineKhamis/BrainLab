# BrainLab

Plateforme d'entraînement au raisonnement, 100 % statique : matrices visuelles,
suites, visuo-spatial, logique, analogies verbales et mémoire de travail.
Tous les items sont **générés de façon procédurale** à partir d'une graine affichée
(on peut donc rejouer un item précis), puis **validés par un solveur indépendant**
avant d'être affichés : la bonne réponse est unique et chaque distracteur viole au
moins une règle. Tout item ambigu est rejeté puis régénéré.

- HTML, CSS et JavaScript en modules ES natifs : aucune étape de build, aucun framework, aucune dépendance.
- Aucune requête réseau externe (pas de CDN, de police distante, d'analytics ni de cookie).
  Une Content-Security-Policy `default-src 'self'` est déclarée en balise meta.
- Données (historique, niveaux, réglages) uniquement dans le `localStorage`, avec
  export JSON, import JSON et effacement complet.
- Responsive (mobile et ordinateur), thème sombre automatique, figures en SVG générées par le code.
- Aucun score global de type « quotient » : seulement des taux de réussite et des niveaux.

## Aperçu

```
┌ BrainLab   Accueil  Entraînement  Examen  Rejouer  Statistiques ───────────┐
│                                                                            │
│  [Matrices] [4×4] [Niveau 9]                     graine : MAT-09-3fa9c21b  │
│  Quelle figure complète la matrice 4×4 ? Chaque attribut suit sa règle.    │
│                                                                            │
│      ┌────┬────┬────┬────┐                                                 │
│      │▲ ▲ │◆◆  │ ●  │⬟⬟⬟│      ← formes, remplissage, nombre, aiguille,   │
│      ├────┼────┼────┼────┤        point de position, traits, bruit         │
│      │ …  │ …  │ …  │ …  │                                                 │
│      ├────┼────┼────┼────┤                                                 │
│      │ …  │ …  │ …  │ ?  │                                                 │
│      └────┴────┴────┴────┘                                                 │
│   (1)  (2)  (3)  (4)  (5)  (6)  (7)  (8)   ← clic ou touches 1 à 8         │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Entraînement** : pas de chrono. Après chaque réponse, la bonne option est
  surlignée en vert, la mauvaise en rouge, puis s'affiche une explication détaillée :
  matrice complétée avec la case réponse encadrée et, pour chaque règle, un tableau
  des valeurs de l'attribut ; suite complétée avec ses opérations dessinées en arcs ;
  pliage du patron ; étapes intermédiaires des symétries ; table des situations
  compatibles en logique ; frise des réponses en n-back… Une analyse de chaque option
  (issue du solveur) indique quelle règle elle viole.
- **Examen** : 30, 36 ou 40 items de difficulté croissante (niveau 1 → 10), chrono
  global, aucun retour avant la fin, puis correction complète item par item.
- **WAIS-IV** : batterie de subtests calquée sur l’échelle de Wechsler pour adultes,
  en quatre niveaux (facile, moyen, difficile, extrême) — voir plus bas.
- **Rejouer** : saisir une graine (`SEQ-05-0a1b2c3d`) régénère exactement le même item.
- **Statistiques** : réussite par catégorie et par niveau, temps moyen, niveau
  maximal stable (≥ 70 % de réussite sur les 20 derniers items d'un niveau), courbes
  de progression en SVG, boutons « Exporter JSON », « Importer JSON », « Tout effacer ».

## Les six catégories

| Code | Catégorie | Contenu |
|---|---|---|
| MAT | Matrices visuelles | 3×3 puis 4×4 ; règles de progression, rotation, addition, soustraction, OU exclusif, distribution de 3 (ou 4) valeurs, comptage ; une règle par attribut (forme, remplissage, taille, nombre, orientation, position, traits) ; règles qui changent selon la ligne ou la colonne ; bruit visuel. |
| SEQ | Suites | arithmétiques, géométriques, second ordre, opérations alternées (cycles de 2 ou 3), règles imbriquées (différences qui suivent elles-mêmes une règle), récurrences d'ordre 2 et dépendant du rang, 2 ou 3 suites entrelacées, lettres et suites mixtes lettres/nombres, terme manquant au milieu. |
| SPA | Visuo-spatial | rotation mentale 2D (polyominos, pièges miroir), rotation mentale 3D (assemblages de cubes isométriques), patrons de cube à plier (symboles orientés), symétries composées (jusqu'à 6 transformations). |
| LOG | Logique | syllogismes à 3 ou 4 catégories, déduction propositionnelle avec négations multiples, grilles de contraintes (énigmes de type Einstein). |
| VER | Analogies verbales | 17 relations, ~490 paires, du vocabulaire courant (chat → chaton) au vocabulaire érudit (sigillographie → sceaux, Pont-à-Mousson → Mussipontains). |
| MEM | Mémoire de travail | empan de chiffres à l'envers (3 à 12 chiffres), n-back spatial (1 à 7), dual n-back position + lettre (1 à 6). |

## Batterie de type WAIS-IV

Page `#/wais`. Les subtests reprennent la structure de la WAIS-IV (quatre indices),
avec des **items originaux** générés et validés comme le reste de l’application ;
aucun item de l’échelle officielle n’est reproduit. Les subtests sont administrés
dans l’ordre de l’échelle, chacun avec des items de difficulté croissante.

| Indice | Subtest (code de graine) | Format |
|---|---|---|
| ICV — compréhension verbale | Similitudes (SIM) | trouver ce que deux notions ont en commun (choix multiple) |
| | Vocabulaire (VOC) | retrouver la définition d’un mot (choix multiple) |
| | Information (INF) | culture générale (choix multiple) |
| IRP — raisonnement perceptif | Cubes (CUB) | reproduire un motif rouge et blanc avec des blocs, chronométré (interactif) |
| | Matrices (MAT) | les matrices visuelles existantes, avec temps limite |
| | Puzzles visuels (PUZ) | choisir les 3 pièces sur 6 qui reconstituent la figure (interactif) |
| | Balances (BAL, supplémentaire) | équilibrer une balance d’après d’autres balances |
| IMT — mémoire de travail | Mémoire des chiffres (CHI) | ordre direct, inverse et croissant (interactif) |
| | Arithmétique (ARI) | problèmes de calcul mental en temps limité (interactif) |
| | Séquence lettres-chiffres (LCS, supplémentaire) | chiffres croissants puis lettres alphabétiques (interactif) |
| IVT — vitesse de traitement | Symboles (SYM) | une cible est-elle dans le groupe ? 2 minutes, note = bonnes − erreurs |
| | Code (COD) | associer chiffres et symboles selon une clé, 2 minutes |

Quatre niveaux de batterie, qui fixent l’intervalle des niveaux d’items (1 à 10) :

| Niveau | Items | Repère |
|---|---|---|
| Facile | 1 → 3 | items courants, peu d’éléments, temps confortable |
| Moyen | 3 → 6 | l’essentiel de l’échelle adulte |
| Difficile | 5 → 8 | derniers items de l’échelle et au-delà |
| Extrême | 8 → 10 | volontairement au-delà du plafond (cubes 4×4 sans grille, empans de 9-10, 5 formes sur les balances…) |

Règle d’arrêt optionnelle (comme dans l’échelle) : un subtest s’arrête après 3 échecs
consécutifs (2 pour les Cubes). Le résultat affiche un taux de réussite par subtest,
par indice (ICV, IRP, IMT, IVT), les indices composites IAG (ICV + IRP) et ICC
(IMT + IVT), une lecture du profil (points forts et faibles relatifs, homogénéité) et
la correction détaillée de chaque item. **Il n’y a aucun étalonnage : ces taux ne se
convertissent ni en notes standard ni en QI et ne permettent aucun diagnostic.**

Chaque subtest est aussi disponible seul dans l’entraînement adaptatif (groupe
« Subtests de type WAIS-IV » du menu des catégories).

## Échelle de difficulté (10 niveaux)

- **1 à 4** : comparables aux tests en ligne grand public (une ou deux règles, 4 à 6 options).
- **5 à 7** : au-delà du test en ligne de Mensa : trois règles (ou plus) combinées,
  8 options, distracteurs plausibles qui ne violent qu'une seule règle.
- **8 à 10** : volontairement surhumains : 4 à 6 règles simultanées, règles qui
  changent selon la ligne ou la colonne, bruit visuel non pertinent, matrices 4×4,
  distracteurs en arbre équilibré (chaque valeur d'attribut apparaît dans la moitié
  des options : impossible de deviner « par majorité »), n-back ≥ 5, chrono serré.

Difficulté adaptative en entraînement : un succès fait monter d'un niveau, un échec
fait descendre ; une case à cocher permet de verrouiller le niveau.

## Publier sur GitHub Pages, pas à pas

1. Créez un dépôt vide sur GitHub (par exemple `brainlab`), sans README ni licence.
2. Décompressez l'archive, puis dans le dossier obtenu :
   ```bash
   cd brainlab
   git remote add origin https://github.com/<utilisateur>/brainlab.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment** :
   *Source* = **Deploy from a branch**, *Branch* = **main**, dossier **/ (root)**, puis **Save**.
4. Après une à deux minutes, le site est en ligne à
   `https://<utilisateur>.github.io/brainlab/`.
   Les tests sont à `https://<utilisateur>.github.io/brainlab/tests/`.

Le fichier `.nojekyll` désactive Jekyll ; tous les chemins sont relatifs, le site
fonctionne donc dans un sous-dossier.

En local, les modules ES ne se chargent pas depuis `file://` : servez le dossier,
par exemple avec `python3 -m http.server 8000`, puis ouvrez `http://localhost:8000/`.

## Architecture

```
index.html            page unique (CSP default-src 'self')
css/style.css         styles, thème clair/sombre automatique, responsive
js/app.js             navigation (routeur sur le hash), modes, interface, items interactifs, batterie WAIS-IV
js/wais.js            batterie WAIS-IV : indices, subtests, niveaux, construction des séries, scores
js/engine.js          génération + validation + régénération déterministe
js/rng.js             générateur pseudo-aléatoire à graine (cyrb53 + mulberry32), format des graines
js/storage.js         localStorage (try/catch), export / import / effacement
js/stats.js           tableaux, niveau maximal stable, courbes SVG
js/util.js            échappement HTML, aides SVG
js/data/lexique.js    relations et paires des analogies
js/data/wais.js       banques Similitudes, Vocabulaire, Information (paliers 1 à 5)
js/generators/        un générateur par catégorie (+ index.js)
js/solvers/           un solveur par catégorie (+ index.js)
tests/index.html      banc de validation exécutable dans le navigateur
tests/validate.js     logique du banc (utilisable aussi sous Node)
tests/runner.js       affichage du rapport
```

### Graines et reproductibilité

Une graine a la forme `CODE-NIVEAU-HEX` (`MAT-07-3fa9c21b`). Le moteur
(`js/engine.js`) crée un générateur pseudo-aléatoire à partir de `graine#0`, produit
un item et le soumet au solveur. Si l'item est ambigu, il recommence avec
`graine#1`, `graine#2`… La suite des tentatives étant elle-même déterministe, une
graine redonne toujours exactement le même item validé.

### Contrat d'un générateur

Chaque fichier de `js/generators/` exporte par défaut :

```js
{
  id: 'matrices',
  generate(rng, level) → item,           // pur, déterministe pour un rng donné
  renderStimulus(item) → html/svg,
  renderOption(item, i) → html/svg,
  renderExplanation(item) → html,
  score?(item, response) → { correct, detail }   // items interactifs
  mount?(stage, item, ctx) → { collect() }       // items interactifs génériques
}
```

`mount` reçoit `ctx = { later, interval, setKeys, finish(response) }` : minuteries et
raccourcis clavier sont annulés automatiquement à la fin de l’item ; `collect()`
renvoie la réponse partielle quand l’item est interrompu (« Passer », temps écoulé).

Un item contient `category`, `level`, `subtype`, `prompt`, `data` (données propres à
la catégorie), `options`, `answer` (indice de la bonne option), `rules` (explications)
et `timeLimit` (secondes, utilisé par l'examen).

### Contrat d'un solveur

Chaque fichier de `js/solvers/` exporte `solve(item) → { ok, reason?, correct, notes }`.
Les solveurs n'utilisent **pas** les règles déclarées par le générateur :

- **matrices** : pour chaque attribut, une bibliothèque de règles candidates
  (constante, progression par ligne/colonne avec pas propre à chaque ligne,
  distribution, addition, soustraction, OU exclusif, réunion, intersection,
  soustraction de traits) est testée sur les cases visibles ; les règles cohérentes
  donnent l'ensemble des valeurs possibles de la case manquante. Une option est
  admissible si tous ses attributs sont prédits. Il faut exactement une option admissible.
- **suites** : chaque option est insérée dans la suite, qui doit être expliquée en
  entier par un modèle (polynômes, géométrique, récurrences affines, d'ordre 2,
  dépendant du rang, cycles d'opérations, différences imbriquées, suites
  entrelacées) avec au moins deux contraintes vérifiées au-delà de ses paramètres.
- **visuo-spatial** : formes canoniques sous les rotations (4 en 2D, 24 en 3D),
  contrôle de visibilité de chaque cube par rastérisation, repliage indépendant du
  patron et test des 24 orientations du cube, application directe des symétries.
- **logique** : énumération exhaustive des mondes (syllogismes), table de vérité
  complète (propositions), énumération de toutes les répartitions (grilles).
- **analogies** : base de connaissances construite depuis le lexique (avec les liens
  « aussi » vrais mais non utilisés en question) ; l'option doit partager une relation avec l'exemple.
- **mémoire** : recalcul indépendant des cibles, contraintes perceptives (pas de
  chiffre répété consécutivement, pas de triple répétition, taux de cibles 20–42 %).
- **subtests WAIS-IV** : recoupement avec les banques (verbal) ; symétrie et nombre de
  diagonales des Cubes ; pavage exhaustif des 20 triplets de pièces (Puzzles, un seul
  triplet doit convenir) ; noyau exact du système des Balances (poids fixés à un
  facteur près, une seule option de même poids) ; réévaluation en rationnels de
  l’Arithmétique (divisions exactes, données présentes dans l’énoncé) ; clés
  recalculées pour la mémoire et la vitesse (Symboles : au plus une cible par groupe).

### Tests

Ouvrez `tests/index.html` (ou `tests/?n=100&auto=1`). Le banc génère 1 000 items par
catégorie et par niveau (170 000 au total, subtests WAIS-IV compris), revalide chacun, vérifie que la même
graine redonne le même item et que le rendu fonctionne, puis affiche : taux de rejet,
nombre d'items uniques / ambigus, échecs, temps moyen et maximal de génération, motifs de rejet.

## Ajouter une nouvelle règle de génération

Exemple : une règle « progression géométrique du nombre d'éléments » (1, 2, 4) dans les matrices.

1. **Générateur** (`js/generators/matrices.js`) :
   - dans `typesFor()`, ajoutez `'geom'` pour l'attribut `count` ;
   - dans `buildRowGrid()`, construisez la grille (`a, 2a, 4a` par ligne, en restant ≤ 9) ;
   - dans `ruleText()`, ajoutez la phrase d'explication ;
   - si besoin, ajoutez la règle aux `types` des niveaux concernés dans `LEVELS`.
2. **Solveur** (`js/solvers/matrices.js`) : dans `predictLines()`, ajoutez le
   candidat correspondant (toutes les lignes complètes vérifient `c = 2b = 4a` → prédire
   `2 × dernière valeur`). Sans cette étape, le solveur ne reconnaît pas la clé et
   tous les items utilisant la règle seront rejetés : c'est voulu, une règle n'est
   acceptée que si le solveur sait la vérifier.
3. **Tests** : ouvrez `tests/index.html` et vérifiez que la colonne « Ambigus » reste
   à 0 et que le taux de rejet reste raisonnable. Un taux de rejet élevé signale
   que la nouvelle règle entre en conflit avec une autre (deux explications plausibles
   pour deux options différentes).

Le principe est le même pour les autres catégories : une famille dans
`js/generators/sequences.js` (et son modèle dans `explain()` du solveur), un
type d'indice dans `logic.js` (et son évaluation dans le solveur), une relation dans
`js/data/lexique.js` (le solveur la prend en compte automatiquement)…

## Licence

MIT — voir `LICENSE`.
