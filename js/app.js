/**
 * Main Application Controller for the Interactive Rubik's Cube Solver & 8-Step Solve Guide
 */
(function () {
  'use strict';

  const { COLORS, DEFAULT_FACE_COLORS, PERSPECTIVE_MAP, CubeState } = window.RubiksCore;
  const { STAGE_METADATA, RubiksGuideSolver } = window.RubiksSolver;
  const { BASICS_SECTION, GUIDE_STEPS } = window.RubiksGuideContent;
  const { Cube3DView } = window.RubiksView3D;

  const appState = {
    mode: 'solver', // 'solver' | 'guide' | 'practice'
    cube: new CubeState(),
    view3d: null,
    activeFrontFace: 'F',

    // Solver timeline state
    solution: null,
    currentMoveCursor: -1, // -1 = before move 0 (initial state); 0..N-1 = after move i
    isPlaying: false,
    playToken: 0,
    activeStageFilter: 'all',

    // Guide state
    selectedGuideTab: 'basics', // 'basics' or 1..8

    // Practice drill state
    activeDrillId: 'step-3',
    drillMoveProgress: 0,
    drillShowHints: true,
    drillCompleted: false,

    // Color Painter state
    painterGrid: null,
    selectedPaintColor: 'R'
  };

  document.addEventListener('DOMContentLoaded', initApp);

  function syncPlayerDockLocation() {
    const dock = document.getElementById('stage-caption-dock');
    const mobileSlot = document.getElementById('mobile-player-slot');
    const desktopSlot = document.getElementById('desktop-player-slot');
    if (!dock || !mobileSlot || !desktopSlot) return;

    const isMobile = window.matchMedia('(max-width: 1080px)').matches;
    const targetParent = isMobile ? mobileSlot : desktopSlot;
    if (dock.parentElement !== targetParent) {
      targetParent.appendChild(dock);
    }
  }

  function initApp() {
    syncPlayerDockLocation();
    const mq = window.matchMedia('(max-width: 1080px)');
    if (mq.addEventListener) {
      mq.addEventListener('change', syncPlayerDockLocation);
    } else {
      window.addEventListener('resize', syncPlayerDockLocation);
    }

    const viewportEl = document.getElementById('cube-3d-viewport');
    appState.view3d = new Cube3DView(viewportEl, appState.cube, {
      onCameraFaceChange: (detectedFace) => {
        appState.activeFrontFace = detectedFace;
        updateOrientationHUD();
      }
    });

    bindTopNavigation();
    bindStageControls();
    bindTimelineControls();
    bindColorPainterModal();
    bindKeyboardShortcuts();

    // Generate initial solution for solved state (or run an initial demo scramble on user request)
    renderMiniNet(appState.cube);
    updateOrientationHUD();
    recomputeSolutionFromCurrentCube();
    renderGuidePanel();
    renderPracticePanel();
  }

  // ===========================================================================
  // NAVIGATION & TOP ACTIONS
  // ===========================================================================
  function closeMobileHeaderMenu() {
    const headerEl = document.getElementById('app-header');
    const toggleBtn = document.getElementById('btn-mobile-menu');
    if (headerEl) headerEl.classList.remove('mobile-menu-open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
  }

  async function triggerScrambleAndSolve() {
    closeMobileHeaderMenu();
    stopPlayback();
    const scrambleMoves = appState.cube.reset().scramble(20);
    appState.view3d.syncFromState(appState.cube);
    await appState.view3d.orbitToFace('F', 300);
    renderMiniNet(appState.cube);

    if (appState.mode !== 'solver') {
      switchMode('solver');
    }
    recomputeSolutionFromCurrentCube(scrambleMoves);
    showToast('Scrambled with 20 moves & generated 8-Step Guide solution!');
  }

  function bindTopNavigation() {
    const mobileMenuBtn = document.getElementById('btn-mobile-menu');
    const headerEl = document.getElementById('app-header');
    if (mobileMenuBtn && headerEl) {
      mobileMenuBtn.addEventListener('click', () => {
        const isOpen = headerEl.classList.toggle('mobile-menu-open');
        mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    document.querySelectorAll('[data-mode-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode-tab');
        closeMobileHeaderMenu();
        switchMode(mode);
      });
    });

    document.getElementById('btn-scramble').addEventListener('click', triggerScrambleAndSolve);
    const mobileScrambleBtn = document.getElementById('btn-scramble-mobile');
    if (mobileScrambleBtn) {
      mobileScrambleBtn.addEventListener('click', triggerScrambleAndSolve);
    }

    document.getElementById('btn-reset-cube').addEventListener('click', async () => {
      closeMobileHeaderMenu();
      stopPlayback();
      appState.cube.reset();
      appState.view3d.syncFromState(appState.cube);
      await appState.view3d.orbitToFace('F', 300);
      renderMiniNet(appState.cube);
      recomputeSolutionFromCurrentCube();
      showToast('Cube reset to solved state.');
    });

    document.getElementById('btn-open-painter').addEventListener('click', () => {
      closeMobileHeaderMenu();
      stopPlayback();
      openColorPainterModal();
    });
  }

  function switchMode(mode) {
    stopPlayback();
    appState.mode = mode;

    document.querySelectorAll('[data-mode-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode-tab') === mode);
    });

    document.querySelectorAll('.context-pane-view').forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${mode}`);
    });

    const captionDock = document.getElementById('stage-caption-dock');
    if (captionDock) {
      captionDock.style.display = mode === 'solver' ? 'flex' : 'none';
    }

    // Automatically expand manual keypad when entering practice mode on mobile
    const keypadCard = document.getElementById('keypad-card');
    const keypadBtn = document.getElementById('btn-toggle-keypad');
    if (keypadCard && keypadBtn) {
      if (mode === 'practice') {
        keypadCard.classList.add('keypad-open');
        keypadBtn.setAttribute('aria-expanded', 'true');
      } else {
        keypadCard.classList.remove('keypad-open');
        keypadBtn.setAttribute('aria-expanded', 'false');
      }
    }
  }

  // ===========================================================================
  // 3D STAGE CONTROLS, MANUAL KEYPAD & MINI 2D NET
  // ===========================================================================
  function bindStageControls() {
    // Collapsible manual keypad toggle (for mobile)
    const keypadToggle = document.getElementById('btn-toggle-keypad');
    const keypadCard = document.getElementById('keypad-card');
    if (keypadToggle && keypadCard) {
      keypadToggle.addEventListener('click', () => {
        const isOpen = keypadCard.classList.toggle('keypad-open');
        keypadToggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // Camera preset buttons
    document.querySelectorAll('[data-camera-face]').forEach(btn => {
      btn.addEventListener('click', () => {
        const face = btn.getAttribute('data-camera-face');
        appState.view3d.orbitToFace(face, 380);
      });
    });

    // Relative Manual Move Keypad buttons
    document.querySelectorAll('[data-manual-move]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (appState.view3d.isAnimating) return;
        stopPlayback();
        const relMove = btn.getAttribute('data-manual-move');
        await executeManualRelativeMoves([relMove]);
      });
    });

    // Quick Trigger buttons (Right Trigger: R U R', Left Trigger: L' U' L)
    document.getElementById('btn-quick-right-trigger').addEventListener('click', async () => {
      if (appState.view3d.isAnimating) return;
      stopPlayback();
      await executeManualRelativeMoves(['R', 'U', "R'"]);
    });

    document.getElementById('btn-quick-left-trigger').addEventListener('click', async () => {
      if (appState.view3d.isAnimating) return;
      stopPlayback();
      await executeManualRelativeMoves(["L'", "U'", 'L']);
    });
  }

  async function executeManualRelativeMoves(relMoves) {
    const frontFace = appState.activeFrontFace || 'F';
    for (const relMove of relMoves) {
      const absMove = CubeState.translateRelativeMove(relMove, frontFace);
      appState.cube.applyMove(absMove);
      await appState.view3d.animateMove(absMove, 240);
      renderMiniNet(appState.cube);

      if (appState.mode === 'practice') {
        handlePracticeManualMove(relMove, absMove);
      }
    }

    if (appState.mode === 'solver') {
      recomputeSolutionFromCurrentCube();
    }
  }

  function updateOrientationHUD() {
    const face = appState.activeFrontFace || 'F';
    const info = PERSPECTIVE_MAP[face] || PERSPECTIVE_MAP.F;
    const badgeEl = document.getElementById('hud-front-badge');
    if (badgeEl) {
      badgeEl.innerHTML = `<span class="color-dot dot-${COLORS[info.frontColor].css}"></span> Front: <strong>${info.frontName}</strong>`;
    }
    document.querySelectorAll('[data-camera-face]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-camera-face') === face);
    });
  }

  function renderMiniNet(cubeState) {
    const container = document.getElementById('mini-net-container');
    if (!container) return;
    const grid = cubeState.toFaceGrid();
    const facesOrder = ['U', 'L', 'F', 'R', 'B', 'D'];
    let html = '<div class="mini-net-grid">';
    for (const face of facesOrder) {
      html += `<div class="mini-net-face mini-face-${face}" title="${face} Face">`;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const col = grid[face][r][c];
          html += `<span class="mini-cell cell-${COLORS[col].css}"></span>`;
        }
      }
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  // ===========================================================================
  // MODE 1: 8-STEP SOLVER & TIMELINE PLAYER
  // ===========================================================================
  function recomputeSolutionFromCurrentCube(scrambleMoves = null) {
    stopPlayback();
    try {
      const solver = new RubiksGuideSolver(appState.cube);
      appState.solution = solver.solve();
      appState.currentMoveCursor = -1;
      renderSolverPane(scrambleMoves);
      updateTimelineUI();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function bindTimelineControls() {
    document.getElementById('btn-play-pause').addEventListener('click', () => {
      if (appState.isPlaying) {
        stopPlayback();
      } else {
        startPlayback();
      }
    });

    document.getElementById('btn-step-prev').addEventListener('click', async () => {
      stopPlayback();
      await stepBackwardOneMove();
    });

    document.getElementById('btn-step-next').addEventListener('click', async () => {
      stopPlayback();
      await stepForwardOneMove();
    });

    document.getElementById('btn-substep-prev').addEventListener('click', () => {
      stopPlayback();
      if (!appState.solution || appState.solution.flatMoves.length === 0) return;
      const curIdx = Math.max(0, appState.currentMoveCursor);
      const curSubStepIdx = appState.solution.flatMoves[curIdx].subStepIndex;
      const targetSubStep = appState.solution.subSteps[Math.max(0, curSubStepIdx - 1)];
      jumpToMoveIndex(targetSubStep.startMoveIndex - 1);
    });

    document.getElementById('btn-substep-next').addEventListener('click', () => {
      stopPlayback();
      if (!appState.solution || appState.solution.flatMoves.length === 0) return;
      if (appState.currentMoveCursor < 0) {
        const firstSub = appState.solution.subSteps[0];
        if (firstSub) jumpToMoveIndex(firstSub.endMoveIndex);
        return;
      }
      const curMove = appState.solution.flatMoves[appState.currentMoveCursor];
      const nextSub = appState.solution.subSteps[curMove.subStepIndex + 1];
      if (nextSub) {
        jumpToMoveIndex(nextSub.endMoveIndex);
      } else {
        jumpToMoveIndex(appState.solution.flatMoves.length - 1);
      }
    });

    const speedSelect = document.getElementById('select-speed');
    if (speedSelect) {
      speedSelect.addEventListener('change', () => {
        appState.view3d.setSpeed(parseFloat(speedSelect.value));
      });
    }
  }

  function jumpToMoveIndex(moveIndex) {
    if (!appState.solution) return;
    const moves = appState.solution.flatMoves;
    if (moves.length === 0 || moveIndex < 0) {
      appState.currentMoveCursor = -1;
      appState.cube = appState.solution.initialState.clone();
      appState.view3d.syncFromState(appState.cube);
      renderMiniNet(appState.cube);
      updateTimelineUI();
      return;
    }

    const clamped = Math.min(moves.length - 1, moveIndex);
    const targetMove = moves[clamped];
    appState.currentMoveCursor = clamped;
    appState.cube = targetMove.stateAfter.clone();
    appState.view3d.syncFromState(appState.cube);
    appState.view3d.orbitToFace(targetMove.frontFace, 280);
    renderMiniNet(appState.cube);
    updateTimelineUI();
  }

  async function stepForwardOneMove() {
    if (!appState.solution || appState.view3d.isAnimating) return false;
    const moves = appState.solution.flatMoves;
    if (appState.currentMoveCursor >= moves.length - 1) return false;

    const nextIdx = appState.currentMoveCursor + 1;
    const moveObj = moves[nextIdx];
    appState.currentMoveCursor = nextIdx;
    updateTimelineUI();

    if (appState.activeFrontFace !== moveObj.frontFace) {
      await appState.view3d.orbitToFace(moveObj.frontFace, 300);
    }
    await appState.view3d.animateMove(moveObj.absMove, 300);
    appState.cube = moveObj.stateAfter.clone();
    renderMiniNet(appState.cube);
    updateTimelineUI();
    return true;
  }

  async function stepBackwardOneMove() {
    if (!appState.solution || appState.view3d.isAnimating) return false;
    const moves = appState.solution.flatMoves;
    if (appState.currentMoveCursor < 0) return false;

    const moveObj = moves[appState.currentMoveCursor];
    const invAbsMove = CubeState.invertMove(moveObj.absMove);
    appState.currentMoveCursor--;
    updateTimelineUI();

    if (appState.activeFrontFace !== moveObj.frontFace) {
      await appState.view3d.orbitToFace(moveObj.frontFace, 260);
    }
    await appState.view3d.animateMove(invAbsMove, 260);
    appState.cube = moveObj.stateBefore.clone();
    renderMiniNet(appState.cube);
    updateTimelineUI();
    return true;
  }

  async function startPlayback() {
    if (!appState.solution || appState.solution.flatMoves.length === 0) return;
    if (appState.currentMoveCursor >= appState.solution.flatMoves.length - 1) {
      jumpToMoveIndex(-1);
    }
    appState.isPlaying = true;
    const myToken = ++appState.playToken;
    updateTimelineUI();

    while (appState.isPlaying && appState.playToken === myToken) {
      const advanced = await stepForwardOneMove();
      if (!advanced) {
        appState.isPlaying = false;
        updateTimelineUI();
        break;
      }
      await new Promise(r => setTimeout(r, 90));
    }
  }

  function stopPlayback() {
    appState.isPlaying = false;
    appState.playToken++;
    updateTimelineUI();
  }

  function updateTimelineUI() {
    const sol = appState.solution;
    const playBtn = document.getElementById('btn-play-pause');
    const progressText = document.getElementById('timeline-progress-text');
    const progressBar = document.getElementById('timeline-progress-fill');
    const activeBanner = document.getElementById('active-move-banner');

    if (playBtn) {
      playBtn.innerHTML = appState.isPlaying
        ? '<span class="icon">⏸</span> Pause'
        : '<span class="icon">▶</span> Play Solve';
      playBtn.classList.toggle('playing', appState.isPlaying);
    }

    if (!sol || sol.flatMoves.length === 0) {
      if (progressText) progressText.textContent = '0 / 0';
      if (progressBar) progressBar.style.width = '100%';
      if (activeBanner) {
        activeBanner.innerHTML = `
          <div class="banner-solved">
            <span class="solved-badge">SOLVED</span>
            <span>Your Rubik’s Cube is completely solved! Click <strong>Scramble</strong> or <strong>Paint Cube</strong> to solve a new state.</span>
          </div>`;
      }
      return;
    }

    const total = sol.flatMoves.length;
    const current = appState.currentMoveCursor + 1;
    const pct = Math.round((current / total) * 100);
    if (progressText) progressText.textContent = `${current} / ${total}`;
    if (progressBar) progressBar.style.width = `${pct}%`;

    // Highlight active move pill & sub-step card
    document.querySelectorAll('.move-pill[data-move-idx]').forEach(el => {
      const idx = parseInt(el.getAttribute('data-move-idx'), 10);
      el.classList.toggle('current', idx === appState.currentMoveCursor);
      el.classList.toggle('completed', idx < appState.currentMoveCursor);
    });

    const activeMoveIdx = Math.max(0, appState.currentMoveCursor);
    const activeMove = sol.flatMoves[activeMoveIdx];

    const stagesContainer = document.getElementById('solver-stages-list');
    document.querySelectorAll('.substep-card[data-substep-idx]').forEach(card => {
      const sIdx = parseInt(card.getAttribute('data-substep-idx'), 10);
      const isCurrent = appState.currentMoveCursor >= 0 && activeMove && activeMove.subStepIndex === sIdx;
      card.classList.toggle('active-substep', isCurrent);
      if (isCurrent && stagesContainer) {
        const containerRect = stagesContainer.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const offsetTop = cardRect.top - containerRect.top + stagesContainer.scrollTop;
        const targetScroll = offsetTop - (stagesContainer.clientHeight / 2) + (card.clientHeight / 2);
        stagesContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      }
    });

    if (activeBanner && activeMove) {
      const nextMoveIdx = appState.currentMoveCursor + 1;
      const focusMove = nextMoveIdx < total ? sol.flatMoves[nextMoveIdx] : activeMove;
      const focusSubStep = sol.subSteps[focusMove.subStepIndex];
      const isDone = appState.currentMoveCursor >= total - 1;
      const colorCss = COLORS[focusMove.frontColor].css;

      let subStepPillsHtml = '';
      if (focusSubStep) {
        for (let i = 0; i < focusSubStep.relativeMoves.length; i++) {
          const gIdx = focusSubStep.startMoveIndex + i;
          const mToken = focusSubStep.relativeMoves[i];
          let cls = 'caption-move-pill';
          if (gIdx <= appState.currentMoveCursor) cls += ' completed';
          else if (gIdx === nextMoveIdx) cls += ' next-up';
          subStepPillsHtml += `<button type="button" class="${cls}" data-caption-move-idx="${gIdx}" title="Jump to move #${gIdx + 1}">${escapeHtml(mToken)}</button>`;
        }
      }

      activeBanner.innerHTML = isDone
        ? `<div class="banner-solved">
             <span class="solved-badge">🎉 STEP 8 COMPLETE</span>
             <span>All ${total} moves executed — your Rubik's Cube is solved!</span>
           </div>`
        : `<div class="banner-step-active">
             <div class="banner-top-row">
               <span class="stage-tag">Step ${focusMove.stageNumber} of 8</span>
               <span class="front-indicator"><span class="color-dot dot-${colorCss}"></span> <strong>${focusMove.frontColorName}</strong> Front</span>
               <div class="caption-pills-strip">${subStepPillsHtml}</div>
             </div>
             <div class="caption-subtitle-text">
               <strong>${escapeHtml(focusMove.subStepTitle)}:</strong> ${escapeHtml(focusMove.explanation)}
             </div>
           </div>`;

      activeBanner.querySelectorAll('[data-caption-move-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          stopPlayback();
          const idx = parseInt(btn.getAttribute('data-caption-move-idx'), 10);
          jumpToMoveIndex(idx);
        });
      });

      const strip = activeBanner.querySelector('.caption-pills-strip');
      const nextPill = activeBanner.querySelector('.caption-move-pill.next-up');
      if (strip && nextPill) {
        const stripRect = strip.getBoundingClientRect();
        const pillRect = nextPill.getBoundingClientRect();
        const offsetLeft = pillRect.left - stripRect.left + strip.scrollLeft;
        const targetLeft = offsetLeft - (strip.clientWidth / 2) + (nextPill.clientWidth / 2);
        strip.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      }
    }
  }

  function renderSolverPane(scrambleMoves = null) {
    const container = document.getElementById('solver-stages-list');
    const summaryEl = document.getElementById('solver-summary-bar');
    if (!container || !appState.solution) return;

    const sol = appState.solution;

    if (summaryEl) {
      const activeStagesCount = sol.stages.filter(s => !s.skipped).length;
      summaryEl.innerHTML = `
        <div class="summary-stats">
          <div class="stat-chip">
            <span class="stat-label">Method</span>
            <span class="stat-val">Official 8-Step Guide</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Active Stages</span>
            <span class="stat-val">${activeStagesCount} / 8</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Total Sub-Steps</span>
            <span class="stat-val">${sol.totalSubSteps}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Total Turns</span>
            <span class="stat-val">${sol.totalMoves}</span>
          </div>
        </div>
        ${scrambleMoves ? `<div class="scramble-bar"><strong>Applied Scramble:</strong> <code>${scrambleMoves.join(' ')}</code></div>` : ''}
      `;
    }

    if (sol.totalMoves === 0) {
      container.innerHTML = `
        <div class="empty-solver-card">
          <h3>Cube is Currently Solved!</h3>
          <p>Click <strong>Scramble Cube</strong> in the header to generate a random 20-move scramble, or click <strong>Paint / Input Cube</strong> to enter the colors of your real-world Rubik's Cube and get a personalized 8-step walkthrough.</p>
        </div>
      `;
      return;
    }

    let html = '';
    for (const stage of sol.stages) {
      if (stage.skipped) {
        html += `
          <div class="stage-block skipped">
            <div class="stage-header">
              <div>
                <span class="stage-num-badge">STEP ${stage.number}</span>
                <strong class="stage-title">${escapeHtml(stage.shortTitle)}</strong>
              </div>
              <span class="stage-status-chip done">✓ Already Complete</span>
            </div>
          </div>`;
        continue;
      }

      html += `
        <div class="stage-block" data-stage-num="${stage.number}">
          <div class="stage-header">
            <div>
              <span class="stage-num-badge">STEP ${stage.number}</span>
              <strong class="stage-title">${escapeHtml(stage.shortTitle)}</strong>
            </div>
            <span class="stage-status-chip">${stage.moveCount} moves</span>
          </div>
          <p class="stage-goal-text">${escapeHtml(stage.goal)}</p>
          <div class="substeps-container">
      `;

      for (const sub of stage.subSteps) {
        const fColorCss = COLORS[sub.frontColor].css;
        html += `
          <div class="substep-card" data-substep-idx="${sub.index}">
            <div class="substep-top">
              <span class="substep-title">${escapeHtml(sub.subStepTitle)}</span>
              <span class="substep-front-badge" title="Hold ${sub.frontColorName} center in Front">
                <span class="color-dot dot-${fColorCss}"></span> ${sub.frontColorName} Front
              </span>
            </div>
            <p class="substep-desc">${escapeHtml(sub.explanation)}</p>
            <div class="substep-moves-row">
              <span class="algo-label">${escapeHtml(sub.algorithmName)}:</span>
              <div class="move-pills-group">
        `;

        for (let i = 0; i < sub.relativeMoves.length; i++) {
          const globalMoveIdx = sub.startMoveIndex + i;
          const relMove = sub.relativeMoves[i];
          const absMove = sub.absoluteMoves[i];
          html += `
            <button type="button" class="move-pill" data-move-idx="${globalMoveIdx}" title="Click to jump to move #${globalMoveIdx + 1} (${relMove} relative to ${sub.frontColorName} / ${absMove} absolute)">
              ${escapeHtml(relMove)}
            </button>`;
        }

        html += `
              </div>
            </div>
          </div>`;
      }

      html += `
          </div>
        </div>`;
    }

    container.innerHTML = html;

    // Bind move pill clicks to jump directly to that move in the 3D timeline
    container.querySelectorAll('.move-pill[data-move-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        stopPlayback();
        const idx = parseInt(btn.getAttribute('data-move-idx'), 10);
        jumpToMoveIndex(idx);
      });
    });
  }

  // ===========================================================================
  // MODE 2: INTERACTIVE 8-STEP SOLVE GUIDE & TUTORIAL
  // ===========================================================================
  function renderGuidePanel() {
    const navEl = document.getElementById('guide-step-nav');
    const bodyEl = document.getElementById('guide-step-content');
    if (!navEl || !bodyEl) return;

    const tabs = [
      { id: 'basics', label: 'The Basics & Triggers' },
      ...GUIDE_STEPS.map(s => ({ id: String(s.number), label: `Step ${s.number}: ${s.title}` }))
    ];

    navEl.innerHTML = tabs.map(t => `
      <button type="button" class="guide-tab-btn ${appState.selectedGuideTab === t.id ? 'active' : ''}" data-guide-tab="${t.id}">
        ${escapeHtml(t.label)}
      </button>
    `).join('');

    navEl.querySelectorAll('[data-guide-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        appState.selectedGuideTab = btn.getAttribute('data-guide-tab');
        renderGuidePanel();
      });
    });

    if (appState.selectedGuideTab === 'basics') {
      bodyEl.innerHTML = renderBasicsGuideHTML();
      bindBasicsDemoButtons(bodyEl);
    } else {
      const stepNum = parseInt(appState.selectedGuideTab, 10);
      const stepObj = GUIDE_STEPS.find(s => s.number === stepNum);
      if (stepObj) {
        bodyEl.innerHTML = renderStepGuideHTML(stepObj);
        bindStepDemoButtons(bodyEl, stepObj);
      }
    }
  }

  function renderBasicsGuideHTML() {
    const b = BASICS_SECTION;
    return `
      <div class="guide-article">
        <div class="guide-hero-card">
          <span class="guide-badge">${escapeHtml(b.badge)}</span>
          <h2>${escapeHtml(b.title)}</h2>
          <p>${escapeHtml(b.subtitle)}</p>
          <div class="golden-rule-banner">
            <span class="color-dot dot-yellow"></span>
            <div>
              <strong>Golden Orientation Rule:</strong> ${escapeHtml(b.goldenRule)}
            </div>
          </div>
        </div>

        <h3 class="guide-section-heading">The Three Types of Pieces</h3>
        <div class="guide-pieces-grid">
          ${b.pieces.map(p => `
            <div class="guide-piece-card">
              <div class="piece-card-title">${escapeHtml(p.name)}</div>
              <div class="piece-card-sub">${escapeHtml(p.tiles)}</div>
              <p>${escapeHtml(p.desc)}</p>
            </div>
          `).join('')}
        </div>

        <h3 class="guide-section-heading">Move Notation (90° Quarter Turns & 180° Double Turns)</h3>
        <div class="guide-notation-grid">
          ${b.notation.map(n => `
            <div class="guide-notation-card">
              <div class="notation-code">${escapeHtml(n.move)}</div>
              <div class="notation-face">${escapeHtml(n.face)}</div>
              <p>${escapeHtml(n.desc)}</p>
            </div>
          `).join('')}
        </div>

        <h3 class="guide-section-heading">Essential Building Blocks: The Triggers</h3>
        <p class="guide-subtext">Triggers are 3-move finger shortcuts used throughout Steps 3 and 4. Click <strong>Animate on 3D Cube</strong> to watch each trigger in action!</p>
        <div class="guide-triggers-grid">
          ${b.triggers.map(t => `
            <div class="guide-trigger-card">
              <div class="trigger-header">
                <div>
                  <h4>${escapeHtml(t.name)}</h4>
                  <code class="trigger-formula">${escapeHtml(t.notation)}</code>
                </div>
                <button type="button" class="btn-accent-sm" data-demo-trigger="${t.id}">
                  ▶ Animate on 3D Cube
                </button>
              </div>
              <p>${escapeHtml(t.desc)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderStepGuideHTML(step) {
    return `
      <div class="guide-article">
        <div class="guide-hero-card">
          <div class="guide-hero-top">
            <span class="guide-badge">${escapeHtml(step.badge)}</span>
            <div class="guide-hero-actions">
              <button type="button" class="btn-accent-sm" id="btn-guide-demo-step">
                ▶ Watch 3D Step Demo
              </button>
              <button type="button" class="btn-outline-sm" id="btn-guide-practice-step">
                🎯 Practice Step ${step.number}
              </button>
            </div>
          </div>
          <h2>${escapeHtml(step.title)}</h2>
          <p class="guide-headline">${escapeHtml(step.headline)}</p>
        </div>

        <div class="guide-two-col">
          <div class="guide-info-box">
            <h4>What You’re Doing</h4>
            <p>${escapeHtml(step.whatYouAreDoing)}</p>
          </div>
          <div class="guide-info-box">
            <h4>How To Do It</h4>
            <p>${escapeHtml(step.howToDoIt)}</p>
          </div>
        </div>

        <div class="guide-visuals-row">
          ${step.visuals.map(v => `
            <div class="guide-visual-card">
              ${v.svg}
              <div class="visual-caption">${escapeHtml(v.caption)}</div>
            </div>
          `).join('')}
        </div>

        <h3 class="guide-section-heading">Step ${step.number} Moves & Algorithms</h3>
        <div class="guide-algos-list">
          ${step.algorithms.map(a => `
            <div class="guide-algo-row">
              <div class="algo-row-left">
                <strong>${escapeHtml(a.label)}</strong>
                <span>${escapeHtml(a.note)}</span>
              </div>
              <code class="algo-formula-badge">${escapeHtml(a.formula)}</code>
            </div>
          `).join('')}
        </div>

        <div class="guide-solving-note">
          <strong>★ Official Solving Note:</strong> ${escapeHtml(step.solvingNote)}
        </div>
      </div>
    `;
  }

  function bindBasicsDemoButtons(container) {
    container.querySelectorAll('[data-demo-trigger]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (appState.view3d.isAnimating) return;
        stopPlayback();
        const trigId = btn.getAttribute('data-demo-trigger');
        const trig = BASICS_SECTION.triggers.find(t => t.id === trigId);
        if (!trig) return;

        appState.cube.reset().applyMoves(trig.setupMoves);
        appState.view3d.syncFromState(appState.cube);
        renderMiniNet(appState.cube);
        await appState.view3d.orbitToFace('F', 300);

        showToast(`Demonstrating ${trig.name}: ${trig.notation}`);
        for (const m of trig.moves) {
          await appState.view3d.animateMove(m, 380);
          appState.cube = appState.view3d.state.clone();
          renderMiniNet(appState.cube);
          await new Promise(r => setTimeout(r, 140));
        }
      });
    });
  }

  function bindStepDemoButtons(container, step) {
    const demoBtn = container.querySelector('#btn-guide-demo-step');
    if (demoBtn) {
      demoBtn.addEventListener('click', async () => {
        if (appState.view3d.isAnimating) return;
        stopPlayback();
        const d = step.drill;
        appState.cube.reset().applyMoves(d.setupMoves);
        appState.view3d.syncFromState(appState.cube);
        renderMiniNet(appState.cube);
        await appState.view3d.orbitToFace(d.frontFace || 'F', 320);

        showToast(`Animating ${step.badge}: ${step.title} (${d.hintMoves.join(' ')})`);
        for (const m of d.hintMoves) {
          await appState.view3d.animateMove(m, 360);
          appState.cube = appState.view3d.state.clone();
          renderMiniNet(appState.cube);
          await new Promise(r => setTimeout(r, 120));
        }
      });
    }

    const pracBtn = container.querySelector('#btn-guide-practice-step');
    if (pracBtn) {
      pracBtn.addEventListener('click', () => {
        appState.activeDrillId = `step-${step.number}`;
        switchMode('practice');
        loadActivePracticeDrill();
      });
    }
  }

  // ===========================================================================
  // MODE 3: INTERACTIVE PRACTICE DRILLS
  // ===========================================================================
  function getAllDrills() {
    const list = [
      {
        id: 'right-trigger',
        badge: 'TRIGGER DRILL',
        title: 'The Right Trigger (R U R\')',
        description: 'Practice the 3-move Right Trigger on the 3D Cube to slot the front-right white corner into the bottom layer.',
        setupMoves: "R U' R'",
        frontFace: 'F',
        hintMoves: ['R', 'U', "R'"]
      },
      {
        id: 'left-trigger',
        badge: 'TRIGGER DRILL',
        title: 'The Left Trigger (L\' U\' L)',
        description: 'Practice the 3-move Left Trigger on the 3D Cube to slot the front-left white corner into the bottom layer.',
        setupMoves: "L' U L",
        frontFace: 'F',
        hintMoves: ["L'", "U'", 'L']
      }
    ];

    for (const s of GUIDE_STEPS) {
      list.push({
        id: `step-${s.number}`,
        badge: `STEP ${s.number} DRILL`,
        title: s.drill.title,
        description: s.drill.description,
        setupMoves: s.drill.setupMoves,
        frontFace: s.drill.frontFace || 'F',
        hintMoves: s.drill.hintMoves,
        stepNumber: s.number
      });
    }
    return list;
  }

  function renderPracticePanel() {
    const container = document.getElementById('practice-panel-content');
    if (!container) return;

    const drills = getAllDrills();
    const activeDrill = drills.find(d => d.id === appState.activeDrillId) || drills[0];

    container.innerHTML = `
      <div class="practice-selector-bar">
        <label for="select-practice-drill">Choose Step or Trigger to Practice:</label>
        <select id="select-practice-drill" class="practice-select">
          ${drills.map(d => `
            <option value="${d.id}" ${d.id === activeDrill.id ? 'selected' : ''}>
              ${escapeHtml(d.badge)} — ${escapeHtml(d.title)}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="practice-card">
        <div class="practice-card-header">
          <span class="guide-badge">${escapeHtml(activeDrill.badge)}</span>
          <div class="practice-actions">
            <button type="button" class="btn-outline-sm" id="btn-practice-reset">↺ Reset Drill</button>
            <button type="button" class="btn-accent-sm" id="btn-practice-autoplay">▶ Auto-Play Solution</button>
          </div>
        </div>
        <h3>${escapeHtml(activeDrill.title)}</h3>
        <p>${escapeHtml(activeDrill.description)}</p>

        <div class="practice-sequence-box">
          <div class="sequence-box-top">
            <strong>Target Move Sequence (use the Move Keypad under the 3D Cube or keyboard keys R, U, F, L, B, D):</strong>
          </div>
          <div class="practice-pills-row">
            ${activeDrill.hintMoves.map((m, idx) => {
              let cls = 'practice-move-pill';
              if (idx < appState.drillMoveProgress) cls += ' done';
              else if (idx === appState.drillMoveProgress) cls += ' next';
              return `<span class="${cls}">${escapeHtml(m)}</span>`;
            }).join('')}
          </div>
        </div>

        ${appState.drillCompleted ? `
          <div class="practice-success-banner">
            <strong>🎉 Drill Complete!</strong> Great job executing the ${escapeHtml(activeDrill.title)} sequence!
          </div>
        ` : `
          <div class="practice-prompt-banner">
            Next expected move: <code>${escapeHtml(activeDrill.hintMoves[appState.drillMoveProgress] || '')}</code>
            (Click <strong>${escapeHtml(activeDrill.hintMoves[appState.drillMoveProgress] || '')}</strong> on the keypad below the 3D cube!)
          </div>
        `}
      </div>
    `;

    document.getElementById('select-practice-drill').addEventListener('change', (e) => {
      appState.activeDrillId = e.target.value;
      loadActivePracticeDrill();
    });

    document.getElementById('btn-practice-reset').addEventListener('click', () => {
      loadActivePracticeDrill();
    });

    document.getElementById('btn-practice-autoplay').addEventListener('click', async () => {
      if (appState.view3d.isAnimating) return;
      loadActivePracticeDrill();
      await new Promise(r => setTimeout(r, 250));
      for (let i = 0; i < activeDrill.hintMoves.length; i++) {
        const m = activeDrill.hintMoves[i];
        await appState.view3d.animateMove(m, 340);
        appState.cube = appState.view3d.state.clone();
        renderMiniNet(appState.cube);
        appState.drillMoveProgress = i + 1;
        if (appState.drillMoveProgress >= activeDrill.hintMoves.length) {
          appState.drillCompleted = true;
        }
        renderPracticePanel();
        await new Promise(r => setTimeout(r, 110));
      }
    });
  }

  function loadActivePracticeDrill() {
    stopPlayback();
    const drills = getAllDrills();
    const activeDrill = drills.find(d => d.id === appState.activeDrillId) || drills[0];
    appState.drillMoveProgress = 0;
    appState.drillCompleted = false;
    appState.cube.reset().applyMoves(activeDrill.setupMoves);
    appState.view3d.syncFromState(appState.cube);
    appState.view3d.orbitToFace(activeDrill.frontFace || 'F', 300);
    renderMiniNet(appState.cube);
    renderPracticePanel();
  }

  function handlePracticeManualMove(relMove, absMove) {
    const drills = getAllDrills();
    const activeDrill = drills.find(d => d.id === appState.activeDrillId) || drills[0];
    if (appState.drillCompleted) return;

    const expected = activeDrill.hintMoves[appState.drillMoveProgress];
    if (absMove === expected || relMove === expected) {
      appState.drillMoveProgress++;
      if (appState.drillMoveProgress >= activeDrill.hintMoves.length) {
        appState.drillCompleted = true;
        showToast(`🎉 Completed ${activeDrill.title}!`);
      }
    } else {
      showToast(`Executed ${relMove} — expected ${expected}. Click "Reset Drill" if you want to restart.`, 'info');
    }
    renderPracticePanel();
  }

  // ===========================================================================
  // 2D CUBE COLOR PAINTER MODAL & REAL-TIME SOLVABILITY VALIDATOR
  // ===========================================================================
  function bindColorPainterModal() {
    document.getElementById('btn-close-painter').addEventListener('click', closeColorPainterModal);
    document.getElementById('painter-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'painter-backdrop') closeColorPainterModal();
    });

    document.querySelectorAll('[data-paint-color]').forEach(swatch => {
      swatch.addEventListener('click', () => {
        appState.selectedPaintColor = swatch.getAttribute('data-paint-color');
        document.querySelectorAll('[data-paint-color]').forEach(s => {
          s.classList.toggle('active', s.getAttribute('data-paint-color') === appState.selectedPaintColor);
        });
      });
    });

    document.getElementById('btn-painter-solved').addEventListener('click', () => {
      appState.painterGrid = new CubeState().toFaceGrid();
      renderPainterNet();
    });

    document.getElementById('btn-painter-scramble').addEventListener('click', () => {
      const s = new CubeState();
      s.scramble(20);
      appState.painterGrid = s.toFaceGrid();
      renderPainterNet();
    });

    document.getElementById('btn-painter-apply').addEventListener('click', () => {
      const candidate = CubeState.fromFaceGrid(appState.painterGrid);
      const validation = candidate.validate();
      if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
      }
      appState.cube = candidate;
      appState.view3d.syncFromState(appState.cube);
      renderMiniNet(appState.cube);
      closeColorPainterModal();
      switchMode('solver');
      recomputeSolutionFromCurrentCube();
      showToast('Custom cube state loaded & 8-Step solution generated!');
    });
  }

  function openColorPainterModal() {
    appState.painterGrid = appState.cube.toFaceGrid();
    renderPainterNet();
    document.getElementById('painter-backdrop').classList.add('open');
  }

  function closeColorPainterModal() {
    document.getElementById('painter-backdrop').classList.remove('open');
  }

  function renderPainterNet() {
    const netEl = document.getElementById('painter-net-board');
    const statusEl = document.getElementById('painter-validation-status');
    const applyBtn = document.getElementById('btn-painter-apply');
    if (!netEl || !appState.painterGrid) return;

    const faceLabels = {
      U: 'UP (Yellow)',
      L: 'LEFT (Blue)',
      F: 'FRONT (Red)',
      R: 'RIGHT (Green)',
      B: 'BACK (Orange)',
      D: 'DOWN (White)'
    };

    let html = '';
    for (const face of ['U', 'L', 'F', 'R', 'B', 'D']) {
      html += `
        <div class="painter-face painter-face-${face}">
          <div class="painter-face-title">${faceLabels[face]}</div>
          <div class="painter-face-cells">
      `;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const isCenter = r === 1 && c === 1;
          const colorCode = appState.painterGrid[face][r][c];
          const colorCss = COLORS[colorCode].css;
          html += `
            <button type="button"
              class="painter-cell cell-${colorCss} ${isCenter ? 'locked-center' : ''}"
              data-pface="${face}" data-prow="${r}" data-pcol="${c}"
              ${isCenter ? 'disabled title="Center pieces are fixed"' : 'title="Click to paint tile"'}>
              ${isCenter ? face : ''}
            </button>`;
        }
      }
      html += `</div></div>`;
    }
    netEl.innerHTML = html;

    netEl.querySelectorAll('.painter-cell:not(.locked-center)').forEach(cell => {
      cell.addEventListener('click', () => {
        const f = cell.getAttribute('data-pface');
        const r = parseInt(cell.getAttribute('data-prow'), 10);
        const c = parseInt(cell.getAttribute('data-pcol'), 10);
        appState.painterGrid[f][r][c] = appState.selectedPaintColor;
        renderPainterNet();
      });
    });

    // Update color counts on swatches
    const counts = { Y: 0, W: 0, R: 0, O: 0, B: 0, G: 0 };
    for (const f of ['U', 'L', 'F', 'R', 'B', 'D']) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          counts[appState.painterGrid[f][r][c]]++;
        }
      }
    }
    document.querySelectorAll('[data-paint-color]').forEach(swatch => {
      const code = swatch.getAttribute('data-paint-color');
      const countSpan = swatch.querySelector('.swatch-count');
      if (countSpan) {
        countSpan.textContent = `${counts[code]}/9`;
        countSpan.classList.toggle('count-invalid', counts[code] !== 9);
      }
    });

    // Validate
    const candidate = CubeState.fromFaceGrid(appState.painterGrid);
    const check = candidate.validate();
    if (statusEl) {
      statusEl.className = `painter-status ${check.valid ? 'valid' : 'invalid'}`;
      statusEl.innerHTML = check.valid
        ? '✓ <strong>Valid Rubik’s Cube state!</strong> Ready to generate your 8-Step solution.'
        : `⚠ <strong>Invalid State:</strong> ${escapeHtml(check.error)}`;
    }
    if (applyBtn) {
      applyBtn.disabled = !check.valid;
    }
  }

  // ===========================================================================
  // KEYBOARD SHORTCUTS & UTILITIES
  // ===========================================================================
  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (document.getElementById('painter-backdrop').classList.contains('open')) return;

      const key = e.key.toUpperCase();
      if (['U', 'D', 'F', 'B', 'L', 'R'].includes(key)) {
        if (appState.view3d.isAnimating) return;
        stopPlayback();
        const move = e.shiftKey ? `${key}'` : key;
        await executeManualRelativeMoves([move]);
      } else if (e.key === 'ArrowRight' && appState.mode === 'solver') {
        e.preventDefault();
        stopPlayback();
        await stepForwardOneMove();
      } else if (e.key === 'ArrowLeft' && appState.mode === 'solver') {
        e.preventDefault();
        stopPlayback();
        await stepBackwardOneMove();
      } else if (e.key === ' ' && appState.mode === 'solver') {
        e.preventDefault();
        if (appState.isPlaying) stopPlayback();
        else startPlayback();
      }
    });
  }

  function showToast(msg, type = 'success') {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `app-toast show ${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3400);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
