document.addEventListener('DOMContentLoaded', function() {
  const d = new Date();
  const hours = d.getHours();
  const night = hours >= 19 || hours <= 7; // between 7pm and 7am
  const body = document.querySelector('body');
  const toggle = document.getElementById('toggle');
  const input = document.getElementById('switch');

  if (night && input) {
    input.checked = true;
    body.classList.add('night');
  }

  if (toggle && input) {
    toggle.addEventListener('click', function() {
      if (input.checked) {
        body.classList.remove('night');
      } else {
        body.classList.add('night');
      }
    });
  }

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
