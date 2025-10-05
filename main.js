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
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

function toggleTheme() {
  const root = document.documentElement;
  const currentTheme = root.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  // Apply theme with transition
  root.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  // Announce theme change to screen readers
  const message = `Switched to ${newTheme} mode`;
  announceToScreenReader(message);
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
    // Show loading state
    grid.innerHTML = '<p class="loading-text">Loading projects...</p>';

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

  // Render projects
  grid.innerHTML = filtered.map(project => createProjectCard(project)).join('');

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
  closeBtn.focus();

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
}

function handleModalKeydown(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
}

// Focus trap for modal accessibility
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleTab(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  }

  element.addEventListener('keydown', handleTab);
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
  const email = 'your.email@example.com';

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
// Contact Form Functionality
// ======================
const contactForm = {
  init() {
    this.form = document.getElementById('contact-form');
    if (!this.form) return;

    // Initialize CSRF token
    this.initCSRF();
    
    // Bind event listeners
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.form.querySelectorAll('input, textarea').forEach(field => {
      field.addEventListener('input', () => this.validateField(field));
      field.addEventListener('blur', () => this.validateField(field));
    });

    // Initialize floating button
    this.initFloatingButton();
  },

  async initCSRF() {
    try {
      const token = await this.generateCSRFToken();
      this.form.querySelector('input[name="csrf_token"]').value = token;
    } catch (error) {
      console.error('Failed to initialize CSRF:', error);
    }
  },

  generateCSRFToken() {
    return new Promise((resolve) => {
      const token = Math.random().toString(36).substr(2);
      resolve(token);
    });
  },

  validateField(field) {
    const errorElement = document.getElementById(`${field.id}-error`);
    if (!errorElement) return true;

    let isValid = field.checkValidity();
    let message = '';

    if (!isValid) {
      if (field.validity.valueMissing) {
        message = `${field.name} is required`;
      } else if (field.validity.typeMismatch && field.type === 'email') {
        message = 'Please enter a valid email address';
      } else if (field.validity.tooShort) {
        message = `${field.name} must be at least ${field.minLength} characters`;
      }
    }

    field.setAttribute('aria-invalid', !isValid);
    errorElement.textContent = message;

    return isValid;
  },

  validateForm() {
    const fields = this.form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  },

  async handleSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) return;
    
    const submitBtn = this.form.querySelector('[type="submit"]');
    submitBtn.setAttribute('data-loading', 'true');
    
    try {
      // Submit to Web3Forms
      const response = await fetch(this.form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.getFormData())
      });

      if (!response.ok) throw new Error('Submission failed');
      
      showToast('Message sent successfully!', 'success');
      this.form.reset();
      
      // Show fallback options
      document.querySelector('.contact-fallback').hidden = false;
      
    } catch (error) {
      console.error('Submission error:', error);
      showToast('Failed to send message. Please try again.', 'error');
      
      // Setup mailto fallback
      const mailtoLink = this.generateMailtoLink();
      document.getElementById('mailto-link').href = mailtoLink;
      document.querySelector('.contact-fallback').hidden = false;
    } finally {
      submitBtn.setAttribute('data-loading', 'false');
    }
  },

  getFormData() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);
    
    // Sanitize data
    Object.keys(data).forEach(key => {
      data[key] = this.sanitizeInput(data[key]);
    });

    return data;
  },

  sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  generateMailtoLink() {
    const email = 'danieljuliusstein@gmail.com';
    const subject = encodeURIComponent('Portfolio Contact');
    const body = encodeURIComponent(
      `Name: ${this.form.name.value}\n` +
      `Email: ${this.form.email.value}\n\n` +
      `Message:\n${this.form.message.value}`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  },

  initFloatingButton() {
    const btn = document.getElementById('float-contact');
    if (!btn) return;

    // Show button when user scrolls past contact section
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        btn.hidden = entry.isIntersecting;
      });
    }, { threshold: 0.1 });

    observer.observe(document.getElementById('contact'));

    // Handle click
    btn.addEventListener('click', () => {
      const modal = document.getElementById('contact-modal');
      if (!modal) return;

      // Clone contact form into modal
      const modalBody = modal.querySelector('.modal-body');
      modalBody.innerHTML = '';
      modalBody.appendChild(this.form.cloneNode(true));

      // Show modal
      modal.hidden = false;
      trapFocus(modal);
    });
  }
};

// Enhanced toast functionality
function showToast(message, type = 'info', duration = 4000) {
  const toast = document.getElementById('toast');
  const messageEl = document.getElementById('toast-message');
  
  // Clear existing timeout
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
    toast.hidden = true;
  }

  messageEl.textContent = message;
  toast.setAttribute('data-type', type);
  toast.hidden = false;
  toast.setAttribute('data-visible', 'true');

  // Auto-hide unless reduced motion is preferred
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    toast.timeoutId = setTimeout(() => {
      toast.setAttribute('data-visible', 'false');
      setTimeout(() => {
        toast.hidden = true;
      }, 300);
    }, duration);
  }
}

