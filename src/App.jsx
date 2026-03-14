import React, { useEffect, useMemo, useRef, useState } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECES = {
  wp: "♙",
  wr: "♖",
  wn: "♘",
  wb: "♗",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  br: "♜",
  bn: "♞",
  bb: "♝",
  bq: "♛",
  bk: "♚",
};

const AI_NAME = "Strong AI";
const ANALYSIS_ROOT_MOVES = 3;
const QUIESCENCE_DEPTH = 2;
const AI_MOVE_DELAY_MS = 20;

const STRONG_AI_BASE_DEPTH = 4;
const STRONG_AI_ENDGAME_DEPTH = 5;
const STRONG_AI_MAX_ROOT = 14;

const TT_MAX_SIZE = 30000;
const LEGAL_CACHE_MAX = 16000;
const EVAL_CACHE_MAX = 16000;

const GLOBAL_TT = new Map();
const LEGAL_CACHE = new Map();
const EVAL_CACHE = new Map();

const ARMY_OPTIONS = ["normal", "mongolian", "samurai", "spartan", "viking", "hannibal", "persian", "roman"];

const VARIANT_RULES = {
  normal: {
    title: "Normal Chess",
    text: `Standard chess rules.
King: one square any direction.
Queen: any direction any distance.
Rook: horizontal or vertical.
Bishop: diagonal movement.
Knight: L-shape jump ignoring pieces.
Pawn: forward movement, diagonal capture, promotion.`,
  },
  mongolian: {
    title: "Mongolian Chess",
    text: `All non-king pieces are replaced with Knights. The game becomes extremely mobile since knights jump and cannot be blocked.
A Mongolian side also loses immediately if all of its knights are gone.`,
  },
  samurai: {
    title: "Samurai Chess",
    text: `Normal movement rules plus Samurai mechanics.
• You may sacrifice your pieces without spending a turn.
• Capturing a piece of the same type deletes all remaining pieces of that type.
• If the Samurai King captures a piece, all pieces of that type are destroyed.`,
  },
  spartan: {
    title: "Spartan Chess",
    text: `Bishops are replaced by Knights.
Pawns move only one square.
Pawns capture forward or sideways instead of diagonally.`,
  },
  viking: {
    title: "Viking Chess",
    text: `Knights are replaced by Bishops.
Rooks may jump over allied pieces vertically but not horizontally.`,
  },
  hannibal: {
    title: "Hannibal Chess",
    text: `No Queen; instead there is an extra Rook.
Pawns may move both forward and backward.
Pawns cannot promote.
Players may rearrange their back rank before the game begins.`,
  },
  persian: {
    title: "Persian Immortal Chess",
    text: `Captured pieces go to reserve instead of being lost.
On your turn you may resurrect a reserve piece onto one of its starting squares.
After resurrecting, that side also loses its following turn.
Persian Bishops, Rooks, and Queens may move a maximum of 4 squares per turn.
Persian Pawns, Knights, and Kings keep their normal movement rules.`,
  },
  roman: {
    title: "Roman Chess",
    text: `Each side has two Kings instead of a Queen.
Kings may move into attacked squares, but doing so immediately loses.
If either King is captured the game is lost.
One Roman King may castle with a rook.`,
  },
};

const OPENING_BOOK = [
  { name: "King's Pawn Game", moves: ["e2e4"] },
  { name: "Queen's Pawn Game", moves: ["d2d4"] },
  { name: "English Opening", moves: ["c2c4"] },
  { name: "Réti Opening", moves: ["g1f3"] },
  { name: "Sicilian Defense", moves: ["e2e4", "c7c5"] },
  { name: "French Defense", moves: ["e2e4", "e7e6"] },
  { name: "Caro-Kann Defense", moves: ["e2e4", "c7c6"] },
  { name: "Scandinavian Defense", moves: ["e2e4", "d7d5"] },
  { name: "Pirc Defense", moves: ["e2e4", "d7d6"] },
  { name: "Alekhine Defense", moves: ["e2e4", "g8f6"] },
  { name: "Open Game", moves: ["e2e4", "e7e5"] },
  { name: "Ruy Lopez", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"] },
  { name: "Italian Game", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
  { name: "Scotch Game", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4"] },
  { name: "Petrov Defense", moves: ["e2e4", "e7e5", "g1f3", "g8f6"] },
  { name: "Queen's Gambit", moves: ["d2d4", "d7d5", "c2c4"] },
  { name: "Queen's Gambit Declined", moves: ["d2d4", "d7d5", "c2c4", "e7e6"] },
  { name: "Slav Defense", moves: ["d2d4", "d7d5", "c2c4", "c7c6"] },
  { name: "King's Indian Defense", moves: ["d2d4", "g8f6", "c2c4", "g7g6"] },
  { name: "Grünfeld Defense", moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "d7d5"] },
  { name: "Nimzo-Indian Defense", moves: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"] },
  { name: "Dutch Defense", moves: ["d2d4", "f7f5"] },
];

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];
const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];
const ROOK_TABLE = [
  [0, 0, 0, 5, 5, 0, 0, 0],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];
const KING_TABLE_MID = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];
const KING_TABLE_END = [
  [-50, -30, -30, -30, -30, -30, -30, -50],
  [-30, -10, 0, 0, 0, 0, -10, -30],
  [-30, 0, 20, 30, 30, 20, 0, -30],
  [-30, 0, 30, 40, 40, 30, 0, -30],
  [-30, 0, 30, 40, 40, 30, 0, -30],
  [-30, 0, 20, 30, 30, 20, 0, -30],
  [-30, -10, 0, 0, 0, 0, -10, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

const TABLES = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_TABLE_MID,
};

function trimMap(map, max) {
  if (map.size <= max) return;
  const removeCount = Math.floor(max * 0.2);
  let i = 0;
  for (const key of map.keys()) {
    map.delete(key);
    i += 1;
    if (i >= removeCount) break;
  }
}

function clearEngineCaches() {
  GLOBAL_TT.clear();
  LEGAL_CACHE.clear();
  EVAL_CACHE.clear();
}

function yieldToUi() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getColor(piece) {
  return piece ? piece[0] : null;
}

function getType(piece) {
  return piece ? piece[1] : null;
}

function other(color) {
  return color === "w" ? "b" : "w";
}

function isSamuraiCatastropheCapture(state, move) {
  if (!move?.from || move.resurrect || move.sacrifice) return false;

  const attacker = state.board[move.from[0]][move.from[1]];
  const target = state.board[move.to[0]][move.to[1]];
  if (!attacker || !target) return false;

  const attackerColor = getColor(attacker);
  const defenderColor = getColor(target);
  if (attackerColor === defenderColor) return false;

  const attackerArmy = variantForColor(state, attackerColor);
  const defenderArmy = variantForColor(state, defenderColor);
  const attackerType = getType(attacker);
  const targetType = getType(target);

  if (attackerType === "p") return false;

  if (attackerArmy === "samurai" && attackerType === targetType) return true;
  if (attackerArmy === "samurai" && attackerType === "k" && targetType !== "p") return true;
  if (defenderArmy === "samurai" && attackerType === targetType) return true;

  return false;
}

function samuraiCatastrophePenalty(state, move) {
  const moverColor = state.turn;
  const opponentColor = other(moverColor);
  const moverArmy = variantForColor(state, moverColor);
  const opponentArmy = variantForColor(state, opponentColor);

  const result = applyMoveToState(state, move, "q");
  const nextState = buildChildState(state, result);

  let penalty = 0;
  let bonus = 0;

  if (isSamuraiCatastropheCapture(state, move)) {
    const movingPiece = move.from ? state.board[move.from[0]][move.from[1]] : null;
    const movingType = movingPiece ? getType(movingPiece) : null;

    bonus += 2600;

    if (moverArmy === "mongolian" && opponentArmy === "samurai" && movingType === "n") {
      bonus += 3200;
    }
  }

  const opponentMoves = allLegalMoves(nextState, opponentColor);

  for (const reply of opponentMoves) {
    if (!reply.from) continue;

    const attacker = nextState.board[reply.from[0]][reply.from[1]];
    if (!attacker) continue;

    const attackerType = getType(attacker);

    if (isSamuraiCatastropheCapture(nextState, reply)) {
      penalty = Math.max(penalty, 4200);

      if (moverArmy === "mongolian" && opponentArmy === "samurai" && attackerType === "n") {
        penalty = Math.max(penalty, 900000);
      }
    }

    if (moverArmy === "mongolian" && opponentArmy === "samurai") {
      const target = nextState.board[reply.to[0]][reply.to[1]];
      if (attackerType === "n" && target && getColor(target) === moverColor && getType(target) === "n") {
        penalty = Math.max(penalty, 900000);
      }
    }
  }

  return { penalty, bonus };
}

function squareIsGuardedBySamuraiKnight(state, row, col, defenderColor) {
  const defenderArmy = variantForColor(state, defenderColor);
  if (defenderArmy !== "samurai") return false;

  const knightSteps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

  for (const [dr, dc] of knightSteps) {
    const r = row + dr;
    const c = col + dc;

    if (!inBounds(r, c)) continue;

    if (state.board[r][c] === `${defenderColor}n`) {
      return true;
    }
  }

  return false;
}

function coordToAlg(r, c) {
  return `${FILES[c]}${8 - r}`;
}

function pieceClass(piece) {
  if (!piece) return "";
  return getColor(piece) === "w"
    ? "!text-white [text-shadow:0_0_1px_#111,0_1px_0_#111,1px_0_0_#111,-1px_0_0_#111,0_-1px_0_#111]"
    : "!text-neutral-900";
}

function pieceFontStyle() {
  return {
    fontFamily: '"Segoe UI Symbol", "Noto Sans Symbols 2", "Noto Sans Symbols", "DejaVu Sans", serif',
  };
}

function variantLabel(name) {
  if (name === "persian") return "Persian Immortal";
  return variantLabelName(name);
}

function variantLabelName(name) {
  return name === "normal"
    ? "Normal"
    : name === "mongolian"
    ? "Mongolian"
    : name === "samurai"
    ? "Samurai"
    : name === "spartan"
    ? "Spartan"
    : name === "viking"
    ? "Viking"
    : name === "hannibal"
    ? "Hannibal"
    : name === "roman"
    ? "Roman"
    : name === "persian"
    ? "Persian Immortal"
    : name === "worldwar"
    ? "World War"
    : name === "random"
    ? "Random"
    : "Unknown";
}

function variantButtonClass(name, selected = false) {
  let palette;

  switch (name) {
    case "normal":
      palette = selected
        ? "bg-gray-400 text-black border-4 border-black"
        : "bg-white text-black border-4 border-black opacity-40 saturate-50";
      break;
    case "mongolian":
      palette = selected
        ? "bg-amber-400 text-amber-900 border-4 border-amber-800"
        : "bg-amber-400 text-amber-900 border-4 border-amber-800 opacity-40 saturate-50";
      break;
    case "samurai":
      palette = selected
        ? "bg-blue-950 text-yellow-300 border-4 border-yellow-400"
        : "bg-blue-950 text-yellow-300 border-4 border-yellow-400 opacity-40 saturate-50";
      break;
    case "spartan":
      palette = selected
        ? "bg-red-900 text-amber-300 border-4 border-amber-700"
        : "bg-red-900 text-amber-300 border-4 border-amber-700 opacity-40 saturate-50";
      break;
    case "viking":
      palette = selected
        ? "bg-blue-900 text-red-500 border-4 border-red-600"
        : "bg-blue-900 text-red-500 border-4 border-red-600 opacity-40 saturate-50";
      break;
    case "hannibal":
      palette = selected
        ? "bg-green-700 text-purple-300 border-4 border-purple-700"
        : "bg-green-700 text-purple-300 border-4 border-purple-700 opacity-40 saturate-50";
      break;
    case "persian":
      palette = selected
        ? "bg-purple-600 text-gray-200 border-4 border-white ring-1 ring-black"
        : "bg-purple-600 text-gray-200 border-4 border-white ring-1 ring-black opacity-40 saturate-50";
      break;
    case "roman":
      palette = selected
        ? "bg-red-800 text-yellow-300 border-4 border-yellow-400"
        : "bg-red-800 text-yellow-300 border-4 border-yellow-400 opacity-40 saturate-50";
      break;
    case "worldwar":
      palette = selected
        ? "bg-neutral-900 text-white border-4 border-black"
        : "bg-neutral-200 text-neutral-900 border-4 border-black opacity-40 saturate-50";
      break;
    case "random":
      palette = selected
        ? "bg-fuchsia-700 text-white"
        : "bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300";
      break;
    default:
      palette = selected
        ? "bg-neutral-900 text-white"
        : "bg-neutral-200 text-neutral-900 border border-neutral-300";
  }

  return `px-4 py-2 rounded-xl font-medium transition-colors ${palette}`;
}

function pickRandomArmy() {
  return ARMY_OPTIONS[Math.floor(Math.random() * ARMY_OPTIONS.length)];
}

function getArmyStartLayout(army, color) {
  const prefix = color;

  if (army === "mongolian") {
    return color === "w"
      ? [
          { row: 6, pieces: Array(8).fill(`${prefix}n`) },
          { row: 7, pieces: [`${prefix}n`, `${prefix}n`, `${prefix}n`, `${prefix}n`, `${prefix}k`, `${prefix}n`, `${prefix}n`, `${prefix}n`] },
        ]
      : [
          { row: 0, pieces: [`${prefix}n`, `${prefix}n`, `${prefix}n`, `${prefix}n`, `${prefix}k`, `${prefix}n`, `${prefix}n`, `${prefix}n`] },
          { row: 1, pieces: Array(8).fill(`${prefix}n`) },
        ];
  }

  const backRank =
    army === "spartan"
      ? [`${prefix}r`, `${prefix}n`, `${prefix}n`, `${prefix}q`, `${prefix}k`, `${prefix}n`, `${prefix}n`, `${prefix}r`]
      : army === "viking"
      ? [`${prefix}r`, `${prefix}b`, `${prefix}b`, `${prefix}q`, `${prefix}k`, `${prefix}b`, `${prefix}b`, `${prefix}r`]
      : army === "hannibal"
      ? [`${prefix}r`, `${prefix}n`, `${prefix}b`, `${prefix}r`, `${prefix}k`, `${prefix}b`, `${prefix}n`, `${prefix}r`]
      : army === "roman"
      ? [`${prefix}r`, `${prefix}n`, `${prefix}b`, `${prefix}k`, `${prefix}k`, `${prefix}b`, `${prefix}n`, `${prefix}r`]
      : [`${prefix}r`, `${prefix}n`, `${prefix}b`, `${prefix}q`, `${prefix}k`, `${prefix}b`, `${prefix}n`, `${prefix}r`];

  if (army === "roman") {
    return color === "w"
      ? [
          { row: 5, pieces: Array(8).fill(`${prefix}p`) },
          { row: 6, pieces: Array(8).fill(`${prefix}p`) },
          { row: 7, pieces: backRank },
        ]
      : [
          { row: 0, pieces: backRank },
          { row: 1, pieces: Array(8).fill(`${prefix}p`) },
          { row: 2, pieces: Array(8).fill(`${prefix}p`) },
        ];
  }

  return color === "w"
    ? [
        { row: 6, pieces: Array(8).fill(`${prefix}p`) },
        { row: 7, pieces: backRank },
      ]
    : [
        { row: 0, pieces: backRank },
        { row: 1, pieces: Array(8).fill(`${prefix}p`) },
      ];
}

function buildBoardFromArmies(whiteArmy = "normal", blackArmy = "normal") {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const layout of getArmyStartLayout(blackArmy, "b")) board[layout.row] = [...layout.pieces];
  for (const layout of getArmyStartLayout(whiteArmy, "w")) board[layout.row] = [...layout.pieces];
  return board;
}

