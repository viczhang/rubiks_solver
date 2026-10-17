/**
 * Official 8-Step Rubik's Solve Guide Curriculum, Interactive Diagrams & Practice Drills
 * Based on https://rubiks.com/solve-guide
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RubiksGuideContent = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Helper to render a clean mini 3x3 face SVG (e.g. UP face or Front+Right 2.5D diagram)
   */
  const HEX = {
    Y: '#FCE000',
    W: '#FFFFFF',
    R: '#E31B23',
    O: '#FF6B00',
    B: '#0051BA',
    G: '#009E60',
    X: '#2A2F3D' // dark grey for "any/irrelevant tile"
  };

  function renderTopFaceSVG(grid3x3, options = {}) {
    const size = options.size || 108;
    const pad = 8;
    const cell = (size - pad * 2) / 3;
    let rects = '';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const code = grid3x3[r][c];
        const fill = HEX[code] || HEX.X;
        const x = pad + c * cell + 1.5;
        const y = pad + r * cell + 1.5;
        const w = cell - 3;
        rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${w.toFixed(1)}" rx="4" fill="${fill}" stroke="#111318" stroke-width="1.5"/>`;
      }
    }
    // Optional side edge indicators (top, bottom, left, right)
    let extras = '';
    if (options.bottomLeftSide) {
      // Highlight yellow sticker on Left or Front of the front-left corner (row=2, col=0)
      if (options.bottomLeftSide === 'L') {
        extras += `<rect x="1" y="${(pad + 2 * cell + 2).toFixed(1)}" width="5" height="${(cell - 4).toFixed(1)}" rx="2" fill="${HEX.Y}" stroke="#111" stroke-width="1"/>`;
      } else if (options.bottomLeftSide === 'F') {
        extras += `<rect x="${(pad + 2).toFixed(1)}" y="${(size - 6).toFixed(1)}" width="${(cell - 4).toFixed(1)}" height="5" rx="2" fill="${HEX.Y}" stroke="#111" stroke-width="1"/>`;
      }
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="guide-mini-svg" aria-hidden="true">
      <rect x="4" y="4" width="${size - 8}" height="${size - 8}" rx="8" fill="#151821" stroke="#343B4F" stroke-width="1.5"/>
      ${rects}
      ${extras}
    </svg>`;
  }

  const BASICS_SECTION = {
    id: 'basics',
    badge: 'THE BASICS',
    title: 'Get to Know Your Cube & Moves',
    subtitle: 'Master the 3 piece types, fixed center orientation, and Trigger moves before starting Step 1.',
    goldenRule: 'For every step in this guide, the YELLOW CENTER is always at the TOP (UP face) of your Cube.',
    pieces: [
      {
        name: 'Center Pieces',
        tiles: '1 Colored Tile',
        desc: 'Centers never move relative to each other and define the color of each face: Yellow is always opposite White, Blue opposite Green, and Red opposite Orange.'
      },
      {
        name: 'Edge Pieces',
        tiles: '2 Colored Tiles',
        desc: '12 edge pieces sit between the corners. In Steps 1, 2, 4, 5, and 8 you will guide edges into place.'
      },
      {
        name: 'Corner Pieces',
        tiles: '3 Colored Tiles',
        desc: '8 corner pieces sit at the vertices of the cube. In Steps 3, 6, and 7 you will orient and position them.'
      }
    ],
    notation: [
      { move: 'F / F\' / F2', face: 'Front Face', desc: 'The face directly facing you. F = 90° clockwise, F\' = 90° counter-clockwise, F2 = 180° double turn.' },
      { move: 'U / U\' / U2', face: 'Up Face', desc: 'The top face (always the Yellow center). U = clockwise looking from above, U\' = counter-clockwise.' },
      { move: 'R / R\' / R2', face: 'Right Face', desc: 'The right side face. R = clockwise looking at the right side (away from you), R\' = counter-clockwise (toward you).' },
      { move: 'L / L\' / L2', face: 'Left Face', desc: 'The left side face. L = clockwise looking at the left side (toward you), L\' = counter-clockwise (away from you).' }
    ],
    triggers: [
      {
        id: 'right-trigger',
        name: 'The Right Trigger',
        notation: "R U R'",
        moves: ['R', 'U', "R'"],
        desc: 'Flick the Right face up (R), slide the Up layer clockwise with your right index finger (U), then bring the Right face back down (R\').',
        setupMoves: "R U' R'"
      },
      {
        id: 'left-trigger',
        name: 'The Left Trigger',
        notation: "L' U' L",
        moves: ["L'", "U'", 'L'],
        desc: 'Flick the Left face up (L\'), slide the Up layer counter-clockwise with your left index finger (U\'), then bring the Left face back down (L).',
        setupMoves: "L' U L"
      }
    ]
  };

  const GUIDE_STEPS = [
    {
      number: 1,
      id: 'step-1-daisy',
      badge: 'STEP 1',
      title: 'The Daisy',
      headline: 'Build a White Daisy around the Yellow CENTER.',
      whatYouAreDoing: 'Find all four white EDGE pieces and bring them to the UP face so they surround the Yellow center piece like daisy petals.',
      howToDoIt: 'Locate a white EDGE piece in the middle or bottom layer. Rotate the UP face first if needed to make an empty spot, then turn the side or front face to lift the white edge onto the UP face without knocking out existing white petals.',
      solvingNote: 'As you place the white EDGEs, rotate the UP face on top of the Cube to make space to slide another white EDGE in around the yellow CENTER.',
      algorithms: [
        { label: 'Middle Right Edge to UP', formula: 'R', note: 'When white tile faces Front on the middle-right edge' },
        { label: 'Middle Left Edge to UP', formula: "L'", note: 'When white tile faces Front on the middle-left edge' },
        { label: 'Bottom Edge to UP', formula: 'F2', note: 'When white tile faces Down on the front-bottom edge' }
      ],
      visuals: [
        {
          caption: 'Target: White Daisy on UP Face',
          svg: renderTopFaceSVG([
            ['X', 'W', 'X'],
            ['W', 'Y', 'W'],
            ['X', 'W', 'X']
          ])
        }
      ],
      drill: {
        title: 'Practice Step 1: Complete the White Daisy',
        description: 'Two white edges are in the middle layer. Bring all 4 white edges around the Yellow center on UP!',
        // Setup from a Daisy (F2 R2 B2 L2) then undo ['R', 'U', 'B'] -> B' U' R'
        setupMoves: "F2 R2 B2 L2 B' U' R'",
        frontFace: 'F',
        hintMoves: ['R', 'U', 'B']
      }
    },
    {
      number: 2,
      id: 'step-2-white-cross',
      badge: 'STEP 2',
      title: 'The White Cross',
      headline: 'Move all 4 white EDGE pieces from the Daisy to the bottom White face.',
      whatYouAreDoing: 'Continuing with the Yellow face on top, match each white EDGE piece’s side tile to its matching CENTER color, then turn that face 180° (F2) to send it to the bottom.',
      howToDoIt: 'Look at the front-top edge on the Daisy. Rotate the UP face (U / U\') until the side tile of that white edge matches the center color below it. Then rotate that front face twice (F2). Repeat for all 4 white edges.',
      solvingNote: 'When you finish all four edges and peek at the bottom (DOWN) face, you will see a complete White Cross whose side tiles all match their centers!',
      algorithms: [
        { label: 'Align & Drop Each Petal', formula: 'U (align center) → F2', note: 'Repeat for Red, Green, Orange, and Blue faces' }
      ],
      visuals: [
        {
          caption: 'Bottom Face: Solved White Cross',
          svg: renderTopFaceSVG([
            ['X', 'W', 'X'],
            ['W', 'W', 'W'],
            ['X', 'W', 'X']
          ])
        }
      ],
      drill: {
        title: 'Practice Step 2: Daisy to White Cross',
        description: 'The Cube starts with a completed Daisy on the UP face. Match each white edge to its center and turn F2 to build the White Cross on the bottom!',
        setupMoves: "F2 R2 B2 L2 U",
        frontFace: 'F',
        hintMoves: ["U'", 'F2', 'R2', 'B2', 'L2']
      }
    },
    {
      number: 3,
      id: 'step-3-white-corners',
      badge: 'STEP 3',
      title: 'The White Corners',
      headline: 'Orient and insert the 4 white CORNER pieces into the bottom layer using Triggers.',
      whatYouAreDoing: 'Locate the white CORNER pieces in the top layer and use Left and Right Triggers to slot them into the bottom layer between their matching center pieces.',
      howToDoIt: 'First look for a white corner in the top layer with its white tile facing out to the side. Rotate the UP face so its other side tile matches its center color. Perform a Left Trigger (L\' U\' L) if it’s on the top-left, or a Right Trigger (R U R\') if it’s on the top-right.',
      solvingNote: 'If a white tile is facing UP, position it above an empty bottom corner and perform the Right Trigger twice (R U R\' R U R\') to flip the white tile outward. If a white corner is stuck in the bottom layer, perform a Right Trigger (R U R\') to pop it to the top layer.',
      algorithms: [
        { label: 'Corner on Top-Right of Front', formula: "R U R'", note: 'Right Trigger — inserts top-right corner' },
        { label: 'Corner on Top-Left of Front', formula: "L' U' L", note: 'Left Trigger — inserts top-left corner' },
        { label: 'White Tile Facing UP', formula: "R U R' R U R'", note: 'Right Trigger × 2 — flips white tile to the side' },
        { label: 'Corner Stuck in Bottom Layer', formula: "R U R'", note: 'Right Trigger — pops bottom-right corner to top' }
      ],
      visuals: [
        {
          caption: 'Bottom Face: All White Corners Solved',
          svg: renderTopFaceSVG([
            ['W', 'W', 'W'],
            ['W', 'W', 'W'],
            ['W', 'W', 'W']
          ])
        }
      ],
      drill: {
        title: 'Practice Step 3: Insert White Corner with Right Trigger',
        description: 'The White-Red-Green corner is in the top layer with its Red tile matched to the Red center. Perform a Right Trigger (R U R\') to solve it!',
        setupMoves: "R U' R'",
        frontFace: 'F',
        hintMoves: ['R', 'U', "R'"]
      }
    },
    {
      number: 4,
      id: 'step-4-middle-layer',
      badge: 'STEP 4',
      title: 'The Middle Layer',
      headline: 'Insert the 4 non-yellow EDGE pieces into the middle layer.',
      whatYouAreDoing: 'Find EDGE pieces in the UP layer that do NOT have a yellow tile. Line up the edge’s front tile with its matching center to make a vertical stripe, then move it down-left or down-right into the middle layer.',
      howToDoIt: 'Check the top color of your aligned edge to see whether it belongs on the Left face or Right face. Move the UP face AWAY from that target side, perform that side’s Trigger, turn to face that side, re-align the displaced white corner, and perform the opposite Trigger.',
      solvingNote: 'Can’t find any non-yellow EDGE pieces on the UP face? Perform the Move Right sequence on an unsolved middle edge to swap a yellow edge into the middle layer and pop the needed edge up!',
      algorithms: [
        {
          label: 'Move Edge Left',
          formula: "U' (L' U' L) → Face Left → U (R U R')",
          note: 'Moves aligned top edge to the middle-left slot'
        },
        {
          label: 'Move Edge Right',
          formula: "U (R U R') → Face Right → U' (L' U' L)",
          note: 'Moves aligned top edge to the middle-right slot'
        }
      ],
      visuals: [
        {
          caption: 'First Two Layers Complete',
          svg: renderTopFaceSVG([
            ['X', 'X', 'X'],
            ['R', 'R', 'R'],
            ['R', 'R', 'R']
          ])
        }
      ],
      drill: {
        title: 'Practice Step 4: Middle Layer Move Right',
        description: 'The Red-Green edge is lined up with the Red center on Front and needs to move Right toward the Green face.',
        setupMoves: "F' U F U R U' R' U'",
        frontFace: 'F',
        hintMoves: ['U', 'R', 'U', "R'", "U'", "F'", "U'", 'F']
      }
    },
    {
      number: 5,
      id: 'step-5-yellow-cross',
      badge: 'STEP 5',
      title: 'The Yellow Cross',
      headline: 'Orient all 4 yellow EDGE pieces to form a Yellow Cross on the UP face.',
      whatYouAreDoing: 'Adjust the four top-layer edge pieces so their yellow tiles all face UP around the Yellow center. Don’t worry if their side colors don’t match the side centers yet.',
      howToDoIt: 'Look at the yellow EDGE tiles on your UP face (ignoring corners) and match to one of the 3 patterns below: Single Yellow Dot, Yellow L-shape (hold at 9 and 12 o’clock — Left and Back), or Horizontal Yellow Line. Then perform F U R U\' R\' F\'. Repeat until you have the Yellow Cross.',
      solvingNote: 'Make sure you orient the L-shape at the Back and Left (or the Line horizontally) before starting F U R U\' R\' F\'.',
      algorithms: [
        {
          label: 'Yellow Cross Algorithm',
          formula: "F U R U' R' F'",
          note: 'Repeat 1–3 times depending on Dot, L-Shape, or Line'
        }
      ],
      visuals: [
        {
          caption: 'Case 1: Center Dot',
          svg: renderTopFaceSVG([
            ['X', 'X', 'X'],
            ['X', 'Y', 'X'],
            ['X', 'X', 'X']
          ])
        },
        {
          caption: 'Case 2: L-Shape (Back & Left)',
          svg: renderTopFaceSVG([
            ['X', 'Y', 'X'],
            ['Y', 'Y', 'X'],
            ['X', 'X', 'X']
          ])
        },
        {
          caption: 'Case 3: Horizontal Line',
          svg: renderTopFaceSVG([
            ['X', 'X', 'X'],
            ['Y', 'Y', 'Y'],
            ['X', 'X', 'X']
          ])
        },
        {
          caption: 'Goal: Yellow Cross',
          svg: renderTopFaceSVG([
            ['X', 'Y', 'X'],
            ['Y', 'Y', 'Y'],
            ['X', 'Y', 'X']
          ])
        }
      ],
      drill: {
        title: 'Practice Step 5: L-Shape to Yellow Cross',
        description: 'The UP face has a Yellow L-shape positioned at Back and Left. Run F U R U\' R\' F\' once to form the Yellow Cross!',
        setupMoves: "F R U R' U' F'",
        frontFace: 'F',
        hintMoves: ['F', 'U', 'R', "U'", "R'", "F'"]
      }
    },
    {
      number: 6,
      id: 'step-6-yellow-face',
      badge: 'STEP 6',
      title: 'The Yellow Face',
      headline: 'Flip all 4 yellow CORNERs so the entire UP face is solid yellow.',
      whatYouAreDoing: 'Now that you have the Yellow Cross, you will orient the 4 top corners until all 9 tiles on the UP face are Yellow.',
      howToDoIt: 'Count how many corners on the UP face already have Yellow facing UP (0, 1, or 2). Rotate the UP face so the front-left corner matches the rule for your count below, then perform R U R\' U R U2 R\'. Repeat until the whole UP face is yellow.',
      solvingNote: 'All three cases focus on the front-left corner of the UP face: 0 corners = yellow tile on Left; 1 corner = yellow corner at Front-Left; 2 corners = yellow tile on Front.',
      algorithms: [
        {
          label: 'Yellow Face Algorithm (Sune)',
          formula: "R U R' U R U2 R'",
          note: 'Orient UP face first based on 0, 1, or 2 yellow corners'
        }
      ],
      visuals: [
        {
          caption: '0 Corners: Yellow on Left',
          svg: renderTopFaceSVG([
            ['X', 'Y', 'X'],
            ['Y', 'Y', 'Y'],
            ['X', 'Y', 'X']
          ], { bottomLeftSide: 'L' })
        },
        {
          caption: '1 Corner: Front-Left UP',
          svg: renderTopFaceSVG([
            ['X', 'Y', 'X'],
            ['Y', 'Y', 'Y'],
            ['Y', 'Y', 'X']
          ])
        },
        {
          caption: '2 Corners: Yellow on Front',
          svg: renderTopFaceSVG([
            ['X', 'Y', 'Y'],
            ['Y', 'Y', 'Y'],
            ['X', 'Y', 'Y']
          ], { bottomLeftSide: 'F' })
        }
      ],
      drill: {
        title: 'Practice Step 6: 1 Yellow Corner (Sune)',
        description: 'One yellow corner is facing UP at the front-left position. Perform R U R\' U R U2 R\' to complete the Yellow Face!',
        setupMoves: "R U2 R' U' R U' R'",
        frontFace: 'F',
        hintMoves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"]
      }
    },
    {
      number: 7,
      id: 'step-7-yellow-corners',
      badge: 'STEP 7',
      title: 'The Yellow Corners',
      headline: 'Position all 4 yellow CORNERs so their side tiles match every face.',
      whatYouAreDoing: 'Move the top-layer corners into their correct positions. The completed yellow face will temporarily disappear after the first algorithm, and you’ll restore it immediately using Step 6’s algorithm!',
      howToDoIt: 'Look around the top row of the side faces for two corners of the same color on the same face ("headlights"). If you find a matching pair, rotate U to align them with their matching center and hold that face on the LEFT. Perform Algorithm 1 (L\' U R U\' L U R\'), then rotate U\' (to bring the single yellow corner to front-left) and perform Algorithm 2 (R U R\' U R U2 R\').',
      solvingNote: 'Don’t have two matching corners on any face? Run Algorithm 1 + Algorithm 2 from any front face first to create a matching pair, then hold that pair on the Left and repeat!',
      algorithms: [
        {
          label: 'Algorithm 1: Swap Top-Right Corners',
          formula: "L' U R U' L U R'",
          note: 'Hold matching corner pair on the LEFT face'
        },
        {
          label: 'Algorithm 2: Restore Yellow Face',
          formula: "U' → R U R' U R U2 R'",
          note: 'Align single yellow corner to front-left, then run Step 6 algorithm'
        }
      ],
      visuals: [
        {
          caption: 'Hold Matching Pair on LEFT',
          svg: renderTopFaceSVG([
            ['B', 'X', 'B'],
            ['B', 'B', 'B'],
            ['B', 'B', 'B']
          ])
        }
      ],
      drill: {
        title: 'Practice Step 7: Permute Yellow Corners',
        description: 'The Blue corners match on the Left face. Perform L\' U R U\' L U R\', then U\' and R U R\' U R U2 R\' to solve all 4 corners!',
        setupMoves: "R U2 R' U' R U' R' U R U' L' U R' U' L",
        frontFace: 'F',
        hintMoves: ["L'", 'U', 'R', "U'", 'L', 'U', "R'", "U'", 'R', 'U', "R'", 'U', 'R', 'U2', "R'"]
      }
    },
    {
      number: 8,
      id: 'step-8-yellow-edges',
      badge: 'STEP 8',
      title: 'The Yellow Edges',
      headline: 'Cycle the final yellow EDGEs clockwise to complete your Rubik’s Cube!',
      whatYouAreDoing: 'Move the remaining 3 yellow edge pieces clockwise around the top layer without disturbing the rest of the cube.',
      howToDoIt: 'If you have a completely solved side face, hold the cube with that solved face at the BACK. (If no side face is solved yet, hold any side face at the back.) Perform F2 U R\' L F2 L\' R U F2. Repeat up to 2–3 times until your Cube is solved!',
      solvingNote: 'Notice how the BACK edge piece never moves while the other three edges (Front, Left, Right) cycle clockwise with each run of the algorithm.',
      algorithms: [
        {
          label: 'Yellow Edges Clockwise Cycle',
          formula: "F2 U R' L F2 L' R U F2",
          note: 'Hold solved side face at the BACK; cycles Front → Left → Right'
        }
      ],
      visuals: [
        {
          caption: 'Clockwise 3-Edge Cycle (Back Fixed)',
          svg: renderTopFaceSVG([
            ['Y', 'Y', 'Y'],
            ['Y', 'Y', 'Y'],
            ['Y', 'Y', 'Y']
          ])
        }
      ],
      drill: {
        title: 'Practice Step 8: Final Yellow Edge Cycle',
        description: 'The Orange (Back) face is completely solved, and the remaining 3 edges need one clockwise cycle. Perform F2 U R\' L F2 L\' R U F2 to finish the Cube!',
        setupMoves: "F2 U' R' L F2 L' R U' F2",
        frontFace: 'F',
        hintMoves: ['F2', 'U', "R'", 'L', 'F2', "L'", 'R', 'U', 'F2']
      }
    }
  ];

  return {
    BASICS_SECTION,
    GUIDE_STEPS,
    renderTopFaceSVG
  };
});
