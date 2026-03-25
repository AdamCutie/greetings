document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  const scene       = document.getElementById('scene');
  const envelope    = document.getElementById('envelope');
  const letter      = document.getElementById('letter');
  const extra       = document.getElementById('extra');
  const backdrop    = document.getElementById('backdrop');
  const confettiCanvas = document.getElementById('confetti');

  const toggleBtn    = document.getElementById('toggle');
  const surpriseBtn  = document.getElementById('surprise');
  const themeBtn     = document.getElementById('theme');
  const letterCloseBtn = document.getElementById('letterClose');
  const copyWishBtn  = document.getElementById('copyWish');

  const passwordOverlay = document.getElementById('passwordOverlay');
  const passwordInput   = document.getElementById('passwordInput');
  const passwordSubmit  = document.getElementById('passwordSubmit');
  const passwordCancel  = document.getElementById('passwordCancel');
  const passwordError   = document.getElementById('passwordError');

  if (!scene || !envelope || !letter || !extra || !backdrop || !confettiCanvas ||
      !toggleBtn || !surpriseBtn || !themeBtn || !letterCloseBtn || !copyWishBtn ||
      !passwordOverlay || !passwordInput || !passwordSubmit || !passwordCancel || !passwordError) {
    console.warn('Missing DOM elements');
    return;
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  let isOpen    = false;
  let isReading = false;
  let isUnlocked = false;

  const CORRECT_PASSWORD = '52'; // Change this as needed

  const THEME_KEY = 'hb_theme';

  // ── Theme ──────────────────────────────────────────────
  const setTheme = (theme) => {
    const isMidnight = theme === 'midnight';
    if (isMidnight) {
      body.dataset.theme = 'midnight';
    } else {
      delete body.dataset.theme;
    }
    themeBtn.setAttribute('aria-pressed', String(isMidnight));
    themeBtn.textContent = isMidnight ? 'Blush' : 'Midnight';
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  };

  const loadTheme = () => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'midnight' || saved === 'blush') return saved;
    } catch { /* ignore */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'midnight' : 'blush';
  };

  // ── Open / Close ────────────────────────────────────────
  const setOpen = (nextOpen, { focusEnvelope = false } = {}) => {
    isOpen = nextOpen;

    envelope.classList.toggle('open',  isOpen);
    envelope.classList.toggle('close', !isOpen);
    envelope.setAttribute('aria-expanded', String(isOpen));

    toggleBtn.textContent   = isOpen ? 'Close' : 'Open';
    surpriseBtn.disabled    = !isOpen;

    if (!isOpen) setReading(false);
    if (focusEnvelope) envelope.focus();

    if (isOpen && !reduceMotion) {
      burstConfetti({ intensity: 0.6 });
    }
  };

  // ── Reading mode ────────────────────────────────────────
  const setReading = (nextReading) => {
    isReading = nextReading && isOpen;

    body.classList.toggle('is-reading', isReading);
    extra.setAttribute('aria-hidden', String(!isReading));

    if (isReading) {
      // Freeze tilt so the fixed letter stays centred
      envelope.style.setProperty('--tilt-x', '0deg');
      envelope.style.setProperty('--tilt-y', '0deg');
      // Slight delay so the fixed layout settles before focus
      requestAnimationFrame(() => letterCloseBtn.focus());
    }
  };

  // ── Copy utility ────────────────────────────────────────
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      Object.assign(ta.style, { position: 'fixed', top: '-1000px', left: '-1000px' });
      document.body.appendChild(ta);
      ta.select();
      try { return document.execCommand('copy'); } catch { return false; }
      finally { document.body.removeChild(ta); }
    }
  };

  const isInteractiveTarget = (el) => {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return tag === 'button' || tag === 'a' || tag === 'input' || tag === 'textarea' || el.isContentEditable;
  };

  // ── Password Logic ──────────────────────────────────────
  const showPasswordModal = () => {
    passwordOverlay.classList.add('active');
    passwordOverlay.setAttribute('aria-hidden', 'false');
    passwordInput.value = '';
    passwordError.style.display = 'none';
    setTimeout(() => passwordInput.focus(), 100);
  };

  const hidePasswordModal = () => {
    passwordOverlay.classList.remove('active');
    passwordOverlay.setAttribute('aria-hidden', 'true');
  };

  const checkPassword = () => {
    if (passwordInput.value === CORRECT_PASSWORD) {
      isUnlocked = true;
      hidePasswordModal();
      setOpen(true, { focusEnvelope: true });
    } else {
      passwordError.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  };

  const requestOpen = (options = {}) => {
    if (isUnlocked || isOpen) {
      setOpen(!isOpen, options);
    } else {
      showPasswordModal();
    }
  };

  // ── Event listeners ─────────────────────────────────────

  // Password Modal Events
  passwordSubmit.addEventListener('click', checkPassword);
  passwordCancel.addEventListener('click', hidePasswordModal);
  passwordOverlay.addEventListener('click', (e) => {
    if (e.target === passwordOverlay) hidePasswordModal();
  });
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkPassword();
    if (e.key === 'Escape') hidePasswordModal();
  });

  // Clicking the envelope body (not the letter) → open/close
  envelope.addEventListener('click', (e) => {
    // If the click originated inside the letter card, let the letter handler deal with it
    if (letter.contains(e.target)) return;
    if (isReading) return;
    requestOpen();
  });

  envelope.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.key !== 'Enter') return;
    e.preventDefault();
    if (isReading) return;
    requestOpen();
  });

  // Clicking the letter card (when open but not yet reading) → enter reading mode
  letter.addEventListener('click', (e) => {
    // Don't swallow close-button clicks
    if (e.target === letterCloseBtn || letterCloseBtn.contains(e.target)) return;
    if (!isOpen) return;
    if (isReading) return;
    e.stopPropagation();
    setReading(true);
  });

  // Close button inside the reading modal
  letterCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setReading(false);
    envelope.focus();
  });

  // Backdrop click closes reading mode or password modal
  backdrop.addEventListener('click', () => {
    if (isReading) {
      setReading(false);
      envelope.focus();
    }
    if (passwordOverlay.classList.contains('active')) {
      hidePasswordModal();
    }
  });

  // Toggle button
  toggleBtn.addEventListener('click', () => {
    if (isReading && isOpen) setReading(false);
    requestOpen({ focusEnvelope: true });
  });

  // Surprise button
  surpriseBtn.addEventListener('click', () => {
    if (!isOpen || reduceMotion) return;
    burstConfetti({ intensity: 1 });
  });

  // Theme button
  themeBtn.addEventListener('click', () => {
    setTheme(body.dataset.theme === 'midnight' ? 'blush' : 'midnight');
  });

  // Copy wish
  copyWishBtn.addEventListener('click', async () => {
    const wish = [
      'Happy 25th Birthday David!',
      'May your builds be green and your bugs be few.',
      'From: Vincent',
    ].join('\n');

    const prev = copyWishBtn.textContent;
    copyWishBtn.textContent = 'Copying…';
    copyWishBtn.disabled = true;

    const ok = await copyText(wish);
    copyWishBtn.textContent = ok ? 'Copied! 🎉' : 'Copy failed';

    window.setTimeout(() => {
      copyWishBtn.textContent = prev;
      copyWishBtn.disabled = false;
    }, 1400);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape') {
      if (isReading) {
        e.preventDefault();
        setReading(false);
        envelope.focus();
        return;
      }
      if (isOpen) {
        e.preventDefault();
        setOpen(false, { focusEnvelope: true });
      }
      return;
    }

    if (isInteractiveTarget(document.activeElement)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (isReading) return;
      requestOpen();
      return;
    }

    if (e.key === 's' || e.key === 'S') {
      if (!isOpen || reduceMotion) return;
      e.preventDefault();
      burstConfetti({ intensity: 1 });
      return;
    }

    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      setTheme(body.dataset.theme === 'midnight' ? 'blush' : 'midnight');
    }
  });

  // ── Initialise ──────────────────────────────────────────
  setTheme(loadTheme());
  setOpen(isOpen);
  setupTilt(scene, envelope, { disabled: reduceMotion });

  // ── Confetti ────────────────────────────────────────────
  let confettiController = null;

  function burstConfetti({ intensity }) {
    if (!confettiController) {
      confettiController = createConfetti(confettiCanvas);
    }
    const styles = getComputedStyle(body);
    const colors = [
      styles.getPropertyValue('--envelope-flap-color').trim(),
      styles.getPropertyValue('--envelope-color').trim(),
      styles.getPropertyValue('--heart-color').trim(),
      styles.getPropertyValue('--btn-accent').trim(),
      styles.getPropertyValue('--seal-color').trim(),
    ].filter(Boolean);
    confettiController.burst({ intensity, colors });
  }
});