// File Viewer Controls
const fileViewer = {
  init() {
    this.container = document.querySelector('.resume-preview-wrapper');
    this.iframe = document.getElementById('resume-preview');
    if (!this.container || !this.iframe) return;

    // Initialize zoom state
    this.scale = 1;
    this.maxScale = 2;
    this.minScale = 0.5;
    this.lastX = 0;
    this.lastY = 0;
    this.isDragging = false;

    // Bind event handlers
    this.bindEvents();
    this.initZoomControls();
  },

  bindEvents() {
    // Mouse wheel zoom
    this.container.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.zoom(delta, e.clientX, e.clientY);
      }
    });

    // Pan functionality
    this.container.addEventListener('mousedown', (e) => {
      this.startDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.drag(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch events
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        this.pinchStart(e);
      } else if (e.touches.length === 1) {
        this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        this.pinchMove(e);
      } else if (e.touches.length === 1 && this.isDragging) {
        this.drag(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    this.container.addEventListener('touchend', () => {
      this.isDragging = false;
      this.lastPinchDistance = null;
    });
  },

  initZoomControls() {
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomReset = document.getElementById('zoom-reset');

    if (zoomIn) {
      zoomIn.addEventListener('click', () => this.zoom(0.1));
    }
    if (zoomOut) {
      zoomOut.addEventListener('click', () => this.zoom(-0.1));
    }
    if (zoomReset) {
      zoomReset.addEventListener('click', () => this.resetZoom());
    }
  },

  zoom(delta, clientX, clientY) {
    const newScale = Math.min(Math.max(this.scale + delta, this.minScale), this.maxScale);
    if (newScale === this.scale) return;

    // Calculate zoom point (default to center if not provided)
    const rect = this.container.getBoundingClientRect();
    const x = clientX ? ((clientX - rect.left) / this.scale) : (rect.width / 2);
    const y = clientY ? ((clientY - rect.top) / this.scale) : (rect.height / 2);

    this.scale = newScale;
    this.updateTransform();

    // Update zoom controls state
    this.updateZoomControlsState();
  },

  startDrag(x, y) {
    this.isDragging = true;
    this.lastX = x;
    this.lastY = y;
  },

  drag(x, y) {
    if (!this.isDragging) return;

    const dx = (x - this.lastX) / this.scale;
    const dy = (y - this.lastY) / this.scale;

    this.lastX = x;
    this.lastY = y;

    // Update transform
    const current = new DOMMatrix(getComputedStyle(this.iframe).transform);
    this.iframe.style.transform = current.translate(dx, dy).scale(this.scale);
  },

  pinchStart(e) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    this.lastPinchDistance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    );
  },

  pinchMove(e) {
    if (!this.lastPinchDistance) return;

    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const distance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    );

    const delta = (distance - this.lastPinchDistance) * 0.01;
    this.lastPinchDistance = distance;

    // Calculate center of pinch
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;

    this.zoom(delta, centerX, centerY);
  },

  resetZoom() {
    this.scale = 1;
    this.iframe.style.transform = 'scale(1) translate(0, 0)';
    this.updateZoomControlsState();
  },

  updateTransform() {
    const matrix = new DOMMatrix(getComputedStyle(this.iframe).transform);
    this.iframe.style.transform = matrix.scale(this.scale);
  },

  updateZoomControlsState() {
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    if (zoomIn) zoomIn.disabled = this.scale >= this.maxScale;
    if (zoomOut) zoomOut.disabled = this.scale <= this.minScale;
  }
};

const resumeViewer = {
  init() {
    this.iframe = document.getElementById('resume-preview');
    if (!this.iframe) return;

    // Handle mobile devices
    if (window.innerWidth <= 768) {
      this.setupMobileView();
    }
  },

  setupMobileView() {
    // Ensure proper scaling on mobile
    this.iframe.onload = () => {
      // Force the PDF to fit to width and disable scrolling
      if (this.iframe.contentWindow) {
        this.iframe.contentWindow.scrollTo(0, 0);
      }
    };
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing...'); // Debug log
  const elements = initializeApp();
  if (!elements) return;

  // Initialize theme
  initTheme();

  // Load projects
  loadProjects().catch(error => {
    console.error('Failed to load projects:', error);
  });

  // Add event listeners
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Initialize file viewer
  fileViewer.init();

  // Initialize resume viewer
  resumeViewer.init();
});

