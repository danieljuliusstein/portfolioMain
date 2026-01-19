// ======================
// State Management
// ======================
let allProjects = [];
window.activeTag = 'all';
window.searchQuery = '';

// ======================
// Theme Management
// ======================
function initTheme() {
  // Check for saved theme
  const savedTheme = localStorage.getItem('theme');
  
  // Check system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set initial theme
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);
  
  // Update theme toggle aria-pressed state
  updateThemeToggleAria(initialTheme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      updateThemeToggleAria(newTheme);
    }
  });
}

function toggleTheme() {
  console.log('toggleTheme called'); // Debug
  const root = document.documentElement;
  const currentTheme = root.getAttribute('data-theme');
  console.log('Current theme:', currentTheme); // Debug
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  // Add transition class for polka dot pulse effect
  document.body.classList.add('theme-transitioning');
  
  // Apply theme with transition
  root.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  console.log('New theme:', newTheme); // Debug
  
  // Update aria-pressed state
  updateThemeToggleAria(newTheme);

  // Remove transition class after animation completes
  setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
  }, 600);

  // Announce theme change to screen readers
  const message = `Switched to ${newTheme} mode`;
  announceToScreenReader(message);
}

function updateThemeToggleAria(theme) {
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    themeToggle.setAttribute('aria-label', 
      theme === 'dark' 
        ? 'Switch to light theme' 
        : 'Switch to dark theme'
    );
  }
}

function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}