function initialBoard(variant = "normal", whiteArmy = "normal", blackArmy = "normal") {
  if (variant === "worldwar") return buildBoardFromArmies(whiteArmy, blackArmy);
  return buildBoardFromArmies(variant, variant);
}

function countKings(board, color) {
  let count = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === `${color}k`) count += 1;
    }
  }
  return count;
}

function countKnights(board, color) {
  let count = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === `${color}n`) count += 1;
    }
  }
  return count;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === `${color}k`) return [r, c];
    }
  }
  return null;
}

function findKings(board, color) {
  const kings = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === `${color}k`) kings.push([r, c]);
    }
  }
  return kings;
}

function getResurrectionStartSquares(piece) {
  const color = getColor(piece);
  const type = getType(piece);
  const backRow = color === "w" ? 7 : 0;
  const pawnRow = color === "w" ? 6 : 1;

  if (type === "p") return Array.from({ length: 8 }, (_, c) => [pawnRow, c]);
  if (type === "r") return [[backRow, 0], [backRow, 7]];
  if (type === "n") return [[backRow, 1], [backRow, 6]];
  if (type === "b") return [[backRow, 2], [backRow, 5]];
  if (type === "q") return [[backRow, 3]];
  if (type === "k") return [[backRow, 4]];
  return [];
}

function getResurrectionMoves(state, color = state.turn) {
  if (variantForColor(state, color) !== "persian") return [];

  const reserve = state.reserve?.[color] || [];
  const moves = [];

  reserve.forEach((piece, reserveIndex) => {
    const squares = getResurrectionStartSquares(piece);
    squares.forEach(([r, c]) => {
      if (!state.board[r][c]) {
        moves.push({
          resurrect: true,
          piece,
          reserveIndex,
          to: [r, c],
        });
      }
    });
  });

  return moves;
}

function getDefaultHannibalBackRank(color) {
  return color === "w"
    ? ["wr", "wn", "wb", "wr", "wk", "wb", "wn", "wr"]
    : ["br", "bn", "bb", "br", "bk", "bb", "bn", "br"];
}

function nextHannibalSetupPhase(config) {
  if (!config?.worldWar) return null;
  if (config.mode !== "pvp") return null;
  if (config.whiteArmy === "hannibal" && config.phase === "w" && config.blackArmy === "hannibal") return "b";
  return null;
}

function shouldShuffleHannibalBackRank(config, color) {
  if (!config) return false;
  if (color === "w") {
    return config.whiteArmy === "hannibal" && config.mode === "ai" && (config.playerColor || "w") !== "w";
  }
  return config.blackArmy === "hannibal" && config.mode === "ai" && (config.playerColor || "w") !== "b";
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function applyHannibalBackRank(board, color, rankPieces) {
  const next = cloneBoard(board);
  const row = color === "w" ? 7 : 0;
  for (let c = 0; c < 8; c++) next[row][c] = rankPieces[c];
  return next;
}

function getMissingPieces(board, reserve = { w: [], b: [] }, whiteArmy = "normal", blackArmy = "normal") {
  const expectedWhite = {};
  const expectedBlack = {};

  const addExpected = (pieceMap, piece) => {
    pieceMap[piece] = (pieceMap[piece] || 0) + 1;
  };

  for (const layout of getArmyStartLayout(whiteArmy, "w")) {
    for (const piece of layout.pieces) addExpected(expectedWhite, piece);
  }
  for (const layout of getArmyStartLayout(blackArmy, "b")) {
    for (const piece of layout.pieces) addExpected(expectedBlack, piece);
  }

  const currentWhite = {};
  const currentBlack = {};
  const addCurrent = (pieceMap, piece) => {
    pieceMap[piece] = (pieceMap[piece] || 0) + 1;
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if (getColor(piece) === "w") addCurrent(currentWhite, piece);
      else addCurrent(currentBlack, piece);
    }
  }

  for (const piece of reserve.w || []) addCurrent(currentWhite, piece);
  for (const piece of reserve.b || []) addCurrent(currentBlack, piece);

  const buildMissingList = (expected, current) => {
    const missing = [];
    for (const [piece, count] of Object.entries(expected)) {
      const diff = count - (current[piece] || 0);
      for (let i = 0; i < diff; i++) missing.push(piece);
    }
    return missing.sort((a, b) => PIECE_VALUES[getType(b)] - PIECE_VALUES[getType(a)]);
  };

  return {
    w: buildMissingList(expectedWhite, currentWhite),
    b: buildMissingList(expectedBlack, currentBlack),
  };
}

function createInitialState(variant = "normal", whiteArmy = "normal", blackArmy = "normal") {
  return {
    board: initialBoard(variant, whiteArmy, blackArmy),
    turn: "w",
    selected: null,
    legalMoves: [],
    status: "White to move",
    moveHistory: [],
    moveKeys: [],
    moveInsights: [],
    moveSides: [],
    castling: { w: { k: true, q: true }, b: { k: true, q: true } },
    enPassant: null,
    gameOver: false,
    variant,
    whiteArmy,
    blackArmy,
    reserve: { w: [], b: [] },
    skipNext: { w: 0, b: 0 },
    skippedTurns: [],
  };
}

function variantForColor(state, color) {
  if (!state) return "normal";
  if (state.variant === "worldwar") {
    return color === "w" ? state.whiteArmy || "normal" : state.blackArmy || "normal";
  }
  return state.variant || "normal";
}

function hashState(state) {
  const boardKey = state.board.map((row) => row.map((cell) => cell || "__").join("")).join("/");
  const reserveW = (state.reserve?.w || []).join("");
  const reserveB = (state.reserve?.b || []).join("");
  const ep = state.enPassant ? `${state.enPassant[0]}${state.enPassant[1]}` : "-";
  const skipW = state.skipNext?.w || 0;
  const skipB = state.skipNext?.b || 0;
  return `${state.variant || "normal"}|${state.whiteArmy || "-"}|${state.blackArmy || "-"}|${state.turn}|${boardKey}|${ep}|${state.castling.w.k ? "1" : "0"}${state.castling.w.q ? "1" : "0"}${state.castling.b.k ? "1" : "0"}${state.castling.b.q ? "1" : "0"}|${reserveW}|${reserveB}|${skipW}|${skipB}`;
}

function buildChildState(state, result) {
  return {
    ...state,
    board: result.board,
    turn: result.turn,
    castling: result.castling,
    enPassant: result.enPassant,
    reserve: result.reserve || state.reserve,
    skipNext: result.skipNext || state.skipNext,
    skippedTurns: result.skippedTurns || [],
    whiteArmy: state.whiteArmy,
    blackArmy: state.blackArmy,
    variant: state.variant,
  };
}

function isSquareAttacked(board, row, col, byColor, variant = "normal", state = null) {
  const activeArmy = variant === "worldwar" && state ? variantForColor(state, byColor) : variant;

  if (activeArmy === "spartan") {
    const dir = byColor === "w" ? -1 : 1;
    const fromForward = row - dir;
    if (inBounds(fromForward, col) && board[fromForward][col] === `${byColor}p`) return true;
    if (inBounds(row, col - 1) && board[row][col - 1] === `${byColor}p`) return true;
    if (inBounds(row, col + 1) && board[row][col + 1] === `${byColor}p`) return true;
  } else {
    const pawnDir = byColor === "w" ? -1 : 1;
    const pawnRow = row - pawnDir;
    for (const dc of [-1, 1]) {
      const pr = pawnRow;
      const pc = col + dc;
      if (inBounds(pr, pc) && board[pr][pc] === `${byColor}p`) return true;
    }
  }

  const knightSteps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [dr, dc] of knightSteps) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && board[r][c] === `${byColor}n`) return true;
  }

  const sliderMaxRange = activeArmy === "persian" ? 4 : 8;

  const bishopDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dr, dc] of bishopDirs) {
    let r = row + dr;
    let c = col + dc;
    let steps = 0;
    while (inBounds(r, c) && steps < sliderMaxRange) {
      steps += 1;
      const piece = board[r][c];
      if (piece) {
        if (getColor(piece) === byColor && ["b", "q"].includes(getType(piece))) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  const rookDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dr, dc] of rookDirs) {
    let r = row + dr;
    let c = col + dc;
    const isVikingVerticalLine = activeArmy === "viking" && dc === 0;
    let steps = 0;
    while (inBounds(r, c) && steps < sliderMaxRange) {
      steps += 1;
      const piece = board[r][c];
      if (piece) {
        if (getColor(piece) === byColor) {
          const type = getType(piece);
          if (["r", "q"].includes(type)) return true;
          if (isVikingVerticalLine) {
            r += dr;
            c += dc;
            continue;
          }
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c) && board[r][c] === `${byColor}k`) return true;
    }
  }

  return false;
}

function isInCheck(board, color, variant = "normal", state = null) {
  const effectiveVariant = variant === "worldwar" && state ? variantForColor(state, color) : variant;
  const kings = effectiveVariant === "roman" ? findKings(board, color) : [findKing(board, color)].filter(Boolean);
  if (kings.length === 0) return false;
  return kings.some(([r, c]) => isSquareAttacked(board, r, c, other(color), variant, state));
}

function generatePseudoMoves(state, row, col) {
  const { board, castling, enPassant } = state;
  const piece = board[row][col];
  if (!piece) return [];
  const color = getColor(piece);
  const movingArmy = variantForColor(state, color);
  const type = getType(piece);
  const moves = [];

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;

    if (movingArmy === "spartan") {
      const oneStep = row + dir;
      if (inBounds(oneStep, col) && !board[oneStep][col]) moves.push({ from: [row, col], to: [oneStep, col] });
      if (inBounds(oneStep, col) && board[oneStep][col] && getColor(board[oneStep][col]) !== color) {
        moves.push({ from: [row, col], to: [oneStep, col], capture: true });
      }
      for (const dc of [-1, 1]) {
        const sideCol = col + dc;
        if (inBounds(row, sideCol) && board[row][sideCol] && getColor(board[row][sideCol]) !== color) {
          moves.push({ from: [row, col], to: [row, sideCol], capture: true });
        }
      }
      return moves;
    }

    if (movingArmy === "hannibal") {
      const oneForward = row + dir;
      const oneBackward = row - dir;

      if (inBounds(oneForward, col) && !board[oneForward][col]) {
        moves.push({ from: [row, col], to: [oneForward, col] });
        const twoStep = row + 2 * dir;
        if (row === startRow && inBounds(twoStep, col) && !board[twoStep][col]) {
          moves.push({ from: [row, col], to: [twoStep, col], doublePawn: true });
        }
      }

      if (inBounds(oneBackward, col) && !board[oneBackward][col]) {
        moves.push({ from: [row, col], to: [oneBackward, col] });
      }

      for (const dc of [-1, 1]) {
        const nc = col + dc;
        if (!inBounds(oneForward, nc)) continue;
        const target = board[oneForward][nc];
        if (target && getColor(target) !== color) moves.push({ from: [row, col], to: [oneForward, nc], capture: true });
        if (enPassant && enPassant[0] === oneForward && enPassant[1] === nc) {
          moves.push({ from: [row, col], to: [oneForward, nc], enPassant: true, capture: true });
        }
      }
      return moves;
    }

    const oneStep = row + dir;
    if (inBounds(oneStep, col) && !board[oneStep][col]) {
      moves.push({ from: [row, col], to: [oneStep, col] });
      const twoStep = row + 2 * dir;
      if (row === startRow && inBounds(twoStep, col) && !board[twoStep][col]) {
        moves.push({ from: [row, col], to: [twoStep, col], doublePawn: true });
      }
    }

    for (const dc of [-1, 1]) {
      const nr = row + dir;
      const nc = col + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (target && getColor(target) !== color) moves.push({ from: [row, col], to: [nr, nc], capture: true });
      if (enPassant && enPassant[0] === nr && enPassant[1] === nc) {
        moves.push({ from: [row, col], to: [nr, nc], enPassant: true, capture: true });
      }
    }
    return moves;
  }

  if (type === "n") {
    const deltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of deltas) {
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (!target || getColor(target) !== color) moves.push({ from: [row, col], to: [nr, nc], capture: !!target });
    }
    return moves;
  }

  if (["b", "r", "q"].includes(type)) {
    const dirs = [];
    if (type === "b" || type === "q") dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    if (type === "r" || type === "q") dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    const maxRange = movingArmy === "persian" ? 4 : 8;

    for (const [dr, dc] of dirs) {
      let nr = row + dr;
      let nc = col + dc;
      const isVikingVerticalRook = movingArmy === "viking" && type === "r" && dc === 0;
      let steps = 0;
      while (inBounds(nr, nc) && steps < maxRange) {
        steps += 1;
        const target = board[nr][nc];
        if (!target) {
          moves.push({ from: [row, col], to: [nr, nc] });
        } else {
          if (getColor(target) !== color) {
            moves.push({ from: [row, col], to: [nr, nc], capture: true });
            break;
          }
          if (isVikingVerticalRook) {
            nr += dr;
            nc += dc;
            continue;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    return moves;
  }

  if (type === "k") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (!target || getColor(target) !== color) moves.push({ from: [row, col], to: [nr, nc], capture: !!target });
      }
    }

    const homeRow = color === "w" ? 7 : 0;
    const canConsiderCastling = movingArmy === "roman"
      ? row === homeRow && col === 4
      : (!isInCheck(board, color, state.variant, state) && row === homeRow && col === 4);

    if (canConsiderCastling) {
      if (
        castling[color].k &&
        !board[homeRow][5] &&
        !board[homeRow][6] &&
        board[homeRow][7] === `${color}r` &&
        (movingArmy === "roman" || (!isSquareAttacked(board, homeRow, 5, other(color), state.variant, state) && !isSquareAttacked(board, homeRow, 6, other(color), state.variant, state)))
      ) {
        moves.push({ from: [row, col], to: [homeRow, 6], castle: "k" });
      }
      if (
        castling[color].q &&
        !board[homeRow][1] &&
        !board[homeRow][2] &&
        !board[homeRow][3] &&
        board[homeRow][0] === `${color}r` &&
        (movingArmy === "roman" || (!isSquareAttacked(board, homeRow, 3, other(color), state.variant, state) && !isSquareAttacked(board, homeRow, 2, other(color), state.variant, state)))
      ) {
        moves.push({ from: [row, col], to: [homeRow, 2], castle: "q" });
      }
    }
  }

  return moves;
}

function applyPendingSkips(state) {
  const skipNext = {
    w: state.skipNext?.w || 0,
    b: state.skipNext?.b || 0,
  };
  let turn = state.turn;
  const skippedTurns = [];
  let safety = 0;

  while (skipNext[turn] > 0 && safety < 4) {
    if (isInCheck(state.board, turn, state.variant || "normal", state)) {
      skipNext[turn] -= 1;
      break;
    }
    skipNext[turn] -= 1;
    skippedTurns.push(turn);
    turn = other(turn);
    safety += 1;
  }

  return {
    ...state,
    turn,
    skipNext,
    skippedTurns,
  };
}

