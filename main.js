// ======================
// State Management
// ======================
let allProjects = [];
// ======================
// Edit Auth (URL Passphrase)
// ======================
let _editAuthorized = null; // null = not yet checked, true/false after check

async function checkEditAuth() {
  if (_editAuthorized !== null) return _editAuthorized;
  const params = new URLSearchParams(window.location.search);
  const phrase = params.get('edit');
  if (!phrase) {
    _editAuthorized = false;
    return false;
  }
  try {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(phrase)
    );
    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    // Hash for passphrase: founder-mode-2026
    _editAuthorized = (hash === '80785bac4945d316041a015be7d1a09d1d4c4a8c41960cfba19f24975ebc5f76');
  } catch {
    _editAuthorized = false;
  }
  // Strip the param from the URL bar immediately so it isn't visible
  if (_editAuthorized) {
    history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
  return _editAuthorized;
}

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

  // Filter projects (search only, if searchQuery is used)
  const filtered = allProjects.filter(project => {
    const matchesSearch = !window.searchQuery ||
      project.title.toLowerCase().includes(window.searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(window.searchQuery.toLowerCase());
    return matchesSearch;
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

  // Add event listeners to new cards — navigate to project page
  grid.querySelectorAll('.view-details').forEach((btn, index) => {
    btn.addEventListener('click', () => navigateToProject(filtered[index]));
  });

  // Initialize STL viewers after project cards are rendered
  initSTLViewers();
}

function createProjectCard(project) {
  console.log('[createProjectCard] ', project.title, 'stlUrl=', project.stlUrl);

  const hasSTL = project.stlUrl && project.stlUrl.trim() !== '';
  const thumbnailHTML = hasSTL
    ? `<div class="project-thumbnail stl-viewer-card" data-stl="${project.stlUrl}" style="height:200px; background:#0d1117; display:flex; align-items:center; justify-content:center;">
        <canvas class="stl-canvas" style="width:100%; height:100%; display:block;"></canvas>
       </div>`
    : `<img src="${project.thumbnail}" alt="${project.thumbnailAlt || 'Project screenshot'}" class="project-thumbnail" loading="lazy">`;

  const card = `
    <article class="project-card">
      ${thumbnailHTML}
      <div class="project-body">
        ${project.discoveryProject ? '<span class="project-badge discovery-badge">Discovery Project</span>' : ''}
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
  return card;
}

function initSTLCanvas(canvas, stlUrl) {
  if (!window.THREE || !canvas || !stlUrl) return;

  // Use the parent container's dimensions for reliable sizing
  const container = canvas.parentElement;
  const W = () => container ? container.clientWidth || 400 : 400;
  const H = () => container ? container.clientHeight || 200 : 200;

  // Set canvas pixel size explicitly before creating renderer
  canvas.width = W();
  canvas.height = H();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H(), false); // false = don't set CSS size (we do it via CSS)
  renderer.setClearColor(0x0d1117, 1);

  // Handle resize
  const ro = new ResizeObserver(() => {
    const w = W(), h = H();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  if (container) ro.observe(container);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.1, 2000);
  camera.position.set(0, 15, 90);
  camera.lookAt(0, -8, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(60, 80, 60);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x3b82f6, 0.35);
  fill.position.set(-60, -20, -40);
  scene.add(fill);

  const pivot = new THREE.Group();
  scene.add(pivot);
  let rotY = 0;
  let rotX = 0.3;

  fetch(stlUrl)
    .then(r => {
      if (!r.ok) throw new Error(`STL fetch failed: ${r.status}`);
      return r.arrayBuffer();
    })
    .then(buf => {
      const view = new DataView(buf);
      const numTri = view.getUint32(80, true);
      const pos = [];
      const nor = [];
      let off = 84;

      for (let i = 0; i < numTri; i++) {
        const nx = view.getFloat32(off, true);
        const ny = view.getFloat32(off + 4, true);
        const nz = view.getFloat32(off + 8, true);
        off += 12;

        for (let v = 0; v < 3; v++) {
          pos.push(view.getFloat32(off, true), view.getFloat32(off + 4, true), view.getFloat32(off + 8, true));
          nor.push(nx, ny, nz);
          off += 12;
        }

        off += 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
      geo.computeBoundingBox();

      const b = geo.boundingBox;
      geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.35 })
      );
      mesh.rotation.x = -Math.PI / 2;
      pivot.add(mesh);
      pivot.position.y = 8;
    })
    .catch(error => {
      console.error('STL load error:', error);
    });

  // Drag to rotate
  let dragging = false;
  let lastX = 0;

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    lastX = e.clientX;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  });

  function animate() {
    requestAnimationFrame(animate);
    rotY += 0.006;
    pivot.rotation.set(rotX, rotY, 0);
    renderer.render(scene, camera);
  }

  animate();
}

function initSTLViewers() {
  if (!window.THREE) {
    console.warn('Three.js not loaded — STL viewer cannot initialize');
    return;
  }
  // Wait two frames so the grid has painted and clientWidth is real
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.stl-viewer-card').forEach(card => {
        const canvas = card.querySelector('.stl-canvas');
        const stlUrl = card.dataset.stl;
        if (canvas && stlUrl) {
          initSTLCanvas(canvas, stlUrl);
        }
      });
    });
  });
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
  
  const modalContent = project.sections && project.sections.length > 0
    ? project.sections.map(s => `
        <div class="modal-section">
          <h3 class="modal-section-heading">${escapeHtml(s.heading)}</h3>
          <p class="modal-section-content">${escapeHtml(s.content)}</p>
        </div>
      `).join('')
    : `<p class="modal-description">${escapeHtml(project.longDescription)}</p>`;

  const visualContent = project.stlUrl && project.stlUrl.trim() !== ''
    ? `<div class="modal-stl-viewer" style="width:100%; height:400px; background:#0d1117; display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
         <canvas class="modal-stl-canvas" style="width:100%; height:100%; display:block;"></canvas>
       </div>`
    : project.image
      ? `<img
          src="${project.image}"
          alt="${project.imageAlt || 'Project detail view'}"
          class="modal-image"
          loading="lazy"
        >`
      : '';

  modalBody.innerHTML = `
    ${visualContent}
    <h2 class="modal-title" id="modal-title">${escapeHtml(project.title)}</h2>
    ${modalContent}
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

  if (project.stlUrl && project.stlUrl.trim() !== '') {
    const modalCanvas = document.querySelector('.modal-stl-canvas');
    initSTLCanvas(modalCanvas, project.stlUrl);
  }

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

function handleModalKeydown(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
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

  // Initialize career goals phase tabs
  initCareerGoalsPhaseTabs();

  // Initialize featured projects - COMMENTED OUT (uncomment when you have more projects)
  // loadFeaturedProjects();

  // Initialize contact form
  initContactForm();

  // Register service worker for offline capability
  registerServiceWorker();

  // Load projects then check for deep link
  loadProjects().then(() => {
    router();
  }).catch(error => {
    console.error('Failed to load projects:', error);
  });

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
  const sections = document.querySelectorAll('.hero, .about-section, .career-goals-section, .projects-section, .resume-section, .testimonials-section, .contact-section');
  
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
// Career Goals Phase Tabs
// ======================
function initCareerGoalsPhaseTabs() {
  const tabs = document.querySelectorAll('.phase-tab');
  const items = document.querySelectorAll('.tl-item[data-phase]');

  if (!tabs.length || !items.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      items.forEach((item) => {
        if (filter === 'all' || item.dataset.phase === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
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
// Typing Animation — type once, cursor fades
// ======================
function initTypingAnimation() {
  const typingElement = document.getElementById('typing-text');
  const subtitleElement = document.querySelector('.hero-subtitle');
  if (!typingElement || !subtitleElement) return;

  // Single phrase — your professional identity, front and center
  const finalText = 'I build things. Sometimes they work.';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    typingElement.textContent = finalText;
    subtitleElement.classList.add('typing-complete');
    return;
  }

  let charIndex = 0;
  const typeSpeed = 45; // slightly slower = feels more deliberate

  function type() {
    if (charIndex < finalText.length) {
      typingElement.textContent = finalText.substring(0, charIndex + 1);
      charIndex++;
      setTimeout(type, typeSpeed);
    } else {
      // Done typing — mark complete (cursor solid for a moment)
      subtitleElement.classList.add('typing-complete');

      // After 1.5s, fade the cursor out entirely
      setTimeout(() => {
        subtitleElement.classList.add('cursor-done');
      }, 1500);
    }
  }

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

  // Check if device has a mouse (not touch-only)
  const hasMouse = window.matchMedia('(pointer: fine)').matches;
  
  // Hide toggle button on touch devices
  if (!hasMouse) {
    toggleBtn.style.display = 'none';
    return;
  }

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
  career      - View career goals<br>
  goals       - View career goals<br>
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
      document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' });
      return 'Navigating to about section...';
    },
    career: () => {
      document.querySelector('#career-goals')?.scrollIntoView({ behavior: 'smooth' });
      return 'Navigating to career goals...';
    },
    goals: () => {
      document.querySelector('#career-goals')?.scrollIntoView({ behavior: 'smooth' });
      return 'Navigating to career goals...';
    },
    projects: () => {
      document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' });
      return 'Navigating to projects section...';
    },
    skills: () => {
      return `Technical Skills:<br>
  • Programming: Python, JavaScript, Java, C/C++<br>
  • Machine Learning & Data Analysis<br>
  • Web Development (HTML, CSS, JavaScript)<br>`;
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
      return ` copied: ${email}`;
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

// ======================
// Client-Side Router
// ======================
// Always look up at call time so the DOM is ready
function getMainContent() {
  return document.getElementById('main-content');
}

function router() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/project\/(.+)$/);
  if (match) {
    const projectId = decodeURIComponent(match[1]);
    const project = allProjects.find(p => p.id === projectId);
    if (project) {
      renderProjectPage(project);
      return;
    }
  }
  // Default — show normal homepage
  showHomePage();
}

function navigateToProject(project) {
  window.location.hash = `/project/${encodeURIComponent(project.id)}`;
}

function showHomePage() {
  const page = document.getElementById('project-page');
  if (page) page.remove();
  const mc = getMainContent();
  if (mc) mc.style.display = '';
  document.title = 'Portfolio - Daniel Stein';
  window.scrollTo(0, 0);
}

function renderProjectPage(project) {
  // Hide main content, show project page
  const mc = getMainContent();
  if (mc) mc.style.display = 'none';

  // Remove existing project page if any
  const existing = document.getElementById('project-page');
  if (existing) existing.remove();

  const stlViewer = project.stlUrl
    ? `<div class="pp-stl-container">
        <canvas class="pp-stl-canvas"></canvas>
        <p class="pp-stl-hint">Drag to rotate</p>
       </div>`
    : project.image
      ? `<img src="${project.image}" alt="${escapeHtml(project.imageAlt || project.title)}" class="pp-hero-image">`
      : '';

  const sectionsHtml = renderBlocks(project);

  const tags = (project.tags || []).map(t =>
    `<span class="project-tag">${escapeHtml(t)}</span>`
  ).join('');

  const actions = [
    project.demoUrl ? `<a href="${project.demoUrl}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Live Demo</a>` : '',
    project.repoUrl ? `<a href="${project.repoUrl}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">View Code</a>` : ''
  ].filter(Boolean).join('');

  const page = document.createElement('div');
  page.id = 'project-page';
  page.innerHTML = `
    <div class="pp-back-bar">
      <div class="container">
        <button class="pp-back-btn" id="pp-back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" width="16" height="16"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Projects
        </button>
      </div>
    </div>

    <div class="pp-hero">
      <div class="container pp-hero-inner">
        <div class="pp-hero-text">
          ${project.discoveryProject ? '<span class="project-badge discovery-badge">Discovery Project</span>' : ''}
          <h1 class="pp-title">${escapeHtml(project.title)}</h1>
          <p class="pp-description">${escapeHtml(project.description)}</p>
          <div class="pp-tags">${tags}</div>
          ${actions ? `<div class="pp-actions">${actions}</div>` : ''}
        </div>
        <div class="pp-hero-visual">
          ${stlViewer}
        </div>
      </div>
    </div>

    <div class="pp-body">
      <div class="container pp-sections">
        <div class="pp-block-area" id="pp-block-area">
          ${sectionsHtml}
        </div>
      </div>
    </div>
  `;

  document.body.insertBefore(page, document.getElementById('project-modal'));
  // Check auth and conditionally render Edit button
  checkEditAuth().then((authorized) => {
    if (!authorized) return;

    // Find or create the edit button in the pp-hero-text area
    const heroText = page.querySelector('.pp-hero-text');
    if (!heroText) return;

    const editBtn = document.createElement('button');
    editBtn.id = 'pp-edit-btn';
    editBtn.className = 'btn btn-outline pp-edit-btn';
    editBtn.textContent = '✏ Edit';
    editBtn._editHandler = () => switchProjectPageToEditMode(project);
    editBtn.addEventListener('click', editBtn._editHandler);

    // Insert after pp-actions div if it exists, otherwise append to heroText
    const actionsDiv = heroText.querySelector('.pp-actions');
    if (actionsDiv) {
      actionsDiv.after(editBtn);
    } else {
      heroText.appendChild(editBtn);
    }
  });

  document.title = `${project.title} — Daniel Stein`;
  window.scrollTo(0, 0);

  // Back button
  document.getElementById('pp-back-btn').addEventListener('click', () => {
    history.back();
  });

  // Init STL if needed
  if (project.stlUrl) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = page.querySelector('.pp-stl-canvas');
        if (canvas && window.THREE) initSTLCanvas(canvas, project.stlUrl);
      });
    });
  }
}

// ======================
// Block Editor
// ======================
function renderBlocks(project) {
  const blocks = project.blocks && project.blocks.length > 0
    ? project.blocks
    : [{
      id: 'b0',
      type: 'text-only',
      title: '',
      text: project.description || '',
      img: null
    }];

  return `<div class="blocks-container">
    ${blocks.map((block) => renderBlockView(block)).join('')}
  </div>`;
}

function renderBlockView(block) {
  const imgHtml = block.img
    ? `<img src="${block.img}" alt="${escapeHtml(block.title || 'Block image')}" style="width:100%;border-radius:var(--border-radius);display:block;">`
    : `<div class="block-img-placeholder">No image</div>`;

  const textHtml = `
    ${block.title ? `<h3 class="block-view-title">${escapeHtml(block.title)}</h3>` : ''}
    <p class="block-view-text">${escapeHtml(block.text || '')}</p>
  `;

  switch (block.type) {
    case 'img-text-left':
      return `<div class="block-layout img-left">
        <div class="block-img">${imgHtml}</div>
        <div class="block-text">${textHtml}</div>
      </div>`;
    case 'img-text-right':
      return `<div class="block-layout img-right">
        <div class="block-img">${imgHtml}</div>
        <div class="block-text">${textHtml}</div>
      </div>`;
    case 'full-img':
      return `<div class="block-full-img">${imgHtml}</div>`;
    case 'text-only':
    default:
      return `<div class="block-text-only">${textHtml}</div>`;
  }
}

function renderBlockEditor(project, container) {
  // Work on a deep copy so Cancel can restore original
  const workingBlocks = JSON.parse(JSON.stringify(
    project.blocks && project.blocks.length > 0
      ? project.blocks
      : [{ id: 'b0', type: 'text-only', title: '', text: project.description || '', img: null }]
  ));

  function generateId() {
    return 'b' + Date.now() + Math.random().toString(36).slice(2, 6);
  }

  function addBlock(type) {
    workingBlocks.push({ id: generateId(), type, title: '', text: '', img: null });
    redraw();
  }

  function removeBlock(id) {
    const idx = workingBlocks.findIndex((b) => b.id === id);
    if (idx !== -1) workingBlocks.splice(idx, 1);
    redraw();
  }

  function duplicateBlock(id) {
    const idx = workingBlocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const copy = JSON.parse(JSON.stringify(workingBlocks[idx]));
    copy.id = generateId();
    workingBlocks.splice(idx + 1, 0, copy);
    redraw();
  }

  function setBlockType(id, type) {
    const block = workingBlocks.find((b) => b.id === id);
    if (block) block.type = type;
    redraw();
  }

  function redraw() {
    renderEditorUI();
    attachEditorEvents();
  }

  // ---- Drag state ----
  let dragSrcId = null;

  function renderEditorUI() {
    container.innerHTML = `
      <div class="editor-toolbar">
        <span class="editor-toolbar-label">Add block:</span>
        <button class="tb-btn" data-add="img-text-left">+ Image + Text</button>
        <button class="tb-btn" data-add="text-only">+ Text Only</button>
        <button class="tb-btn" data-add="full-img">+ Full-width Image</button>
      </div>
      <div class="block-editor" id="block-editor-list">
        ${workingBlocks.map((block) => renderBlockEditorCard(block)).join('')}
      </div>
      <div class="editor-save-bar">
        <button class="btn btn-primary" id="editor-save-btn">Save</button>
        <button class="btn btn-outline" id="editor-cancel-btn">Cancel</button>
      </div>
    `;
  }

  function renderBlockEditorCard(block) {
    const isImgType = block.type === 'img-text-left' || block.type === 'img-text-right';
    const isFullImg = block.type === 'full-img';

    const layoutToggle = isImgType ? `
      <div class="layout-toggle">
        <button class="lt-btn ${block.type === 'img-text-left' ? 'active' : ''}" data-layout="img-text-left" data-block-id="${block.id}">Img left</button>
        <button class="lt-btn ${block.type === 'img-text-right' ? 'active' : ''}" data-layout="img-text-right" data-block-id="${block.id}">Img right</button>
      </div>` : '';

    const typeLabel = {
      'img-text-left': 'Image + Text',
      'img-text-right': 'Image + Text',
      'full-img': 'Full-width Image',
      'text-only': 'Text Only'
    }[block.type] || 'Block';

    const imgSlot = (isImgType || isFullImg) ? `
      <div class="img-upload-slot ${block.img ? 'has-img' : ''}" data-block-id="${block.id}" data-upload-slot>
        ${block.img
          ? `<img src="${block.img}" alt="Block image" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:6px;">
             <div class="img-change-overlay"><span>Change image</span></div>`
          : `<div class="slot-label">Click to upload</div>`
        }
        <input type="file" accept="image/*" style="display:none;" data-file-input="${block.id}">
      </div>` : '';

    const textFields = block.type !== 'full-img' ? `
      <div contenteditable="true" class="block-title-edit" data-field="title" data-block-id="${block.id}" data-placeholder="Block title (optional)">${escapeHtml(block.title || '')}</div>
      <div contenteditable="true" class="block-text-edit" data-field="text" data-block-id="${block.id}" data-placeholder="Add text...">${escapeHtml(block.text || '')}</div>
    ` : '';

    const bodyContent = isImgType
      ? `<div class="editor-block-two-col ${block.type === 'img-text-right' ? 'img-right' : 'img-left'}">${imgSlot}<div class="editor-block-text-col">${textFields}</div></div>`
      : `${imgSlot}${textFields}`;

    return `
      <div class="editor-block" draggable="true" data-block-id="${block.id}">
        <div class="editor-block-header">
          <span class="block-drag-handle" aria-label="Drag to reorder">⠿</span>
          <span class="block-type-label">${typeLabel}</span>
          ${layoutToggle}
          <div class="block-actions">
            <button class="ba-btn" data-dup="${block.id}">Duplicate</button>
            <button class="ba-btn btn-remove" data-remove="${block.id}">Remove</button>
          </div>
        </div>
        <div class="editor-block-body">
          ${bodyContent}
        </div>
      </div>
    `;
  }

  function attachEditorEvents() {
    // --- Toolbar: add block ---
    container.querySelectorAll('.tb-btn[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => addBlock(btn.dataset.add));
    });

    // --- Layout toggle ---
    container.querySelectorAll('.lt-btn[data-layout]').forEach((btn) => {
      btn.addEventListener('click', () => setBlockType(btn.dataset.blockId, btn.dataset.layout));
    });

    // --- Remove / Duplicate ---
    container.querySelectorAll('.ba-btn[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => removeBlock(btn.dataset.remove));
    });
    container.querySelectorAll('.ba-btn[data-dup]').forEach((btn) => {
      btn.addEventListener('click', () => duplicateBlock(btn.dataset.dup));
    });

    // --- Image upload ---
    container.querySelectorAll('[data-upload-slot]').forEach((slot) => {
      const blockId = slot.dataset.blockId;
      const fileInput = slot.querySelector(`[data-file-input="${blockId}"]`);
      slot.addEventListener('click', () => fileInput && fileInput.click());
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const block = workingBlocks.find((b) => b.id === blockId);
            if (block) {
              block.img = ev.target.result;
              redraw();
            }
          };
          reader.readAsDataURL(file);
        });
      }
    });

    // --- Contenteditable sync ---
    container.querySelectorAll('[contenteditable][data-field]').forEach((el) => {
      const field = el.dataset.field;
      const blockId = el.dataset.blockId;
      el.addEventListener('input', () => {
        const block = workingBlocks.find((b) => b.id === blockId);
        if (block) block[field] = el.innerText;
      });
    });

    // --- Drag and Drop ---
    container.querySelectorAll('.editor-block[draggable]').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragSrcId = card.dataset.blockId;
        setTimeout(() => card.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        // Safari requires setData for drag to properly initiate.
        e.dataTransfer.setData('text/plain', dragSrcId);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        container.querySelectorAll('.editor-block').forEach((c) => c.classList.remove('drag-over'));
        dragSrcId = null;
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragSrcId && dragSrcId !== card.dataset.blockId) {
          card.classList.add('drag-over');
        }
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (!dragSrcId || dragSrcId === card.dataset.blockId) return;
        const fromIdx = workingBlocks.findIndex((b) => b.id === dragSrcId);
        const toIdx = workingBlocks.findIndex((b) => b.id === card.dataset.blockId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = workingBlocks.splice(fromIdx, 1);
        const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
        workingBlocks.splice(insertIdx, 0, moved);
        redraw();
      });
    });

    // --- Save ---
    const saveBtn = container.querySelector('#editor-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        // Flush any active contenteditable that hasn't fired 'input' yet
        container.querySelectorAll('[contenteditable][data-field]').forEach((el) => {
          const block = workingBlocks.find((b) => b.id === el.dataset.blockId);
          if (block) block[el.dataset.field] = el.innerText;
        });

        // Write back to the in-memory project
        project.blocks = JSON.parse(JSON.stringify(workingBlocks));

        // Also update in allProjects array
        const idx = allProjects.findIndex((p) => p.id === project.id);
        if (idx !== -1) allProjects[idx].blocks = project.blocks;

        // Generate export JSON
        const exportJson = JSON.stringify(allProjects, null, 2);
        console.log('[Block Editor] Updated projects.json:', exportJson);

        // Show JSON export overlay
        showJsonExportOverlay(container, exportJson, project);
      });
    }

    // --- Cancel ---
    const cancelBtn = container.querySelector('#editor-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        switchProjectPageToViewMode(project);
      });
    }
  }

  // Initial render
  renderEditorUI();
  attachEditorEvents();
}