// ======================
// Data Loading
// ======================
function initializeApp() {
  // Check if all required elements exist
  const requiredElements = {
    projectsGrid: document.getElementById('projects-grid'),
    themeToggle: document.querySelector('.theme-toggle')
  };

  // Check if any required element is missing
  const missingElements = Object.entries(requiredElements)
    .filter(([_, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error('Missing required elements:', missingElements);
    document.body.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <h1>Initialization Error</h1>
        <p>The following elements are missing:</p>
        <ul style="list-style: none; padding: 0;">
          ${missingElements.map(name => `<li>${name}</li>`).join('')}
        </ul>
        <p>Please check the HTML structure and try again.</p>
      </div>
    `;
    return null;
  }

  return requiredElements;
}

async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) {
    console.error('Projects grid element not found');
    return;
  }

  try {
    // Show skeleton loading state
    grid.innerHTML = createSkeletonCards(6);

    // Fetch projects
    const response = await fetch('projects.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const projects = await response.json();
    if (!Array.isArray(projects)) {
      throw new Error('Invalid projects data');
    }

    // Store projects and render
    allProjects = projects;
    
    // Extract and render filter tags
    const allTags = ['all', ...new Set(projects.flatMap(p => p.tags || []))];
    renderFilterTags(allTags);
    
    renderProjects();

  } catch (error) {
    console.error('Error loading projects:', error);
    grid.innerHTML = `
      <div class="error-message">
        <p>Failed to load projects. ${error.message}</p>
        <button onclick="loadProjects()" class="btn btn-primary" style="margin-top: 1rem;">
          Try Again
        </button>
      </div>
    `;
  }
}

function createSkeletonCards(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-thumbnail"></div>
      <div class="skeleton-body">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line tags"></div>
        <div class="skeleton-line desc-1"></div>
        <div class="skeleton-line desc-2"></div>
        <div class="skeleton-line desc-3"></div>
        <div class="skeleton-line button"></div>
      </div>
    </div>
  `).join('');
}
// ======================
// Rendering Functions
// ======================
function renderFilterTags(tags) {
  const container = document.querySelector('.filter-tags');
  container.innerHTML = tags.map(tag => `
    <button
      class="tag-btn ${tag === 'all' ? 'active' : ''}"
      data-tag="${tag}"
    >
      ${tag === 'all' ? 'All' : tag}
    </button>
  `).join('');

  // Add event listeners to filter buttons
  container.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) {
    console.error('Cannot find #projects-grid element');
    return;
  }

  const noResults = document.getElementById('no-results');
  
  // Ensure we have projects to render
  if (!allProjects || !Array.isArray(allProjects)) {
    grid.innerHTML = '<p class="loading-text">No projects available.</p>';
    return;
  }

  // Filter projects
  const filtered = allProjects.filter(project => {
    const matchesTag = !window.activeTag || window.activeTag === 'all' || project.tags.includes(window.activeTag);
    const matchesSearch = !window.searchQuery || 
      project.title.toLowerCase().includes(window.searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(window.searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  // Show no results message if needed
  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noResults) noResults.hidden = false;
    return;
  }

  // Hide no results message
  if (noResults) noResults.hidden = true;

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Render projects with animation
  grid.innerHTML = filtered.map((project, index) => {
    const card = createProjectCard(project);
    // Wrap in a div with animation class and stagger delay
    const delay = prefersReducedMotion ? 0 : index * 50; // 50ms stagger
    return `<div class="project-card-wrapper" style="animation-delay: ${delay}ms">${card}</div>`;
  }).join('');

  // Trigger animation by adding class after a brief delay
  requestAnimationFrame(() => {
    grid.querySelectorAll('.project-card-wrapper').forEach(wrapper => {
      wrapper.classList.add('animate-in');
    });
  });

  // Add event listeners to new cards
  grid.querySelectorAll('.view-details').forEach((btn, index) => {
    btn.addEventListener('click', () => openModal(filtered[index]));
  });
}

function createProjectCard(project) {
  console.log('Creating card for project:', project);
  const card = `
    <article class="project-card">
      <img
        src="${project.thumbnail}"
        alt="${project.thumbnailAlt || 'Project screenshot'}"
        class="project-thumbnail"
        loading="lazy"
      >
      <div class="project-body">
        <h3 class="project-title">${escapeHtml(project.title)}</h3>
        <div class="project-tags">
          ${project.tags.map(tag => `<span class="project-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <p class="project-description">${escapeHtml(project.description)}</p>
        <div class="project-actions">
          <button class="btn btn-primary view-details" aria-label="View details for ${escapeHtml(project.title)}">
            View Details
          </button>
          ${project.demoUrl ? `
            <a
              href="${project.demoUrl}"
              class="btn btn-outline"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open live demo for ${escapeHtml(project.title)}"
            >
              Live Demo
            </a>
          ` : ''}
        </div>
      </div>
    </article>
  `;
  console.log('Created card HTML:', card);
  return card;
}

// ======================
// Modal Management
// ======================
let lastActiveElement = null; // Track element that opened modal

function openModal(project) {
  const modal = document.getElementById('project-modal');
  const modalBody = document.getElementById('modal-body');
  const closeBtn = modal.querySelector('.modal-close');
  
  // Save the currently focused element
  lastActiveElement = document.activeElement;
  
  modalBody.innerHTML = `
    ${project.image ? `
      <img
        src="${project.image}"
        alt="${project.imageAlt || 'Project detail view'}"
        class="modal-image"
        loading="lazy"
      >
    ` : ''}
    <h2 class="modal-title" id="modal-title">${escapeHtml(project.title)}</h2>
    <p class="modal-description">${escapeHtml(project.longDescription)}</p>
    <div class="modal-actions">
      ${project.demoUrl ? `
        <a
          href="${project.demoUrl}"
          class="btn btn-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Live Project
        </a>
      ` : ''}
      ${project.repoUrl ? `
        <a
          href="${project.repoUrl}"
          class="btn btn-outline"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Code
        </a>
      ` : ''}
    </div>
  `;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  
  // Set up focus trap
  setupModalFocusTrap(modal);
  
  // Focus close button
  closeBtn.focus();

  // Announce modal opened to screen readers
  announceToScreenReader(`Project details for ${project.title} opened`);

  // Ensure close button works
  closeBtn.addEventListener('click', closeModal);
  modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
  document.addEventListener('keydown', handleModalKeydown);
}

function closeModal() {
  const modal = document.getElementById('project-modal');
  modal.hidden = true;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleModalKeydown);
  
  // Restore focus to element that opened the modal
  if (lastActiveElement) {
    lastActiveElement.focus();
    lastActiveElement = null;
  }
  
  announceToScreenReader('Project details closed');
}

function handleModalKeydown(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
}

// Focus trap for modal accessibility
function setupModalFocusTrap(modal) {
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab: going backwards
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab: going forwards
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });
}

// ======================
// Event Handlers
// ======================
function handleFilterClick(e) {
  const tag = e.target.dataset.tag;
  if (!tag) return;

  activeTag = tag;

  // Update active state
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tag === tag);
  });

  renderProjects();
}

function handleSearch(e) {
  searchQuery = e.target.value;
  renderProjects();
}

function handleModalKeydown(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
}

function handleResetFilters() {
  activeTag = 'all';
  searchQuery = '';
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tag === 'all');
  });
  renderProjects();
}

// ======================
// Contact & Utilities
// ======================
function copyEmailToClipboard() {
  const email = 'dstein35@gatech.edu';

  // Modern clipboard API with fallback
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(email)
      .then(() => showToast('Email copied to clipboard!'))
      .catch(() => fallbackCopy(email));
  } else {
    fallbackCopy(email);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    showToast('Email copied to clipboard!');
  } catch (err) {
    showToast('Failed to copy email');
  }

  document.body.removeChild(textarea);
}

// ======================
// Contact Form Validation & Submission
// ======================
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Add input validation listeners
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const messageInput = document.getElementById('contact-message');

  nameInput?.addEventListener('blur', () => validateName(nameInput.value));
  emailInput?.addEventListener('blur', () => validateEmail(emailInput.value));
  messageInput?.addEventListener('blur', () => validateMessage(messageInput.value));

  // Handle form submission
  form.addEventListener('submit', handleFormSubmit);
}

function validateName(name) {
  const errorEl = document.getElementById('name-error');
  if (!name.trim()) {
    errorEl.textContent = 'Name is required';
    return false;
  }
  if (name.trim().length < 2) {
    errorEl.textContent = 'Name must be at least 2 characters';
    return false;
  }
  errorEl.textContent = '';
  return true;
}

function validateEmail(email) {
  const errorEl = document.getElementById('email-error');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email.trim()) {
    errorEl.textContent = 'Email is required';
    return false;
  }
  if (!emailRegex.test(email)) {
    errorEl.textContent = 'Please enter a valid email address';
    return false;
  }
  errorEl.textContent = '';
  return true;
}

function validateMessage(message) {
  const errorEl = document.getElementById('message-error');
  if (!message.trim()) {
    errorEl.textContent = 'Message is required';
    return false;
  }
  if (message.trim().length < 10) {
    errorEl.textContent = 'Message must be at least 10 characters';
    return false;
  }
  errorEl.textContent = '';
  return true;
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const statusEl = document.getElementById('form-status');

  // Get form values
  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const message = document.getElementById('contact-message').value;

  // Validate all fields
  const isNameValid = validateName(name);
  const isEmailValid = validateEmail(email);
  const isMessageValid = validateMessage(message);

  if (!isNameValid || !isEmailValid || !isMessageValid) {
    statusEl.textContent = 'Please fix the errors above';
    statusEl.className = 'form-status error';
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  btnText.hidden = true;
  btnLoading.hidden = false;
  statusEl.textContent = '';
  statusEl.className = 'form-status';

  try {
    // Submit form via FormSubmit.co
    const formData = new FormData(form);
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      statusEl.textContent = '✓ Message sent successfully! I\'ll get back to you soon.';
      statusEl.className = 'form-status success';
      form.reset();
    } else {
      throw new Error('Form submission failed');
    }
  } catch (error) {
    console.error('Form submission error:', error);
    statusEl.textContent = '✗ Failed to send message. Please try again or email directly.';
    statusEl.className = 'form-status error';
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    btnText.hidden = false;
    btnLoading.hidden = true;
  }
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // Clear any existing timeout
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
    toast.hidden = true;
    void toast.offsetWidth; // Force reflow
  }

  toastMessage.textContent = message;
  toast.hidden = false;
  toast.setAttribute('data-visible', 'true');

  // Auto-hide
  toast.timeoutId = setTimeout(() => {
    toast.setAttribute('data-visible', 'false');
    setTimeout(() => {
      toast.hidden = true;
    }, 300); // Match transition duration
  }, duration);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ======================
// Keyboard Shortcuts
// ======================
function handleGlobalKeydown(e) {
  // Press '/' to focus search
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    document.getElementById('search-input').focus();
  }

  // Press 'T' to toggle theme
  if (e.key === 't' || e.key === 'T') {
    if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      toggleTheme();
    }
  }

  // Press 'Escape' to close modal
  if (e.key === 'Escape') {
    const modal = document.getElementById('project-modal');
    if (!modal.hidden) {
      closeModal();
    }
  }
}

// ======================
// PDF Viewer Functionality
// ======================
function initResumePreviewer() {
  const preview = document.querySelector('.resume-preview');
  if (!preview) return;

  // Handle loading errors
  preview.onerror = () => {
    preview.style.display = 'none';
    preview.parentElement.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">
        <p>Preview not available.</p>
        <p>Please download or view the resume directly.</p>
      </div>
      <div class="resume-actions">
        <!-- Original buttons here -->
      </div>
    `;
  };
}

function handleThemeChange(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Update PDF viewer if it exists
  const preview = document.querySelector('.resume-preview');
  if (preview) {
    preview.src = preview.src; // Reload iframe to update colors
  }
}

// ======================
// Initialization
// ======================
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing...'); // Debug log
  const elements = initializeApp();
  if (!elements) return;

  // Initialize theme
  initTheme();

  // Initialize scroll animations
  initScrollAnimations();

  // Initialize typing animation
  initTypingAnimation();

  // Initialize Konami code easter egg
  initKonamiCode();

  // Initialize back to top button
  initBackToTop();

  // Initialize scroll progress indicator
  initScrollProgress();

  // Initialize cursor trail
  initCursorTrail();

  // Initialize terminal
  initTerminal();

  // Initialize testimonials carousel
  initTestimonials();

  // Initialize featured projects - COMMENTED OUT (uncomment when you have more projects)
  // loadFeaturedProjects();

  // Initialize contact form
  initContactForm();

  // Register service worker for offline capability
  registerServiceWorker();

  // Load projects
  loadProjects().catch(error => {
    console.error('Failed to load projects:', error);
  });

  // Add event listeners
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  // Add copy email button listener (if it still exists)
  const copyEmailBtn = document.getElementById('copy-email');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', copyEmailToClipboard);
  }
  
  // Add global keyboard shortcuts
  document.addEventListener('keydown', handleGlobalKeydown);
});