// ── Tilt effect ─────────────────────────────────────────────────────────────
function setupTilt(scene, envelope, { disabled }) {
  if (disabled) return;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const maxTilt = 10;

  const onMove = (e) => {
    const rect = scene.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    envelope.style.setProperty('--tilt-y', `${clamp((x - 0.5) * maxTilt * 2, -maxTilt, maxTilt).toFixed(2)}deg`);
    envelope.style.setProperty('--tilt-x', `${clamp((0.5 - y) * maxTilt * 2, -maxTilt, maxTilt).toFixed(2)}deg`);
  };

  const onLeave = () => {
    envelope.style.setProperty('--tilt-x', '0deg');
    envelope.style.setProperty('--tilt-y', '0deg');
  };

  scene.addEventListener('pointermove', onMove);
  scene.addEventListener('pointerleave', onLeave);
}

// ── Confetti engine ──────────────────────────────────────────────────────────
function createConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { burst: () => {} };

  const state = { particles: [], rafId: null };
  const fallback = ['#8b5e3c','#c47d50','#b56a5a','#d4a574','#e8c9a0','#f5ede8'];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.floor(window.innerWidth  * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width  = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const rnd = (min, max) => min + Math.random() * (max - min);

  const spawn = (count, palette) => {
    const ox = window.innerWidth  * rnd(0.2, 0.8);
    const oy = window.innerHeight * rnd(0.2, 0.4);
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x: ox, y: oy,
        vx: rnd(-6.5, 6.5),
        vy: rnd(-11, -5.5),
        g: rnd(0.22, 0.34),
        size: rnd(6, 12),
        rotation: rnd(0, Math.PI * 2),
        vr: rnd(-0.2, 0.2),
        color: palette[Math.floor(Math.random() * palette.length)],
        life: rnd(70, 120),
      });
    }
  };

  const tick = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    state.particles = state.particles.filter(p => p.life > 0);

    for (const p of state.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g;
      p.vx *= 0.992; p.rotation += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
      ctx.restore();
    }

    if (state.particles.length > 0) {
      state.rafId = requestAnimationFrame(tick);
    } else {
      state.rafId = null;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };

  window.addEventListener('resize', resize);
  resize();

  return {
    burst: ({ intensity, colors }) => {
      resize();
      const count = Math.floor(90 + intensity * 140);
      const palette = Array.isArray(colors) && colors.length ? colors : fallback;
      spawn(count, palette);
      if (!state.rafId) state.rafId = requestAnimationFrame(tick);
    },
  };
}