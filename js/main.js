document.addEventListener('DOMContentLoaded', function() {
  // ---------------------------------------------------------------
  // Theme toggle (dark by default, persists choice in localStorage)
  // ---------------------------------------------------------------
  const switchEl = document.getElementById('switch');
  const body = document.body;
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'day') {
      body.classList.remove('night');
      if (switchEl) switchEl.checked = false;
    } else {
      body.classList.add('night');
      if (switchEl) switchEl.checked = true;
    }
  } catch (e) { /* localStorage unavailable: keep default night */ }

  if (switchEl) {
    switchEl.addEventListener('change', function() {
      if (switchEl.checked) {
        body.classList.add('night');
        try { localStorage.setItem('theme', 'night'); } catch (e) {}
      } else {
        body.classList.remove('night');
        try { localStorage.setItem('theme', 'day'); } catch (e) {}
      }
    });
  }

  // ---------------------------------------------------------------
  // Scroll-to-top button visibility + click handler
  // ---------------------------------------------------------------
  const intro = document.querySelector('.intro');
  const introHeight = intro ? intro.offsetHeight : 0;
  const topButton = document.getElementById('top-button');

  if (topButton) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > introHeight) {
        topButton.style.display = 'block';
      } else {
        topButton.style.display = 'none';
      }
    }, false);

    topButton.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const hand = document.querySelector('.emoji.wave-hand');
  if (hand) {
    function waveOnLoad() {
      hand.classList.add('wave');
      setTimeout(function() {
        hand.classList.remove('wave');
      }, 2000);
    }

    setTimeout(waveOnLoad, 1000);

    hand.addEventListener('mouseover', function() {
      hand.classList.add('wave');
    });

    hand.addEventListener('mouseout', function() {
      hand.classList.remove('wave');
    });
  }

  if (typeof ScrollReveal !== 'undefined') {
    window.sr = ScrollReveal({
      reset: false,
      duration: 600,
      easing: 'cubic-bezier(.694,0,.335,1)',
      scale: 1,
      viewFactor: 0.3,
    });

    sr.reveal('.background');
    sr.reveal('.skills');
    sr.reveal('.experience', { viewFactor: 0.2 });
  }
});
