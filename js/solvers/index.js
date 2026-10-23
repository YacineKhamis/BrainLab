import matrices from './matrices.js';
import sequences from './sequences.js';
import spatial from './spatial.js';
import logic from './logic.js';
import verbal from './verbal.js';
import memory from './memory.js';
import { similitudes, vocabulaire, information } from './wais-verbal.js';
import cubes from './cubes.js';
import puzzles from './puzzles.js';
import balances from './balances.js';
import { chiffres, lettresChiffres } from './memoire-wais.js';
import arithmetique from './arithmetique.js';
import { symboles, code } from './vitesse.js';

export const SOLVERS = {
  matrices, sequences, spatial, logic, verbal, memory,
  similitudes, vocabulaire, information, cubes, puzzles, balances,
  chiffres, arithmetique, lettresChiffres, symboles, code,
};
