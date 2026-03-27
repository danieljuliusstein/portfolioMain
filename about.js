// About section scroll reveal
function initAboutReveal() {
  const wrapper = document.querySelector('.about-wrapper');
  if (!wrapper) return;

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      wrapper.classList.add('about--visible');
      io.disconnect();
    }
  }, { threshold: 0.15 });

  io.observe(wrapper);
}

document.addEventListener('DOMContentLoaded', initAboutReveal);