function showJsonExportOverlay(container, json, project) {
  // Remove any existing overlay
  const existing = container.querySelector('.json-export-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'json-export-overlay';
  overlay.innerHTML = `
    <p>✓ Saved! Copy the JSON below and paste it into <code>projects.json</code> to persist your changes:</p>
    <textarea class="json-export-textarea" readonly></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn btn-primary json-copy-btn">Copy JSON</button>
      <button class="btn btn-outline json-close-overlay-btn">Close</button>
    </div>
  `;
  container.querySelector('.editor-save-bar')?.after(overlay);
  const jsonTextarea = overlay.querySelector('.json-export-textarea');
  if (jsonTextarea) {
    jsonTextarea.value = json;
  }

  overlay.querySelector('.json-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(json)
      .then(() => showToast('JSON copied to clipboard!'))
      .catch(() => showToast('Copy failed — select the textarea and copy manually'));
  });
  overlay.querySelector('.json-close-overlay-btn').addEventListener('click', () => {
    overlay.remove();
    switchProjectPageToViewMode(project);
  });

  overlay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function switchProjectPageToViewMode(project) {
  const sectionsContainer = document.querySelector('.pp-block-area');
  if (!sectionsContainer) return;
  sectionsContainer.innerHTML = renderBlocks(project);

  const editBtn = document.getElementById('pp-edit-btn');
  if (editBtn) editBtn.textContent = '✏ Edit';

  if (editBtn?._editHandler) {
    editBtn.removeEventListener('click', editBtn._editHandler);
  }
  editBtn._editHandler = () => switchProjectPageToEditMode(project);
  editBtn?.addEventListener('click', editBtn._editHandler);
}

function switchProjectPageToEditMode(project) {
  const sectionsContainer = document.querySelector('.pp-block-area');
  if (!sectionsContainer) return;
  renderBlockEditor(project, sectionsContainer);

  const editBtn = document.getElementById('pp-edit-btn');
  if (editBtn) editBtn.textContent = 'Editing…';
}

// Wire up hash routing
window.addEventListener('hashchange', router);