document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  // Check for saved theme in localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    body.classList.add(savedTheme);
  } else {
    body.classList.add('light-mode'); // Default to light mode
  }

  // Theme toggle functionality
  themeToggle.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    body.classList.toggle('dark-mode');

    // Save theme preference in localStorage
    if (body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark-mode');
    } else {
      localStorage.setItem('theme', 'light-mode');
    }
  });

  // Handle responsive behavior
  const isMobile = window.matchMedia('(max-width: 768px)');

  function handleScreenChange(e) {
    if (e.matches) {
      console.log('Mobile view: Adjusting layout for mobile');
      // Add mobile-specific functionality here, if needed
    } else {
      console.log('Desktop view: Adjusting layout for desktop');
      // Add desktop-specific functionality here, if needed
    }
  }

  isMobile.addListener(handleScreenChange); // Listen for changes in screen size
  handleScreenChange(isMobile); // Initial check on page load

  // Debounce function for optimizing resize events
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Adjust hero section height dynamically
  function adjustHeroHeight() {
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.style.height = `${window.innerHeight}px`;
    }
  }

  window.addEventListener('resize', debounce(adjustHeroHeight, 300));
  adjustHeroHeight(); // Initial adjustment on page load

  // Handle touch interactions
  const contactButton = document.querySelector('.contact-button');
  if (contactButton) {
    contactButton.addEventListener('click', () => console.log('Button clicked'));
    contactButton.addEventListener('touchstart', () => console.log('Button tapped'));
  }

  // Lazy loading for images
  const lazyLoadImages = () => {
    const images = document.querySelectorAll('[data-src]');
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const lazyLoad = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src; // Assign real source
          observer.unobserve(img);
        }
      });
    };

    const observer = new IntersectionObserver(lazyLoad, options);
    images.forEach((img) => observer.observe(img));
  };

  lazyLoadImages();

  // Orientation change handler
  window.addEventListener('orientationchange', () => {
    console.log('Orientation changed!');
    adjustHeroHeight(); // Recalculate heights
  });

  // Animation trigger on scroll
  document.addEventListener('scroll', debounce(() => {
    const animatedSection = document.querySelector('.animated-section');
    if (animatedSection) {
      const rect = animatedSection.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        animatedSection.classList.add('animate');
      }
    }
  }, 200));
  // Adjust iframe scaling for better mobile responsiveness
  const adjustIframe = () => {
    const resumeIframe = document.querySelector('.resume-card iframe');
    if (resumeIframe) {
      const screenWidth = window.innerWidth;

      if (screenWidth < 768) {
        // Adjust iframe dimensions for smaller screens
        resumeIframe.style.width = '100%';
        resumeIframe.style.height = '500px';
      } else {
        // Restore to desktop dimensions
        resumeIframe.style.width = '90%';
        resumeIframe.style.height = '650px';
      }
    }
  };

  // Run adjustIframe on load and resize
  adjustIframe();
  window.addEventListener('resize', adjustIframe);
  const downloadButton = document.createElement('a');
  downloadButton.href = 'path/to/your/resume.pdf'; // Replace with your PDF file path
  downloadButton.textContent = 'Download Resume';
  downloadButton.classList.add('contact-button');
  downloadButton.style.display = 'block';
  downloadButton.style.marginTop = '20px';
  downloadButton.download = 'Resume.pdf';

  const resumeCard = document.querySelector('.resume-card');
  if (resumeCard) {
    resumeCard.appendChild(downloadButton);
  }
});