// ======================
// Interactive Canvas Dots
// ======================
function initCanvasDots() {
  // Check if canvas already exists and remove it
  const existingCanvas = document.querySelector('.dots-canvas');
  if (existingCanvas) {
    existingCanvas.remove();
  }
  
  // Create ONE canvas for the entire page
  const canvas = document.createElement('canvas');
  canvas.className = 'dots-canvas';
  canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 100; mix-blend-mode: multiply;';
  
  // Append to body as first child
  document.body.insertBefore(canvas, document.body.firstChild);
  
  const ctx = canvas.getContext('2d');
  let dots = [];
  let mouse = { x: -1000, y: -1000 };
  let animationFrame;
  
  // Get CSS variables
  const styles = getComputedStyle(document.documentElement);
  const dotSpacing = 29;
  const dotSize = 1.45;
  const magnetRadius = 80;
  const magnetStrength = 15;
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initDots();
  }
  
  function initDots() {
    dots = [];
    const cols = Math.ceil(canvas.width / dotSpacing);
    const rows = Math.ceil(canvas.height / dotSpacing);
    
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push({
          x: i * dotSpacing,
          y: j * dotSpacing,
          baseX: i * dotSpacing,
          baseY: j * dotSpacing,
          vx: 0,
          vy: 0
        });
      }
    }
  }
  
  function updateDots() {
    dots.forEach(dot => {
      // Calculate distance to mouse
      const dx = mouse.x - dot.x;
      const dy = mouse.y - dot.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < magnetRadius) {
        // Apply magnetic force
        const force = (1 - distance / magnetRadius) * magnetStrength;
        dot.vx += (dx / distance) * force * 0.1;
        dot.vy += (dy / distance) * force * 0.1;
      }
      
      // Apply spring force back to original position
      const springX = (dot.baseX - dot.x) * 0.15;
      const springY = (dot.baseY - dot.y) * 0.15;
      dot.vx += springX;
      dot.vy += springY;
      
      // Apply damping
      dot.vx *= 0.85;
      dot.vy *= 0.85;
      
      // Update position
      dot.x += dot.vx;
      dot.y += dot.vy;
    });
  }
  
  function drawDots() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get accent color from CSS
    const accentColor = styles.getPropertyValue('--color-accent').trim();
    const opacity = parseFloat(styles.getPropertyValue('--dot-opacity').trim());
    
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = opacity;
    
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
  }
  
  function animate() {
    updateDots();
    drawDots();
    animationFrame = requestAnimationFrame(animate);
  }
  
  // Event listeners on window for global tracking
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  
  document.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });
  
  // Initialize
  resizeCanvas();
  animate();
  
  // Handle resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 100);
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animationFrame);
  });
}