function applyMoveToState(state, move, promotionChoice = "q") {
  const board = cloneBoard(state.board);
  const reserve = {
    w: [...(state.reserve?.w || [])],
    b: [...(state.reserve?.b || [])],
  };
  const skipNext = {
    w: state.skipNext?.w || 0,
    b: state.skipNext?.b || 0,
  };

  const [fr, fc] = move.from || [-1, -1];
  const [tr, tc] = move.to;
  const piece = move.resurrect ? move.piece : board[fr][fc];
  const color = getColor(piece);
  const type = getType(piece);
  const originalTarget = board[tr][tc];

  const newCastling = {
    w: { ...state.castling.w },
    b: { ...state.castling.b },
  };

  if (move.resurrect) {
    board[tr][tc] = piece;
    reserve[color].splice(move.reserveIndex, 1);
    skipNext[color] += 1;
    return applyPendingSkips({
      ...state,
      board,
      turn: other(color),
      castling: newCastling,
      enPassant: null,
      massDelete: null,
      reserve,
      skipNext,
    });
  }

  if (piece === "wk") { newCastling.w.k = false; newCastling.w.q = false; }
  if (piece === "bk") { newCastling.b.k = false; newCastling.b.q = false; }
  if (fr === 7 && fc === 0 && piece === "wr") newCastling.w.q = false;
  if (fr === 7 && fc === 7 && piece === "wr") newCastling.w.k = false;
  if (fr === 0 && fc === 0 && piece === "br") newCastling.b.q = false;
  if (fr === 0 && fc === 7 && piece === "br") newCastling.b.k = false;
  if (tr === 7 && tc === 0 && board[tr][tc] === "wr") newCastling.w.q = false;
  if (tr === 7 && tc === 7 && board[tr][tc] === "wr") newCastling.w.k = false;
  if (tr === 0 && tc === 0 && board[tr][tc] === "br") newCastling.b.q = false;
  if (tr === 0 && tc === 7 && board[tr][tc] === "br") newCastling.b.k = false;

  board[fr][fc] = null;

  if (move.sacrifice) {
    return applyPendingSkips({
      ...state,
      board,
      turn: color,
      castling: newCastling,
      enPassant: null,
      massDelete: null,
      reserve,
      skipNext,
    });
  }

  let capturedPiece = originalTarget;
  if (move.enPassant) {
    const captureRow = color === "w" ? tr + 1 : tr - 1;
    capturedPiece = board[captureRow][tc];
    board[captureRow][tc] = null;
  }

  if (move.castle === "k") {
    board[tr][tc] = piece;
    board[tr][5] = board[tr][7];
    board[tr][7] = null;
  } else if (move.castle === "q") {
    board[tr][tc] = piece;
    board[tr][3] = board[tr][0];
    board[tr][0] = null;
  } else {
    board[tr][tc] = piece;
  }

  let massDelete = null;
  if (originalTarget && getColor(originalTarget) !== color) {
    const targetColor = getColor(originalTarget);
    const targetType = getType(originalTarget);
    const moverArmy = variantForColor(state, color);
    const targetArmy = variantForColor(state, targetColor);
    const removedSquares = [];

    if (moverArmy === "samurai") {
      if (type !== "p" && type !== "k" && targetType === type && findKing(board, color) && findKing(board, targetColor)) {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const otherPiece = board[r][c];
            if (otherPiece && getColor(otherPiece) === targetColor && getType(otherPiece) === type) {
              board[r][c] = null;
              removedSquares.push([r, c]);
            }
          }
        }
      }

      if (type === "k" && targetType !== "p") {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const otherPiece = board[r][c];
            if (otherPiece && getColor(otherPiece) === targetColor && getType(otherPiece) === targetType) {
              board[r][c] = null;
              removedSquares.push([r, c]);
            }
          }
        }
      }
    }

    if (targetArmy === "samurai" && type !== "p" && type !== "k" && targetType === type && findKing(board, targetColor)) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const otherPiece = board[r][c];
          if (otherPiece && getColor(otherPiece) === targetColor && getType(otherPiece) === targetType) {
            board[r][c] = null;
            removedSquares.push([r, c]);
          }
        }
      }
    }

    if (removedSquares.length > 0) {
      const uniqueSquares = [];
      const seen = new Set();
      for (const [rr, cc] of removedSquares) {
        const key = `${rr},${cc}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSquares.push([rr, cc]);
        }
      }
      massDelete = { type: targetType, removedSquares: uniqueSquares, triggeredAt: Date.now() };
    }
  }

  if (type === "p" && (tr === 0 || tr === 7) && variantForColor(state, color) !== "hannibal") {
    board[tr][tc] = `${color}${promotionChoice}`;
  }

  const newEnPassant = move.doublePawn ? [Math.floor((fr + tr) / 2), fc] : null;

  if (variantForColor(state, other(color)) === "persian" && capturedPiece) {
    reserve[getColor(capturedPiece)].push(capturedPiece);
  }

  return applyPendingSkips({
    ...state,
    board,
    turn: other(color),
    castling: newCastling,
    enPassant: newEnPassant,
    massDelete,
    reserve,
    skipNext,
  });
}

function generateLegalMovesForSquare(state, row, col) {
  const piece = state.board[row][col];
  if (!piece || getColor(piece) !== state.turn) return [];

  const pseudo = generatePseudoMoves(state, row, col);
  if (variantForColor(state, state.turn) === "samurai" && getType(piece) !== "k") {
    pseudo.push({ from: [row, col], to: [row, col], sacrifice: true });
  }

  return pseudo.filter((move) => {
    const result = applyMoveToState(state, move, "q");
    if (variantForColor(state, state.turn) === "roman") return true;
    return !isInCheck(result.board, state.turn, state.variant, buildChildState(state, result));
  });
}

function allLegalMoves(state, color = state.turn) {
  const tempState = color === state.turn ? state : { ...state, turn: color };
  const cacheKey = `moves|${hashState(tempState)}`;
  const cached = LEGAL_CACHE.get(cacheKey);
  if (cached) return cached;

  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = tempState.board[r][c];
      if (piece && getColor(piece) === color) {
        moves.push(...generateLegalMovesForSquare(tempState, r, c));
      }
    }
  }

  const resurrectionMoves = getResurrectionMoves(tempState, color).filter((move) => {
    const result = applyMoveToState(tempState, move, "q");
    if (variantForColor(tempState, color) === "roman") return true;
    return !isInCheck(result.board, color, tempState.variant, buildChildState(tempState, result));
  });

  moves.push(...resurrectionMoves);

  LEGAL_CACHE.set(cacheKey, moves);
  trimMap(LEGAL_CACHE, LEGAL_CACHE_MAX);
  return moves;
}

function moveToKey(move) {
  if (move.sacrifice) return `s@${FILES[move.from[1]]}${8 - move.from[0]}`;
  if (move.resurrect) return `r@${move.piece}:${FILES[move.to[1]]}${8 - move.to[0]}`;
  return `${FILES[move.from[1]]}${8 - move.from[0]}${FILES[move.to[1]]}${8 - move.to[0]}`;
}

function moveToNotation(state, move, promotionChoice = "q") {
  if (move.resurrect) {
    return `${PIECES[move.piece]} @ ${coordToAlg(move.to[0], move.to[1])} (resurrect)`;
  }

  const piece = state.board[move.from[0]][move.from[1]];
  if (move.sacrifice) return `${coordToAlg(move.from[0], move.from[1])} (sacrifice)`;

  if (move.castle === "k") return "O-O";
  if (move.castle === "q") return "O-O-O";

  const target = state.board[move.to[0]][move.to[1]];
  const type = getType(piece);
  const from = coordToAlg(move.from[0], move.from[1]);
  const to = coordToAlg(move.to[0], move.to[1]);
  const isCapture = !!target || !!move.enPassant;
  const separator = isCapture ? "x" : "-";

  let notation = `${from}${separator}${to}`;
  if (type === "p" && (move.to[0] === 0 || move.to[0] === 7)) {
    notation += `=${promotionChoice.toUpperCase()}`;
  }
  return notation;
}

function getRomanSelfCheckLoss(board, movedPiece, move, moverColor) {
  if (!movedPiece || getType(movedPiece) !== "k") return null;
  const [tr, tc] = move.to;
  if (isSquareAttacked(board, tr, tc, other(moverColor), "roman")) return moverColor;
  return null;
}

function getRomanKingSafetyScore(board, color) {
  const kings = findKings(board, color);
  let penalty = 0;

  for (const [r, c] of kings) {
    if (isSquareAttacked(board, r, c, other(color), "roman")) {
      penalty += 1400;
    }

    let localThreats = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (isSquareAttacked(board, nr, nc, other(color), "roman")) {
          localThreats += 1;
        }
      }
    }
    penalty += localThreats * 55;
  }

  return penalty;
}

function getRomanKingPreservationBonus(board, color) {
  return countKings(board, color) * 2200;
}

function hasInsufficientMaterial(board) {
  const pieces = [];
  const bishops = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || getType(piece) === "k") continue;
      pieces.push(piece);
      if (getType(piece) === "b") {
        bishops.push({ color: getColor(piece), squareColor: (r + c) % 2 });
      }
    }
  }

  if (pieces.length === 0) return true;
  if (pieces.length === 1) return ["b", "n"].includes(getType(pieces[0]));

  if (pieces.length === 2) {
    const [a, b] = pieces;
    const ta = getType(a);
    const tb = getType(b);
    const ca = getColor(a);
    const cb = getColor(b);

    if (ta === "n" && tb === "n") return true;
    if ((ta === "b" && tb === "n") || (ta === "n" && tb === "b")) return ca !== cb;
    if (ta === "b" && tb === "b") {
      if (ca !== cb) return true;
      return bishops.length === 2 && bishops[0].squareColor === bishops[1].squareColor;
    }
  }

  return false;
}

function isEndgame(state) {
  let queens = 0;
  let minorMajorMaterial = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      const type = getType(piece);
      if (type === "q") queens += 1;
      if (["r", "b", "n"].includes(type)) minorMajorMaterial += PIECE_VALUES[type];
    }
  }
  return queens === 0 || minorMajorMaterial <= 2600;
}

function getPieceSquareValue(piece, r, c, endgame = false) {
  const type = getType(piece);
  const table = type === "k" ? (endgame ? KING_TABLE_END : KING_TABLE_MID) : TABLES[type];
  if (!table) return 0;
  return getColor(piece) === "w" ? table[r][c] : table[7 - r][c];
}

function fileHasPawn(board, file, color) {
  for (let r = 0; r < 8; r++) {
    if (board[r][file] === `${color}p`) return true;
  }
  return false;
}

function countPawnsOnFile(board, file, color) {
  let count = 0;
  for (let r = 0; r < 8; r++) {
    if (board[r][file] === `${color}p`) count += 1;
  }
  return count;
}

function isPassedPawn(board, row, col, color) {
  const enemy = other(color);
  const dir = color === "w" ? -1 : 1;

  for (let fc = Math.max(0, col - 1); fc <= Math.min(7, col + 1); fc++) {
    let r = row + dir;
    while (inBounds(r, fc)) {
      if (board[r][fc] === `${enemy}p`) return false;
      r += dir;
    }
  }
  return true;
}

function isIsolatedPawn(board, row, col, color) {
  for (const adjFile of [col - 1, col + 1]) {
    if (adjFile < 0 || adjFile > 7) continue;
    for (let r = 0; r < 8; r++) {
      if (board[r][adjFile] === `${color}p`) return false;
    }
  }
  return true;
}

function isConnectedPawn(board, row, col, color) {
  const supportRows = color === "w" ? [row, row + 1] : [row, row - 1];

  for (const adjFile of [col - 1, col + 1]) {
    if (adjFile < 0 || adjFile > 7) continue;
    for (const rr of supportRows) {
      if (inBounds(rr, adjFile) && board[rr][adjFile] === `${color}p`) return true;
    }
  }
  return false;
}

function evaluatePawnStructure(board) {
  let score = 0;

  for (let file = 0; file < 8; file++) {
    const whiteCount = countPawnsOnFile(board, file, "w");
    const blackCount = countPawnsOnFile(board, file, "b");

    if (whiteCount > 1) score -= (whiteCount - 1) * 18;
    if (blackCount > 1) score += (blackCount - 1) * 18;
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || getType(piece) !== "p") continue;

      const color = getColor(piece);
      let pawnScore = 0;

      if (isIsolatedPawn(board, r, c, color)) pawnScore -= 14;
      if (isConnectedPawn(board, r, c, color)) pawnScore += 10;

      if (isPassedPawn(board, r, c, color)) {
        const advance = color === "w" ? 6 - r : r - 1;
        pawnScore += 20 + advance * 12;
      }

      score += color === "w" ? pawnScore : -pawnScore;
    }
  }

  return score;
}

function evaluateRookActivity(board) {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || getType(piece) !== "r") continue;

      const color = getColor(piece);
      const ownPawn = fileHasPawn(board, c, color);
      const enemyPawn = fileHasPawn(board, c, other(color));

      let rookScore = 0;

      if (!ownPawn && !enemyPawn) rookScore += 22;
      else if (!ownPawn && enemyPawn) rookScore += 10;

      if ((color === "w" && r === 1) || (color === "b" && r === 6)) {
        rookScore += 16;
      }

      score += color === "w" ? rookScore : -rookScore;
    }
  }

  return score;
}

function evaluateKnightOutposts(board) {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || getType(piece) !== "n") continue;

      const color = getColor(piece);

      if ((color === "w" && r > 4) || (color === "b" && r < 3)) continue;

      let supportedByPawn = false;
      const pawnSupportRow = color === "w" ? r + 1 : r - 1;

      for (const dc of [-1, 1]) {
        const sc = c + dc;
        if (inBounds(pawnSupportRow, sc) && board[pawnSupportRow][sc] === `${color}p`) {
          supportedByPawn = true;
        }
      }

      let attackedByEnemyPawn = false;
      const enemy = other(color);
      const enemyPawnRow = color === "w" ? r - 1 : r + 1;

      for (const dc of [-1, 1]) {
        const ec = c + dc;
        if (inBounds(enemyPawnRow, ec) && board[enemyPawnRow][ec] === `${enemy}p`) {
          attackedByEnemyPawn = true;
        }
      }

      let bonus = 0;
      if (supportedByPawn) bonus += 12;
      if (supportedByPawn && !attackedByEnemyPawn) bonus += 18;

      score += color === "w" ? bonus : -bonus;
    }
  }

  return score;
}

function evaluateKingSafety(board, endgame) {
  if (endgame) return 0;

  let score = 0;

  for (const color of ["w", "b"]) {
    const king = findKing(board, color);
    if (!king) continue;

    const [r, c] = king;
    let kingScore = 0;

    const distFromCenter = Math.abs(3.5 - r) + Math.abs(3.5 - c);
    kingScore -= Math.max(0, 6 - distFromCenter) * 6;

    const forward = color === "w" ? -1 : 1;
    const shieldRow = r + forward;

    for (const fc of [c - 1, c, c + 1]) {
      if (inBounds(shieldRow, fc) && board[shieldRow][fc] === `${color}p`) {
        kingScore += 12;
      }
    }

    for (const fc of [c - 1, c, c + 1]) {
      if (fc < 0 || fc > 7) continue;
      const ownPawn = fileHasPawn(board, fc, color);
      if (!ownPawn) kingScore -= 10;
    }

    score += color === "w" ? kingScore : -kingScore;
  }

  return score;
}

function evaluateBishopMobilityShape(board) {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || getType(piece) !== "b") continue;

      const color = getColor(piece);
      let bishopScore = 0;

      const ownPawnPenaltySquares =
        color === "w"
          ? [[6, 3], [6, 4], [5, 3], [5, 4]]
          : [[1, 3], [1, 4], [2, 3], [2, 4]];

      for (const [pr, pc] of ownPawnPenaltySquares) {
        if (board[pr][pc] === `${color}p`) bishopScore -= 4;
      }

      score += color === "w" ? bishopScore : -bishopScore;
    }
  }

  return score;
}

function evaluateDevelopment(state) {
  if (isEndgame(state)) return 0;

  let score = 0;
  const board = state.board;

  if (board[7][1] === "wn") score -= 10;
  if (board[7][6] === "wn") score -= 10;
  if (board[7][2] === "wb") score -= 10;
  if (board[7][5] === "wb") score -= 10;

  if (board[0][1] === "bn") score += 10;
  if (board[0][6] === "bn") score += 10;
  if (board[0][2] === "bb") score += 10;
  if (board[0][5] === "bb") score += 10;

  const whiteKing = findKing(board, "w");
  const blackKing = findKing(board, "b");

  if (whiteKing && (whiteKing[1] === 6 || whiteKing[1] === 2)) score += 22;
  if (blackKing && (blackKing[1] === 6 || blackKing[1] === 2)) score -= 22;

  return score;
}

function evaluateCenterControl(board) {
  let score = 0;

  const coreCenter = [
    [3, 3], [3, 4],
    [4, 3], [4, 4],
  ];

  const extendedCenter = [
    [2, 2], [2, 3], [2, 4], [2, 5],
    [3, 2], [3, 5],
    [4, 2], [4, 5],
    [5, 2], [5, 3], [5, 4], [5, 5],
  ];

  for (const [r, c] of coreCenter) {
    const piece = board[r][c];
    if (!piece) continue;

    const color = getColor(piece);
    const type = getType(piece);

    let value = 0;
    if (type === "p") value = 30;
    else if (type === "n") value = 24;
    else if (type === "b") value = 18;
    else if (type === "r") value = 8;
    else if (type === "q") value = 10;
    else if (type === "k") value = -12;

    score += color === "w" ? value : -value;
  }

  for (const [r, c] of extendedCenter) {
    const piece = board[r][c];
    if (!piece) continue;

    const color = getColor(piece);
    const type = getType(piece);

    let value = 0;
    if (type === "p") value = 12;
    else if (type === "n") value = 14;
    else if (type === "b") value = 10;
    else if (type === "r") value = 4;
    else if (type === "q") value = 5;
    else if (type === "k") value = -8;

    score += color === "w" ? value : -value;
  }

  return score;
}

function evaluateBoard(state) {
  const cacheKey = `eval|${hashState(state)}`;
  if (EVAL_CACHE.has(cacheKey)) return EVAL_CACHE.get(cacheKey);

  const activeVariant = state.variant || "normal";
  const legal = allLegalMoves(state, state.turn);
  const inCheck = isInCheck(state.board, state.turn, activeVariant, state);

  const whiteArmyType = variantForColor(state, "w");
  const blackArmyType = variantForColor(state, "b");

  if (whiteArmyType === "mongolian" && countKnights(state.board, "w") === 0) {
    EVAL_CACHE.set(cacheKey, -999999);
    trimMap(EVAL_CACHE, EVAL_CACHE_MAX);
    return -999999;
  }
  if (blackArmyType === "mongolian" && countKnights(state.board, "b") === 0) {
    EVAL_CACHE.set(cacheKey, 999999);
    trimMap(EVAL_CACHE, EVAL_CACHE_MAX);
    return 999999;
  }

  let score;
  if (legal.length === 0) {
    score = inCheck ? (state.turn === "w" ? -999999 : 999999) : 0;
    EVAL_CACHE.set(cacheKey, score);
    trimMap(EVAL_CACHE, EVAL_CACHE_MAX);
    return score;
  }

  if (activeVariant === "roman") {
    const whiteKings = countKings(state.board, "w");
    const blackKings = countKings(state.board, "b");
    if (whiteKings < 2) {
      EVAL_CACHE.set(cacheKey, -999999);
      trimMap(EVAL_CACHE, EVAL_CACHE_MAX);
      return -999999;
    }
    if (blackKings < 2) {
      EVAL_CACHE.set(cacheKey, 999999);
      trimMap(EVAL_CACHE, EVAL_CACHE_MAX);
      return 999999;
    }
  }

  const endgame = isEndgame(state);
  score = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  let whitePawns = 0;
  let blackPawns = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      const color = getColor(piece);
      const type = getType(piece);
      let value = PIECE_VALUES[type] + getPieceSquareValue(piece, r, c, endgame);
      if (activeVariant === "roman" && type === "k") value = 0;
      score += color === "w" ? value : -value;

      if (piece === "wb") whiteBishops += 1;
      if (piece === "bb") blackBishops += 1;
      if (piece === "wp") whitePawns += 1;
      if (piece === "bp") blackPawns += 1;

      if (type === "p") {
        const advanceBonus = color === "w" ? (6 - r) * 6 : (r - 1) * 6;
        score += color === "w" ? advanceBonus : -advanceBonus;
      }
    }
  }

  if (whiteBishops >= 2) score += 30;
  if (blackBishops >= 2) score -= 30;

  const whiteMobility = allLegalMoves({ ...state, turn: "w" }, "w").length;
  const blackMobility = allLegalMoves({ ...state, turn: "b" }, "b").length;
  score += (whiteMobility - blackMobility) * 4;

  if (isInCheck(state.board, "b", activeVariant, state)) score += activeVariant === "roman" ? 140 : 30;
  if (isInCheck(state.board, "w", activeVariant, state)) score -= activeVariant === "roman" ? 140 : 30;

  const whiteKing = findKing(state.board, "w");
  const blackKing = findKing(state.board, "b");
  if (endgame && whiteKing && blackKing) {
    const kingDistance = Math.abs(whiteKing[0] - blackKing[0]) + Math.abs(whiteKing[1] - blackKing[1]);
    score += (14 - kingDistance) * 3;
  }

  if (activeVariant === "roman") {
    score += getRomanKingPreservationBonus(state.board, "w");
    score -= getRomanKingPreservationBonus(state.board, "b");
    score -= getRomanKingSafetyScore(state.board, "w");
    score += getRomanKingSafetyScore(state.board, "b");
  }

  if (activeVariant === "persian") {
    for (const piece of state.reserve?.w || []) score += PIECE_VALUES[getType(piece)] * 0.35;
    for (const piece of state.reserve?.b || []) score -= PIECE_VALUES[getType(piece)] * 0.35;
  }

    const whiteSkipPenalty = (state.skipNext?.w || 0) * 260;
  const blackSkipPenalty = (state.skipNext?.b || 0) * 260;
  score -= whiteSkipPenalty;
  score += blackSkipPenalty;

  score += (whitePawns - blackPawns) * 2;

    if (activeVariant === "normal" || activeVariant === "worldwar") {
    score += evaluatePawnStructure(state.board);
    score += evaluateRookActivity(state.board);
    score += evaluateKnightOutposts(state.board);
    score += evaluateKingSafety(state.board, endgame);
    score += evaluateBishopMobilityShape(state.board);
    score += evaluateCenterControl(state.board);

    if (isNormalLikeGame(state)) {
      score += evaluateDevelopment(state);
    }
  }

  EVAL_CACHE.set(cacheKey, score);
  trimMap(EVAL_CACHE, EVAL_CACHE_MAX);
  return score;
}

function isNormalLikeGame(state) {
  if (state.variant === "normal") return true;
  if (state.variant === "worldwar") {
    return state.whiteArmy === "normal" && state.blackArmy === "normal";
  }
  return false;
}

function totalNonPawnMaterial(state) {
  let total = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      const type = getType(piece);
      if (type !== "p" && type !== "k") total += PIECE_VALUES[type];
    }
  }
  return total;
}

function estimatePositionComplexity(state, moves) {
  const moveCount = moves.length;
  const nonPawnMaterial = totalNonPawnMaterial(state);

  let variantComplexity = 0;
  if (state.variant === "worldwar") variantComplexity += 2;
  if (state.variant === "mongolian") variantComplexity += 2;
  if (state.variant === "samurai") variantComplexity += 1;
  if (state.variant === "persian") variantComplexity += 1;
  if (state.variant === "roman") variantComplexity += 1;

  let materialComplexity = 0;
  if (nonPawnMaterial > 5000) materialComplexity += 2;
  else if (nonPawnMaterial > 3000) materialComplexity += 1;

  let branchingComplexity = 0;
  if (moveCount > 40) branchingComplexity += 3;
  else if (moveCount > 30) branchingComplexity += 2;
  else if (moveCount > 22) branchingComplexity += 1;

  return variantComplexity + materialComplexity + branchingComplexity;
}

function getMoveOrderingScore(state, move) {
  if (move.resurrect) return -120;
  if (move.sacrifice) return -100;

  let score = 0;

  const movingPiece = move.from ? state.board[move.from[0]][move.from[1]] : null;
  const movingType = movingPiece ? getType(movingPiece) : null;
  const movingColor = movingPiece ? getColor(movingPiece) : null;
  const target = state.board[move.to[0]][move.to[1]];
  const opponentColor = movingColor ? other(movingColor) : null;

  if (target) {
    const victimValue = PIECE_VALUES[getType(target)] || 0;
    const attackerValue = PIECE_VALUES[movingType] || 0;
    score += 1200 + victimValue * 12 - attackerValue;
  }

  if (isSamuraiCatastropheCapture(state, move)) {
    score += 5000;

    if (
      movingPiece &&
      variantForColor(state, movingColor) === "mongolian" &&
      variantForColor(state, opponentColor) === "samurai" &&
      movingType === "n" &&
      target &&
      getType(target) === "n"
    ) {
      score += 8000;
    }
  }

  if (
    movingPiece &&
    variantForColor(state, movingColor) === "mongolian" &&
    variantForColor(state, opponentColor) === "samurai" &&
    movingType === "n"
  ) {
    if (squareIsGuardedBySamuraiKnight(state, move.to[0], move.to[1], opponentColor)) {
      score -= 12000;
    }
  }

  if (move.enPassant) score += 1000;
  if (move.castle) score += 100;

  if (movingType === "p" && (move.to[0] === 0 || move.to[0] === 7)) {
    score += 1200;
  }

  const [tr, tc] = move.to;
  const distFromCenter = Math.abs(3.5 - tr) + Math.abs(3.5 - tc);
  score += Math.round((7 - distFromCenter) * 6);

  if (moveGivesCheck(state, move)) {
    score += 220;
  }

  return score;
}

function orderMoves(state, moves) {
  return [...moves].sort((a, b) => getMoveOrderingScore(state, b) - getMoveOrderingScore(state, a));
}

function quiescence(state, alpha, beta, maximizingPlayer, depthLeft = QUIESCENCE_DEPTH) {
  const standPat = evaluateBoard(state);

  if (maximizingPlayer) {
    if (standPat >= beta) return beta;
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return alpha;
    beta = Math.min(beta, standPat);
  }

  if (depthLeft <= 0) return standPat;

    const tacticalMoves = orderMoves(state, allLegalMoves(state, state.turn)).filter((move) => {
    if (move.resurrect || move.sacrifice) return false;

    const target = state.board[move.to[0]][move.to[1]];
    const isCapture = !!target || !!move.enPassant;
    const isCheck = moveGivesCheck(state, move);

    return isCapture || isCheck;
  });

  if (tacticalMoves.length === 0) return standPat;

  if (maximizingPlayer) {
    let value = standPat;
    for (const move of tacticalMoves) {
      const result = applyMoveToState(state, move, "q");
      const score = quiescence(buildChildState(state, result), alpha, beta, false, depthLeft - 1);
      value = Math.max(value, score);
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = standPat;
  for (const move of tacticalMoves) {
    const result = applyMoveToState(state, move, "q");
    const score = quiescence(buildChildState(state, result), alpha, beta, true, depthLeft - 1);
    value = Math.min(value, score);
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

function minimax(state, depth, alpha, beta, maximizingPlayer, tt = GLOBAL_TT) {
  const alphaOrig = alpha;
  const betaOrig = beta;
  const key = tt ? `${hashState(state)}|${depth}|${maximizingPlayer ? "M" : "m"}` : null;

  if (tt && key && tt.has(key)) {
    const cached = tt.get(key);
    if (cached.flag === "exact") return cached.value;
    if (cached.flag === "lower") alpha = Math.max(alpha, cached.value);
    if (cached.flag === "upper") beta = Math.min(beta, cached.value);
    if (alpha >= beta) return cached.value;
  }

  const legal = allLegalMoves(state, state.turn);
  const inCheck = isInCheck(state.board, state.turn, state.variant || "normal", state);

  if (depth === 0 || legal.length === 0) {
    let terminalValue;
    if (legal.length === 0) {
      terminalValue = inCheck ? (maximizingPlayer ? -999999 - depth : 999999 + depth) : 0;
    } else {
      terminalValue = quiescence(state, alpha, beta, maximizingPlayer);
    }
    if (tt && key) {
      trimMap(tt, TT_MAX_SIZE);
      tt.set(key, { value: terminalValue, flag: "exact" });
    }
    return terminalValue;
  }

  const orderedMoves = orderMoves(state, legal);
  let bestValue;

  if (maximizingPlayer) {
    bestValue = -Infinity;
    for (const move of orderedMoves) {
      const result = applyMoveToState(state, move, "q");
      const evalScore = minimax(buildChildState(state, result), depth - 1, alpha, beta, false, tt);
      bestValue = Math.max(bestValue, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
  } else {
    bestValue = Infinity;
    for (const move of orderedMoves) {
      const result = applyMoveToState(state, move, "q");
      const evalScore = minimax(buildChildState(state, result), depth - 1, alpha, beta, true, tt);
      bestValue = Math.min(bestValue, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
  }

  if (tt && key) {
    let flag = "exact";
    if (bestValue <= alphaOrig) flag = "upper";
    else if (bestValue >= betaOrig) flag = "lower";
    trimMap(tt, TT_MAX_SIZE);
    tt.set(key, { value: bestValue, flag });
  }

  return bestValue;
}

function getOpeningName(moveKeys) {
  let bestMatch = null;
  for (const opening of OPENING_BOOK) {
    if (opening.moves.length > moveKeys.length) continue;
    let matches = true;
    for (let i = 0; i < opening.moves.length; i++) {
      if (opening.moves[i] !== moveKeys[i]) {
        matches = false;
        break;
      }
    }
    if (matches && (!bestMatch || opening.moves.length > bestMatch.moves.length)) {
      bestMatch = opening;
    }
  }
  return bestMatch ? bestMatch.name : "Unknown / Offbeat";
}

function classifyMoveLoss(loss, brilliant = false) {
  if (brilliant) return "Brilliant";
  if (loss <= 5) return "Best";
  if (loss <= 35) return "Excellent";
  if (loss <= 90) return "Good";
  if (loss <= 180) return "Inaccuracy";
  if (loss <= 320) return "Mistake";
  return "Blunder";
}

function analyzeMoveQuality(state, move) {
  const legalMoves = allLegalMoves(state);
  if (legalMoves.length === 0) return { label: "—", loss: 0 };

  const color = state.turn;
  const orderedMoves = orderMoves(state, legalMoves).slice(0, Math.min(ANALYSIS_ROOT_MOVES, legalMoves.length));
  const depth = 2;

  const scored = orderedMoves.map((candidate) => {
    const result = applyMoveToState(state, candidate, "q");
    const nextState = buildChildState(state, result);
    const score = minimax(nextState, depth - 1, -Infinity, Infinity, color === "b");
    return { move: candidate, score };
  });

  scored.sort((a, b) => color === "w" ? b.score - a.score : a.score - b.score);

  const chosenKey = moveToKey(move);
  const chosen = scored.find((entry) => moveToKey(entry.move) === chosenKey);
  const bestScore = scored[0]?.score ?? 0;
  const chosenScore = chosen ? chosen.score : bestScore;
  const loss = color === "w" ? bestScore - chosenScore : chosenScore - bestScore;

  const normalizedLoss = Math.max(0, loss);
  const evalSwing = Math.abs(bestScore);
  const brilliant = normalizedLoss <= 5 && evalSwing > 350;

  return {
    label: classifyMoveLoss(normalizedLoss, brilliant),
    loss: Math.max(0, Math.round(loss)),
  };
}

function moveGivesCheck(state, move) {
  const result = applyMoveToState(state, move, "q");
  const nextState = buildChildState(state, result);
  return isInCheck(nextState.board, nextState.turn, nextState.variant || "normal", nextState);
}

function isImmediateWinningMove(state, move) {
  const movingPiece = move.resurrect ? move.piece : state.board[move.from[0]][move.from[1]];
  const moverColor = getColor(movingPiece);
  const result = applyMoveToState(state, move, "q");

  if (variantForColor(state, moverColor) === "roman") {
    const selfLoss = getRomanSelfCheckLoss(result.board, movingPiece, move, moverColor);
    if (selfLoss === moverColor) return false;
  }

  const whiteArmyType = variantForColor(state, "w");
  const blackArmyType = variantForColor(state, "b");

  if (whiteArmyType === "roman" && countKings(result.board, "w") < 2) return moverColor === "b";
  if (blackArmyType === "roman" && countKings(result.board, "b") < 2) return moverColor === "w";

  if (whiteArmyType === "mongolian" && countKnights(result.board, "w") === 0) return moverColor === "b";
  if (blackArmyType === "mongolian" && countKnights(result.board, "b") === 0) return moverColor === "w";

  const nextState = buildChildState(state, result);
  const legal = allLegalMoves(nextState);
  const inCheck = isInCheck(nextState.board, nextState.turn, nextState.variant || "normal", nextState);

  return legal.length === 0 && inCheck;
}

function moveAllowsOpponentImmediateWin(state, move) {
  const movingPiece = move.resurrect ? move.piece : state.board[move.from[0]][move.from[1]];
  const moverColor = getColor(movingPiece);
  const result = applyMoveToState(state, move, "q");

  if (variantForColor(state, moverColor) === "roman") {
    const selfLoss = getRomanSelfCheckLoss(result.board, movingPiece, move, moverColor);
    if (selfLoss === moverColor) return true;
  }

  const whiteArmyType = variantForColor(state, "w");
  const blackArmyType = variantForColor(state, "b");

  if (whiteArmyType === "roman" && countKings(result.board, "w") < 2) return moverColor === "w";
  if (blackArmyType === "roman" && countKings(result.board, "b") < 2) return moverColor === "b";

  if (whiteArmyType === "mongolian" && countKnights(result.board, "w") === 0) return moverColor === "w";
  if (blackArmyType === "mongolian" && countKnights(result.board, "b") === 0) return moverColor === "b";

  const nextState = buildChildState(state, result);
  const opponentMoves = orderMoves(nextState, allLegalMoves(nextState));

  for (const reply of opponentMoves) {
    if (isImmediateWinningMove(nextState, reply)) return true;
  }

  return false;
}

function getImmediateLossPenalty(state, move) {
  if (moveAllowsOpponentImmediateWin(state, move)) return 900000;

  const moverColor = state.turn;
  const opponentColor = other(moverColor);
  const moverArmy = variantForColor(state, moverColor);
  const opponentArmy = variantForColor(state, opponentColor);

  const result = applyMoveToState(state, move, "q");
  const nextState = buildChildState(state, result);
  const opponentMoves = allLegalMoves(nextState, opponentColor);

  for (const reply of opponentMoves) {
    if (!reply.from) continue;

    const attacker = nextState.board[reply.from[0]][reply.from[1]];
    const target = nextState.board[reply.to[0]][reply.to[1]];
    if (!attacker || !target) continue;

    if (isSamuraiCatastropheCapture(nextState, reply)) {
      const attackerType = getType(attacker);

      if (moverArmy === "mongolian" && opponentArmy === "samurai" && attackerType === "n") {
        return 900000;
      }
      return 4200;
    }

    if (moverArmy === "mongolian" && opponentArmy === "samurai") {
      if (getType(attacker) === "n" && getType(target) === "n" && getColor(target) === moverColor) {
        return 900000;
      }
    }
  }

  return 0;
}

function getStrongAiSearchConfig(state, moves) {
  const complexity = estimatePositionComplexity(state, moves);
  const endgameish = totalNonPawnMaterial(state) <= 2200;
  const currentlyInCheck = isInCheck(state.board, state.turn, state.variant || "normal", state);

  let depth;
  let rootLimit;

  if (endgameish && moves.length <= 20) {
    depth = STRONG_AI_ENDGAME_DEPTH;
    rootLimit = 12;
  } else if (complexity >= 6) {
    depth = 3;
    rootLimit = 8;
  } else if (complexity >= 4) {
    depth = 4;
    rootLimit = 10;
  } else {
    depth = STRONG_AI_BASE_DEPTH;
    rootLimit = STRONG_AI_MAX_ROOT;
  }

  if (currentlyInCheck) depth += 1;

  return { depth, rootLimit };
}

async function chooseStrongComputerMoveAsync(state, isCancelled = () => false) {
  const legalMoves = allLegalMoves(state);
  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) return legalMoves[0];

  const aiColor = state.turn;
  let orderedMoves = orderMoves(state, legalMoves);

  if (isNormalLikeGame(state)) {
    const currentKeys = state.moveKeys || [];
    const matchingLines = OPENING_BOOK.filter((opening) => {
      if (opening.moves.length <= currentKeys.length) return false;
      for (let i = 0; i < currentKeys.length; i++) {
        if (opening.moves[i] !== currentKeys[i]) return false;
      }
      return true;
    });

    if (matchingLines.length > 0 && currentKeys.length < 8) {
      const nextBookKeys = [...new Set(matchingLines.map((line) => line.moves[currentKeys.length]))];
      const matchingMove = orderedMoves.find((m) => nextBookKeys.includes(moveToKey(m)));
      if (matchingMove) return matchingMove;
    }
  }

  for (const move of orderedMoves) {
    if (isCancelled()) return null;
    if (isImmediateWinningMove(state, move)) return move;
  }

  const { depth: targetDepth, rootLimit } = getStrongAiSearchConfig(state, orderedMoves);
  let rootMoves = orderedMoves.slice(0, Math.min(rootLimit, orderedMoves.length));

  let bestMove = rootMoves[0];
  const tt = GLOBAL_TT;

  for (let currentDepth = 2; currentDepth <= targetDepth; currentDepth++) {
    if (isCancelled()) return bestMove;

    const scored = [];

    for (let i = 0; i < rootMoves.length; i++) {
      if (isCancelled()) return bestMove;

      const move = rootMoves[i];
      const result = applyMoveToState(state, move, "q");
      const nextState = buildChildState(state, result);

      const checkExtension = moveGivesCheck(state, move) ? 1 : 0;
      let score = minimax(
        nextState,
        currentDepth - 1 + checkExtension,
        -Infinity,
        Infinity,
        aiColor === "b",
        tt
      );

            const immediateLossPenalty = getImmediateLossPenalty(state, move);
      if (immediateLossPenalty > 0) {
        score += aiColor === "w" ? -immediateLossPenalty : immediateLossPenalty;
      }

      const samuraiSwing = samuraiCatastrophePenalty(state, move);
      if (samuraiSwing.penalty > 0) {
        score += aiColor === "w" ? -samuraiSwing.penalty : samuraiSwing.penalty;
      }
      if (samuraiSwing.bonus > 0) {
        score += aiColor === "w" ? samuraiSwing.bonus : -samuraiSwing.bonus;
      }

      if (moveGivesCheck(state, move)) {
        score += aiColor === "w" ? 35 : -35;
      }

      if (move.resurrect) {
        score += aiColor === "w" ? -80 : 80;
      }

      const movingPiece = move.from ? state.board[move.from[0]][move.from[1]] : null;
      if (movingPiece) {
        const movingType = getType(movingPiece);
        const opponentColor = other(aiColor);

        if (
          variantForColor(state, aiColor) === "mongolian" &&
          variantForColor(state, opponentColor) === "samurai" &&
          movingType === "n"
        ) {
          if (squareIsGuardedBySamuraiKnight(state, move.to[0], move.to[1], opponentColor)) {
            score += aiColor === "w" ? -15000 : 15000;
          }

          const target = state.board[move.to[0]][move.to[1]];
          if (target && getType(target) === "n" && getColor(target) === opponentColor) {
            score += aiColor === "w" ? 6000 : -6000;
          }
        }
      }

      scored.push({ move, score });

      if (i < rootMoves.length - 1) {
        await yieldToUi();
      }
    }

    scored.sort((a, b) => (aiColor === "w" ? b.score - a.score : a.score - b.score));

    if (scored[0]?.move) bestMove = scored[0].move;
    rootMoves = scored.map((entry) => entry.move);
  }

  return bestMove;
}

function moveNeedsPromotion(state, move) {
  if (!move || move.resurrect || move.sacrifice || !move.from) return false;
  const piece = state.board[move.from[0]][move.from[1]];
  if (!piece || getType(piece) !== "p") return false;
  if (variantForColor(state, getColor(piece)) === "hannibal") return false;
  return move.to[0] === 0 || move.to[0] === 7;
}

function isSamuraiVsMongolianWorldWar(state) {
  if (state.variant !== "worldwar") return false;
  return (
    (state.whiteArmy === "samurai" && state.blackArmy === "mongolian") ||
    (state.whiteArmy === "mongolian" && state.blackArmy === "samurai")
  );
}

export default function PlayableChessGame() {
  const [variant, setVariant] = useState(null);
  const [game, setGame] = useState(createInitialState("normal"));
  const [playerColor, setPlayerColor] = useState(null);
  const [mode, setMode] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("");
  const [lastMove, setLastMove] = useState(null);
  const [coachMode, setCoachMode] = useState(false);
  const [evalBarMode, setEvalBarMode] = useState(false);
  const [katanaEffect, setKatanaEffect] = useState(null);
  const [endOverlay, setEndOverlay] = useState(null);
  const [skipOverlay, setSkipOverlay] = useState(null);
  const [resurrectionOverlay, setResurrectionOverlay] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [selectedReserve, setSelectedReserve] = useState(null);
  const [hannibalSetup, setHannibalSetup] = useState(null);
  const [hannibalSelectedSlot, setHannibalSelectedSlot] = useState(null);
  const [worldWarSetup, setWorldWarSetup] = useState(null);

  const aiTimerRef = useRef(null);
  const aiSearchTokenRef = useRef(0);
  const coachModeRef = useRef(false);

  useEffect(() => {
    coachModeRef.current = coachMode;
  }, [coachMode]);

  const boardFacing = playerColor || "w";
  const whiteArmyType = variantForColor(game, "w");
  const blackArmyType = variantForColor(game, "b");
  const currentTurnArmy = variantForColor(game, game.turn);
  const hasSamuraiSide = whiteArmyType === "samurai" || blackArmyType === "samurai";
  const hasPersianSide = whiteArmyType === "persian" || blackArmyType === "persian";
  const hasRomanSide = whiteArmyType === "roman" || blackArmyType === "roman";

  useEffect(() => {
    const validModes = ["pvp", "ai", "ai_setup"];
    const validVariants = ["normal", "mongolian", "samurai", "spartan", "viking", "hannibal", "persian", "roman", "worldwar"];
    const invalidMode = mode && !validModes.includes(mode);
    const invalidVariant = variant !== null && !validVariants.includes(variant);
    const stuckWithoutVariant = mode && !variant && !worldWarSetup && !hannibalSetup;
    const invalidGame = !game || !Array.isArray(game.board) || game.board.length !== 8 || game.board.some((row) => !Array.isArray(row) || row.length !== 8);

    if (invalidMode || invalidVariant || stuckWithoutVariant || invalidGame) {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      aiSearchTokenRef.current += 1;
      setThinking(false);
      setThinkingLabel("");
      setMode(null);
      setPlayerColor(null);
      setVariant(null);
      setWorldWarSetup(null);
      setHannibalSetup(null);
      setHannibalSelectedSlot(null);
      setSelectedReserve(null);
      setLastMove(null);
      setKatanaEffect(null);
      setEndOverlay(null);
      setSkipOverlay(null);
      setResurrectionOverlay(null);
      setPendingPromotion(null);
      clearEngineCaches();
      setGame(createInitialState("normal"));
    }
  }, [mode, variant, worldWarSetup, hannibalSetup, game]);

  const gameSummary = useMemo(() => {
    const legal = allLegalMoves(game);
    const inCheck = isInCheck(game.board, game.turn, game.variant || "normal", game);

    const openingName = coachMode ? getOpeningName(game.moveKeys || []) : null;
    const latestInsight =
      coachMode && (game.moveInsights || []).length > 0
        ? game.moveInsights[game.moveInsights.length - 1]
        : null;

    const rawEval = evalBarMode && !game.gameOver ? evaluateBoard(game) : 0;
    const clampedEval = Math.max(-2000, Math.min(2000, rawEval));
    const whitePercent = 50 + (clampedEval / 2000) * 50;

    return {
      legalCount: legal.length,
      inCheck,
      openingName,
      latestInsight,
      rawEval,
      whitePercent: Math.max(0, Math.min(100, whitePercent)),
      whiteSkipQueued: game.skipNext?.w || 0,
      blackSkipQueued: game.skipNext?.b || 0,
    };
  }, [game, coachMode, evalBarMode]);

  function cancelAiThinking() {
    aiSearchTokenRef.current += 1;
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setThinking(false);
    setThinkingLabel("");
  }

  function resetGame() {
    cancelAiThinking();
    aiSearchTokenRef.current += 1;
    clearEngineCaches();

    const nextState =
      variant === "worldwar"
        ? createInitialState("worldwar", game.whiteArmy || "normal", game.blackArmy || "normal")
        : createInitialState(variant || "normal");

    setGame(nextState);
    setLastMove(null);
    setKatanaEffect(null);
    setEndOverlay(null);
    setSkipOverlay(null);
    setResurrectionOverlay(null);
    setSelectedReserve(null);
    setPendingPromotion(null);
    setHannibalSetup(null);
    setHannibalSelectedSlot(null);
    setWorldWarSetup(null);
  }

  function startGame(color, chosenMode) {
    cancelAiThinking();
    clearEngineCaches();
    setPlayerColor(color);
    setMode(chosenMode);
    setThinking(false);
    setThinkingLabel("");
    setLastMove(null);
    setKatanaEffect(null);
    setEndOverlay(null);
    setSkipOverlay(null);
    setResurrectionOverlay(null);
    setSelectedReserve(null);
    setPendingPromotion(null);
    setHannibalSetup(null);
    setHannibalSelectedSlot(null);
    setWorldWarSetup(null);

    if (variant === "worldwar") {
      setWorldWarSetup({
        whiteArmy: "normal",
        blackArmy: "normal",
        mode: chosenMode,
        playerColor: color,
      });
      return;
    }

    if (variant === "hannibal") {
      if (chosenMode === "pvp") {
        setHannibalSetup({
          phase: "w",
          mode: chosenMode,
          playerColor: color,
          whiteRank: getDefaultHannibalBackRank("w"),
          blackRank: getDefaultHannibalBackRank("b"),
        });
      } else {
        setHannibalSetup({
          phase: color,
          mode: chosenMode,
          playerColor: color,
          whiteRank: getDefaultHannibalBackRank("w"),
          blackRank: getDefaultHannibalBackRank("b"),
        });
      }
      return;
    }

    setGame(createInitialState(variant));
  }

  function triggerResurrectionOverlay(move, nextGameBase) {
    if (!move?.resurrect) return;
    const colorName = getColor(move.piece) === "w" ? "White" : "Black";
    const overlay = {
      message: `${colorName} ${variantLabelName(variantForColor(nextGameBase, getColor(move.piece)))} Resurrection`,
      submessage: `Skip queued for ${colorName}'s next turn${isInCheck(nextGameBase.board, getColor(move.piece), nextGameBase.variant || "normal", nextGameBase) ? ", unless check cancels it" : ""}.`,
      piece: move.piece,
      triggeredAt: Date.now(),
    };
    setResurrectionOverlay(overlay);
    setTimeout(() => {
      setResurrectionOverlay((current) => current && current.triggeredAt === overlay.triggeredAt ? null : current);
    }, 1450);
  }

  function finalizeTurn(nextGameBase, notation = null, move = null, insight = null, massDelete = null, specialOutcome = null) {
    const activeVariant = nextGameBase.variant || variant;
    const inCheck = isInCheck(nextGameBase.board, nextGameBase.turn, activeVariant, nextGameBase);
    const legal = allLegalMoves(nextGameBase);
    const insufficientMaterial = activeVariant === "roman" ? false : hasInsufficientMaterial(nextGameBase.board);

    let status = `${nextGameBase.turn === "w" ? "White" : "Black"} to move`;
    const skippedTurnsNow = nextGameBase.skippedTurns || [];

    if (skippedTurnsNow.length > 0) {
      const skippedNames = skippedTurnsNow.map((c) => c === "w" ? "White" : "Black").join(", ");
      status = `${skippedNames} skipped a turn. ${status}`;
    }

    let gameOver = false;

    if (specialOutcome?.type === "roman-self-check") {
      gameOver = true;
      status = `${specialOutcome.loser === "w" ? "White" : "Black"} moved a Roman king onto an attacked square and loses.`;
    } else if (specialOutcome?.type === "roman-king-lost") {
      gameOver = true;
      status = `${specialOutcome.loser === "w" ? "White" : "Black"} lost a Roman king and loses.`;
    } else if (specialOutcome?.type === "mongolian-knights-lost") {
      gameOver = true;
      status = `${specialOutcome.loser === "w" ? "White" : "Black"} lost all knights and loses.`;
    } else if (legal.length === 0) {
      gameOver = true;
      if (inCheck) {
        status = `${nextGameBase.turn === "w" ? "White" : "Black"} is checkmated. ${nextGameBase.turn === "w" ? "Black" : "White"} wins.`;
      } else {
        status = "Stalemate.";
      }
    } else if (insufficientMaterial) {
      gameOver = true;
      status = "Draw by insufficient material.";
    } else if (inCheck) {
      status = `${nextGameBase.turn === "w" ? "White" : "Black"} to move — check.`;
    }

    setGame((prev) => ({
      ...nextGameBase,
      selected: null,
      legalMoves: [],
      status,
      gameOver,
      moveHistory: notation ? [...prev.moveHistory, notation] : prev.moveHistory,
      moveKeys: move ? [...(prev.moveKeys || []), moveToKey(move)] : (prev.moveKeys || []),
      moveInsights: insight ? [...(prev.moveInsights || []), insight] : (prev.moveInsights || []),
      moveSides: move
        ? [
            ...(prev.moveSides || []),
            move.resurrect
              ? getColor(move.piece)
              : getColor(nextGameBase.board[move.to[0]][move.to[1]]) ||
                getColor(prev.board?.[move.from?.[0]]?.[move.from?.[1]]) ||
                prev.turn,
          ]
        : (prev.moveSides || []),
      reserve: nextGameBase.reserve || prev.reserve,
      skipNext: nextGameBase.skipNext || prev.skipNext,
      skippedTurns: skippedTurnsNow,
    }));

    setSelectedReserve(null);
    setHannibalSetup(null);
    setHannibalSelectedSlot(null);
    setWorldWarSetup(null);

    if (skippedTurnsNow.length > 0) {
      const skippedNames = skippedTurnsNow.map((c) => c === "w" ? "White" : "Black").join(" & ");
      const overlay = {
        message: `${skippedNames} Turn Skipped`,
        triggeredAt: Date.now(),
      };
      setSkipOverlay(overlay);
      setTimeout(() => {
        setSkipOverlay((current) => current && current.triggeredAt === overlay.triggeredAt ? null : current);
      }, 1350);
    } else {
      setSkipOverlay(null);
    }

    if (gameOver) {
      const overlayTone = status.includes("wins") || status.includes("loses") ? "victory" : "draw";
      setEndOverlay({
        kind: overlayTone,
        message: status,
        triggeredAt: Date.now(),
      });
    } else {
      setEndOverlay(null);
    }

    if (move?.resurrect) {
      triggerResurrectionOverlay(move, nextGameBase);
    } else {
      setResurrectionOverlay(null);
    }

    if (move) {
      setLastMove({
        from: move.from || move.to,
        to: move.to,
        movedAt: Date.now(),
      });
    }

    if (massDelete) {
      setKatanaEffect(massDelete);
      setTimeout(() => {
        setKatanaEffect((current) => (current && current.triggeredAt === massDelete.triggeredAt ? null : current));
      }, 900);
    } else {
      setKatanaEffect(null);
    }
  }

  function applyAndFinalize(state, move, promotionChoice = "q") {
    const movingPiece = move.resurrect ? move.piece : state.board[move.from[0]][move.from[1]];
    const moverColor = getColor(movingPiece);
    const result = applyMoveToState(state, move, promotionChoice);
    const notation = moveToNotation(state, move, promotionChoice);

    const moveKey = moveToKey(move);
    const nextMoveKeys = [...(state.moveKeys || []), moveKey];

    let insight = null;
    if (coachModeRef.current) {
      const quality = analyzeMoveQuality(state, move);
      insight = {
        notation,
        key: moveKey,
        quality: quality.label,
        loss: quality.loss,
        opening: getOpeningName(nextMoveKeys),
      };
    }

    let specialOutcome = null;
    const whiteArmyTypeLocal = variantForColor(state, "w");
    const blackArmyTypeLocal = variantForColor(state, "b");
    const whiteKings = countKings(result.board, "w");
    const blackKings = countKings(result.board, "b");

    if (whiteArmyTypeLocal === "roman" && whiteKings < 2) {
      specialOutcome = { type: "roman-king-lost", loser: "w" };
    } else if (blackArmyTypeLocal === "roman" && blackKings < 2) {
      specialOutcome = { type: "roman-king-lost", loser: "b" };
    } else if (variantForColor(state, moverColor) === "roman") {
      const selfCheckLoser = getRomanSelfCheckLoss(result.board, movingPiece, move, moverColor);
      if (selfCheckLoser) {
        specialOutcome = { type: "roman-self-check", loser: selfCheckLoser };
      }
    }

    const whiteKnights = countKnights(result.board, "w");
    const blackKnights = countKnights(result.board, "b");

    if (whiteArmyTypeLocal === "mongolian" && whiteKnights === 0) {
      specialOutcome = { type: "mongolian-knights-lost", loser: "w" };
    } else if (blackArmyTypeLocal === "mongolian" && blackKnights === 0) {
      specialOutcome = { type: "mongolian-knights-lost", loser: "b" };
    }

    finalizeTurn(buildChildState(state, result), notation, move, insight, result.massDelete || null, specialOutcome);
  }

  function handleSacrifice() {
    if (game.gameOver || thinking || pendingPromotion) return;
    if (mode === "ai" && game.turn !== playerColor) return;
    if (currentTurnArmy !== "samurai") return;
    if (!game.selected) return;

    const [r, c] = game.selected;
    const piece = game.board[r][c];
    if (!piece || getColor(piece) !== game.turn || getType(piece) === "k") return;

    const sacrificeMove = {
      from: [r, c],
      to: [r, c],
      sacrifice: true,
    };

    applyAndFinalize(game, sacrificeMove);
  }

  function handleHannibalSlotClick(index) {
    if (!hannibalSetup) return;
    if (hannibalSelectedSlot === null) {
      setHannibalSelectedSlot(index);
      return;
    }

    const phaseKey = hannibalSetup.phase === "w" ? "whiteRank" : "blackRank";
    const nextRank = [...hannibalSetup[phaseKey]];
    [nextRank[hannibalSelectedSlot], nextRank[index]] = [nextRank[index], nextRank[hannibalSelectedSlot]];
    setHannibalSetup((prev) => ({ ...prev, [phaseKey]: nextRank }));
    setHannibalSelectedSlot(null);
  }

  function confirmHannibalSetup() {
    if (!hannibalSetup) return;

    if (hannibalSetup.worldWar) {
      const nextPhase = nextHannibalSetupPhase(hannibalSetup);
      if (nextPhase) {
        setHannibalSetup((prev) => ({ ...prev, phase: nextPhase }));
        setHannibalSelectedSlot(null);
        return;
      }

      const base = createInitialState("worldwar", hannibalSetup.whiteArmy, hannibalSetup.blackArmy);
      let board = cloneBoard(base.board);
      let whiteRank = hannibalSetup.whiteRank;
      let blackRank = hannibalSetup.blackRank;

      if (hannibalSetup.mode === "ai") {
        if (shouldShuffleHannibalBackRank(hannibalSetup, "w")) whiteRank = shuffleArray(whiteRank);
        if (shouldShuffleHannibalBackRank(hannibalSetup, "b")) blackRank = shuffleArray(blackRank);
      }

      if (hannibalSetup.whiteArmy === "hannibal") board = applyHannibalBackRank(board, "w", whiteRank);
      if (hannibalSetup.blackArmy === "hannibal") board = applyHannibalBackRank(board, "b", blackRank);

      clearEngineCaches();
      setGame({
        ...base,
        board,
        variant: "worldwar",
        whiteArmy: hannibalSetup.whiteArmy,
        blackArmy: hannibalSetup.blackArmy,
      });
      setHannibalSetup(null);
      setHannibalSelectedSlot(null);
      return;
    }

    if (hannibalSetup.mode === "pvp" && hannibalSetup.phase === "w") {
      setHannibalSetup((prev) => ({ ...prev, phase: "b" }));
      setHannibalSelectedSlot(null);
      return;
    }

    const base = createInitialState("hannibal");
    let whiteRank = hannibalSetup.whiteRank;
    let blackRank = hannibalSetup.blackRank;

    if (hannibalSetup.mode === "ai") {
      if (hannibalSetup.playerColor === "w") blackRank = shuffleArray(blackRank);
      else whiteRank = shuffleArray(whiteRank);
    }

    let board = applyHannibalBackRank(base.board, "w", whiteRank);
    board = applyHannibalBackRank(board, "b", blackRank);

    clearEngineCaches();
    setGame({ ...base, board, variant: "hannibal" });
    setHannibalSetup(null);
    setHannibalSelectedSlot(null);
  }

  function confirmWorldWarSetup() {
    if (!worldWarSetup) return;

    const resolvedWhiteArmy = worldWarSetup.whiteArmy === "random" ? pickRandomArmy() : worldWarSetup.whiteArmy;
    const resolvedBlackArmy = worldWarSetup.blackArmy === "random" ? pickRandomArmy() : worldWarSetup.blackArmy;

    const needsWhiteHannibal = resolvedWhiteArmy === "hannibal";
    const needsBlackHannibal = resolvedBlackArmy === "hannibal";
    const isAiWorldWar = worldWarSetup.mode === "ai";
    const humanColor = worldWarSetup.playerColor || "w";
    const humanNeedsHannibal = humanColor === "w" ? needsWhiteHannibal : needsBlackHannibal;
    const anyNeedsManualHannibal = isAiWorldWar ? humanNeedsHannibal : (needsWhiteHannibal || needsBlackHannibal);

    if (anyNeedsManualHannibal) {
      setHannibalSetup({
        worldWar: true,
        mode: worldWarSetup.mode || "pvp",
        playerColor: humanColor,
        phase: isAiWorldWar ? humanColor : (needsWhiteHannibal ? "w" : "b"),
        whiteArmy: resolvedWhiteArmy,
        blackArmy: resolvedBlackArmy,
        whiteRank: getDefaultHannibalBackRank("w"),
        blackRank: getDefaultHannibalBackRank("b"),
      });
      setWorldWarSetup(null);
      setHannibalSelectedSlot(null);
      return;
    }

    const base = createInitialState("worldwar", resolvedWhiteArmy, resolvedBlackArmy);
    let board = cloneBoard(base.board);

    if (isAiWorldWar) {
      if (shouldShuffleHannibalBackRank({ mode: "ai", playerColor: humanColor, whiteArmy: resolvedWhiteArmy, blackArmy: resolvedBlackArmy }, "w")) {
        board = applyHannibalBackRank(board, "w", shuffleArray(getDefaultHannibalBackRank("w")));
      }
      if (shouldShuffleHannibalBackRank({ mode: "ai", playerColor: humanColor, whiteArmy: resolvedWhiteArmy, blackArmy: resolvedBlackArmy }, "b")) {
        board = applyHannibalBackRank(board, "b", shuffleArray(getDefaultHannibalBackRank("b")));
      }
    }

    clearEngineCaches();
    setGame({ ...base, board, variant: "worldwar", whiteArmy: resolvedWhiteArmy, blackArmy: resolvedBlackArmy });
    setWorldWarSetup(null);
  }

  function handleReserveClick(piece, reserveIndex) {
    if (game.gameOver || thinking || pendingPromotion) return;
    if (mode === "ai" && game.turn !== playerColor) return;
    if (variantForColor(game, game.turn) !== "persian") return;
    if (getColor(piece) !== game.turn) return;

    setGame((prev) => ({ ...prev, selected: null, legalMoves: [] }));
    setSelectedReserve({ piece, reserveIndex });
  }

  function handleSquareClick(r, c) {
    if (game.gameOver || thinking || pendingPromotion) return;
    if (mode === "ai" && game.turn !== playerColor) return;

    const piece = game.board[r][c];

    if (selectedReserve) {
      const resurrectionMove = getResurrectionMoves(game).find(
        (move) => move.reserveIndex === selectedReserve.reserveIndex && move.piece === selectedReserve.piece && move.to[0] === r && move.to[1] === c
      );
      if (resurrectionMove) {
        applyAndFinalize(game, resurrectionMove);
        return;
      }
      setSelectedReserve(null);
    }

    if (game.selected) {
      const clickingSelectedSquare = game.selected[0] === r && game.selected[1] === c;

      if (clickingSelectedSquare) {
        setGame((prev) => ({ ...prev, selected: [r, c], legalMoves: prev.legalMoves }));
        return;
      }

      const chosenMove = game.legalMoves.find(
        (m) => m.to[0] === r && m.to[1] === c && !m.sacrifice
      );
      if (chosenMove) {
        if (moveNeedsPromotion(game, chosenMove)) {
          const promotionPieceColor = getColor(game.board[chosenMove.from[0]][chosenMove.from[1]]);
          setPendingPromotion({ move: chosenMove, color: promotionPieceColor });
        } else {
          applyAndFinalize(game, chosenMove);
        }
        return;
      }
    }

    if (piece && getColor(piece) === game.turn) {
      const legalMoves = generateLegalMovesForSquare(game, r, c);
      setGame((prev) => ({ ...prev, selected: [r, c], legalMoves }));
    } else {
      setGame((prev) => ({ ...prev, selected: null, legalMoves: [] }));
    }
  }

  function squareHighlighted(r, c) {
    if (selectedReserve) {
      return getResurrectionMoves(game).some(
        (m) => m.reserveIndex === selectedReserve.reserveIndex && m.piece === selectedReserve.piece && m.to[0] === r && m.to[1] === c
      );
    }
    return game.legalMoves.some((m) => m.to[0] === r && m.to[1] === c);
  }

  function selectedSquare(r, c) {
    return game.selected && game.selected[0] === r && game.selected[1] === c;
  }

  function isLastMoveSquare(r, c) {
    if (!lastMove) return false;
    return (lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c);
  }

  function isLastMoveToSquare(r, c) {
    if (!lastMove) return false;
    return lastMove.to[0] === r && lastMove.to[1] === c;
  }

  function isKatanaRemovedSquare(r, c) {
    if (!katanaEffect) return false;
    return katanaEffect.removedSquares.some(([rr, cc]) => rr === r && cc === c);
  }

  useEffect(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }

    if (hannibalSetup || worldWarSetup) return;
    if (mode !== "ai") return;
    if (!playerColor) return;
    if (game.gameOver) return;
    if (game.turn === playerColor) return;
    if (pendingPromotion) return;

    const token = ++aiSearchTokenRef.current;
    let cancelled = false;

    setThinking(true);
    setThinkingLabel(`${AI_NAME} is thinking...`);

    aiTimerRef.current = setTimeout(async () => {
      const move = await chooseStrongComputerMoveAsync(
        game,
        () => cancelled || token !== aiSearchTokenRef.current
      );

      if (cancelled || token !== aiSearchTokenRef.current) {
        return;
      }

      if (move) {
        applyAndFinalize(game, move);
      }

      if (!cancelled && token === aiSearchTokenRef.current) {
        setThinking(false);
        setThinkingLabel("");
      }

      aiTimerRef.current = null;
    }, AI_MOVE_DELAY_MS);

    return () => {
      cancelled = true;
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [game, mode, playerColor, hannibalSetup, worldWarSetup, pendingPromotion]);

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-xl w-full">
          <h1 className="text-3xl font-bold mb-6">Choose Game Mode</h1>
          <div className="mb-6">
            <div className="text-lg font-semibold mb-2">Variant</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 justify-center">
              <button onClick={() => setVariant("normal")} className={variantButtonClass("normal", variant === "normal")}>Normal Chess</button>
              <button onClick={() => setVariant("mongolian")} className={variantButtonClass("mongolian", variant === "mongolian")}>Mongolian Chess</button>
              <button onClick={() => setVariant("samurai")} className={variantButtonClass("samurai", variant === "samurai")}>Samurai Chess</button>
              <button onClick={() => setVariant("spartan")} className={variantButtonClass("spartan", variant === "spartan")}>Spartan Chess</button>
              <button onClick={() => setVariant("viking")} className={variantButtonClass("viking", variant === "viking")}>Viking Chess</button>
              <button onClick={() => setVariant("hannibal")} className={variantButtonClass("hannibal", variant === "hannibal")}>Hannibal Chess</button>
              <button onClick={() => setVariant("persian")} className={variantButtonClass("persian", variant === "persian")}>Persian Immortal Chess</button>
              <button onClick={() => setVariant("roman")} className={variantButtonClass("roman", variant === "roman")}>Roman Chess</button>
              <button onClick={() => setVariant("worldwar")} className={variantButtonClass("worldwar", variant === "worldwar")}>World War</button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                if (!variant) return;
                startGame("w", "pvp");
              }}
              className={`px-6 py-4 rounded-2xl text-lg ${variant ? "bg-neutral-900 text-white" : "bg-neutral-300 text-neutral-500 cursor-not-allowed"}`}
            >
              Two Player (Control Both Sides)
            </button>
            <button
              onClick={() => {
                if (!variant) return;
                setMode("ai_setup");
                setPlayerColor(null);
              }}
              className={`px-6 py-4 rounded-2xl text-lg ${variant ? "bg-neutral-700 text-white" : "bg-neutral-300 text-neutral-500 cursor-not-allowed"}`}
            >
              Play vs Computer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (worldWarSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-3xl w-full">
          <h1 className="text-3xl font-bold mb-3">Configure World War Matchup</h1>
          <p className="text-neutral-600 mb-6">
            Choose the faction rules for each side. White and Black can each use a different variant ruleset.
            Your selections determine both the starting army and the rules each side uses during the game.
          </p>
          {worldWarSetup.mode === "ai" && (
            <div className="mb-4 rounded-2xl bg-neutral-100 p-3 text-sm text-neutral-700">
              You are playing as <span className="font-semibold">{worldWarSetup.playerColor === "w" ? "White" : "Black"}</span>. The computer will control the other side.
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div>
              <div className="text-lg font-semibold mb-3">White Army</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWorldWarSetup((prev) => ({ ...prev, whiteArmy: "random" }))}
                  className={variantButtonClass("random", worldWarSetup.whiteArmy === "random")}
                >
                  Random
                </button>
                {ARMY_OPTIONS.map((army) => (
                  <button
                    key={`ww-w-${army}`}
                    onClick={() => setWorldWarSetup((prev) => ({ ...prev, whiteArmy: army }))}
                    className={variantButtonClass(army, worldWarSetup.whiteArmy === army)}
                  >
                    {variantLabelName(army)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold mb-3">Black Army</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWorldWarSetup((prev) => ({ ...prev, blackArmy: "random" }))}
                  className={variantButtonClass("random", worldWarSetup.blackArmy === "random")}
                >
                  Random
                </button>
                {ARMY_OPTIONS.map((army) => (
                  <button
                    key={`ww-b-${army}`}
                    onClick={() => setWorldWarSetup((prev) => ({ ...prev, blackArmy: army }))}
                    className={variantButtonClass(army, worldWarSetup.blackArmy === army)}
                  >
                    {variantLabelName(army)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-700">
            White: <span className="font-semibold">{variantLabelName(worldWarSetup.whiteArmy)}</span> • Black:{" "}
            <span className="font-semibold">{variantLabelName(worldWarSetup.blackArmy)}</span>
            <div className="mt-2 text-neutral-500">Examples: Samurai vs Spartan, Roman vs Viking, Persian Immortal vs Hannibal.</div>
          </div>
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => {
                cancelAiThinking();
                setMode(null);
                setPlayerColor(null);
                setWorldWarSetup(null);
              }}
              className="px-5 py-3 rounded-2xl bg-neutral-200"
            >
              Cancel
            </button>
            <button onClick={confirmWorldWarSetup} className="px-5 py-3 rounded-2xl bg-neutral-900 text-white">
              Start World War Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hannibalSetup) {
    const phaseKey = hannibalSetup.phase === "w" ? "whiteRank" : "blackRank";
    const currentRank = hannibalSetup[phaseKey];
    const displayIndices = hannibalSetup.phase === "b" ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const title = hannibalSetup.worldWar
      ? `Arrange ${hannibalSetup.phase === "w" ? "White" : "Black"} Hannibal Back Rank`
      : hannibalSetup.mode === "pvp"
      ? `Arrange ${hannibalSetup.phase === "w" ? "White" : "Black"} Back Rank`
      : `Arrange Your Hannibal Back Rank`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-3xl w-full">
          <h1 className="text-3xl font-bold mb-3">{title}</h1>
          <p className="text-neutral-600 mb-6">Click one piece, then another square to swap them. In Hannibal Chess, any back-rank piece may start on any back-rank square.</p>
          <div className="grid grid-cols-8 gap-3 mb-2">
            {displayIndices.map((actualIndex) => {
              const piece = currentRank[actualIndex];
              const isDarkSquare = ((hannibalSetup.phase === "w" ? 7 : 0) + actualIndex) % 2 === 1;
              return (
                <button
                  key={`${piece}-${actualIndex}`}
                  onClick={() => handleHannibalSlotClick(actualIndex)}
                  className={`aspect-square rounded-2xl border text-5xl flex items-center justify-center transition-all ${isDarkSquare ? "bg-amber-800/85 text-white border-amber-950" : "bg-amber-100 text-neutral-900 border-amber-300"} ${hannibalSelectedSlot === actualIndex ? "ring-4 ring-sky-400 scale-105" : ""}`}
                >
                  <span className={pieceClass(piece)}>{PIECES[piece]}</span>
                </button>
              );
            })}
          </div>
          <div className="mb-6 flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded border border-amber-300 bg-amber-100" />
              <span>Light square</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded border border-amber-950 bg-amber-800/85" />
              <span>Dark square</span>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                cancelAiThinking();
                setMode(null);
                setPlayerColor(null);
                setHannibalSetup(null);
                setHannibalSelectedSlot(null);
                setWorldWarSetup(null);
              }}
              className="px-5 py-3 rounded-2xl bg-neutral-200"
            >
              Cancel
            </button>
            <button onClick={confirmHannibalSetup} className="px-5 py-3 rounded-2xl bg-neutral-900 text-white">
              {hannibalSetup.worldWar
                ? (nextHannibalSetupPhase(hannibalSetup) ? "Next: Black Hannibal Setup" : "Start Game")
                : (hannibalSetup.mode === "pvp" && hannibalSetup.phase === "w" ? "Next: Black Setup" : "Start Game")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "ai_setup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-2xl w-full">
          <h1 className="text-3xl font-bold mb-3">Play vs {AI_NAME}</h1>
          <p className="text-neutral-600 mb-8">
            One stronger adaptive AI mode tuned for deeper search, better mate finishing, and stronger tactical threat recognition across variants.
          </p>

          <h2 className="text-2xl font-bold mb-4">Choose Your Color</h2>
          <div className="flex gap-6 justify-center">
            <button onClick={() => startGame("w", "ai")} className="px-6 py-4 bg-neutral-900 text-white rounded-2xl text-lg">
              Play White
            </button>
            <button onClick={() => startGame("b", "ai")} className="px-6 py-4 bg-neutral-700 text-white rounded-2xl text-lg">
              Play Black
            </button>
          </div>
          <button
            onClick={() => {
              cancelAiThinking();
              setMode(null);
              setPlayerColor(null);
              resetGame();
            }}
            className="mt-6 px-4 py-2 bg-neutral-200 rounded-xl"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const rowOrder = boardFacing === "w" ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
  const colOrder = boardFacing === "w" ? [...Array(8).keys()] : [...Array(8).keys()].reverse();

  return (
    <div className="min-h-screen bg-neutral-100 p-3 md:p-4 overflow-x-auto relative">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Playable Chess</h1>
            <p className="text-sm text-neutral-600">
              {mode === "ai"
                ? `Mode: vs Computer • ${AI_NAME} • Variant: ${variant === "normal" ? "Normal" : variant === "mongolian" ? "Mongolian" : variant === "samurai" ? "Samurai" : variant === "spartan" ? "Spartan" : variant === "viking" ? "Viking" : variant === "hannibal" ? "Hannibal" : variant === "roman" ? "Roman" : variant === "worldwar" ? `World War (${variantLabel(game.whiteArmy)} vs ${variantLabel(game.blackArmy)})` : "Persian Immortal"}`
                : `Mode: Two Player • Variant: ${variant === "normal" ? "Normal" : variant === "mongolian" ? "Mongolian" : variant === "samurai" ? "Samurai" : variant === "spartan" ? "Spartan" : variant === "viking" ? "Viking" : variant === "hannibal" ? "Hannibal" : variant === "roman" ? "Roman" : variant === "worldwar" ? `World War (${variantLabel(game.whiteArmy)} vs ${variantLabel(game.blackArmy)})` : "Persian Immortal"}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                cancelAiThinking();
                setPendingPromotion(null);
                resetGame();
              }}
              className="px-4 py-2 bg-neutral-200 rounded-xl"
            >
              New Game
            </button>
            <button
              onClick={() => {
                cancelAiThinking();
                clearEngineCaches();
                setPendingPromotion(null);
                setMode(null);
                setPlayerColor(null);
                setVariant(null);
                setWorldWarSetup(null);
                setHannibalSetup(null);
                setHannibalSelectedSlot(null);
                setSelectedReserve(null);
                setLastMove(null);
                setKatanaEffect(null);
                setEndOverlay(null);
                setSkipOverlay(null);
                setResurrectionOverlay(null);
                setGame(createInitialState("normal"));
              }}
              className="px-4 py-2 bg-neutral-800 text-white rounded-xl"
            >
              Menu
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(760px,820px)_320px] items-start">
          <div className="w-full min-w-[760px] flex items-start gap-3">
            {evalBarMode && (
              <div className="flex h-[calc(min(100vw,820px))] max-h-[820px] min-h-[760px] w-8 shrink-0 overflow-hidden rounded-2xl border bg-white shadow-lg">
                <div className="relative flex h-full w-full flex-col-reverse">
                  <div className="w-full bg-white transition-all duration-500" style={{ height: `${gameSummary.whitePercent}%` }} title={`White ${Math.round(gameSummary.whitePercent)}%`} />
                  <div className="w-full bg-neutral-900 transition-all duration-500" style={{ height: `${100 - gameSummary.whitePercent}%` }} title={`Black ${Math.round(100 - gameSummary.whitePercent)}%`} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-2 text-center text-[10px] font-semibold">
                    <span className="text-neutral-900">W</span>
                    <span className="text-white">B</span>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-[32px_repeat(8,minmax(84px,1fr))] grid-rows-[repeat(8,minmax(84px,1fr))_32px] border bg-white rounded-2xl overflow-hidden shadow-lg aspect-square">
              {rowOrder.map((r) => (
                <React.Fragment key={r}>
                  <div className="flex items-center justify-center text-xs bg-neutral-200 font-semibold">{8 - r}</div>
                  {colOrder.map((c) => {
                    const dark = (r + c) % 2 === 1;
                    const piece = game.board[r][c];
                    const highlight = squareHighlighted(r, c);
                    const selected = selectedSquare(r, c);
                    const inCheckKing = piece === `${game.turn}k` && gameSummary.inCheck;
                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => handleSquareClick(r, c)}
                        className={`relative aspect-square text-4xl md:text-5xl lg:text-6xl transition-all duration-300 overflow-hidden ${dark ? "bg-amber-700" : "bg-amber-100"} ${selected ? "ring-4 ring-sky-500 ring-inset" : ""} ${inCheckKing ? "ring-4 ring-red-500 ring-inset" : ""} ${isLastMoveSquare(r, c) ? "shadow-[inset_0_0_0_9999px_rgba(250,204,21,0.22)]" : ""}`}
                      >
                        {highlight && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className={`${piece ? "h-12 w-12 border-4 border-emerald-500 rounded-full" : "h-4 w-4 bg-emerald-500 rounded-full"}`} />
                          </span>
                        )}
                        {isLastMoveToSquare(r, c) && (
                          <span className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <span className="h-16 w-16 rounded-full border-4 border-yellow-300/90 animate-ping" />
                          </span>
                        )}
                        {isKatanaRemovedSquare(r, c) && (
                          <>
                            <span className="absolute inset-0 pointer-events-none bg-red-500/25 animate-pulse" />
                            <span className="absolute inset-[-20%] pointer-events-none flex items-center justify-center text-5xl md:text-6xl text-white/90 rotate-[-28deg] animate-pulse">╱</span>
                            <span className="absolute inset-0 pointer-events-none border-2 border-red-400/80 animate-ping" />
                          </>
                        )}
                        <span
  className={`relative z-10 transition-transform duration-200 ${isLastMoveToSquare(r, c) ? "scale-110" : "scale-100"} ${pieceClass(piece)}`}
  style={pieceFontStyle()}
>
  {piece ? PIECES[piece] : ""}
</span>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
              <div />
              {colOrder.map((c) => (
                <div key={c} className="text-xs flex items-center justify-center bg-neutral-200 font-semibold">
                  {FILES[c]}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 xl:w-[320px] min-w-[280px]">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="text-lg font-semibold">Status</div>
              <div className="mt-2 text-neutral-800">{thinking ? thinkingLabel : game.status}</div>
              {game.gameOver && game.status.includes("insufficient material") && (
                <div className="mt-2 text-sm text-neutral-600">Neither side has enough material left to deliver checkmate.</div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-neutral-100 rounded-xl p-3">
                  <div className="font-medium">Turn</div>
                  <div>{game.turn === "w" ? "White" : "Black"}</div>
                </div>
                <div className="bg-neutral-100 rounded-xl p-3">
                  <div className="font-medium">Legal moves</div>
                  <div>{gameSummary.legalCount}</div>
                </div>
              </div>

              {hasSamuraiSide && (
                <div className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-neutral-900">Samurai action</div>
                      <div className="text-neutral-600">
                        {currentTurnArmy === "samurai"
                          ? "You may sacrifice your selected non-king piece instead of moving it. Matching-type captures also trigger Samurai deletion rules."
                          : "The Samurai action becomes available when it is the Samurai side's turn."}
                      </div>
                    </div>
                    <button
                      onClick={handleSacrifice}
                      disabled={
                        currentTurnArmy !== "samurai" ||
                        !game.selected ||
                        (game.selected &&
                          (!game.board[game.selected[0]][game.selected[1]] ||
                            getType(game.board[game.selected[0]][game.selected[1]]) === "k" ||
                            getColor(game.board[game.selected[0]][game.selected[1]]) !== game.turn)) ||
                        thinking ||
                        game.gameOver ||
                        (mode === "ai" && game.turn !== playerColor)
                      }
                      className="px-4 py-2 rounded-xl bg-neutral-900 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Sacrifice Selected
                    </button>
                  </div>
                </div>
              )}

              {hasRomanSide && (
                <div className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-700">
                  <div className="font-medium text-neutral-900">Roman rule</div>
                  <div className="mt-1">
                    Each Roman side has two kings and no queen. If either Roman king is lost, that side loses. A Roman king may move onto an attacked square, but doing so loses immediately.
                  </div>
                </div>
              )}

              {hasPersianSide && (
                <div className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-700">
                  <div className="font-medium text-neutral-900">Persian reserve</div>
                  <div className="mt-1">Captured pieces go to reserve. Click one of your reserve pieces, then click any open valid starting square for that piece to resurrect it. Resurrection uses your whole turn.</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div className={`rounded-xl border p-3 ${gameSummary.whiteSkipQueued > 0 ? "border-purple-500 bg-purple-100" : "border-neutral-200 bg-white"}`}>
                      <div className="font-semibold uppercase tracking-wide text-neutral-500">White skip</div>
                      <div className={`mt-1 ${gameSummary.whiteSkipQueued > 0 ? "font-bold text-purple-800" : "text-neutral-500"}`}>
                        {gameSummary.whiteSkipQueued > 0 ? "Queued after resurrection" : "None queued"}
                      </div>
                    </div>
                    <div className={`rounded-xl border p-3 ${gameSummary.blackSkipQueued > 0 ? "border-purple-500 bg-purple-100" : "border-neutral-200 bg-white"}`}>
                      <div className="font-semibold uppercase tracking-wide text-neutral-500">Black skip</div>
                      <div className={`mt-1 ${gameSummary.blackSkipQueued > 0 ? "font-bold text-purple-800" : "text-neutral-500"}`}>
                        {gameSummary.blackSkipQueued > 0 ? "Queued after resurrection" : "None queued"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">White reserve</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(game.reserve?.w || []).length === 0 ? <span className="text-xs text-neutral-400">Empty</span> : game.reserve.w.map((piece, index) => (
                        <button
                          key={`w-${piece}-${index}`}
                          onClick={() => handleReserveClick(piece, index)}
                          className={`h-10 w-10 rounded-xl border text-2xl ${selectedReserve && selectedReserve.piece === piece && selectedReserve.reserveIndex === index ? "bg-amber-100 border-amber-400" : "bg-white border-neutral-300"}`}
                        >
                          <span className={pieceClass(piece)}>{PIECES[piece]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Black reserve</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(game.reserve?.b || []).length === 0 ? <span className="text-xs text-neutral-400">Empty</span> : game.reserve.b.map((piece, index) => (
                        <button
                          key={`b-${piece}-${index}`}
                          onClick={() => handleReserveClick(piece, index)}
                          className={`h-10 w-10 rounded-xl border text-2xl ${selectedReserve && selectedReserve.piece === piece && selectedReserve.reserveIndex === index ? "bg-amber-100 border-amber-400" : "bg-white border-neutral-300"}`}
                        >
                          <span className={pieceClass(piece)}>{PIECES[piece]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-100 p-3 text-sm">
                <div>
                  <div className="font-medium text-neutral-900">Win Bar</div>
                  <div className="text-neutral-600">Show who is ahead from the current position.</div>
                </div>
                <button
                  onClick={() => setEvalBarMode((prev) => !prev)}
                  className={`rounded-full px-4 py-2 font-medium ${evalBarMode ? "bg-neutral-900 text-white" : "bg-white text-neutral-700 border border-neutral-300"}`}
                >
                  {evalBarMode ? "On" : "Off"}
                </button>
              </div>
              {evalBarMode && (
                <div className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm">
                  <div className="font-medium text-neutral-900">Position edge</div>
                  <div className="mt-1 text-neutral-700">
                    {gameSummary.rawEval > 0 ? "White is ahead" : gameSummary.rawEval < 0 ? "Black is ahead" : "Even position"}
                    {` • ${Math.round(gameSummary.whitePercent)} / ${Math.round(100 - gameSummary.whitePercent)}`}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-100 p-3 text-sm">
                <div>
                  <div className="font-medium text-neutral-900">Coach Mode</div>
                  <div className="text-neutral-600">Show opening name and move quality.</div>
                </div>
                <button
                  onClick={() => setCoachMode((prev) => !prev)}
                  className={`rounded-full px-4 py-2 font-medium ${coachMode ? "bg-neutral-900 text-white" : "bg-white text-neutral-700 border border-neutral-300"}`}
                >
                  {coachMode ? "On" : "Off"}
                </button>
              </div>
              {coachMode && (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-neutral-100 p-3">
                    <div className="font-medium text-neutral-900">Opening</div>
                    <div className="text-neutral-700 mt-1">{game.moveKeys.length === 0 ? "No opening yet" : gameSummary.openingName}</div>
                  </div>
                  <div className="rounded-xl bg-neutral-100 p-3">
                    <div className="font-medium text-neutral-900">Last move assessment</div>
                    {gameSummary.latestInsight ? (() => {
                      const q = gameSummary.latestInsight.quality;
                      const color = q === "Brilliant" ? "text-blue-500" : q === "Best" ? "text-green-600" : q === "Excellent" ? "text-green-500" : q === "Good" ? "text-yellow-600" : q === "Inaccuracy" ? "text-yellow-500" : q === "Mistake" ? "text-orange-600" : q === "Blunder" ? "text-red-600" : "text-neutral-700";
                      return (
                        <div className={`mt-1 ${color}`}>
                          {gameSummary.latestInsight.notation}: {gameSummary.latestInsight.quality}
                          {gameSummary.latestInsight.quality !== "Best" ? ` (${gameSummary.latestInsight.loss} cp off best)` : ""}
                        </div>
                      );
                    })() : (
                      <div className="mt-1 text-neutral-500">No move evaluated yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="text-lg font-semibold">Captured / Lost Pieces</div>
              {(() => {
                const missing = getMissingPieces(game.board, game.reserve, game.whiteArmy || game.variant || "normal", game.blackArmy || game.variant || "normal");
                return (
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="rounded-xl bg-neutral-100 p-3">
                      <div className="font-medium text-neutral-900">White lost</div>
                      <div className="mt-2 flex flex-wrap gap-2 min-h-10">
                        {missing.w.length === 0 ? <span className="text-neutral-500">None</span> : missing.w.map((piece, index) => (
                          <span key={`lost-w-${piece}-${index}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 bg-white text-2xl">
                            <span className={pieceClass(piece)}>{PIECES[piece]}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-100 p-3">
                      <div className="font-medium text-neutral-900">Black lost</div>
                      <div className="mt-2 flex flex-wrap gap-2 min-h-10">
                        {missing.b.length === 0 ? <span className="text-neutral-500">None</span> : missing.b.map((piece, index) => (
                          <span key={`lost-b-${piece}-${index}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 bg-white text-2xl">
                            <span className={pieceClass(piece)}>{PIECES[piece]}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="text-lg font-semibold">Move Log</div>
              <div className="mt-3 h-[280px] overflow-y-auto rounded-xl bg-neutral-100 p-3 space-y-2 text-sm">
                {game.moveHistory.length === 0 ? (
                  <div className="text-neutral-500">No moves yet.</div>
                ) : (
                  [...game.moveHistory].reverse().map((move, reversedIndex) => {
                    const index = game.moveHistory.length - 1 - reversedIndex;
                    const moverColor = game.moveSides?.[index] || (index % 2 === 0 ? "w" : "b");
                    const mover = moverColor === "w" ? "White" : "Black";
                    return (
                      <div
                        key={`${index}-${move}`}
                        className={`rounded-lg px-3 py-2 shadow-sm ${index === game.moveHistory.length - 1 ? "bg-yellow-100 ring-2 ring-yellow-300" : (moverColor === "w" ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-white")}`}
                      >
                        <span className="text-neutral-500 font-medium mr-2">{Math.floor(index / 2) + 1}{moverColor === "w" ? "." : "..."}</span>
                        <span className="font-semibold mr-2">{mover}:</span>
                        {move}
                        {coachMode && game.moveInsights[index] && (
                          <div className="mt-1 text-xs text-neutral-500">
                            {game.moveInsights[index].quality}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 text-sm text-neutral-700 leading-6">
              <div className="text-lg font-semibold text-neutral-900 mb-2">Variant Rules</div>
              {game.variant === "worldwar" ? (
                <div className="space-y-3 whitespace-pre-line">
                  <div>
                    <div className="font-semibold">White Rules</div>
                    <div>{VARIANT_RULES[game.whiteArmy]?.text}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Black Rules</div>
                    <div>{VARIANT_RULES[game.blackArmy]?.text}</div>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-line">{VARIANT_RULES[game.variant || variant || "normal"]?.text}</div>
              )}

                            {isSamuraiVsMongolianWorldWar(game) && (
                <div className="mt-4 rounded-xl bg-neutral-100 p-3">
                  <div className="font-semibold text-neutral-900">World War interaction</div>
                  <div className="mt-1">
                    If a Samurai knight captures a Mongolian knight, all remaining Mongolian knights are destroyed. Since Mongolian loses when all knights are gone, that capture is usually immediate defeat.
                    More generally, Samurai same-type captures like knight-to-knight, bishop-to-bishop, and rook-to-rook are catastrophic because they wipe out the rest of that piece type.
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="text-lg font-semibold text-neutral-900 mb-2">About the AI</div>
                <p>
                  Strong AI uses deeper adaptive search with iterative deepening, mate checks, and better threat handling.
                </p>
                <p className="mt-2">
                  It looks for immediate wins first, heavily penalizes moves that allow immediate losses, searches deeper in quiet and endgame positions, and extends forcing check lines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {resurrectionOverlay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-violet-900/15 animate-pulse" />
          <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-violet-700/95 via-purple-700/95 to-fuchsia-700/95 px-10 py-7 text-center shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,white_0%,transparent_60%)]" />
            <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/80 bg-white/12 text-6xl shadow-lg">
              <span className={pieceClass(resurrectionOverlay.piece)}>{PIECES[resurrectionOverlay.piece]}</span>
            </div>
            <div className="relative text-[clamp(2rem,6vw,4.2rem)] font-black uppercase tracking-[0.14em] text-gray-100 [text-shadow:0_2px_0_rgba(0,0,0,0.35)] animate-pulse">
              Resurrection
            </div>
            <div className="relative mt-2 text-lg md:text-2xl font-bold text-white">
              {resurrectionOverlay.message}
            </div>
            <div className="relative mt-1 text-sm md:text-base font-semibold text-gray-100/90">
              {resurrectionOverlay.submessage}
            </div>
          </div>
        </div>
      )}

      {skipOverlay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-purple-900/20 animate-pulse" />
          <div className="relative rounded-3xl border-4 border-white bg-purple-700/90 px-10 py-6 text-center shadow-2xl backdrop-blur-sm">
            <div className="text-[clamp(2.2rem,7vw,4.8rem)] font-black uppercase tracking-[0.16em] text-gray-100 [text-shadow:0_2px_0_rgba(0,0,0,0.35)] animate-bounce">
              Skipped Turn
            </div>
            <div className="mt-2 text-lg md:text-2xl font-bold text-white">
              {skipOverlay.message}
            </div>
          </div>
        </div>
      )}

      {pendingPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45">
          <div className="rounded-3xl bg-white p-6 shadow-2xl w-[min(92vw,420px)]">
            <div className="text-2xl font-bold text-center mb-2">Choose Promotion</div>
            <div className="text-sm text-neutral-600 text-center mb-5">Select the piece to promote your pawn into.</div>
            <div className="grid grid-cols-4 gap-3">
              {["q", "r", "b", "n"].map((type) => {
                const piece = `${pendingPromotion.color}${type}`;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      const pending = pendingPromotion;
                      setPendingPromotion(null);
                      applyAndFinalize(game, pending.move, type);
                    }}
                    className="rounded-2xl border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 p-4 text-5xl flex items-center justify-center"
                  >
                    <span className={pieceClass(piece)}>{PIECES[piece]}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-center">
              <button onClick={() => setPendingPromotion(null)} className="px-4 py-2 rounded-xl bg-neutral-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {endOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className={`absolute inset-0 ${endOverlay.kind === "victory" ? "bg-black/55" : "bg-neutral-900/45"} animate-pulse`} />
          <div className="relative flex flex-col items-center justify-center px-6 text-center">
            <div className={`mb-6 text-[clamp(3rem,10vw,7rem)] font-black tracking-[0.18em] uppercase drop-shadow-2xl animate-bounce ${endOverlay.kind === "victory" ? "text-yellow-300" : "text-sky-200"}`}>
              {endOverlay.kind === "victory" ? "Checkmate" : "Draw"}
            </div>
            <div className={`rounded-3xl border px-8 py-5 text-lg md:text-2xl font-bold shadow-2xl backdrop-blur-sm ${endOverlay.kind === "victory" ? "border-yellow-200/70 bg-yellow-100/12 text-white" : "border-sky-200/70 bg-sky-100/12 text-white"}`}>
              {endOverlay.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}