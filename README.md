# Rubik's® 3×3 Interactive Cube Solver & 8-Step Solve Guide

An interactive 3D Rubik's Cube solver and tutorial companion web application implementing the official [Rubik's 3×3 8-Step Solve Guide](https://rubiks.com/solve-guide) beginner method.

## Features

- **Interactive 3D Rubik's Cube (Three.js)**: Smooth animated layer turns, camera face-snapping (`Red`, `Green`, `Orange`, `Blue`, and `Bottom` peek) with the **Yellow center on UP**, and responsive desktop/mobile layouts.
- **Official 8-Step Beginner Solver Engine**:
  1. Know Your Cube
  2. Create the Daisy (`Yellow` center with 4 `White` edge petals)
  3. Solve the White Cross
  4. Solve the Bottom Layer (White Corners via Left/Right Triggers)
  5. Solve the Middle Layer
  6. Create the Yellow Cross
  7. Solve the Yellow Face (`R U R' U R U2 R'`)
  8. Position the Yellow Corners & Edges
- **Movie-Caption Playback & Timeline**: Step-by-step and substep-by-substep transport controls (`⏮`, `◀ Prev`, `▶ Play Solve`, `Next ▶`, `⏭`), adjustable animation speed (`0.6×` to `3.0×`), and active Front-face orientation guidance.
- **2D Color Painter & Solvability Validator**: Input any physical cube state with real-time validation of sticker counts, edge/corner validity, twist/flip invariants, and permutation parity.
- **Interactive 8-Step Guide & Practice Drills**: Dedicated curriculum walkthrough and hands-on trigger/algorithm drills.

## Project Structure

- `index.php` — Application shell, 3D stage HUD, solver/guide/practice panes, and 2D painter modal
- `css/styles.css` — Responsive dark-mode styling for desktop split-screen and mobile movie-caption layouts
- `js/cube-state.js` — 54-sticker state model, move engine, perspective remapper, and solvability validator
- `js/solver-guide.js` — Deterministic 8-Step Solve Guide human-style solver
- `js/guide-content.js` — Official 8-Step curriculum content and practice drill presets
- `js/cube-3d.js` — Three.js 3D cube renderer, spherical orbit controls, and animated turn engine
- `js/app.js` — UI controller, playback state machine, and 2D color painter
