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

const portraitToggle = document.querySelector('.portrait-toggle, .profile-frame');
if (portraitToggle) {
  portraitToggle.addEventListener('click', () => {
    const isColor = portraitToggle.classList.toggle('is-color');
    portraitToggle.setAttribute('aria-pressed', String(isColor));
    portraitToggle.setAttribute('aria-label', isColor ? 'Show portrait in black and white' : 'Reveal portrait color');
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