// ======================
// Service Worker Registration
// ======================
function registerServiceWorker() {
  // Only register service worker in production (not file:// protocol)
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('[Service Worker] Registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        console.log('[Service Worker] Registration failed:', error);
      });
  }
}


// ======================
// Scroll Animations (Intersection Observer)
// ======================
function initScrollAnimations() {
  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Select all sections to animate
  const sections = document.querySelectorAll('.hero, .projects-section, .resume-section, .contact-section');
  
  // Create intersection observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        // Optional: unobserve after animation to improve performance
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15, // Trigger when 15% of section is visible
    rootMargin: '0px 0px -50px 0px' // Start animation slightly before element enters viewport
  });

  // Observe each section
  sections.forEach(section => {
    section.classList.add('animate-on-scroll');
    observer.observe(section);
  });
}

// ======================
// Testimonials Carousel
// ======================
function initTestimonials() {
  const track = document.getElementById('testimonials-track');
  const cards = document.querySelectorAll('.testimonial-card');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  const dots = document.querySelectorAll('.carousel-dots .dot');

  if (!track || cards.length === 0) return;

  let currentIndex = 0;
  const totalCards = cards.length;

  function updateCarousel() {
    // Update track position
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    // Update active card
    cards.forEach((card, index) => {
      if (index === currentIndex) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update dots
    dots.forEach((dot, index) => {
      if (index === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update button states
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === totalCards - 1;
  }

  function goToSlide(index) {
    currentIndex = Math.max(0, Math.min(index, totalCards - 1));
    updateCarousel();
  }

  function nextSlide() {
    if (currentIndex < totalCards - 1) {
      goToSlide(currentIndex + 1);
    }
  }

  function prevSlide() {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  }

  // Event listeners
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => goToSlide(index));
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const testimonialsSection = document.querySelector('.testimonials-section');
    if (!testimonialsSection) return;

    const rect = testimonialsSection.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom >= 0;

    if (isInView) {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    }
  });

  // Auto-advance (optional)
  let autoAdvanceInterval = setInterval(() => {
    if (currentIndex < totalCards - 1) {
      nextSlide();
    } else {
      goToSlide(0);
    }
  }, 5000); // Change every 5 seconds

  // Pause auto-advance on hover
  const carousel = document.querySelector('.testimonials-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => {
      clearInterval(autoAdvanceInterval);
    });

    carousel.addEventListener('mouseleave', () => {
      autoAdvanceInterval = setInterval(() => {
        if (currentIndex < totalCards - 1) {
          nextSlide();
        } else {
          goToSlide(0);
        }
      }, 5000);
    });
  }

  // Initial update
  updateCarousel();
}

