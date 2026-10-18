<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rubik's® 3×3 Interactive Cube Solver &amp; 8-Step Solve Guide</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg" />
  <link rel="icon" type="image/png" sizes="190x190" href="favicon.png" />
  <link rel="shortcut icon" href="favicon.ico" />
  <link rel="apple-touch-icon" href="favicon.png" />
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>

  <!-- Top Navigation Header -->
  <header class="app-header" id="app-header">
    <div class="header-top-bar">
      <div class="brand-group">
        <div class="brand-cube-icon" aria-hidden="true">
          <span class="cell-yellow"></span><span class="cell-red"></span><span class="cell-blue"></span>
          <span class="cell-green"></span><span class="cell-yellow"></span><span class="cell-orange"></span>
          <span class="cell-white"></span><span class="cell-blue"></span><span class="cell-red"></span>
        </div>
        <div>
          <div class="brand-title">Rubik’s <span class="accent">3×3 Solver</span></div>
          <span class="brand-subtitle">Official 8-Step Solve Guide Interactive Companion</span>
        </div>
      </div>

      <div class="mobile-quick-bar">
        <button type="button" class="btn btn-primary btn-mobile-scramble" id="btn-scramble-mobile" title="Scramble &amp; Solve">
          🔀 Scramble
        </button>
        <button type="button" class="mobile-menu-toggle" id="btn-mobile-menu" aria-expanded="false" aria-controls="header-collapsible" title="Toggle Menu &amp; Tools">
          <span class="menu-icon">☰</span> <span class="menu-label">Menu</span>
        </button>
      </div>
    </div>

    <div class="header-collapsible" id="header-collapsible">
      <nav class="mode-tabs" aria-label="Application Modes">
        <button type="button" class="mode-tab-btn active" data-mode-tab="solver">
          1. Interactive 8-Step Solver
        </button>
        <button type="button" class="mode-tab-btn" data-mode-tab="guide">
          2. Official 8-Step Solve Guide
        </button>
        <button type="button" class="mode-tab-btn" data-mode-tab="practice">
          3. Practice Drills &amp; Triggers
        </button>
      </nav>

      <div class="header-actions">
        <button type="button" class="btn btn-secondary" id="btn-open-painter">
          🎨 Paint / Input Cube
        </button>
        <button type="button" class="btn btn-secondary" id="btn-reset-cube">
          ↺ Reset Solved
        </button>
        <button type="button" class="btn btn-primary" id="btn-scramble">
          🔀 Scramble &amp; Solve
        </button>
      </div>
    </div>
  </header>

  <!-- Split-Screen Interactive Workspace -->
  <main class="workspace-grid">

    <!-- Left Column: 3D Interactive Cube Stage & Manual Move Keypad -->
    <section class="stage-column" aria-label="3D Rubik's Cube Stage">
      <div class="stage-card">
        <div class="stage-hud-top">
          <div class="hud-badges">
            <span class="hud-pill" id="hud-up-badge" title="Steps 1–4: White on UP | Steps 5–8: Yellow on UP">
              <span class="color-dot dot-white"></span> UP: <strong>White</strong>
            </span>
            <span class="hud-pill" id="hud-front-badge">
              <span class="color-dot dot-red"></span> Front: <strong>Red</strong>
            </span>
          </div>

          <div class="camera-snap-bar" aria-label="Snap Camera to Face">
            <button type="button" class="cam-btn active" data-camera-face="F" title="Look at Red Center (Front)">
              <span class="color-dot dot-red"></span> <span class="cam-label">Red</span>
            </button>
            <button type="button" class="cam-btn" data-camera-face="R" title="Look at Green Center (Right)">
              <span class="color-dot dot-green"></span> <span class="cam-label">Green</span>
            </button>
            <button type="button" class="cam-btn" data-camera-face="B" title="Look at Orange Center (Back)">
              <span class="color-dot dot-orange"></span> <span class="cam-label">Orange</span>
            </button>
            <button type="button" class="cam-btn" data-camera-face="L" title="Look at Blue Center (Left)">
              <span class="color-dot dot-blue"></span> <span class="cam-label">Blue</span>
            </button>
            <button type="button" class="cam-btn" data-camera-face="D" title="Peek at Bottom Center">
              <span class="color-dot dot-yellow" id="cam-bottom-dot"></span> <span class="cam-label">Bottom</span>
            </button>
          </div>
        </div>

        <div class="viewport-wrapper">
          <div id="cube-3d-viewport"></div>
          <div id="mini-net-container" class="mini-net-overlay" aria-label="2D Cube Net"></div>
          <div class="viewport-hint">Drag to orbit • Scroll to zoom</div>
        </div>

        <!-- Mobile-Only Slot: Movie-Caption Step Display & Playback Controls Directly Under 3D Cube -->
        <div id="mobile-player-slot"></div>
      </div>

      <!-- Manual Turn & Trigger Keypad (Collapsible on Mobile) -->
      <div class="keypad-card" id="keypad-card">
        <div class="keypad-header">
          <button type="button" class="keypad-toggle-btn" id="btn-toggle-keypad" aria-expanded="false">
            <span class="keypad-title">⌨️ Manual Turns &amp; Triggers</span>
            <span class="keypad-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="quick-triggers">
            <button type="button" class="btn-trigger" id="btn-quick-left-trigger" title="Execute Left Trigger: L' U' L">
              ⚡ Left (L' U' L)
            </button>
            <button type="button" class="btn-trigger" id="btn-quick-right-trigger" title="Execute Right Trigger: R U R'">
              ⚡ Right (R U R')
            </button>
          </div>
        </div>

        <div class="keypad-moves-grid" id="keypad-moves-grid">
          <button type="button" class="key-btn" data-manual-move="F" title="Front Clockwise">F</button>
          <button type="button" class="key-btn" data-manual-move="U" title="Up Clockwise">U</button>
          <button type="button" class="key-btn" data-manual-move="R" title="Right Clockwise">R</button>
          <button type="button" class="key-btn" data-manual-move="L" title="Left Clockwise">L</button>
          <button type="button" class="key-btn" data-manual-move="B" title="Back Clockwise">B</button>
          <button type="button" class="key-btn" data-manual-move="D" title="Down Clockwise">D</button>

          <button type="button" class="key-btn" data-manual-move="F'" title="Front Counter-Clockwise">F'</button>
          <button type="button" class="key-btn" data-manual-move="U'" title="Up Counter-Clockwise">U'</button>
          <button type="button" class="key-btn" data-manual-move="R'" title="Right Counter-Clockwise">R'</button>
          <button type="button" class="key-btn" data-manual-move="L'" title="Left Counter-Clockwise">L'</button>
          <button type="button" class="key-btn" data-manual-move="B'" title="Back Counter-Clockwise">B'</button>
          <button type="button" class="key-btn" data-manual-move="D'" title="Down Counter-Clockwise">D'</button>

          <button type="button" class="key-btn" data-manual-move="F2" title="Front 180°">F2</button>
          <button type="button" class="key-btn" data-manual-move="U2" title="Up 180°">U2</button>
          <button type="button" class="key-btn" data-manual-move="R2" title="Right 180°">R2</button>
          <button type="button" class="key-btn" data-manual-move="L2" title="Left 180°">L2</button>
          <button type="button" class="key-btn" data-manual-move="B2" title="Back 180°">B2</button>
          <button type="button" class="key-btn" data-manual-move="D2" title="Down 180°">D2</button>
        </div>
      </div>
    </section>

    <!-- Right Column: Context Views (1. Solver | 2. 8-Step Guide | 3. Practice Drills) -->
    <section class="context-column">

      <!-- PANE 1: INTERACTIVE 8-STEP SOLVER -->
      <div id="pane-solver" class="context-pane-view active">
        <!-- Desktop Slot: Keeps Playback & Active Step Instructions in the Right Panel on Desktop -->
        <div id="desktop-player-slot">
          <div class="stage-caption-dock" id="stage-caption-dock">
            <div id="active-move-banner" class="movie-caption-box" aria-live="polite"></div>

            <div class="caption-transport-bar">
              <div class="timeline-progress-bar">
                <div id="timeline-progress-fill"></div>
              </div>

              <div class="timeline-controls-row">
                <div class="player-btns">
                  <button type="button" class="btn-player" id="btn-substep-prev" title="Previous Sub-Step">⏮</button>
                  <button type="button" class="btn-player" id="btn-step-prev" title="Step Backward 1 Move (Left Arrow)">◀ Prev</button>
                  <button type="button" class="btn-player btn-play-main" id="btn-play-pause" title="Play / Pause Solution (Spacebar)">
                    <span class="icon">▶</span> Play Solve
                  </button>
                  <button type="button" class="btn-player" id="btn-step-next" title="Step Forward 1 Move (Right Arrow)">Next ▶</button>
                  <button type="button" class="btn-player" id="btn-substep-next" title="Next Sub-Step">⏭</button>
                </div>

                <div class="transport-meta-right">
                  <span id="timeline-progress-text" class="caption-progress-text">Solved</span>
                  <select id="select-speed" class="speed-select" aria-label="Playback Speed">
                    <option value="0.5">0.5×</option>
                    <option value="1" selected>1×</option>
                    <option value="2">2×</option>
                    <option value="4">4×</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="solver-summary-bar" class="desktop-only-solver-block"></div>
        <div id="solver-stages-list" class="solver-stages-scroll desktop-only-solver-block"></div>
      </div>

      <!-- PANE 2: OFFICIAL 8-STEP SOLVE GUIDE & TUTORIAL -->
      <div id="pane-guide" class="context-pane-view">
        <div id="guide-step-nav" class="guide-step-nav" role="tablist"></div>
        <div id="guide-step-content"></div>
      </div>

      <!-- PANE 3: PRACTICE DRILLS & TRIGGERS -->
      <div id="pane-practice" class="context-pane-view">
        <div id="practice-panel-content"></div>
      </div>

    </section>
  </main>

  <!-- 2D Unfolded Net Color Painter Modal -->
  <div id="painter-backdrop" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="painter-modal-title">
    <div class="painter-modal">
      <div class="painter-modal-header">
        <div>
          <h2 id="painter-modal-title">Paint / Input Your Rubik’s Cube</h2>
          <p style="font-size:0.82rem;color:var(--text-muted);">
            Hold your physical cube with the <strong>Yellow Center on UP</strong> and <strong>Red Center on FRONT</strong>, then click tiles to match your cube.
          </p>
        </div>
        <button type="button" class="btn btn-secondary" id="btn-close-painter">✕ Close</button>
      </div>

      <div class="palette-bar" aria-label="Select Sticker Color">
        <span style="font-size:0.8rem;font-weight:700;color:var(--text-muted);margin-right:0.25rem;">Select Color:</span>
        <button type="button" class="swatch-btn active" data-paint-color="R">
          <span class="color-dot dot-red"></span> Red <span class="swatch-count">9/9</span>
        </button>
        <button type="button" class="swatch-btn" data-paint-color="G">
          <span class="color-dot dot-green"></span> Green <span class="swatch-count">9/9</span>
        </button>
        <button type="button" class="swatch-btn" data-paint-color="O">
          <span class="color-dot dot-orange"></span> Orange <span class="swatch-count">9/9</span>
        </button>
        <button type="button" class="swatch-btn" data-paint-color="B">
          <span class="color-dot dot-blue"></span> Blue <span class="swatch-count">9/9</span>
        </button>
        <button type="button" class="swatch-btn" data-paint-color="Y">
          <span class="color-dot dot-yellow"></span> Yellow <span class="swatch-count">9/9</span>
        </button>
        <button type="button" class="swatch-btn" data-paint-color="W">
          <span class="color-dot dot-white"></span> White <span class="swatch-count">9/9</span>
        </button>
      </div>

      <div id="painter-net-board" class="painter-net-board"></div>

      <div id="painter-validation-status" class="painter-status valid"></div>

      <div class="painter-modal-footer">
        <div style="display:flex;gap:0.5rem;">
          <button type="button" class="btn btn-secondary" id="btn-painter-solved">Reset to Solved</button>
          <button type="button" class="btn btn-secondary" id="btn-painter-scramble">Fill Random Scramble</button>
        </div>
        <button type="button" class="btn btn-primary" id="btn-painter-apply">
          ✓ Load &amp; Generate 8-Step Solution
        </button>
      </div>
    </div>
  </div>

  <div id="app-toast" class="app-toast" role="status" aria-live="polite"></div>

  <!-- Scripts -->
  <script src="js/vendor/three.min.js"></script>
  <script src="js/cube-state.js"></script>
  <script src="js/solver-guide.js"></script>
  <script src="js/guide-content.js"></script>
  <script src="js/cube-3d.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
