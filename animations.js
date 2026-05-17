/* ============================================================
   VENAD HOUSE — animations.js
   IntersectionObserver fallback for scroll reveals.

   This file is the safety net for Safari/iOS where
   animation-timeline: view() has incomplete support.
   It adds .in-view to .reveal elements, which triggers
   the CSS transition defined in animations.css.

   On modern browsers where CSS scroll-driven animations
   are supported, the @supports block in animations.css
   handles reveals natively — this JS is still loaded
   but the .in-view transitions are overridden by the
   CSS animations, so there's no conflict.
   ============================================================ */

(function () {

  /* ── Scroll reveals ── */
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          /* Unobserve after reveal — no need to watch it anymore */
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold:  0.08,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  reveals.forEach((el) => observer.observe(el));

})();


/* ── Custom cursor ── */
(function () {

  /* Only on devices with a real pointer (mouse/trackpad) */
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dot = document.createElement('div');
  dot.classList.add('cursor-dot');
  document.body.appendChild(dot);

  let mouseX = 0;
  let mouseY = 0;
  let dotX   = 0;
  let dotY   = 0;
  let raf    = null;

  /* Smooth follow with lerp */
  function lerp(a, b, t) { return a + (b - a) * t; }

  function loop() {
    dotX = lerp(dotX, mouseX, 0.18);
    dotY = lerp(dotY, mouseY, 0.18);
    dot.style.left = dotX + 'px';
    dot.style.top  = dotY + 'px';
    raf = requestAnimationFrame(loop);
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!dot.classList.contains('visible')) {
      dot.classList.add('visible');
      dotX = mouseX;
      dotY = mouseY;
      loop();
    }
  });

  /* Expand on images and interactive elements */
  const expandTargets = 'img, a, button, [data-cursor-expand]';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(expandTargets)) {
      dot.classList.add('expanded');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(expandTargets)) {
      dot.classList.remove('expanded');
    }
  });

  /* Hide when leaving the window */
  document.addEventListener('mouseleave', () => {
    dot.classList.remove('visible');
    cancelAnimationFrame(raf);
  });

  document.addEventListener('mouseenter', () => {
    dot.classList.add('visible');
    loop();
  });

})();