// ======================
// Featured Projects Carousel
// ======================
let featuredProjects = [];

async function loadFeaturedProjects() {
  try {
    const response = await fetch('featured-projects.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    featuredProjects = await response.json();
    renderFeaturedProjects();
    initFeaturedCarousel();
  } catch (error) {
    console.error('Failed to load featured projects:', error);
    // Hide the section if no projects
    const section = document.querySelector('.featured-project-section');
    if (section) section.style.display = 'none';
  }
}

function renderFeaturedProjects() {
  const track = document.getElementById('featured-track');
  const dotsContainer = document.getElementById('featured-dots');
  
  if (!track || !featuredProjects.length) return;

  // Render cards
  track.innerHTML = featuredProjects.map((project, index) => `
    <div class="featured-card ${index === 0 ? 'active' : ''}" data-index="${index}">
      <div class="featured-image">
        <img src="${project.image}" alt="${project.imageAlt}" loading="lazy">
      </div>
      <div class="featured-content">
        <span class="featured-badge">${project.badge || 'Featured'}</span>
        <h3 class="featured-title">${escapeHtml(project.title)}</h3>
        <p class="featured-description">${escapeHtml(project.description)}</p>
        <div class="featured-tech">
          ${project.technologies.map(tech => `
            <span class="featured-tech-tag">${escapeHtml(tech)}</span>
          `).join('')}
        </div>
        <div class="featured-actions">
          <button class="featured-btn featured-btn-primary" onclick="openFeaturedProject('${project.id}')">
            View Details →
          </button>
          ${project.repoUrl ? `
            <a href="${project.repoUrl}" target="_blank" rel="noopener noreferrer" class="featured-btn featured-btn-secondary">
              GitHub
            </a>
          ` : ''}
          ${project.demoUrl ? `
            <a href="${project.demoUrl}" target="_blank" rel="noopener noreferrer" class="featured-btn featured-btn-secondary">
              Live Demo
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');

  // Render dots
  dotsContainer.innerHTML = featuredProjects.map((_, index) => `
    <button class="featured-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Go to project ${index + 1}"></button>
  `).join('');
}

function openFeaturedProject(projectId) {
  const project = featuredProjects.find(p => p.id === projectId);
  if (project) {
    openModal(project);
  }
}

// Make it globally accessible
window.openFeaturedProject = openFeaturedProject;

function initFeaturedCarousel() {
  const track = document.getElementById('featured-track');
  const cards = document.querySelectorAll('.featured-card');
  const prevBtn = document.querySelector('.featured-prev');
  const nextBtn = document.querySelector('.featured-next');
  const dots = document.querySelectorAll('.featured-dot');

  if (!track || cards.length === 0) return;

  let currentIndex = 0;
  const totalCards = cards.length;

  function updateCarousel() {
    // Update track position
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    // Update active card
    cards.forEach((card, index) => {
      if (index === currentIndex) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update dots
    dots.forEach((dot, index) => {
      if (index === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update button states
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === totalCards - 1;
  }

  function goToSlide(index) {
    currentIndex = Math.max(0, Math.min(index, totalCards - 1));
    updateCarousel();
  }

  function nextSlide() {
    if (currentIndex < totalCards - 1) {
      goToSlide(currentIndex + 1);
    }
  }

  function prevSlide() {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  }

  // Event listeners
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => goToSlide(index));
  });

  // Auto-rotate every 8 seconds
  let autoRotateInterval = setInterval(() => {
    if (currentIndex < totalCards - 1) {
      nextSlide();
    } else {
      goToSlide(0);
    }
  }, 8000);

  // Pause on hover
  const carousel = document.querySelector('.featured-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => {
      clearInterval(autoRotateInterval);
    });

    carousel.addEventListener('mouseleave', () => {
      autoRotateInterval = setInterval(() => {
        if (currentIndex < totalCards - 1) {
          nextSlide();
        } else {
          goToSlide(0);
        }
      }, 8000);
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const section = document.querySelector('.featured-project-section');
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom >= 0;

    if (isInView) {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    }
  });

  // Initial update
  updateCarousel();
}

// ======================
// Typing Animation with Rotation
// ======================
function initTypingAnimation() {
  const typingElement = document.getElementById('typing-text');
  const subtitleElement = document.querySelector('.hero-subtitle');
  if (!typingElement || !subtitleElement) return;

  const texts = [
  'Computer Engineer',
  'Gym Rat',
  'Georgia Tech Student',
  'Always Learning + Building'
];

  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // If user prefers reduced motion, show first text immediately
  if (prefersReducedMotion) {
    typingElement.textContent = texts[0];
    subtitleElement.classList.add('typing-complete');
    return;
  }

  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  const typeSpeed = 30; // typing speed
  const deleteSpeed = 30; // backspace speed
  const pauseAfterType = 4000; // pause after typing complete word
  const pauseAfterDelete = 700; // pause after deleting complete word

  function type() {
    const currentText = texts[textIndex];
    
    if (!isDeleting && charIndex < currentText.length) {
      // Typing forward
      typingElement.textContent = currentText.substring(0, charIndex + 1);
      charIndex++;
      setTimeout(type, typeSpeed);
    } else if (!isDeleting && charIndex === currentText.length) {
      // Finished typing, pause then start deleting
      subtitleElement.classList.add('typing-complete');
      setTimeout(() => {
        isDeleting = true;
        subtitleElement.classList.remove('typing-complete');
        type();
      }, pauseAfterType);
    } else if (isDeleting && charIndex > 0) {
      // Deleting backwards
      typingElement.textContent = currentText.substring(0, charIndex - 1);
      charIndex--;
      setTimeout(type, deleteSpeed);
    } else if (isDeleting && charIndex === 0) {
      // Finished deleting, move to next text
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length; // Loop through texts
      setTimeout(type, pauseAfterDelete);
    }
  }

  // Start typing after initial delay
  setTimeout(type, 500);
}

// ======================
// Easter Egg (Konami Code)
// ======================
function initKonamiCode() {
  const konamiCode = [
    'ArrowUp', 'ArrowUp', 
    'ArrowDown', 'ArrowDown', 
    'ArrowLeft', 'ArrowRight', 
    'ArrowLeft', 'ArrowRight', 
    'b', 'a'
  ];
  let konamiIndex = 0;
  let easterEggActivated = false;

  document.addEventListener('keydown', (e) => {
    // Check if the key matches the current position in the Konami code
    if (e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      
      // If the entire code has been entered
      if (konamiIndex === konamiCode.length) {
        if (!easterEggActivated) {
          activateEasterEgg();
          easterEggActivated = true;
        }
        konamiIndex = 0; // Reset for potential re-entry
      }
    } else {
      konamiIndex = 0; // Reset if wrong key pressed
    }
  });
}

function activateEasterEgg() {
  // Add special class to body for polka dot animation
  document.body.classList.add('konami-active');
  
  // Show toast with fun message
  showToast('🎮 Konami Code Activated! Watch the dots dance! 🎉');
  
  // Remove class after animation completes
  setTimeout(() => {
    document.body.classList.remove('konami-active');
  }, 5000);
  
  // Announce to screen readers
  announceToScreenReader('Easter egg activated! Polka dots are dancing!');
}

// ======================
// Back to Top Button
// ======================
function initBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (!backToTopBtn) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollThreshold = 300; // Show button after scrolling 300px

  // Handle scroll events
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    // Debounce scroll events for performance
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrolled = window.scrollY || document.documentElement.scrollTop;
      
      if (scrolled > scrollThreshold) {
        backToTopBtn.setAttribute('data-visible', 'true');
        backToTopBtn.hidden = false;
      } else {
        backToTopBtn.setAttribute('data-visible', 'false');
        setTimeout(() => {
          if (backToTopBtn.getAttribute('data-visible') === 'false') {
            backToTopBtn.hidden = true;
          }
        }, 300); // Match transition duration
      }
    }, 100);
  });

  // Handle click event
  backToTopBtn.addEventListener('click', () => {
    if (prefersReducedMotion) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    announceToScreenReader('Scrolled to top of page');
  });
}

