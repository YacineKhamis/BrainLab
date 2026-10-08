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
js/app.js             navigation (routeur sur le hash), modes, interface, mémoire interactive
js/engine.js          génération + validation + régénération déterministe
js/rng.js             générateur pseudo-aléatoire à graine (cyrb53 + mulberry32), format des graines
js/storage.js         localStorage (try/catch), export / import / effacement
js/stats.js           tableaux, niveau maximal stable, courbes SVG
js/util.js            échappement HTML, aides SVG
js/data/lexique.js    relations et paires des analogies
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
  score?(item, response) → { correct, detail }   // items interactifs (mémoire)
}
```

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

### Tests

Ouvrez `tests/index.html` (ou `tests/?n=100&auto=1`). Le banc génère 1 000 items par
catégorie et par niveau (60 000 au total), revalide chacun, vérifie que la même
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
