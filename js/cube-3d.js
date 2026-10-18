/**
 * Three.js Interactive 3D Rubik's Cube View & Animator
 * Syncs with RubiksCore.CubeState and supports:
 *   - Smooth animated layer turns (F, U, R, L, B, D + ' + 2)
 *   - Smooth camera orientation to any active Front face (Red, Green, Orange, Blue)
 *     while keeping Yellow on UP (or peeking at the bottom White Cross)
 *   - Interactive OrbitControls
 */
(function (root, factory) {
  root.RubiksView3D = factory(root.THREE, root.RubiksCore);
})(typeof self !== 'undefined' ? self : this, function (THREE, RubiksCore) {
  'use strict';

  const { COLORS, FACE_NORMALS, CubeState } = RubiksCore;

  // Camera target positions for each Front face (with Yellow +Y on top and slight upper-right isometric angle)
  const CAMERA_PRESETS = {
    F: { pos: [4.25, 3.85, 6.1], label: 'Red Front (Yellow UP)' },
    R: { pos: [6.1, 3.85, -4.25], label: 'Green Front (Yellow UP)' },
    B: { pos: [-4.25, 3.85, -6.1], label: 'Orange Front (Yellow UP)' },
    L: { pos: [-6.1, 3.85, 4.25], label: 'Blue Front (Yellow UP)' },
    D: { pos: [4.1, -5.4, 5.3], label: 'Bottom Peek (White Cross)' }
  };

  // 1x in the UI corresponds to the former 0.6x physical pace
  const BASE_SPEED_SCALE = 0.6;

  class Cube3DView {
    constructor(containerEl, initialCubeState, options = {}) {
      this.container = containerEl;
      this.state = initialCubeState.clone();
      this.onCameraFaceChange = options.onCameraFaceChange || null;
      this.currentFrontFace = 'F';
      this.topColor = options.initialTopColor || 'W'; // 'W' for Steps 1–4, 'Y' for Steps 5–8
      this.isAnimating = false;
      this.userSpeed = 1.0; // UI multiplier (0.5, 1, 2, 4)
      this.animationSpeed = this.userSpeed * BASE_SPEED_SCALE;

      this.initScene();
      this.buildCubies();
      this.syncFromState(this.state);
      this.startRenderLoop();
      this.bindResize();
    }

    getAdaptiveFov(aspect) {
      // Widen vertical FOV automatically when viewport is square or portrait so horizontal margins stay generous
      const baseFov = 38;
      if (aspect < 1.15) {
        return Math.min(54, baseFov / Math.max(0.72, aspect * 0.92));
      }
      return baseFov;
    }

    getWorldPresetPos(frontFace, topColor = this.topColor) {
      if (frontFace === 'D') {
        return CAMERA_PRESETS.D.pos;
      }
      if (topColor === 'W') {
        // When rotated 180° around Z (White on top), local R (+X, Green) is at world -X (L) and local L (-X, Blue) is at world +X (R)
        if (frontFace === 'R') return CAMERA_PRESETS.L.pos;
        if (frontFace === 'L') return CAMERA_PRESETS.R.pos;
      }
      const preset = CAMERA_PRESETS[frontFace] || CAMERA_PRESETS.F;
      return preset.pos;
    }

    initScene() {
      const width = Math.min(this.container.clientWidth || 320, window.innerWidth || 520);
      const height = this.container.clientHeight || 240;
      const aspect = width / height;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(this.getAdaptiveFov(aspect), aspect, 0.1, 100);
      this.camera.position.set(...this.getWorldPresetPos('F', this.topColor));
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);

      // Lighting
      const ambient = new THREE.AmbientLight(0xffffff, 0.82);
      this.scene.add(ambient);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.65);
      dirLight1.position.set(8, 14, 10);
      this.scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x90a8ff, 0.32);
      dirLight2.position.set(-9, -10, -8);
      this.scene.add(dirLight2);

      // Orientation group flips the whole cube between White on top (rotZ = PI) and Yellow on top (rotZ = 0)
      this.orientationGroup = new THREE.Group();
      this.orientationGroup.rotation.z = this.topColor === 'W' ? Math.PI : 0;
      this.scene.add(this.orientationGroup);

      // Root group & pivot group for rotating faces
      this.cubeGroup = new THREE.Group();
      this.orientationGroup.add(this.cubeGroup);

      this.pivotGroup = new THREE.Group();
      this.orientationGroup.add(this.pivotGroup);

      // Subtle orientation ring under the cube
      const ringGeo = new THREE.RingGeometry(2.35, 2.42, 64);
      this.ringMat = new THREE.MeshBasicMaterial({
        color: this.topColor === 'W' ? 0xffffff : 0xfce000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.14
      });
      const ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -2.15;
      this.scene.add(ringMesh);

      // OrbitControls (loaded via Three.js OrbitControls or built-in spherical pointer drag)
      this.initOrbitControls();
    }

    initOrbitControls() {
      // Lightweight, super-responsive spherical orbit controller so it works reliably with any Three.js build
      this.spherical = new THREE.Spherical();
      this.spherical.setFromVector3(this.camera.position);

      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      const dom = this.renderer.domElement;

      const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
        dom.style.cursor = 'grabbing';
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;

        this.spherical.theta -= dx * 0.0075;
        this.spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, this.spherical.phi - dy * 0.0075));
        this.camera.position.setFromSpherical(this.spherical);
        this.camera.lookAt(0, 0, 0);
        this.detectDominantFrontFace();
      };

      const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        dom.style.cursor = 'grab';
      };

      const onWheel = (e) => {
        e.preventDefault();
        this.spherical.radius = Math.max(4.5, Math.min(10.5, this.spherical.radius + e.deltaY * 0.004));
        this.camera.position.setFromSpherical(this.spherical);
        this.camera.lookAt(0, 0, 0);
      };

      dom.style.cursor = 'grab';
      dom.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      dom.addEventListener('wheel', onWheel, { passive: false });
    }

    detectDominantFrontFace() {
      const { x, z } = this.camera.position;
      let detected = 'F';
      if (Math.abs(x) > Math.abs(z)) {
        if (this.topColor === 'W') {
          detected = x > 0 ? 'L' : 'R';
        } else {
          detected = x > 0 ? 'R' : 'L';
        }
      } else {
        detected = z > 0 ? 'F' : 'B';
      }
      if (detected !== this.currentFrontFace) {
        this.currentFrontFace = detected;
        if (this.onCameraFaceChange) {
          this.onCameraFaceChange(detected, this.topColor);
        }
      }
    }

    buildCubies() {
      this.cubieMeshes = [];
      const spacing = 1.02;
      const bodyGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x12141c,
        roughness: 0.35,
        metalness: 0.15
      });

      const stickerGeo = new THREE.PlaneGeometry(0.83, 0.83);

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if (x === 0 && y === 0 && z === 0) continue;

            const group = new THREE.Group();
            group.position.set(x * spacing, y * spacing, z * spacing);
            group.userData = { gridPos: [x, y, z], stickerMats: {} };

            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            group.add(bodyMesh);

            // Add 6 sticker planes slightly offset from the cubie faces
            const faces = ['U', 'D', 'F', 'B', 'L', 'R'];
            for (const face of faces) {
              const [nx, ny, nz] = FACE_NORMALS[face];
              const mat = new THREE.MeshStandardMaterial({
                color: 0x1a1d26,
                roughness: 0.22,
                metalness: 0.05
              });
              const plane = new THREE.Mesh(stickerGeo, mat);
              plane.position.set(nx * 0.485, ny * 0.485, nz * 0.485);
              plane.lookAt(nx * 2, ny * 2, nz * 2);
              group.add(plane);
              group.userData.stickerMats[face] = mat;
            }

            this.cubeGroup.add(group);
            this.cubieMeshes.push(group);
          }
        }
      }
    }

    /**
     * Synchronize all 26 cubie meshes & sticker colors directly from a CubeState.
     */
    syncFromState(cubeState) {
      this.state = cubeState.clone();
      const spacing = 1.02;

      // Ensure no cubies remain attached to pivotGroup
      while (this.pivotGroup.children.length > 0) {
        const child = this.pivotGroup.children[0];
        this.cubeGroup.add(child);
      }
      this.pivotGroup.rotation.set(0, 0, 0);

      for (const meshGroup of this.cubieMeshes) {
        const [gx, gy, gz] = meshGroup.userData.gridPos;
        meshGroup.position.set(gx * spacing, gy * spacing, gz * spacing);
        meshGroup.rotation.set(0, 0, 0);

        const cubie = this.state.getCubieAt(gx, gy, gz);
        for (const [face, mat] of Object.entries(meshGroup.userData.stickerMats)) {
          const colorCode = cubie ? cubie.stickers[face] : null;
          if (colorCode && COLORS[colorCode]) {
            mat.color.set(COLORS[colorCode].hex);
          } else {
            mat.color.set(0x161922);
          }
        }
      }
    }

    /**
     * Smoothly orient the cube's top center face ('W' for Steps 1–4, 'Y' for Steps 5–8)
     * and orbit the camera to face `frontFace` ('F', 'R', 'B', 'L', or 'D').
     */
    orientCube(frontFace = this.currentFrontFace, topColor = this.topColor, durationMs = 380) {
      const targetTop = topColor === 'W' ? 'W' : 'Y';
      const targetRotZ = targetTop === 'W' ? Math.PI : 0;
      const startRotZ = this.orientationGroup ? this.orientationGroup.rotation.z : targetRotZ;

      this.topColor = targetTop;
      if (this.ringMat) {
        this.ringMat.color.set(targetTop === 'W' ? 0xffffff : 0xfce000);
      }

      if (frontFace !== 'D') {
        this.currentFrontFace = frontFace;
      }
      if (this.onCameraFaceChange) {
        this.onCameraFaceChange(this.currentFrontFace, this.topColor);
      }

      const startPos = this.camera.position.clone();
      const endPos = new THREE.Vector3(...this.getWorldPresetPos(frontFace, targetTop));
      const rotDiff = Math.abs(targetRotZ - startRotZ);

      if (durationMs <= 0 || (startPos.distanceTo(endPos) < 0.05 && rotDiff < 0.02)) {
        if (this.orientationGroup) {
          this.orientationGroup.rotation.z = targetRotZ;
        }
        this.camera.position.copy(endPos);
        this.spherical.setFromVector3(this.camera.position);
        this.camera.lookAt(0, 0, 0);
        return Promise.resolve();
      }

      const startSpherical = new THREE.Spherical().setFromVector3(startPos);
      const endSpherical = new THREE.Spherical().setFromVector3(endPos);

      // Shortest angular path for theta
      let deltaTheta = endSpherical.theta - startSpherical.theta;
      while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
      while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;

      return new Promise(resolve => {
        const startTime = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - startTime) / durationMs);
          const ease = 1 - Math.pow(1 - t, 3);
          if (this.orientationGroup) {
            this.orientationGroup.rotation.z = startRotZ + (targetRotZ - startRotZ) * ease;
          }
          this.spherical.radius = startSpherical.radius + (endSpherical.radius - startSpherical.radius) * ease;
          this.spherical.phi = startSpherical.phi + (endSpherical.phi - startSpherical.phi) * ease;
          this.spherical.theta = startSpherical.theta + deltaTheta * ease;
          this.camera.position.setFromSpherical(this.spherical);
          this.camera.lookAt(0, 0, 0);
          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    }

    setTopColor(topColor, durationMs = 380) {
      return this.orientCube(this.currentFrontFace, topColor, durationMs);
    }

    orbitToFace(frontFace, durationMs = 380) {
      return this.orientCube(frontFace, this.topColor, durationMs);
    }

    /**
     * Natural "human inspection" gesture after a step finishes:
     * Rotates the cube view back and forth (left/right) and up and down (top/bottom)
     * as if holding it and giving it another look before proceeding to the next step.
     */
    inspectCubeGesture(baseDurationMs = 1550, shouldAbort = null) {
      const duration = Math.max(400, baseDurationMs / Math.max(0.25, Math.min(3.0, this.animationSpeed)));
      const baseSpherical = new THREE.Spherical().setFromVector3(this.camera.position);

      const waypoints = [
        { t: 0.0,  dTheta: 0.0,   dPhi: 0.0 },
        { t: 0.27, dTheta: 0.56,  dPhi: -0.24 },
        { t: 0.58, dTheta: -0.56, dPhi: 0.30 },
        { t: 0.82, dTheta: 0.20,  dPhi: -0.18 },
        { t: 1.0,  dTheta: 0.0,   dPhi: 0.0 }
      ];

      return new Promise(resolve => {
        const startTime = performance.now();
        const tick = (now) => {
          if (shouldAbort && shouldAbort()) {
            this.spherical.copy(baseSpherical);
            this.camera.position.setFromSpherical(this.spherical);
            this.camera.lookAt(0, 0, 0);
            resolve();
            return;
          }

          const progress = Math.min(1, (now - startTime) / duration);

          // Find current segment in waypoints
          let segIdx = 0;
          for (let i = 0; i < waypoints.length - 1; i++) {
            if (progress >= waypoints[i].t && progress <= waypoints[i + 1].t) {
              segIdx = i;
              break;
            }
          }
          const wp0 = waypoints[segIdx];
          const wp1 = waypoints[segIdx + 1];
          const segSpan = Math.max(0.0001, wp1.t - wp0.t);
          const localT = Math.min(1, Math.max(0, (progress - wp0.t) / segSpan));
          // Smooth cosine ease-in-out between waypoints
          const ease = 0.5 - 0.5 * Math.cos(Math.PI * localT);

          const dTheta = wp0.dTheta + (wp1.dTheta - wp0.dTheta) * ease;
          const dPhi = wp0.dPhi + (wp1.dPhi - wp0.dPhi) * ease;

          this.spherical.radius = baseSpherical.radius;
          this.spherical.theta = baseSpherical.theta + dTheta;
          this.spherical.phi = Math.max(0.22, Math.min(Math.PI - 0.22, baseSpherical.phi + dPhi));
          this.camera.position.setFromSpherical(this.spherical);
          this.camera.lookAt(0, 0, 0);

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            this.spherical.copy(baseSpherical);
            this.camera.position.setFromSpherical(this.spherical);
            this.camera.lookAt(0, 0, 0);
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });
    }

    /**
     * Animate a single move in absolute cube coordinates (e.g., "R", "U'", "F2")
     * and update `this.state`.
     */
    animateMove(absMove, baseDurationMs = 320) {
      if (!absMove) return Promise.resolve();
      const token = absMove.trim();
      const face = token[0].toUpperCase();
      const mod = token.slice(1);

      const [nx, ny, nz] = FACE_NORMALS[face];
      let angle = -Math.PI / 2; // Clockwise around outward normal
      if (mod === "'" || mod === '’') {
        angle = Math.PI / 2;
      } else if (mod === '2' || mod === "2'") {
        angle = -Math.PI;
      }

      const duration = Math.max(90, (baseDurationMs * (Math.abs(angle) > 2 ? 1.25 : 1.0)) / this.animationSpeed);

      // Attach matching cubies to pivotGroup
      this.pivotGroup.rotation.set(0, 0, 0);
      const activeMeshes = this.cubieMeshes.filter(m =>
        CubeState.isCubieInFace(m.userData.gridPos, face)
      );
      for (const m of activeMeshes) {
        this.pivotGroup.add(m);
      }

      this.isAnimating = true;
      return new Promise(resolve => {
        const startTime = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - startTime) / duration);
          // Smooth cubic easeInOut
          const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const currentAngle = angle * ease;
          this.pivotGroup.rotation.set(nx * currentAngle, ny * currentAngle, nz * currentAngle);

          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            this.state.applyMove(token);
            this.syncFromState(this.state);
            this.isAnimating = false;
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });
    }

    setSpeed(multiplier) {
      this.userSpeed = Math.max(0.25, Math.min(8.0, Number(multiplier) || 1.0));
      this.animationSpeed = this.userSpeed * BASE_SPEED_SCALE;
    }

    startRenderLoop() {
      const render = () => {
        this.renderer.render(this.scene, this.camera);
        this._rafId = requestAnimationFrame(render);
      };
      this._rafId = requestAnimationFrame(render);
    }

    bindResize() {
      const onResize = () => {
        if (!this.container) return;
        const w = this.container.clientWidth || 520;
        const h = this.container.clientHeight || 460;
        const aspect = w / h;
        this.camera.aspect = aspect;
        this.camera.fov = this.getAdaptiveFov(aspect);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(onResize);
        ro.observe(this.container);
      }
    }
  }

  return {
    CAMERA_PRESETS,
    Cube3DView
  };
});