// ======================
// Scroll Progress Indicator
// ======================
function initScrollProgress() {
  const progressBar = document.querySelector('.scroll-progress');
  if (!progressBar) return;

  function updateProgress() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Calculate progress percentage
    const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
    const clampedPercent = Math.min(Math.max(scrollPercent, 0), 100);
    
    progressBar.style.width = `${clampedPercent}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(clampedPercent));
  }

  // Update on scroll with throttling
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      updateProgress();
      scrollTimeout = null;
    }, 10);
  });

  // Initial update
  updateProgress();
}

// ======================
// Cursor Trail Effect
// ======================
function initCursorTrail() {
  const toggleBtn = document.querySelector('.cursor-trail-toggle');
  if (!toggleBtn) return;

  let trailEnabled = localStorage.getItem('cursorTrail') === 'true';
  let trails = [];
  const maxTrails = 15;

  // Set initial state
  toggleBtn.setAttribute('aria-pressed', trailEnabled ? 'true' : 'false');

  function createTrail(x, y) {
    if (!trailEnabled) return;

    const trail = document.createElement('div');
    trail.className = 'cursor-trail active';
    trail.style.left = `${x}px`;
    trail.style.top = `${y}px`;
    document.body.appendChild(trail);

    trails.push(trail);

    // Remove after animation
    setTimeout(() => {
      trail.remove();
      trails = trails.filter(t => t !== trail);
    }, 600);

    // Limit number of trails
    if (trails.length > maxTrails) {
      const oldTrail = trails.shift();
      if (oldTrail && oldTrail.parentNode) {
        oldTrail.remove();
      }
    }
  }

  // Throttle trail creation
  let lastTrailTime = 0;
  const trailInterval = 30; // ms

  window.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastTrailTime >= trailInterval) {
      createTrail(e.clientX, e.clientY);
      lastTrailTime = now;
    }
  });

  toggleBtn.addEventListener('click', () => {
    trailEnabled = !trailEnabled;
    localStorage.setItem('cursorTrail', trailEnabled);
    toggleBtn.setAttribute('aria-pressed', trailEnabled ? 'true' : 'false');
    
    // Clear existing trails
    trails.forEach(trail => trail.remove());
    trails = [];

    announceToScreenReader(`Cursor trail ${trailEnabled ? 'enabled' : 'disabled'}`);
  });
}

// ======================
// Interactive Terminal
// ======================
function initTerminal() {
  const terminal = document.getElementById('terminal');
  const terminalToggle = document.getElementById('terminal-toggle');
  const terminalClose = document.querySelector('.terminal-close');
  const terminalInput = document.getElementById('terminal-input');
  const terminalOutput = document.getElementById('terminal-output');

  if (!terminal || !terminalToggle) {
    console.error('Terminal elements not found:', { terminal, terminalToggle });
    return;
  }

  let commandHistory = [];
  let historyIndex = -1;

  const commands = {
    help: () => {
      return `Available commands:<br>
  help        - Show this help message<br>
  about       - Learn about me<br>
  projects    - View my projects<br>
  skills      - List my skills<br>
  contact     - Get contact information<br>
  resume      - View my resume<br>
  clear       - Clear terminal<br>
  theme       - Toggle dark/light theme<br>
  github      - Open my GitHub profile<br>
  email       - Copy email to clipboard`;
    },
    about: () => {
      return `Hi! I'm Daniel Stein, a Computer Engineer from Georgia Tech.<br>
I build innovative solutions through software and hardware.`;
    },
    projects: () => {
      document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' });
      return 'Navigating to projects section...';
    },
    skills: () => {
      return `Technical Skills:<br>
  • Programming: Python, JavaScript, Java, C/C++<br>
  • Machine Learning & Data Analysis<br>
  • Web Development (HTML, CSS, JavaScript)<br>
  • Software & Hardware Integration`;
    },
    contact: () => {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
      return 'Navigating to contact section...';
    },
    resume: () => {
      document.querySelector('#resume')?.scrollIntoView({ behavior: 'smooth' });
      return 'Navigating to resume section...';
    },
    clear: () => {
      terminalOutput.innerHTML = '';
      return null;
    },
    theme: () => {
      toggleTheme();
      return 'Theme toggled!';
    },
    github: () => {
      window.open('https://github.com/danieljuliusstein', '_blank');
      return 'Opening GitHub profile...';
    },
    email: () => {
      const email = 'dstein35@gatech.edu';
      navigator.clipboard.writeText(email).then(() => {
        showToast('Email copied to clipboard!');
      });
      return `Email copied: ${email}`;
    }
  };

  function addOutput(text, className = '') {
    if (text === null) return;
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.innerHTML = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  function executeCommand(cmd) {
    const trimmedCmd = cmd.trim().toLowerCase();
    
    // Add command to output
    addOutput(`$ ${cmd}`, 'command');

    if (!trimmedCmd) return;

    // Add to history
    commandHistory.push(cmd);
    historyIndex = commandHistory.length;

    // Execute command
    if (commands[trimmedCmd]) {
      try {
        const result = commands[trimmedCmd]();
        if (result) addOutput(result, 'success');
      } catch (error) {
        addOutput(`Error executing command: ${error.message}`, 'error');
      }
    } else {
      addOutput(`Command not found: ${trimmedCmd}. Type 'help' for available commands.`, 'error');
    }
  }

  // Toggle terminal
  function toggleTerminal() {
    const isHidden = terminal.hidden;
    terminal.hidden = !isHidden;
    
    if (!isHidden) {
      // Closing
      terminalInput.blur();
    } else {
      // Opening
      setTimeout(() => terminalInput.focus(), 100);
    }
  }

  terminalToggle.addEventListener('click', toggleTerminal);
  terminalClose.addEventListener('click', toggleTerminal);

  // Handle input
  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = terminalInput.value;
      if (cmd.trim()) {
        executeCommand(cmd);
        terminalInput.value = '';
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        terminalInput.value = commandHistory[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        terminalInput.value = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        terminalInput.value = '';
      }
    }
  });

  // Keyboard shortcut: Ctrl+` to toggle terminal
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      toggleTerminal();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !terminal.hidden) {
      toggleTerminal();
    }
  });
}
