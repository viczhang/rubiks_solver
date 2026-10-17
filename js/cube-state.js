/**
 * Core 3x3x3 Rubik's Cube State & Solvability Validator
 * Follows the official Rubik's Solve Guide orientation:
 *   UP (+Y)    = Yellow ('Y')
 *   DOWN (-Y)  = White  ('W')
 *   FRONT (+Z) = Red    ('R')
 *   BACK (-Z)  = Orange ('O')
 *   LEFT (-X)  = Blue   ('B')
 *   RIGHT (+X) = Green  ('G')
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RubiksCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLORS = {
    Y: { code: 'Y', name: 'Yellow', hex: '#FCE000', css: 'yellow', defaultFace: 'U' },
    W: { code: 'W', name: 'White',  hex: '#FFFFFF', css: 'white',  defaultFace: 'D' },
    R: { code: 'R', name: 'Red',    hex: '#E31B23', css: 'red',    defaultFace: 'F' },
    O: { code: 'O', name: 'Orange', hex: '#FF6B00', css: 'orange', defaultFace: 'B' },
    B: { code: 'B', name: 'Blue',   hex: '#0051BA', css: 'blue',   defaultFace: 'L' },
    G: { code: 'G', name: 'Green',  hex: '#009E60', css: 'green',  defaultFace: 'R' }
  };

  const FACE_NORMALS = {
    U: [0, 1, 0],
    D: [0, -1, 0],
    F: [0, 0, 1],
    B: [0, 0, -1],
    L: [-1, 0, 0],
    R: [1, 0, 0]
  };

  const DEFAULT_FACE_COLORS = {
    U: 'Y',
    D: 'W',
    F: 'R',
    B: 'O',
    L: 'B',
    R: 'G'
  };

  // Side faces ordered clockwise when looking at U from above: F -> L -> B -> R
  // Wait: if someone rotates the whole cube around Y (keeping Yellow on UP),
  // which side faces are Left, Back, Right relative to a chosen Front face?
  // When Red ('F') is Front: Left is Blue ('L'), Back is Orange ('B'), Right is Green ('R').
  // When Green ('R') is Front: Left is Red ('F'), Back is Blue ('L'), Right is Orange ('B').
  // When Orange ('B') is Front: Left is Green ('R'), Back is Red ('F'), Right is Blue ('L').
  // When Blue ('L') is Front: Left is Orange ('B'), Back is Green ('R'), Right is Red ('F').
  const PERSPECTIVE_MAP = {
    F: { F: 'F', R: 'R', B: 'B', L: 'L', U: 'U', D: 'D', frontColor: 'R', frontName: 'Red' },
    R: { F: 'R', R: 'B', B: 'L', L: 'F', U: 'U', D: 'D', frontColor: 'G', frontName: 'Green' },
    B: { F: 'B', R: 'L', B: 'F', L: 'R', U: 'U', D: 'D', frontColor: 'O', frontName: 'Orange' },
    L: { F: 'L', R: 'F', B: 'R', L: 'B', U: 'U', D: 'D', frontColor: 'B', frontName: 'Blue' }
  };

  const COLOR_TO_FACE = {
    Y: 'U',
    W: 'D',
    R: 'F',
    O: 'B',
    B: 'L',
    G: 'R'
  };

  /**
   * Rotate a 3D integer vector [x, y, z] by 90 degrees clockwise for a given face normal.
   */
  function rotateVecCW(vec, face) {
    const [x, y, z] = vec;
    switch (face) {
      case 'U': return [-z, y, x];
      case 'D': return [z, y, -x];
      case 'F': return [y, -x, z];
      case 'B': return [-y, x, z];
      case 'R': return [x, z, -y];
      case 'L': return [x, -z, y];
      default: throw new Error('Unknown face: ' + face);
    }
  }

  function normalToFace(nx, ny, nz) {
    if (ny === 1) return 'U';
    if (ny === -1) return 'D';
    if (nz === 1) return 'F';
    if (nz === -1) return 'B';
    if (nx === -1) return 'L';
    if (nx === 1) return 'R';
    return null;
  }

  /**
   * Maps a face ('U','D','F','B','L','R') and 2D grid row (0..2), col (0..2)
   * to a 3D cubie coordinate [x, y, z].
   * Standard net orientation for each face when looking directly at that face
   * (with Yellow UP for F, B, L, R; Back at top for U; Front at top for D):
   */
  function faceRowColToXYZ(face, row, col) {
    switch (face) {
      case 'U': // Looking down at U with B at top (row=0 -> z=-1), F at bottom (row=2 -> z=+1), L at left (col=0 -> x=-1), R at right (col=2 -> x=+1)
        return [col - 1, 1, row - 1];
      case 'D': // Looking up at D with F at top (row=0 -> z=+1), B at bottom (row=2 -> z=-1), L at left (col=0 -> x=-1), R at right (col=2 -> x=+1)
        return [col - 1, -1, 1 - row];
      case 'F': // Looking at F with U at top (row=0 -> y=+1), L at left (col=0 -> x=-1)
        return [col - 1, 1 - row, 1];
      case 'B': // Looking at B from behind with U at top (row=0 -> y=+1), R at left (col=0 -> x=+1), L at right (col=2 -> x=-1)
        return [1 - col, 1 - row, -1];
      case 'L': // Looking at L from left with U at top (row=0 -> y=+1), B at left (col=0 -> z=-1), F at right (col=2 -> z=+1)
        return [-1, 1 - row, col - 1];
      case 'R': // Looking at R from right with U at top (row=0 -> y=+1), F at left (col=0 -> z=+1), B at right (col=2 -> z=-1)
        return [1, 1 - row, 1 - col];
      default:
        throw new Error('Invalid face: ' + face);
    }
  }

  class CubeState {
    constructor(cubies) {
      if (cubies) {
        this.cubies = cubies.map(c => ({
          id: c.id,
          homePos: [...c.homePos],
          pos: [...c.pos],
          stickers: { ...c.stickers } // keyed by current face ('U','D','F','B','L','R') -> color code ('Y','W','R','O','B','G')
        }));
      } else {
        this.reset();
      }
    }

    reset() {
      this.cubies = [];
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if (x === 0 && y === 0 && z === 0) continue;
            const stickers = {};
            if (y === 1) stickers.U = DEFAULT_FACE_COLORS.U;
            if (y === -1) stickers.D = DEFAULT_FACE_COLORS.D;
            if (z === 1) stickers.F = DEFAULT_FACE_COLORS.F;
            if (z === -1) stickers.B = DEFAULT_FACE_COLORS.B;
            if (x === -1) stickers.L = DEFAULT_FACE_COLORS.L;
            if (x === 1) stickers.R = DEFAULT_FACE_COLORS.R;
            const id = `${x}_${y}_${z}`;
            this.cubies.push({
              id,
              homePos: [x, y, z],
              pos: [x, y, z],
              stickers
            });
          }
        }
      }
      return this;
    }

    clone() {
      return new CubeState(this.cubies);
    }

    /**
     * Find the cubie currently at [x, y, z]
     */
    getCubieAt(x, y, z) {
      for (let i = 0; i < this.cubies.length; i++) {
        const p = this.cubies[i].pos;
        if (p[0] === x && p[1] === y && p[2] === z) {
          return this.cubies[i];
        }
      }
      return null;
    }

    /**
     * Get the color code on a specific face at [x, y, z]
     */
    getStickerAt(x, y, z, face) {
      const c = this.getCubieAt(x, y, z);
      return c ? c.stickers[face] || null : null;
    }

    /**
     * Returns whether a cubie belongs on the layer for `face` ('U','D','F','B','L','R')
     */
    static isCubieInFace(pos, face) {
      const [x, y, z] = pos;
      switch (face) {
        case 'U': return y === 1;
        case 'D': return y === -1;
        case 'F': return z === 1;
        case 'B': return z === -1;
        case 'L': return x === -1;
        case 'R': return x === 1;
        default: return false;
      }
    }

    /**
     * Rotate a single face ('U','D','F','B','L','R') by 90 deg CW (quarterTurns=1),
     * 180 deg (quarterTurns=2), or 90 deg CCW (quarterTurns=3).
     */
    rotateFaceQuarter(face) {
      for (let i = 0; i < this.cubies.length; i++) {
        const cubie = this.cubies[i];
        if (!CubeState.isCubieInFace(cubie.pos, face)) continue;

        cubie.pos = rotateVecCW(cubie.pos, face);
        const newStickers = {};
        const stickerFaces = Object.keys(cubie.stickers);
        for (let j = 0; j < stickerFaces.length; j++) {
          const oldFace = stickerFaces[j];
          const [nx, ny, nz] = rotateVecCW(FACE_NORMALS[oldFace], face);
          const nextFace = normalToFace(nx, ny, nz);
          newStickers[nextFace] = cubie.stickers[oldFace];
        }
        cubie.stickers = newStickers;
      }
    }

    /**
     * Apply a single move token in absolute cube coordinates:
     * e.g., "R", "R'", "R2", "U", "U'", "U2", "F", "F'", "F2", "L", "L'", "L2", "B", "B'", "B2", "D", "D'", "D2"
     */
    applyMove(moveStr) {
      if (!moveStr) return this;
      const token = moveStr.trim();
      if (!token) return this;

      const face = token[0].toUpperCase();
      if (!FACE_NORMALS[face]) {
        throw new Error('Invalid move token: ' + token);
      }
      const modifier = token.slice(1);
      let quarters = 1;
      if (modifier === "'" || modifier === '’' || modifier === 'i') {
        quarters = 3;
      } else if (modifier === '2' || modifier === "2'") {
        quarters = 2;
      }
      for (let q = 0; q < quarters; q++) {
        this.rotateFaceQuarter(face);
      }
      return this;
    }

    /**
     * Apply a sequence of space-separated moves or an array of moves.
     */
    applyMoves(moves) {
      const list = Array.isArray(moves)
        ? moves
        : String(moves).trim().split(/\s+/).filter(Boolean);
      for (const m of list) {
        this.applyMove(m);
      }
      return this;
    }

    /**
     * Translate a move written relative to a chosen Front face ('F','R','B','L')
     * into an absolute move on the cube (while Yellow remains on U).
     * Example: if frontFace === 'R' (Green center in front), then relative 'F' is absolute 'R',
     * relative 'R' is absolute 'B', relative 'L' is absolute 'F', relative 'U' is absolute 'U'.
     */
    static translateRelativeMove(relMove, frontFace = 'F') {
      const token = relMove.trim();
      const baseFace = token[0].toUpperCase();
      const mod = token.slice(1);
      const map = PERSPECTIVE_MAP[frontFace] || PERSPECTIVE_MAP.F;
      const absFace = map[baseFace] || baseFace;
      return absFace + mod;
    }

    static translateRelativeMoves(relMoves, frontFace = 'F') {
      const list = Array.isArray(relMoves)
        ? relMoves
        : String(relMoves).trim().split(/\s+/).filter(Boolean);
      return list.map(m => CubeState.translateRelativeMove(m, frontFace));
    }

    static invertMove(move) {
      const token = move.trim();
      const face = token[0];
      const mod = token.slice(1);
      if (mod === '2') return token;
      if (mod === "'") return face;
      return face + "'";
    }

    /**
     * Check if the cube is completely solved.
     */
    isSolved() {
      for (const cubie of this.cubies) {
        for (const [face, color] of Object.entries(cubie.stickers)) {
          if (DEFAULT_FACE_COLORS[face] !== color) return false;
        }
      }
      return true;
    }

    /**
     * Export to a 6-face 3x3 grid object:
     * { U: [[..],[..],[..]], D: ..., F: ..., B: ..., L: ..., R: ... }
     */
    toFaceGrid() {
      const grid = {};
      for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
        grid[face] = [
          [null, null, null],
          [null, null, null],
          [null, null, null]
        ];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const [x, y, z] = faceRowColToXYZ(face, r, c);
            grid[face][r][c] = this.getStickerAt(x, y, z, face);
          }
        }
      }
      return grid;
    }

    /**
     * Populate the CubeState from a 6-face 3x3 grid object, validating solvability.
     */
    static fromFaceGrid(grid) {
      const state = new CubeState();
      for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const [x, y, z] = faceRowColToXYZ(face, r, c);
            const cubie = state.getCubieAt(x, y, z);
            cubie.stickers[face] = grid[face][r][c];
          }
        }
      }
      // Update each cubie's homePos according to its sticker colors if valid
      for (const cubie of state.cubies) {
        let hx = 0, hy = 0, hz = 0;
        for (const color of Object.values(cubie.stickers)) {
          const homeFace = COLOR_TO_FACE[color];
          if (homeFace) {
            const [nx, ny, nz] = FACE_NORMALS[homeFace];
            hx += nx;
            hy += ny;
            hz += nz;
          }
        }
        cubie.homePos = [hx, hy, hz];
        cubie.id = `${hx}_${hy}_${hz}`;
      }
      return state;
    }

    /**
     * Generate a random N-move scramble and apply it.
     */
    scramble(length = 20) {
      const faces = ['U', 'D', 'F', 'B', 'L', 'R'];
      const mods = ['', "'", '2'];
      const axis = { U: 0, D: 0, F: 1, B: 1, L: 2, R: 2 };
      const moves = [];
      let lastFace = null;
      let secondLastFace = null;

      for (let i = 0; i < length; i++) {
        let candidate;
        do {
          candidate = faces[Math.floor(Math.random() * faces.length)];
        } while (
          candidate === lastFace ||
          (secondLastFace && axis[candidate] === axis[lastFace] && candidate === secondLastFace)
        );
        const mod = mods[Math.floor(Math.random() * mods.length)];
        moves.push(candidate + mod);
        secondLastFace = lastFace;
        lastFace = candidate;
      }

      this.applyMoves(moves);
      return moves;
    }

    /**
     * Comprehensive Solvability Validator for user-painted cubes.
     * Checks:
     *  1. Centers match U=Y, D=W, F=R, B=O, L=B, R=G
     *  2. Color counts: exactly 9 of each color
     *  3. Valid 8 corner piece color sets and 12 edge piece color sets (no duplicates/missing pieces)
     *  4. Corner orientation twist invariant (sum mod 3 === 0)
     *  5. Edge orientation flip invariant (sum mod 2 === 0)
     *  6. Overall permutation parity (corner parity === edge parity)
     */
    validate() {
      const counts = { Y: 0, W: 0, R: 0, O: 0, B: 0, G: 0 };
      for (const cubie of this.cubies) {
        for (const color of Object.values(cubie.stickers)) {
          if (!counts.hasOwnProperty(color)) {
            return { valid: false, error: `Unknown sticker color "${color}".` };
          }
          counts[color]++;
        }
      }

      // 1. Check centers
      for (const [face, expectedColor] of Object.entries(DEFAULT_FACE_COLORS)) {
        const [nx, ny, nz] = FACE_NORMALS[face];
        const actual = this.getStickerAt(nx, ny, nz, face);
        if (actual !== expectedColor) {
          return {
            valid: false,
            error: `Center piece on ${face} face must be ${COLORS[expectedColor].name}.`
          };
        }
      }

      // 2. Check color counts
      const wrongCounts = [];
      for (const [code, count] of Object.entries(counts)) {
        if (count !== 9) {
          wrongCounts.push(`${COLORS[code].name}: ${count}/9`);
        }
      }
      if (wrongCounts.length > 0) {
        return {
          valid: false,
          error: `Each color must appear exactly 9 times (${wrongCounts.join(', ')}).`
        };
      }

      // Define canonical 8 corners and 12 edges
      const CORNER_SLOTS = [
        { pos: [1, 1, 1],   faces: ['U', 'R', 'F'], colors: ['Y', 'G', 'R'] }, // URF
        { pos: [-1, 1, 1],  faces: ['U', 'F', 'L'], colors: ['Y', 'R', 'B'] }, // UFL
        { pos: [-1, 1, -1], faces: ['U', 'L', 'B'], colors: ['Y', 'B', 'O'] }, // ULB
        { pos: [1, 1, -1],  faces: ['U', 'B', 'R'], colors: ['Y', 'O', 'G'] }, // UBR
        { pos: [1, -1, 1],  faces: ['D', 'F', 'R'], colors: ['W', 'R', 'G'] }, // DFR
        { pos: [-1, -1, 1], faces: ['D', 'L', 'F'], colors: ['W', 'B', 'R'] }, // DLF
        { pos: [-1, -1, -1],faces: ['D', 'B', 'L'], colors: ['W', 'O', 'B'] }, // DBL
        { pos: [1, -1, -1], faces: ['D', 'R', 'B'], colors: ['W', 'G', 'O'] }  // DRB
      ];

      const EDGE_SLOTS = [
        { pos: [0, 1, 1],   faces: ['U', 'F'], colors: ['Y', 'R'] }, // UF
        { pos: [-1, 1, 0],  faces: ['U', 'L'], colors: ['Y', 'B'] }, // UL
        { pos: [0, 1, -1],  faces: ['U', 'B'], colors: ['Y', 'O'] }, // UB
        { pos: [1, 1, 0],   faces: ['U', 'R'], colors: ['Y', 'G'] }, // UR
        { pos: [0, -1, 1],  faces: ['D', 'F'], colors: ['W', 'R'] }, // DF
        { pos: [-1, -1, 0], faces: ['D', 'L'], colors: ['W', 'B'] }, // DL
        { pos: [0, -1, -1], faces: ['D', 'B'], colors: ['W', 'O'] }, // DB
        { pos: [1, -1, 0],  faces: ['D', 'R'], colors: ['W', 'G'] }, // DR
        { pos: [1, 0, 1],   faces: ['F', 'R'], colors: ['R', 'G'] }, // FR
        { pos: [-1, 0, 1],  faces: ['F', 'L'], colors: ['R', 'B'] }, // FL
        { pos: [-1, 0, -1], faces: ['B', 'L'], colors: ['O', 'B'] }, // BL
        { pos: [1, 0, -1],  faces: ['B', 'R'], colors: ['O', 'G'] }  // BR
      ];

      // 3 & 4. Check corners & twist
      const cornerPerm = new Array(8).fill(-1);
      const seenCorners = new Set();
      let cornerTwistSum = 0;

      for (let i = 0; i < 8; i++) {
        const slot = CORNER_SLOTS[i];
        const cubie = this.getCubieAt(...slot.pos);
        const actualColors = slot.faces.map(f => cubie.stickers[f]);
        const sortedActual = [...actualColors].sort().join('');

        let matchedIdx = -1;
        for (let j = 0; j < 8; j++) {
          if ([...CORNER_SLOTS[j].colors].sort().join('') === sortedActual) {
            matchedIdx = j;
            break;
          }
        }
        if (matchedIdx === -1) {
          const names = actualColors.map(c => COLORS[c].name).join('-');
          return {
            valid: false,
            error: `Invalid corner piece (${names}) at ${slot.faces.join('')}. That color combination cannot exist on a standard Rubik's Cube.`
          };
        }
        if (seenCorners.has(matchedIdx)) {
          const names = actualColors.map(c => COLORS[c].name).join('-');
          return {
            valid: false,
            error: `Duplicate corner piece (${names}).`
          };
        }
        seenCorners.add(matchedIdx);
        cornerPerm[i] = matchedIdx;

        // Check orientation: where is the Y or W sticker?
        const udAxisIdx = actualColors.findIndex(c => c === 'Y' || c === 'W');
        // Also verify chirality of the corner (must be an even permutation of the home corner's clockwise faces)
        const targetColors = CORNER_SLOTS[matchedIdx].colors;
        const c1 = actualColors[(udAxisIdx + 1) % 3];
        const c2 = actualColors[(udAxisIdx + 2) % 3];
        if (c1 !== targetColors[1] || c2 !== targetColors[2]) {
          const names = actualColors.map(c => COLORS[c].name).join('-');
          return {
            valid: false,
            error: `Corner piece (${names}) at ${slot.faces.join('')} has inverted sticker order (impossible physical corner).`
          };
        }
        cornerTwistSum = (cornerTwistSum + udAxisIdx) % 3;
      }

      if (cornerTwistSum !== 0) {
        return {
          valid: false,
          error: 'Impossible cube state: One or more corners are twisted in place (corner orientation sum is invalid).'
        };
      }

      // 3 & 5. Check edges & flip
      const edgePerm = new Array(12).fill(-1);
      const seenEdges = new Set();
      let edgeFlipSum = 0;

      for (let i = 0; i < 12; i++) {
        const slot = EDGE_SLOTS[i];
        const cubie = this.getCubieAt(...slot.pos);
        const actualColors = slot.faces.map(f => cubie.stickers[f]);
        const sortedActual = [...actualColors].sort().join('');

        let matchedIdx = -1;
        for (let j = 0; j < 12; j++) {
          if ([...EDGE_SLOTS[j].colors].sort().join('') === sortedActual) {
            matchedIdx = j;
            break;
          }
        }
        if (matchedIdx === -1) {
          const names = actualColors.map(c => COLORS[c].name).join('-');
          return {
            valid: false,
            error: `Invalid edge piece (${names}) at ${slot.faces.join('')}. Opposite face colors cannot share an edge.`
          };
        }
        if (seenEdges.has(matchedIdx)) {
          const names = actualColors.map(c => COLORS[c].name).join('-');
          return {
            valid: false,
            error: `Duplicate edge piece (${names}).`
          };
        }
        seenEdges.add(matchedIdx);
        edgePerm[i] = matchedIdx;

        // Standard edge orientation check:
        // Primary color of an edge is Y/W if it has Y/W, otherwise R/O.
        // Primary face of a slot is U/D if the slot is on U/D, otherwise F/B.
        const targetPrimaryColor = EDGE_SLOTS[matchedIdx].colors[0];
        const flip = actualColors[0] === targetPrimaryColor ? 0 : 1;
        edgeFlipSum = (edgeFlipSum + flip) % 2;
      }

      if (edgeFlipSum !== 0) {
        return {
          valid: false,
          error: 'Impossible cube state: An odd number of edges are flipped in place.'
        };
      }

      // 6. Check permutation parity
      function parityOfPerm(arr) {
        let inversions = 0;
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] > arr[j]) inversions++;
          }
        }
        return inversions % 2;
      }

      if (parityOfPerm(cornerPerm) !== parityOfPerm(edgePerm)) {
        return {
          valid: false,
          error: 'Impossible cube state: Permutation parity error (two pieces are swapped).'
        };
      }

      return { valid: true, error: null };
    }
  }

  return {
    COLORS,
    FACE_NORMALS,
    DEFAULT_FACE_COLORS,
    PERSPECTIVE_MAP,
    COLOR_TO_FACE,
    faceRowColToXYZ,
    CubeState
  };
});
