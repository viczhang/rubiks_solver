/**
 * Official 8-Step Rubik's Solve Guide Engine (https://rubiks.com/solve-guide)
 *
 * Solves any valid 3x3x3 CubeState using the exact 8 stages, orientation rules
 * (Yellow Center always on UP), Triggers, and algorithms from the official guide:
 *   Step 1: The Daisy
 *   Step 2: The White Cross
 *   Step 3: The White Corners (Right Trigger: R U R', Left Trigger: L' U' L)
 *   Step 4: The Middle Layer
 *   Step 5: The Yellow Cross (F U R U' R' F')
 *   Step 6: The Yellow Face (R U R' U R U2 R')
 *   Step 7: The Yellow Corners (L' U R U' L U R' + Step 6 Sune)
 *   Step 8: The Yellow Edges (F2 U R' L F2 L' R U F2)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const RubiksCore = require('./cube-state.js');
    module.exports = factory(RubiksCore);
  } else {
    root.RubiksSolver = factory(root.RubiksCore);
  }
})(typeof self !== 'undefined' ? self : this, function (RubiksCore) {
  'use strict';

  const {
    COLORS,
    DEFAULT_FACE_COLORS,
    PERSPECTIVE_MAP,
    CubeState
  } = RubiksCore;

  const SIDE_FACES = ['F', 'R', 'B', 'L']; // CW looking from bottom, or F(Red), R(Green), B(Orange), L(Blue)

  const STAGE_METADATA = [
    {
      number: 1,
      id: 'daisy',
      title: 'Step 1: The Daisy',
      shortTitle: 'The Daisy',
      goal: 'Build a White Daisy around the Yellow CENTER on the UP face.',
      tip: 'Keep the Yellow center on top! Rotate the UP face if needed to make room before bringing a white edge up.'
    },
    {
      number: 2,
      id: 'white-cross',
      title: 'Step 2: The White Cross',
      shortTitle: 'White Cross',
      goal: 'Match each white edge’s side tile to its center piece, then rotate 180° (F2) to the bottom.',
      tip: 'Repeat for all 4 white edges until the White Cross is formed on the bottom (DOWN) face.'
    },
    {
      number: 3,
      id: 'white-corners',
      title: 'Step 3: The White Corners',
      shortTitle: 'White Corners',
      goal: 'Use Left Trigger (L\' U\' L) and Right Trigger (R U R\') to place all 4 white corners into the bottom layer.',
      tip: 'Line up the non-white side tile of a top-layer white corner with its matching center before triggering.'
    },
    {
      number: 4,
      id: 'middle-layer',
      title: 'Step 4: The Middle Layer',
      shortTitle: 'Middle Layer',
      goal: 'Place the 4 non-yellow edge pieces into the middle layer using Move Left or Move Right trigger combos.',
      tip: 'Line up the front tile of a non-yellow top edge with its center to form an upside-down T before starting.'
    },
    {
      number: 5,
      id: 'yellow-cross',
      title: 'Step 5: The Yellow Cross',
      shortTitle: 'Yellow Cross',
      goal: 'Orient all 4 yellow edge pieces on the UP face using F U R U\' R\' F\'.',
      tip: 'Match your UP face to Dot, L-shape (at 9 and 12 o’clock), or horizontal Line before running the algorithm.'
    },
    {
      number: 6,
      id: 'yellow-face',
      title: 'Step 6: The Yellow Face',
      shortTitle: 'Yellow Face',
      goal: 'Flip all yellow corners onto the UP face using R U R\' U R U2 R\'.',
      tip: 'Count how many yellow corners are on UP (0, 1, or 2) and orient the front-left corner properly before each run.'
    },
    {
      number: 7,
      id: 'yellow-corners',
      title: 'Step 7: The Yellow Corners',
      shortTitle: 'Yellow Corners',
      goal: 'Position the 4 yellow corners using L\' U R U\' L U R\' followed by the Step 6 Yellow Face algorithm.',
      tip: 'If two corners match on a side, line them up with their center and hold that face on the LEFT.'
    },
    {
      number: 8,
      id: 'yellow-edges',
      title: 'Step 8: The Yellow Edges',
      shortTitle: 'Yellow Edges',
      goal: 'Cycle the final 3 yellow edges clockwise into place using F2 U R\' L F2 L\' R U F2.',
      tip: 'Hold the solved side face at the BACK. The back edge stays still while the other three cycle clockwise.'
    }
  ];

  // Edge coordinates on U and D and Middle layer for each side face
  const FACE_EDGE_COORD = {
    F: [0, 0, 1],
    R: [1, 0, 0],
    B: [0, 0, -1],
    L: [-1, 0, 0]
  };

  function getUCoordForFace(face) {
    const [x, , z] = FACE_EDGE_COORD[face];
    return [x, 1, z];
  }

  function getDCoordForFace(face) {
    const [x, , z] = FACE_EDGE_COORD[face];
    return [x, -1, z];
  }

  // Relative right and left faces when looking at `frontFace` with Yellow on UP
  function getRightFace(frontFace) {
    return PERSPECTIVE_MAP[frontFace].R;
  }
  function getLeftFace(frontFace) {
    return PERSPECTIVE_MAP[frontFace].L;
  }
  function getBackFace(frontFace) {
    return PERSPECTIVE_MAP[frontFace].B;
  }

  /**
   * Returns the U moves ('', 'U', "U'", 'U2') needed to move a piece on the U layer
   * from `fromSideFace` to `toSideFace`.
   * Remember: looking at U from above, CW 'U' moves F -> L -> B -> R -> F.
   */
  const U_CW_ORDER = ['F', 'L', 'B', 'R'];
  function getUMoveFromFaceToFace(fromFace, toFace) {
    const i1 = U_CW_ORDER.indexOf(fromFace);
    const i2 = U_CW_ORDER.indexOf(toFace);
    const diff = (i2 - i1 + 4) % 4;
    if (diff === 0) return [];
    if (diff === 1) return ['U'];
    if (diff === 2) return ['U2'];
    return ["U'"];
  }

  // Top-right corner coordinate [x, 1, z] when looking at `frontFace`
  function getTopRightCornerPos(frontFace) {
    switch (frontFace) {
      case 'F': return [1, 1, 1];   // UFR
      case 'R': return [1, 1, -1];  // UBR
      case 'B': return [-1, 1, -1]; // UBL
      case 'L': return [-1, 1, 1];  // UFL
    }
  }

  // Top-left corner coordinate [x, 1, z] when looking at `frontFace`
  function getTopLeftCornerPos(frontFace) {
    switch (frontFace) {
      case 'F': return [-1, 1, 1];  // UFL
      case 'R': return [1, 1, 1];   // UFR
      case 'B': return [1, 1, -1];  // UBR
      case 'L': return [-1, 1, -1]; // UBL
    }
  }

  // Bottom-right corner coordinate [x, -1, z] when looking at `frontFace`
  function getBottomRightCornerPos(frontFace) {
    const [x, , z] = getTopRightCornerPos(frontFace);
    return [x, -1, z];
  }

  // Bottom-left corner coordinate [x, -1, z] when looking at `frontFace`
  function getBottomLeftCornerPos(frontFace) {
    const [x, , z] = getTopLeftCornerPos(frontFace);
    return [x, -1, z];
  }

  // Middle-right edge coordinate [x, 0, z] when looking at `frontFace`
  function getMiddleRightEdgePos(frontFace) {
    const [x, , z] = getTopRightCornerPos(frontFace);
    return [x, 0, z];
  }

  // Middle-left edge coordinate [x, 0, z] when looking at `frontFace`
  function getMiddleLeftEdgePos(frontFace) {
    const [x, , z] = getTopLeftCornerPos(frontFace);
    return [x, 0, z];
  }

  // Map a U corner coordinate [x, 1, z] to its index in CW U rotation order:
  // U (+Y) CW moves: UFL (-1,1,1) -> UBL (-1,1,-1) -> UBR (1,1,-1) -> UFR (1,1,1)
  const U_CORNER_CW = [
    [-1, 1, 1],
    [-1, 1, -1],
    [1, 1, -1],
    [1, 1, 1]
  ];

  function getUMoveCornerToCorner(fromPos, toPos) {
    const i1 = U_CORNER_CW.findIndex(p => p[0] === fromPos[0] && p[2] === fromPos[2]);
    const i2 = U_CORNER_CW.findIndex(p => p[0] === toPos[0] && p[2] === toPos[2]);
    const diff = (i2 - i1 + 4) % 4;
    if (diff === 0) return [];
    if (diff === 1) return ['U'];
    if (diff === 2) return ['U2'];
    return ["U'"];
  }

  class RubiksGuideSolver {
    constructor(initialState) {
      this.initialState = initialState.clone();
      this.state = initialState.clone();
      this.subSteps = [];
      this.flatMoves = []; // Each entry: { index, subStepIndex, stageNumber, relMove, absMove, frontFace, frontColorName, stateBefore, stateAfter }
    }

    recordSubStep({
      stageNumber,
      subStepTitle,
      frontFace = 'F',
      algorithmName = '',
      relativeMoves = [],
      explanation = ''
    }) {
      const relList = Array.isArray(relativeMoves)
        ? relativeMoves.filter(Boolean)
        : String(relativeMoves).trim().split(/\s+/).filter(Boolean);

      if (relList.length === 0) return;

      const absList = CubeState.translateRelativeMoves(relList, frontFace);
      const frontInfo = PERSPECTIVE_MAP[frontFace];
      const subStepIndex = this.subSteps.length;
      const startMoveIndex = this.flatMoves.length;
      const stateBeforeSubStep = this.state.clone();

      for (let i = 0; i < relList.length; i++) {
        const relMove = relList[i];
        const absMove = absList[i];
        const stateBefore = this.state.clone();
        this.state.applyMove(absMove);
        const stateAfter = this.state.clone();

        this.flatMoves.push({
          index: this.flatMoves.length,
          subStepIndex,
          stageNumber,
          relMove,
          absMove,
          frontFace,
          frontColor: frontInfo.frontColor,
          frontColorName: frontInfo.frontName,
          algorithmName,
          subStepTitle,
          explanation,
          stateBefore,
          stateAfter
        });
      }

      this.subSteps.push({
        index: subStepIndex,
        stageNumber,
        subStepTitle,
        frontFace,
        frontColor: frontInfo.frontColor,
        frontColorName: frontInfo.frontName,
        algorithmName,
        relativeMoves: relList,
        absoluteMoves: absList,
        explanation,
        startMoveIndex,
        endMoveIndex: this.flatMoves.length - 1,
        stateBefore: stateBeforeSubStep,
        stateAfter: this.state.clone()
      });
    }

    solve() {
      const validation = this.state.validate();
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (this.state.isSolved()) {
        return this.buildResult();
      }

      if (!this.isWhiteCrossComplete()) {
        this.solveStep1Daisy();
        this.solveStep2WhiteCross();
      }
      this.solveStep3WhiteCorners();
      this.solveStep4MiddleLayer();
      this.solveStep5YellowCross();
      this.solveStep6YellowFace();
      this.solveStep7YellowCorners();
      this.solveStep8YellowEdges();

      return this.buildResult();
    }

    isWhiteCrossComplete() {
      for (const targetFace of SIDE_FACES) {
        const centerColor = DEFAULT_FACE_COLORS[targetFace];
        const [dx, dy, dz] = getDCoordForFace(targetFace);
        const dCubie = this.state.getCubieAt(dx, dy, dz);
        if (!dCubie || dCubie.stickers.D !== 'W' || dCubie.stickers[targetFace] !== centerColor) {
          return false;
        }
      }
      return true;
    }

    // =========================================================================
    // STEP 1: THE DAISY
    // Goal: All 4 white edge pieces on U face with White sticker facing U.
    // =========================================================================
    isDaisyComplete() {
      for (const f of SIDE_FACES) {
        const [x, y, z] = getUCoordForFace(f);
        if (this.state.getStickerAt(x, y, z, 'U') !== 'W') return false;
      }
      return true;
    }

    ensureUEdgeSlotFree(targetSideFace) {
      const [tx, ty, tz] = getUCoordForFace(targetSideFace);
      if (this.state.getStickerAt(tx, ty, tz, 'U') !== 'W') {
        return; // Already free
      }
      // Find a side face on U that does not currently have a White petal on U
      for (const f of SIDE_FACES) {
        const [x, y, z] = getUCoordForFace(f);
        if (this.state.getStickerAt(x, y, z, 'U') !== 'W') {
          const uMoves = getUMoveFromFaceToFace(f, targetSideFace);
          this.recordSubStep({
            stageNumber: 1,
            subStepTitle: 'Make Space on UP Face',
            frontFace: targetSideFace,
            algorithmName: 'Rotate UP Face',
            relativeMoves: uMoves,
            explanation: `Rotate the UP face so we don't knock out an existing white petal at the ${PERSPECTIVE_MAP[targetSideFace].frontName} slot.`
          });
          return;
        }
      }
    }

    solveStep1Daisy() {
      let guard = 0;
      while (!this.isDaisyComplete() && guard++ < 30) {
        // Find a white edge that is not currently on U with U==='W'
        const whiteEdges = this.state.cubies.filter(c => {
          const vals = Object.values(c.stickers);
          return vals.length === 2 && vals.includes('W') && !(c.pos[1] === 1 && c.stickers.U === 'W');
        });
        if (whiteEdges.length === 0) break;

        // Prioritize middle-layer edges first (1 move to U!), then D-layer with W on D (F2), then flipped U/D edges
        whiteEdges.sort((a, b) => {
          const score = c => {
            if (c.pos[1] === 0) return 1;
            if (c.pos[1] === -1 && c.stickers.D === 'W') return 2;
            return 3;
          };
          return score(a) - score(b);
        });

        const edge = whiteEdges[0];
        const otherColor = Object.values(edge.stickers).find(col => col !== 'W');
        const pieceDesc = `White-${COLORS[otherColor].name} edge`;
        const [x, y, z] = edge.pos;

        if (y === 0) {
          // Middle layer edge: one sticker is 'W' on face `wFace`, other sticker is on `turnFace`
          const wFace = Object.keys(edge.stickers).find(f => edge.stickers[f] === 'W');
          const turnFace = Object.keys(edge.stickers).find(f => f !== wFace);

          // Free the U slot on `turnFace` first
          this.ensureUEdgeSlotFree(turnFace);

          // Hold `wFace` as Front: `turnFace` is either R or L relative to `wFace`
          const isRight = getRightFace(wFace) === turnFace;
          const relMove = isRight ? 'R' : "L'";
          this.recordSubStep({
            stageNumber: 1,
            subStepTitle: `Bring ${pieceDesc} to Daisy`,
            frontFace: wFace,
            algorithmName: 'Middle Layer to Daisy',
            relativeMoves: [relMove],
            explanation: `With the ${PERSPECTIVE_MAP[wFace].frontName} center in front, turn the ${isRight ? 'Right' : 'Left'} face (${relMove}) to lift the ${pieceDesc} onto the UP face.`
          });
        } else if (y === -1 && edge.stickers.D === 'W') {
          // Bottom layer with White facing D
          const sideFace = Object.keys(edge.stickers).find(f => f !== 'D');
          this.ensureUEdgeSlotFree(sideFace);
          this.recordSubStep({
            stageNumber: 1,
            subStepTitle: `Bring ${pieceDesc} from Bottom to Daisy`,
            frontFace: sideFace,
            algorithmName: 'Bottom Edge to Daisy',
            relativeMoves: ['F2'],
            explanation: `Hold the ${PERSPECTIVE_MAP[sideFace].frontName} center in front and turn the Front face twice (F2) to bring the ${pieceDesc} up to the yellow center.`
          });
        } else if (y === -1 && edge.stickers.D !== 'W') {
          // Bottom layer with White facing out on `sideFace`
          const sideFace = Object.keys(edge.stickers).find(f => edge.stickers[f] === 'W');
          this.ensureUEdgeSlotFree(sideFace);
          // Turn F' relative to sideFace to put it into the middle-right edge, then next iteration lifts it cleanly
          this.recordSubStep({
            stageNumber: 1,
            subStepTitle: `Position ${pieceDesc} into Middle Layer`,
            frontFace: sideFace,
            algorithmName: 'Flip Bottom Edge',
            relativeMoves: ["F'"],
            explanation: `Hold the ${PERSPECTIVE_MAP[sideFace].frontName} center in front and rotate F' so the ${pieceDesc} moves to the middle layer where it can be lifted into the Daisy.`
          });
        } else if (y === 1 && edge.stickers.U !== 'W') {
          // Top layer but flipped (White facing out on `sideFace`)
          const sideFace = Object.keys(edge.stickers).find(f => edge.stickers[f] === 'W');
          this.recordSubStep({
            stageNumber: 1,
            subStepTitle: `Flip ${pieceDesc} on UP Face`,
            frontFace: sideFace,
            algorithmName: 'Flip Daisy Edge',
            relativeMoves: ['F'],
            explanation: `The ${pieceDesc} is on the top layer with white facing out. Hold ${PERSPECTIVE_MAP[sideFace].frontName} in front and turn F to move it into the middle layer.`
          });
        }
      }
    }

    // =========================================================================
    // STEP 2: THE WHITE CROSS
    // Goal: Align each white edge on U with its matching side center, then F2.
    // =========================================================================
    solveStep2WhiteCross() {
      for (const targetFace of SIDE_FACES) {
        const centerColor = DEFAULT_FACE_COLORS[targetFace];
        const centerName = COLORS[centerColor].name;

        // Check if already solved in D
        const [dx, dy, dz] = getDCoordForFace(targetFace);
        const dCubie = this.state.getCubieAt(dx, dy, dz);
        if (dCubie && dCubie.stickers.D === 'W' && dCubie.stickers[targetFace] === centerColor) {
          continue;
        }

        // Find where the W + centerColor edge is on U
        let currentFaceOnU = null;
        for (const f of SIDE_FACES) {
          const [ux, uy, uz] = getUCoordForFace(f);
          const cubie = this.state.getCubieAt(ux, uy, uz);
          if (cubie && cubie.stickers.U === 'W' && cubie.stickers[f] === centerColor) {
            currentFaceOnU = f;
            break;
          }
        }

        if (currentFaceOnU) {
          const uMoves = getUMoveFromFaceToFace(currentFaceOnU, targetFace);
          const moves = [...uMoves, 'F2'];
          this.recordSubStep({
            stageNumber: 2,
            subStepTitle: `Place White-${centerName} Edge`,
            frontFace: targetFace,
            algorithmName: 'Match Center & F2',
            relativeMoves: moves,
            explanation: uMoves.length > 0
              ? `Rotate the UP face (${uMoves.join(' ')}) to match the White-${centerName} edge with the ${centerName} center, then rotate the Front face twice (F2) to send it to the bottom.`
              : `The White-${centerName} edge already matches the ${centerName} center. Rotate the Front face twice (F2) to move it to the White Cross on the bottom.`
          });
        }
      }
    }

    // =========================================================================
    // STEP 3: THE WHITE CORNERS
    // Goal: Solve all 4 white corners in the D layer using Right Trigger (R U R')
    // and Left Trigger (L' U' L).
    // =========================================================================
    isWhiteCornerSolved(frontFace) {
      const [x, y, z] = getBottomRightCornerPos(frontFace);
      const rightFace = getRightFace(frontFace);
      const cubie = this.state.getCubieAt(x, y, z);
      return (
        cubie &&
        cubie.stickers.D === 'W' &&
        cubie.stickers[frontFace] === DEFAULT_FACE_COLORS[frontFace] &&
        cubie.stickers[rightFace] === DEFAULT_FACE_COLORS[rightFace]
      );
    }

    solveStep3WhiteCorners() {
      for (const targetFrontFace of SIDE_FACES) {
        const rightFace = getRightFace(targetFrontFace);
        const colorF = DEFAULT_FACE_COLORS[targetFrontFace];
        const colorR = DEFAULT_FACE_COLORS[rightFace];
        const cornerDesc = `White-${COLORS[colorF].name}-${COLORS[colorR].name} corner`;

        let guard = 0;
        while (!this.isWhiteCornerSolved(targetFrontFace) && guard++ < 8) {
          // Find the cubie with colors W, colorF, colorR
          const corner = this.state.cubies.find(c => {
            const vals = Object.values(c.stickers);
            return vals.length === 3 && vals.includes('W') && vals.includes(colorF) && vals.includes(colorR);
          });

          if (!corner) break;

          // 1. If the corner is stuck in the bottom layer (y === -1), pop it out with a Right Trigger (R U R')
          if (corner.pos[1] === -1) {
            const popFrontFace = SIDE_FACES.find(f => {
              const [bx, , bz] = getBottomRightCornerPos(f);
              return bx === corner.pos[0] && bz === corner.pos[2];
            });
            this.recordSubStep({
              stageNumber: 3,
              subStepTitle: `Pop ${cornerDesc} to Top Layer`,
              frontFace: popFrontFace,
              algorithmName: 'Right Trigger (R U R\')',
              relativeMoves: ['R', 'U', "R'"],
              explanation: `The ${cornerDesc} is in the bottom layer. Hold the ${PERSPECTIVE_MAP[popFrontFace].frontName} center in front with that corner at the bottom-right and perform a Right Trigger (R U R') to bring it to the top layer.`
            });
            continue;
          }

          // 2. Corner is in the top layer (y === 1)
          if (corner.stickers.U === 'W') {
            // White sticker is facing UP:
            // Place it at the top-right corner above its target slot (between targetFrontFace and rightFace)
            const targetTopCornerPos = getTopRightCornerPos(targetFrontFace);
            const uMoves = getUMoveCornerToCorner(corner.pos, targetTopCornerPos);
            if (uMoves.length > 0) {
              this.recordSubStep({
                stageNumber: 3,
                subStepTitle: `Position ${cornerDesc} Above Slot`,
                frontFace: targetFrontFace,
                algorithmName: 'Align Above Empty Corner',
                relativeMoves: uMoves,
                explanation: `Since the white tile on the ${cornerDesc} is facing UP, rotate the UP face (${uMoves.join(' ')}) to place it directly above its target corner between ${COLORS[colorF].name} and ${COLORS[colorR].name}.`
              });
            }
            // Perform Right Trigger twice (R U R' R U R') to flip the white tile to the outside!
            this.recordSubStep({
              stageNumber: 3,
              subStepTitle: `Flip ${cornerDesc} White Tile Outward`,
              frontFace: targetFrontFace,
              algorithmName: 'Right Trigger × 2 (R U R\' R U R\')',
              relativeMoves: ['R', 'U', "R'", 'R', 'U', "R'"],
              explanation: `Perform the Right Trigger (R U R') twice with ${COLORS[colorF].name} in front to flip the white tile from the UP face to the outside.`
            });
            continue;
          }

          // 3. White tile is facing OUT on one of the side faces!
          // The other side tile (which is NOT facing U and NOT 'W') determines which center we match it to.
          const sideStickerFace = Object.keys(corner.stickers).find(
            f => f !== 'U' && corner.stickers[f] !== 'W'
          );
          const sideStickerColor = corner.stickers[sideStickerFace];
          const matchingCenterFace = SIDE_FACES.find(f => DEFAULT_FACE_COLORS[f] === sideStickerColor);

          // Determine if rotating U to put that sticker on `matchingCenterFace` puts the corner at top-right or top-left of `matchingCenterFace`
          const uMoves = getUMoveFromFaceToFace(sideStickerFace, matchingCenterFace);
          if (uMoves.length > 0) {
            this.recordSubStep({
              stageNumber: 3,
              subStepTitle: `Align ${cornerDesc} with ${COLORS[sideStickerColor].name} Center`,
              frontFace: matchingCenterFace,
              algorithmName: 'Match Corner to Center',
              relativeMoves: uMoves,
              explanation: `Rotate the UP face (${uMoves.join(' ')}) so the ${COLORS[sideStickerColor].name} side tile of the ${cornerDesc} matches the ${COLORS[sideStickerColor].name} center.`
            });
          }

          // Now check if the corner is at the top-right or top-left of `matchingCenterFace`
          const updatedCorner = this.state.cubies.find(c => c.id === corner.id);
          const trPos = getTopRightCornerPos(matchingCenterFace);
          const isTopRight = updatedCorner.pos[0] === trPos[0] && updatedCorner.pos[2] === trPos[2];

          if (isTopRight) {
            this.recordSubStep({
              stageNumber: 3,
              subStepTitle: `Insert ${cornerDesc} (Right Trigger)`,
              frontFace: matchingCenterFace,
              algorithmName: 'Right Trigger (R U R\')',
              relativeMoves: ['R', 'U', "R'"],
              explanation: `The matching ${COLORS[sideStickerColor].name} tile is on the top-right of the ${COLORS[sideStickerColor].name} front face. Perform a Right Trigger (R U R') to drop the corner into place.`
            });
          } else {
            this.recordSubStep({
              stageNumber: 3,
              subStepTitle: `Insert ${cornerDesc} (Left Trigger)`,
              frontFace: matchingCenterFace,
              algorithmName: 'Left Trigger (L\' U\' L)',
              relativeMoves: ["L'", "U'", 'L'],
              explanation: `The matching ${COLORS[sideStickerColor].name} tile is on the top-left of the ${COLORS[sideStickerColor].name} front face. Perform a Left Trigger (L' U' L) to drop the corner into place.`
            });
          }
        }
      }
    }

    // =========================================================================
    // STEP 4: THE MIDDLE LAYER
    // Goal: Insert all 4 non-yellow middle-layer edges using Move Left or Move Right.
    //   Move Left:  U' + Left Trigger (L' U' L), then face left & U + Right Trigger (R U R')
    //   Move Right: U  + Right Trigger (R U R'), then face right & U' + Left Trigger (L' U' L)
    // =========================================================================
    isMiddleEdgeSolved(frontFace) {
      const rightFace = getRightFace(frontFace);
      const [x, y, z] = getMiddleRightEdgePos(frontFace);
      const cubie = this.state.getCubieAt(x, y, z);
      return (
        cubie &&
        cubie.stickers[frontFace] === DEFAULT_FACE_COLORS[frontFace] &&
        cubie.stickers[rightFace] === DEFAULT_FACE_COLORS[rightFace]
      );
    }

    areAllMiddleEdgesSolved() {
      return SIDE_FACES.every(f => this.isMiddleEdgeSolved(f));
    }

    executeMiddleLayerMoveRight(frontFace, edgeDesc) {
      const rightFace = getRightFace(frontFace);
      const frontName = PERSPECTIVE_MAP[frontFace].frontName;
      const rightName = PERSPECTIVE_MAP[rightFace].frontName;

      this.recordSubStep({
        stageNumber: 4,
        subStepTitle: `${edgeDesc}: Move Right (Part 1)`,
        frontFace,
        algorithmName: 'U + Right Trigger (U R U R\')',
        relativeMoves: ['U', 'R', 'U', "R'"],
        explanation: `Hold ${frontName} in front. Rotate U away from the target side, then perform a Right Trigger (R U R').`
      });

      this.recordSubStep({
        stageNumber: 4,
        subStepTitle: `${edgeDesc}: Re-insert White Corner (Part 2)`,
        frontFace: rightFace,
        algorithmName: 'U\' + Left Trigger (U\' L\' U\' L)',
        relativeMoves: ["U'", "L'", "U'", 'L'],
        explanation: `Turn the cube to face the ${rightName} center. Rotate U' to align the displaced white corner with the ${rightName} center, then perform a Left Trigger (L' U' L).`
      });
    }

    executeMiddleLayerMoveLeft(frontFace, edgeDesc) {
      const leftFace = getLeftFace(frontFace);
      const frontName = PERSPECTIVE_MAP[frontFace].frontName;
      const leftName = PERSPECTIVE_MAP[leftFace].frontName;

      this.recordSubStep({
        stageNumber: 4,
        subStepTitle: `${edgeDesc}: Move Left (Part 1)`,
        frontFace,
        algorithmName: 'U\' + Left Trigger (U\' L\' U\' L)',
        relativeMoves: ["U'", "L'", "U'", 'L'],
        explanation: `Hold ${frontName} in front. Rotate U' away from the target side, then perform a Left Trigger (L' U' L).`
      });

      this.recordSubStep({
        stageNumber: 4,
        subStepTitle: `${edgeDesc}: Re-insert White Corner (Part 2)`,
        frontFace: leftFace,
        algorithmName: 'U + Right Trigger (U R U R\')',
        relativeMoves: ['U', 'R', 'U', "R'"],
        explanation: `Turn the cube to face the ${leftName} center. Rotate U to align the displaced white corner with the ${leftName} center, then perform a Right Trigger (R U R').`
      });
    }

    solveStep4MiddleLayer() {
      let guard = 0;
      while (!this.areAllMiddleEdgesSolved() && guard++ < 16) {
        // Look for any non-yellow, non-white edge in the U layer (y === 1)
        let uEdgeFace = null;
        for (const f of SIDE_FACES) {
          const [ux, uy, uz] = getUCoordForFace(f);
          const cubie = this.state.getCubieAt(ux, uy, uz);
          const vals = Object.values(cubie.stickers);
          if (!vals.includes('Y') && !vals.includes('W')) {
            uEdgeFace = f;
            break;
          }
        }

        if (uEdgeFace) {
          const [ux, uy, uz] = getUCoordForFace(uEdgeFace);
          const cubie = this.state.getCubieAt(ux, uy, uz);
          const sideColor = cubie.stickers[uEdgeFace];
          const topColor = cubie.stickers.U;
          const edgeDesc = `${COLORS[sideColor].name}-${COLORS[topColor].name} Edge`;

          // Align `sideColor` with its matching center
          const targetFrontFace = SIDE_FACES.find(f => DEFAULT_FACE_COLORS[f] === sideColor);
          const uMoves = getUMoveFromFaceToFace(uEdgeFace, targetFrontFace);
          if (uMoves.length > 0) {
            this.recordSubStep({
              stageNumber: 4,
              subStepTitle: `Align ${edgeDesc} with ${COLORS[sideColor].name} Center`,
              frontFace: targetFrontFace,
              algorithmName: 'Line Up Edge with Center',
              relativeMoves: uMoves,
              explanation: `Rotate the UP face (${uMoves.join(' ')}) so the ${COLORS[sideColor].name} tile on the front of the edge lines up with the ${COLORS[sideColor].name} center.`
            });
          }

          // Determine if `topColor` matches the Right face center or Left face center relative to `targetFrontFace`
          const rightFace = getRightFace(targetFrontFace);
          if (DEFAULT_FACE_COLORS[rightFace] === topColor) {
            this.executeMiddleLayerMoveRight(targetFrontFace, edgeDesc);
          } else {
            this.executeMiddleLayerMoveLeft(targetFrontFace, edgeDesc);
          }
        } else {
          // No non-yellow edges on U, but middle layer is not complete:
          // Pop out an unsolved middle-right edge using Move Right
          const unsolvedFace = SIDE_FACES.find(f => !this.isMiddleEdgeSolved(f));
          if (!unsolvedFace) break;
          this.executeMiddleLayerMoveRight(
            unsolvedFace,
            `Pop Trapped Edge from ${PERSPECTIVE_MAP[unsolvedFace].frontName}-Right Slot`
          );
        }
      }
    }

    // =========================================================================
    // STEP 5: THE YELLOW CROSS
    // Goal: All 4 edges on U have Yellow facing UP using F U R U' R' F'.
    // Note on F U R U' R' F' (the inverse of F R U R' U' F'):
    //   - Dot (0 yellow edges) -> L-Shape (2 adjacent yellow edges)
    //   - L-Shape: when held at Back & Left (9 and 12 o'clock) or Front & Right:
    //     Let's check: F U R U' R' F' solves an L-shape directly into a Yellow Cross in 1 step
    //     when the L-shape is at Back (UB) and Right (UR) or Back (UB) and Left (UL)!
    //     Wait: whether it takes 1 or 2 applications of F U R U' R' F', we orient U according to
    //     the pattern on U and apply F U R U' R' F' until all 4 yellow edges face UP.
    // =========================================================================
    getYellowCrossUEdges() {
      const res = {};
      for (const f of SIDE_FACES) {
        const [x, y, z] = getUCoordForFace(f);
        res[f] = this.state.getStickerAt(x, y, z, 'U') === 'Y';
      }
      return res;
    }

    solveStep5YellowCross() {
      let guard = 0;
      while (guard++ < 6) {
        const uEdges = this.getYellowCrossUEdges();
        const yellowFaces = SIDE_FACES.filter(f => uEdges[f]);

        if (yellowFaces.length === 4) {
          break; // Yellow cross is complete!
        }

        let frontFace = 'F';
        let patternDesc = '';

        if (yellowFaces.length === 0) {
          // Center Dot only
          frontFace = 'F';
          patternDesc = 'Yellow Center Dot (no yellow edges facing up)';
        } else if (yellowFaces.length === 2) {
          // Check if opposite (Line) or adjacent (L-shape)
          const [f1, f2] = yellowFaces;
          if (getBackFace(f1) === f2) {
            // Line: hold so the line is horizontal (Left-to-Right).
            // If f1 is L or R, then F has the line horizontal!
            frontFace = (f1 === 'L' || f1 === 'R') ? 'F' : 'R';
            patternDesc = 'Yellow Line (held horizontally from Left to Right)';
          } else {
            // L-shape (2 adjacent edges):
            // In the official Rubik's guide for `F U R U' R' F'`, holding the L-shape at 9 o'clock (Left) and 12 o'clock (Back)
            // — or let's check which orientation of the L-shape solves directly to the Cross under `F U R U' R' F'`!
            // If `L` and `B` are yellow on U, then `getLeftFace(frontFace)` and `getBackFace(frontFace)` are the two yellow edges!
            for (const candidate of SIDE_FACES) {
              const l = getLeftFace(candidate);
              const b = getBackFace(candidate);
              if (uEdges[l] && uEdges[b]) {
                frontFace = candidate;
                break;
              }
            }
            patternDesc = 'Yellow L-Shape (positioned at the Back and Left on the UP face)';
          }
        }

        this.recordSubStep({
          stageNumber: 5,
          subStepTitle: `Yellow Cross Algorithm (${patternDesc.split(' (')[0]})`,
          frontFace,
          algorithmName: 'F U R U\' R\' F\'',
          relativeMoves: ['F', 'U', 'R', "U'", "R'", "F'"],
          explanation: `Pattern on UP face: ${patternDesc}. Hold the ${PERSPECTIVE_MAP[frontFace].frontName} center in front and perform F U R U' R' F'.`
        });
      }
    }

    // =========================================================================
    // STEP 6: THE YELLOW FACE
    // Goal: Orient all 4 yellow corners onto the U face using Sune: R U R' U R U2 R'.
    // Official guide rules focusing on the front-left U corner (UFL relative to Front):
    //   - 0 corners with Yellow on U: Rotate U so the front-left corner has Yellow on its LEFT face.
    //   - 1 corner with Yellow on U ("Fish"): Rotate U so that single Yellow corner is at the front-left.
    //   - 2 corners with Yellow on U: Rotate U so the front-left corner has Yellow on its FRONT face.
    // =========================================================================
    solveStep6YellowFace(stageNumber = 6) {
      let guard = 0;
      const frontFace = 'F'; // Keep Red in front and rotate U as instructed by the guide
      const uflPos = getTopLeftCornerPos(frontFace);

      while (guard++ < 8) {
        const uCorners = U_CORNER_CW.map(pos => this.state.getCubieAt(...pos));
        const yellowUpCorners = uCorners.filter(c => c.stickers.U === 'Y');

        if (yellowUpCorners.length === 4) {
          break; // Full Yellow Face complete!
        }

        // Find the U rotation ('', 'U', "U'", 'U2') that satisfies the guide's front-left corner rule
        let chosenUMove = null;
        let caseDescription = '';

        const candidateUMoves = [[], ['U'], ["U'"], ['U2']];
        for (const uMove of candidateUMoves) {
          const testState = this.state.clone();
          testState.applyMoves(uMove);
          const uflCubie = testState.getCubieAt(...uflPos);

          if (yellowUpCorners.length === 1) {
            if (uflCubie.stickers.U === 'Y') {
              chosenUMove = uMove;
              caseDescription = '1 Yellow Corner on UP (placed at front-left corner)';
              break;
            }
          } else if (yellowUpCorners.length === 0) {
            if (uflCubie.stickers.L === 'Y') {
              chosenUMove = uMove;
              caseDescription = '0 Yellow Corners on UP (front-left corner has yellow tile facing Left)';
              break;
            }
          } else {
            // 2 Yellow Corners on UP
            if (uflCubie.stickers.F === 'Y') {
              chosenUMove = uMove;
              caseDescription = '2 Yellow Corners on UP (front-left corner has yellow tile facing Front)';
              break;
            }
          }
        }

        if (chosenUMove && chosenUMove.length > 0) {
          this.recordSubStep({
            stageNumber,
            subStepTitle: 'Position UP Face for Yellow Face Algorithm',
            frontFace,
            algorithmName: 'Orient UP Layer',
            relativeMoves: chosenUMove,
            explanation: `Rotate the UP face (${chosenUMove.join(' ')}) to set up the front-left corner for ${caseDescription}.`
          });
        }

        this.recordSubStep({
          stageNumber,
          subStepTitle: stageNumber === 6 ? 'Yellow Face Algorithm (Sune)' : 'Restore Yellow Face (Step 6 Algorithm)',
          frontFace,
          algorithmName: 'R U R\' U R U2 R\'',
          relativeMoves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"],
          explanation: `${caseDescription}. Perform R U R' U R U2 R' to orient the yellow corners.`
        });
      }
    }

    // =========================================================================
    // STEP 7: THE YELLOW CORNERS
    // Goal: Permute the 4 yellow corners using the official Rubik's guide two-part step:
    //   Algorithm 1: L' U R U' L U R'
    //   Algorithm 2: Step 6 Sune (align U so the single yellow corner is at front-left, then R U R' U R U2 R')
    // Wait: let's verify what L' U R U' L U R' followed by U' + R U R' U R U2 R' (or U + R U R' U R U2 R') does!
    // =========================================================================
    findMatchingCornerPairsOnU() {
      // Check for any side face `f` where the two U corners on `f` have the same color on `f`
      const matches = [];
      for (const f of SIDE_FACES) {
        const tl = getTopLeftCornerPos(f);
        const tr = getTopRightCornerPos(f);
        const c1 = this.state.getStickerAt(tl[0], tl[1], tl[2], f);
        const c2 = this.state.getStickerAt(tr[0], tr[1], tr[2], f);
        if (c1 === c2) {
          matches.push({ face: f, color: c1 });
        }
      }
      return matches;
    }

    solveStep7YellowCorners() {
      let guard = 0;
      while (guard++ < 4) {
        const matches = this.findMatchingCornerPairsOnU();

        if (matches.length === 4) {
          // All 4 side faces have matching corners! Align them with their centers if needed
          const fMatch = matches.find(m => m.face === 'F');
          const targetFace = SIDE_FACES.find(f => DEFAULT_FACE_COLORS[f] === fMatch.color);
          const uMoves = getUMoveFromFaceToFace('F', targetFace);
          if (uMoves.length > 0) {
            this.recordSubStep({
              stageNumber: 7,
              subStepTitle: 'Align Solved Yellow Corners with Centers',
              frontFace: 'F',
              algorithmName: 'Align UP Corners',
              relativeMoves: uMoves,
              explanation: `All four pairs of yellow corners match! Rotate the UP face (${uMoves.join(' ')}) to line them up with their matching side centers.`
            });
          }
          break;
        }

        let algoFrontFace = 'F';
        if (matches.length >= 1) {
          // Rotate U so the matching corner pair lines up with its matching center,
          // then hold that matching face on the LEFT!
          const match = matches[0];
          const matchingCenterFace = SIDE_FACES.find(f => DEFAULT_FACE_COLORS[f] === match.color);
          const uMoves = getUMoveFromFaceToFace(match.face, matchingCenterFace);
          if (uMoves.length > 0) {
            this.recordSubStep({
              stageNumber: 7,
              subStepTitle: `Line Up Matching ${COLORS[match.color].name} Corners`,
              frontFace: matchingCenterFace,
              algorithmName: 'Match Corners to Center',
              relativeMoves: uMoves,
              explanation: `Rotate the UP face (${uMoves.join(' ')}) so the two matching ${COLORS[match.color].name} corners line up with the ${COLORS[match.color].name} center.`
            });
          }
          // Hold the matching face on the LEFT -> so `algoFrontFace` has `getLeftFace(algoFrontFace) === matchingCenterFace`
          algoFrontFace = SIDE_FACES.find(f => getLeftFace(f) === matchingCenterFace);
        }

        const leftCenterName = PERSPECTIVE_MAP[getLeftFace(algoFrontFace)].frontName;
        this.recordSubStep({
          stageNumber: 7,
          subStepTitle: matches.length >= 1
            ? `Permute Yellow Corners (${leftCenterName} on Left)`
            : 'Permute Yellow Corners (No Matching Pair Yet)',
          frontFace: algoFrontFace,
          algorithmName: 'L\' U R U\' L U R\'',
          relativeMoves: ["L'", 'U', 'R', "U'", 'L', 'U', "R'"],
          explanation: matches.length >= 1
            ? `Hold the matching ${leftCenterName} face on the Left (${PERSPECTIVE_MAP[algoFrontFace].frontName} in front) and perform L' U R U' L U R'.`
            : `No two corners match on the same face yet. Hold ${PERSPECTIVE_MAP[algoFrontFace].frontName} in front and perform L' U R U' L U R'.`
        });

        // After L' U R U' L U R', exactly 1 yellow corner is facing up on U (at UBR relative to algoFrontFace).
        // As shown in the official guide's "Yellow Corners Algo 2" diagram:
        // Rotate U' to bring that single yellow corner to front-left (or U? Wait: UBR -> UFR -> UFL is U, wait:
        // U CW moves UFL -> UBL -> UBR -> UFR -> UFL! So UBR -> UFL is U2, wait let's check where the yellow corner is!)
        // Even better: our Step 6 helper checks the exact position of the single yellow corner on U and rotates it to front-left before running R U R' U R U2 R'!
        const uflPos = getTopLeftCornerPos(algoFrontFace);
        const candidateUMoves = [['U'], ["U'"], ['U2'], []];
        let restoreUMove = [];
        for (const uMove of candidateUMoves) {
          const testState = this.state.clone();
          testState.applyMoves(CubeState.translateRelativeMoves(uMove, algoFrontFace));
          const uflCubie = testState.getCubieAt(...uflPos);
          if (uflCubie.stickers.U === 'Y') {
            restoreUMove = uMove;
            break;
          }
        }

        const secondAlgoMoves = [...restoreUMove, 'R', 'U', "R'", 'U', 'R', 'U2', "R'"];
        this.recordSubStep({
          stageNumber: 7,
          subStepTitle: 'Restore Yellow Face (Algorithm 2)',
          frontFace: algoFrontFace,
          algorithmName: `${restoreUMove.join(' ')} R U R' U R U2 R'`.trim(),
          relativeMoves: secondAlgoMoves,
          explanation: `Just like in Step 6, position the single yellow corner at the front-left (${restoreUMove.join(' ')}) and perform R U R' U R U2 R' to bring back the full yellow face.`
        });
      }
    }

    // =========================================================================
    // STEP 8: THE YELLOW EDGES
    // Goal: Cycle the remaining 3 yellow edges clockwise into place using:
    //   F2 U R' L F2 L' R U F2
    // with the solved face held at the BACK.
    // =========================================================================
    isSideFaceSolved(face) {
      const expected = DEFAULT_FACE_COLORS[face];
      const grid = this.state.toFaceGrid()[face];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (grid[r][c] !== expected) return false;
        }
      }
      return true;
    }

    solveStep8YellowEdges() {
      let guard = 0;
      while (!this.state.isSolved() && guard++ < 5) {
        // First ensure corners are aligned with their centers
        const tlF = getTopLeftCornerPos('F');
        const cColor = this.state.getStickerAt(tlF[0], tlF[1], tlF[2], 'F');
        const targetFace = SIDE_FACES.find(f => DEFAULT_FACE_COLORS[f] === cColor);
        const uMoves = getUMoveFromFaceToFace('F', targetFace);
        if (uMoves.length > 0) {
          this.recordSubStep({
            stageNumber: 8,
            subStepTitle: 'Align Top Layer Corners with Centers',
            frontFace: 'F',
            algorithmName: 'Align UP Layer',
            relativeMoves: uMoves,
            explanation: `Rotate the UP face (${uMoves.join(' ')}) so the yellow corners match their side centers.`
          });
        }

        if (this.state.isSolved()) break;

        // Check if any side face is completely solved
        const solvedSide = SIDE_FACES.find(f => this.isSideFaceSolved(f));
        let frontFace = 'F';
        if (solvedSide) {
          // Hold the solved face at the BACK
          frontFace = getBackFace(solvedSide);
        }

        const backName = PERSPECTIVE_MAP[getBackFace(frontFace)].frontName;
        this.recordSubStep({
          stageNumber: 8,
          subStepTitle: solvedSide
            ? `Cycle Yellow Edges Clockwise (${backName} Solved at Back)`
            : 'Cycle Yellow Edges (No Solved Side Face Yet)',
          frontFace,
          algorithmName: 'F2 U R\' L F2 L\' R U F2',
          relativeMoves: ['F2', 'U', "R'", 'L', 'F2', "L'", 'R', 'U', 'F2'],
          explanation: solvedSide
            ? `Hold the solved ${backName} face at the Back (${PERSPECTIVE_MAP[frontFace].frontName} in front) and perform F2 U R' L F2 L' R U F2 to cycle the three remaining yellow edges clockwise.`
            : `No side face is solved yet. Hold ${PERSPECTIVE_MAP[frontFace].frontName} in front and perform F2 U R' L F2 L' R U F2 once to solve a side face.`
        });
      }
    }

    buildResult() {
      const stages = STAGE_METADATA.map(meta => {
        const stageSubSteps = this.subSteps.filter(s => s.stageNumber === meta.number);
        const moveCount = stageSubSteps.reduce((acc, s) => acc + s.relativeMoves.length, 0);
        return {
          ...meta,
          subSteps: stageSubSteps,
          moveCount,
          skipped: stageSubSteps.length === 0
        };
      });

      return {
        solved: this.state.isSolved(),
        totalMoves: this.flatMoves.length,
        totalSubSteps: this.subSteps.length,
        stages,
        subSteps: this.subSteps,
        flatMoves: this.flatMoves,
        initialState: this.initialState,
        finalState: this.state
      };
    }
  }

  return {
    STAGE_METADATA,
    RubiksGuideSolver
  };
});
