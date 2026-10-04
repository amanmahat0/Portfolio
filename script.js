const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.topbar nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
    });
  });
}

// Reading progress bar
const progress = document.createElement('div');
progress.className = 'scroll-progress';
progress.setAttribute('aria-hidden', 'true');
progress.innerHTML = '<span></span>';
document.body.append(progress);
const progressFill = progress.querySelector('span');
let progressQueued = false;
const updateProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progressFill.style.width = `${scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0}%`;
  progressQueued = false;
};
window.addEventListener('scroll', () => {
  if (!progressQueued) {
    window.requestAnimationFrame(updateProgress);
    progressQueued = true;
  }
}, { passive: true });
updateProgress();

// Reveal sections as they enter view; show everything when reduced motion is preferred.
const revealItems = document.querySelectorAll('.section, .story-intro, .visit-strip, .gallery-section, .source-note, .project, .leadership-link');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('reveal-ready');
  revealItems.forEach((item) => item.classList.add('reveal'));
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
}

// Photo grid lightbox; placeholders become clickable automatically when images are added.
const galleryImages = [...document.querySelectorAll('.gallery-tile img')];
if (galleryImages.length) {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Photo viewer');
  lightbox.innerHTML = '<button type="button" aria-label="Close photo viewer">×</button><img alt="">';
  document.body.append(lightbox);
  const lightboxImage = lightbox.querySelector('img');
  const closeButton = lightbox.querySelector('button');
  const closeLightbox = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.gallery-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      const image = tile.querySelector('img');
      if (!image || image.hidden || !image.complete || image.naturalWidth === 0) return;
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      closeButton.focus();
    });
  });
  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });
}

// Lightweight constellation: one canvas for the whole page, with local cursor influence.
(() => {
  const canvas = document.querySelector('.constellation-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const touchLayout = window.matchMedia('(max-width: 700px)');
  const pointer = { x: -1000, y: -1000, active: false };
  const trail = [];
  let particles = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  let lastFrame = 0;
  let resizeFrame = 0;
  let running = false;

  const createParticles = () => {
    const areaCount = Math.round((width * height) / 18000);
    const limit = touchLayout.matches ? 34 : 82;
    const count = Math.max(touchLayout.matches ? 24 : 42, Math.min(limit, areaCount));
    particles = Array.from({ length: count }, () => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return { x, y, ox: x, oy: y, vx: 0, vy: 0, size: Math.random() * 1.25 + .45, phase: Math.random() * Math.PI * 2 };
    });
  };

  const resize = () => {
    const nextWidth = window.innerWidth;
    const nextHeight = window.innerHeight;
    if (!nextWidth || !nextHeight) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    createParticles();
    draw(0, true);
  };

  const draw = (time, staticFrame = false) => {
    context.clearRect(0, 0, width, height);
    const interactive = pointer.active && finePointer.matches && !reducedMotion.matches;
    const influenceRadius = 155;

    for (const particle of particles) {
      const dx = pointer.x - particle.x;
      const dy = pointer.y - particle.y;
      const distance = Math.hypot(dx, dy);
      const influence = interactive ? Math.max(0, 1 - distance / influenceRadius) : 0;
      if (!staticFrame && !reducedMotion.matches) {
        const pull = influence * .012;
        particle.vx += (particle.ox - particle.x) * .0015 - dx * pull;
        particle.vy += (particle.oy - particle.y) * .0015 - dy * pull;
        particle.vx *= .965;
        particle.vy *= .965;
        particle.x += particle.vx;
        particle.y += particle.vy;
      }
      const pulse = touchLayout.matches && !reducedMotion.matches ? .08 * Math.sin(time * .00045 + particle.phase) : 0;
      const alpha = Math.min(.68, .17 + pulse + influence * .48);
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size + influence * .45, 0, Math.PI * 2);
      context.fillStyle = influence > .15 ? `rgba(167,139,250,${alpha})` : `rgba(235,235,235,${alpha})`;
      context.fill();
    }

    const linkDistance = 118;
    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        if (distance > linkDistance) continue;
        const local = interactive && (Math.hypot(pointer.x - a.x, pointer.y - a.y) < influenceRadius || Math.hypot(pointer.x - b.x, pointer.y - b.y) < influenceRadius);
        const alpha = (1 - distance / linkDistance) * (local ? .20 : .075);
        context.strokeStyle = local ? `rgba(139,92,246,${alpha})` : `rgba(220,220,220,${alpha})`;
        context.lineWidth = .65;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }

    if (interactive && trail.length > 1) {
      for (let i = trail.length - 1; i > 0; i -= 1) {
        const age = (trail.length - i) / trail.length;
        context.beginPath();
        context.arc(trail[i].x, trail[i].y, 1.25 * (1 - age * .5), 0, Math.PI * 2);
        context.fillStyle = `rgba(139,92,246,${(1 - age) * .22})`;
        context.fill();
      }
    }
  };

  const animate = (time) => {
    if (!running) return;
    frame = window.requestAnimationFrame(animate);
    const interval = touchLayout.matches ? 42 : 24;
    if (time - lastFrame < interval) return;
    lastFrame = time;
    if (pointer.active && finePointer.matches && !reducedMotion.matches && trail.length) {
      trail.unshift({ x: pointer.x, y: pointer.y });
      if (trail.length > 12) trail.length = 12;
    } else if (trail.length) trail.length = 0;
    draw(time);
  };

  const start = () => {
    if (running || document.hidden) return;
    running = true;
    frame = window.requestAnimationFrame(animate);
  };
  const stop = () => {
    running = false;
    window.cancelAnimationFrame(frame);
  };
  const onResize = () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(resize);
  };

  if (finePointer.matches) {
    window.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });
  }
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  reducedMotion.addEventListener?.('change', () => draw(0, reducedMotion.matches));
  touchLayout.addEventListener?.('change', onResize);

  resize();
  if (reducedMotion.matches) draw(0, true);
  else start();
})();

// Navigation state and compact scrolled header.
(() => {
  const header = document.querySelector('.topbar');
  const links = [...document.querySelectorAll('.topbar nav a[href^="#"]')];
  if (!header) return;
  let queued = false;
  const updateHeader = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    queued = false;
  };
  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(updateHeader);
    }
  }, { passive: true });
  updateHeader();

  if (links.length && 'IntersectionObserver' in window) {
    const targets = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      links.forEach((link) => {
        if (link.hash === `#${current.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-22% 0px -58% 0px', threshold: [0, .15, .35] });
    targets.forEach((target) => observer.observe(target));
  }
})();

// Small desktop cursor marker; touch and reduced-motion users keep the native cursor.
(() => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.body.classList.add('has-custom-cursor');
  const dot = document.createElement('span');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  window.addEventListener('pointermove', (event) => {
    dot.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
    dot.classList.toggle('is-hovering', Boolean(event.target.closest('a,button,.gallery-tile')));
  }, { passive: true });
})();
