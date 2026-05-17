/* ============================================================
   VENAD HOUSE — nav.js
   Navigation scroll behaviour and mobile menu.
   ============================================================ */

(function () {
  const nav        = document.querySelector('.nav');
  const hamburger  = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.nav-mobile');
  const mobileLinks = document.querySelectorAll('.nav-mobile-link, .nav-mobile-book');

  if (!nav) return;

  /* ── Scroll: toggle .scrolled class ── */
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 55);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Run on init in case page is already scrolled

  /* ── Mobile menu ── */
  function openMenu() {
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
  }

  if (hamburger) {
    hamburger.addEventListener('click', toggleMenu);
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-controls', 'mobile-menu');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
  }

  /* Close mobile menu when a link is clicked */
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  /* Close on Escape key */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
  });

  /* ── Active link state ── */
  /* Marks the current page link as active based on URL */
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });

})();
