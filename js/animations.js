/* ═══════════════════════════════════════════════════
   ZUCERO — Interaction Engine
   Smooth, cinematic, intentional
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Scroll Reveal with stagger ──
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px'
  });
  revealEls.forEach(el => revealObserver.observe(el));

  // Stagger children
  const staggerEls = document.querySelectorAll('.stagger-children');
  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });
  staggerEls.forEach(el => staggerObserver.observe(el));

  // ── 2. Dynamic Theme Switching (logo excluded from inversion) ──
  const sections = document.querySelectorAll('section[data-theme]');
  const body = document.body;

  const themeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const theme = entry.target.getAttribute('data-theme');
        body.classList.remove('theme-ivory', 'theme-charcoal');
        if (theme) body.classList.add(`theme-${theme}`);
      }
    });
  }, { threshold: 0.45 });

  sections.forEach(s => themeObserver.observe(s));

  // ── 3. Navigation — Frosted Glass Scroll ──
  const nav = document.querySelector('nav');
  let lastScroll = 0;

  // ── 4. Parallax Images (subtle) ──
  const parallaxImgs = document.querySelectorAll('.parallax-img');
  let ticking = false;

  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;

    // Nav state
    if (scrolled > 60) {
      nav.classList.add('nav-scrolled');
    } else {
      nav.classList.remove('nav-scrolled');
    }
    lastScroll = scrolled;

    // Parallax — rAF throttled
    if (!ticking) {
      requestAnimationFrame(() => {
        parallaxImgs.forEach(img => {
          const rect = img.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            const yPos = -(rect.top * 0.06);
            img.style.transform = `scale(1.08) translateY(${yPos}px)`;
          }
        });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ── 5. Hero Ken Burns ──
  const hero = document.querySelector('.hero');
  if (hero) {
    setTimeout(() => hero.classList.add('loaded'), 100);
  }

  // ── 6. Cart Drawer ──
  const cartTriggers = document.querySelectorAll('.cart-trigger');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartCloseBtn = document.getElementById('cart-close');

  if (cartDrawer && cartOverlay) {
    const openCart = (e) => {
      e.preventDefault();
      cartDrawer.classList.add('active');
      cartOverlay.classList.add('active');
    };
    const closeCart = () => {
      cartDrawer.classList.remove('active');
      cartOverlay.classList.remove('active');
    };

    cartTriggers.forEach(t => t.addEventListener('click', openCart));
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);
  }

  // ── 7. Mobile Menu ──
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileOverlay = document.getElementById('mobile-menu-overlay');
  const mobileClose = document.getElementById('mobile-menu-close');

  if (mobileBtn && mobileOverlay) {
    mobileBtn.addEventListener('click', () => {
      mobileOverlay.classList.add('active');
      mobileBtn.classList.add('active');
    });
    mobileClose.addEventListener('click', () => {
      mobileOverlay.classList.remove('active');
      mobileBtn.classList.remove('active');
    });
    mobileOverlay.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileOverlay.classList.remove('active');
      });
    });
  }

  // ── 8. Smooth link hover gold underline (already CSS) ──

  // ── 9. Image lazy loading fallback ──
  if ('loading' in HTMLImageElement.prototype) {
    const lazyImgs = document.querySelectorAll('img[loading="lazy"]');
    lazyImgs.forEach(img => {
      if (img.dataset.src) img.src = img.dataset.src;
    });
  }
});
