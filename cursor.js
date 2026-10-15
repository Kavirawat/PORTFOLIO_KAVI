
(function () {
  'use strict';

  function initCursor() {
    const cursor = document.getElementById('cursor');
    const cursorCanvas = document.getElementById('cursor-canvas');
    if (!cursor || !cursorCanvas) return;

    const cursorCtx = cursorCanvas.getContext('2d');
    const CURSOR_HOVER_SELECTOR = 'a, button, [data-cursor-hover], input, textarea, select, .btn, .sci a, #earth-container, .resume-btn, .portfolio-box .navigation button, .services-box';
    const CURSOR_TRAIL = {
      length: 15,
      lerpFactor: 0.2,
      maxRadius: 8
    };

    let isPointerDown = false;
    let isOverInteractive = false;
    let cursorTrailVisible = true;
    let cursorTrailRaf = null;
    let cursorTrailFramesRemaining = 0;
    const trailPoints = [];
    const mouse = { x: 0, y: 0 };

    function resizeCursorCanvas() {
      cursorCanvas.width = window.innerWidth;
      cursorCanvas.height = window.innerHeight;
    }

    function setCursorState(state) {
      cursor.classList.remove('cursor-default', 'cursor-hover', 'cursor-click');
      cursor.classList.add(`cursor-${state}`);
    }

    function updateCursorState() {
      if (isPointerDown) {
        setCursorState('click');
      } else if (isOverInteractive) {
        setCursorState('hover');
      } else {
        setCursorState('default');
      }
    }

    function isInteractiveTarget(target) {
      return target instanceof Element && Boolean(target.closest(CURSOR_HOVER_SELECTOR));
    }

    function drawCursorTrail() {
      cursorTrailRaf = null;
      cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

      if (cursorTrailVisible && cursorTrailFramesRemaining > 0) {
        for (let i = 0; i < trailPoints.length; i++) {
          const p = trailPoints[i];

          if (i > 0) {
            p.x += (trailPoints[i - 1].x - p.x) * CURSOR_TRAIL.lerpFactor;
            p.y += (trailPoints[i - 1].y - p.y) * CURSOR_TRAIL.lerpFactor;
          }

          const alpha = (i + 1) / trailPoints.length;
          
          cursorCtx.fillStyle = `rgba(124, 240, 61, ${alpha * 0.55})`;
          cursorCtx.beginPath();
          cursorCtx.arc(p.x, p.y, CURSOR_TRAIL.maxRadius * alpha, 0, Math.PI * 2);
          cursorCtx.fill();

          cursorCtx.fillStyle = `rgba(225, 255, 200, ${alpha * 0.75})`;
          cursorCtx.beginPath();
          cursorCtx.arc(p.x, p.y, CURSOR_TRAIL.maxRadius * alpha * 0.45, 0, Math.PI * 2);
          cursorCtx.fill();
        }

        cursorTrailFramesRemaining--;
        cursorTrailRaf = requestAnimationFrame(drawCursorTrail);
        return;
      }

      trailPoints.length = 0;
    }

    function scheduleCursorTrail() {
      cursorTrailFramesRemaining = CURSOR_TRAIL.length + 4;
      if (cursorTrailRaf === null) {
        cursorTrailRaf = requestAnimationFrame(drawCursorTrail);
      }
    }

    let touchFadeTimer = null;

    function handlePointerMove(clientX, clientY, target, isTouch) {
      mouse.x = clientX;
      mouse.y = clientY;
      trailPoints.push({ x: mouse.x, y: mouse.y });
      if (trailPoints.length > CURSOR_TRAIL.length) trailPoints.shift();
      cursor.style.left = `${clientX}px`;
      cursor.style.top = `${clientY}px`;
      isOverInteractive = isInteractiveTarget(target);

      if (isTouch) {
        if (touchFadeTimer) clearTimeout(touchFadeTimer);
        cursor.classList.add('touch-active');
        cursor.style.opacity = '1';
        cursorTrailVisible = true;
      }

      updateCursorState();
      scheduleCursorTrail();
    }

    function handlePointerDown(clientX, clientY, target, isTouch) {
      isPointerDown = true;
      if (isTouch) {
        if (touchFadeTimer) clearTimeout(touchFadeTimer);
        cursor.classList.add('touch-active');
        cursor.style.opacity = '1';
        cursorTrailVisible = true;
      }
      handlePointerMove(clientX, clientY, target, isTouch);
      updateCursorState();
    }

    function handlePointerUp(isTouch) {
      isPointerDown = false;
      updateCursorState();
      if (isTouch) {
        touchFadeTimer = setTimeout(() => {
          cursor.classList.remove('touch-active');
          cursor.style.opacity = '0';
        }, 220);
      }
    }

    document.addEventListener('pointermove', (event) => {
      const isTouch = event.pointerType === 'touch';
      handlePointerMove(event.clientX, event.clientY, event.target, isTouch);
    });

    document.addEventListener('pointerdown', (event) => {
      const isTouch = event.pointerType === 'touch';
      handlePointerDown(event.clientX, event.clientY, event.target, isTouch);
    });

    document.addEventListener('pointerup', (event) => {
      const isTouch = event.pointerType === 'touch';
      handlePointerUp(isTouch);
    });

    document.addEventListener('pointercancel', (event) => {
      const isTouch = event.pointerType === 'touch';
      handlePointerUp(isTouch);
    });

    document.addEventListener('touchmove', (event) => {
      if (event.touches && event.touches.length > 0) {
        const t = event.touches[0];
        handlePointerMove(t.clientX, t.clientY, event.target, true);
      }
    }, { passive: true });

    document.addEventListener('touchstart', (event) => {
      if (event.touches && event.touches.length > 0) {
        const t = event.touches[0];
        handlePointerDown(t.clientX, t.clientY, event.target, true);
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      handlePointerUp(true);
    }, { passive: true });

    document.addEventListener('pointerleave', (event) => {
      if (event.target === document.documentElement) {
        cursor.style.opacity = '0';
        cursorTrailVisible = false;
        trailPoints.length = 0;
        cursorTrailFramesRemaining = 0;
        if (cursorTrailRaf !== null) {
          cancelAnimationFrame(cursorTrailRaf);
          cursorTrailRaf = null;
        }
        cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
      }
    });

    document.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') {
        cursor.style.opacity = '1';
        cursorTrailVisible = true;
      }
    });

    window.addEventListener('resize', resizeCursorCanvas);
    setCursorState('default');
    resizeCursorCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursor);
  } else {
    initCursor();
  }
})();
