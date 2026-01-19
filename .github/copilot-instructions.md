# Portfolio Site - AI Coding Agent Instructions

## Project Overview
Single-page portfolio for Daniel Stein (Computer Engineer). **Zero build tools** - pure vanilla JS/HTML/CSS. Core features: accessibility-first design, dark mode with `data-theme` attribute, polka dot pattern system via CSS `::before` pseudo-elements.

## Architecture

### Core Files
- **index.html** (257 lines): Semantic HTML5, ARIA labels, FormSubmit.co integration, resume iframe
- **main.js** (1099 lines): Modular vanilla JS with 10 initialization functions called in strict order
- **styles.css** (1694 lines): CSS custom properties for theming, polka dot backgrounds, scrollbar customization
- **projects.json**: Data source for dynamic project cards (title, description, tags, thumbnail, repoUrl)
- **service-worker.js** (91 lines): Offline caching strategy for static assets

### Initialization Flow (Critical Order)
```javascript
// DOMContentLoaded → initializeApp() → returns validated elements object
initTheme();              // localStorage → system preference → set [data-theme]
loadProjects();           // Fetch JSON → filter → renderProjects() → DOM injection
initContactForm();        // FormSubmit validation + async submission
initScrollAnimations();   // Intersection Observer for fade-ins
initBackToTop();          // Scroll-triggered button with debounce
initKonamiCode();         // Easter egg for animated polka dots
registerServiceWorker();  // Only if NOT file:// protocol
```
Global state: `window.activeTag`, `window.searchQuery` trigger re-renders via `renderProjects()`

## Critical Patterns

### Theme System (NEVER use classList)
```javascript
// ✅ CORRECT - Uses setAttribute
document.documentElement.setAttribute('data-theme', 'dark');
localStorage.setItem('theme', 'dark');

// ❌ WRONG - Don't use classList for theme
document.documentElement.classList.add('dark-theme');
```
- Theme persists via localStorage, respects `prefers-color-scheme` on first visit
- All colors reference CSS variables: `var(--color-accent)`, `var(--color-text-muted)`
- Theme toggle button uses `aria-pressed` attribute and emoji via `::before { content: '🌞'; }`

### Polka Dot Background System
**Every major section** (header, hero, footer, modal, contact) uses this `::before` pattern:
```css
.section-name::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--dot-color) var(--dot-size), transparent var(--dot-size));
  background-size: var(--dot-space) var(--dot-space);
  opacity: var(--dot-opacity);
  z-index: -1;           /* MUST be -1 to stay behind content */
  pointer-events: none;  /* Allow clicks to pass through */
}
```
**Variables:** `--dot-size: 1.45px`, `--dot-space: 29px`, `--dot-opacity: 0.50`  
**DO NOT** remove `::before` when editing sections - parent must have `position: relative`

### Modal Pattern (hidden attribute, NOT display:none)
```javascript
// Opening modal
modal.hidden = false;
lastActiveElement = document.activeElement; // Save focus
modalCloseBtn.focus();

// Closing modal
modal.hidden = true;
lastActiveElement?.focus(); // Restore focus
```
**CRITICAL CSS:** `.modal[hidden] { display: none !important; }` must exist or modal won't hide properly. Escape key listener in global keydown handler.

### Security: ALWAYS Escape User Data
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;  // Browser's built-in XSS protection
  return div.innerHTML;
}
```
Used in: `createProjectCard()` for titles, descriptions, tags from `projects.json`

## JavaScript Conventions

### Code Structure
Functions organized with comment headers: `// ====================== \n // Section Name \n // ======================`  
Order: **State** → **Theme** → **Data** → **Rendering** → **Modal** → **Events** → **Init**

### Error Handling Pattern
```javascript
async function loadProjects() {
  try {
    const response = await fetch('projects.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    allProjects = await response.json();
    renderProjects();
  } catch (error) {
    console.error('Failed to load projects:', error);
    // Show fallback UI with retry button
    grid.innerHTML = '<p class="error-text">Failed to load projects. <button onclick="loadProjects()">Try Again</button></p>';
  }
}
```
**Never** just log errors - always provide user-facing feedback

### DOM Access Pattern
```javascript
function initFeature() {
  const element = document.getElementById('my-element');
  if (!element) return; // Early return if missing
  // ... rest of code
}
```
Query once, validate, early return if null

### Service Worker Registration
```javascript
// Only registers if NOT file:// protocol
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  navigator.serviceWorker.register('/service-worker.js');
}
```
Service worker caches: `index.html`, `styles.css`, `main.js`, `projects.json`, `DJSResume.pdf`

## CSS Conventions

### Custom Property System
- **Spacing**: `var(--spacing-xs|sm|md|lg|xl)` - never hardcode rem values
- **Colors**: `var(--color-accent)`, `var(--color-text-muted)` - defined in `:root` and `[data-theme="dark"]`
- **Transitions**: `var(--transition)` (0.2s) or `var(--theme-transition-duration)` (0.5s)
- Dark mode: Override variables only in `[data-theme="dark"]` block

### Z-index Layers (strict hierarchy)
```css
-1:   Polka dots (::before backgrounds)
0-1:  Regular content
50:   Sticky header
100:  Modal overlay
101:  Modal content
200:  Toast notifications
```

### Animation Respect for Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  .animate-on-scroll {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```
**Always** check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before animations

## Common Development Workflows

### Testing Locally
```bash
# Option 1: Python simple server
python3 -m http.server 8000

# Option 2: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```
**Important:** Service worker only registers when NOT using `file://` protocol

### Adding New Project
Edit `projects.json` - all fields required except `demoUrl`:
```json
{
  "title": "Project Name",
  "description": "Short description (shown on card)",
  "longDescription": "Full description (shown in modal)",
  "tags": ["Tag1", "Tag2"],
  "thumbnail": "images/thumb.png",
  "thumbnailAlt": "Alt text for thumbnail",
  "image": "images/full.png",
  "imageAlt": "Alt text for full image",
  "repoUrl": "https://github.com/...",
  "demoUrl": ""  // Optional - Live Demo button appears if set
}
```

### Modifying Theme Colors
1. Update `:root` variables (lines 1-40) for light mode
2. Update `[data-theme="dark"]` (lines 42-60) for dark mode
3. Test toggle: All elements should transition smoothly over 0.5s

### Adding New Section with Polka Dots
```html
<!-- HTML: Parent needs position: relative -->
<section class="new-section">
  <div class="container">
    <!-- Content here -->
  </div>
</section>
```
```css
/* CSS: Add ::before for polka dots */
.new-section {
  position: relative;
  padding: var(--spacing-xl) 0;
}

.new-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    var(--dot-color) var(--dot-size),
    transparent var(--dot-size)
  );
  background-size: var(--dot-space) var(--dot-space);
  opacity: var(--dot-opacity);
  z-index: -1;
  pointer-events: none;
}
```

## Debugging Checklist
- [ ] **Init validation fails?** Check `initializeApp()` - returns validated elements object or logs missing DOM IDs
- [ ] **Modal stuck visible?** Verify `.modal[hidden] { display: none !important; }` exists in CSS (line ~1023)
- [ ] **Theme not switching?** Inspect `<html data-theme="...">` attribute (not classList)
- [ ] **Projects not loading?** Console errors for fetch? JSON syntax valid? Check `loadProjects()` try/catch
- [ ] **Polka dots missing?** Parent has `position: relative`? `::before` has `z-index: -1`?
- [ ] **Form not submitting?** Check FormSubmit.co action URL includes email: `dstein35@gatech.edu`
- [ ] **Service worker not caching?** Must use HTTP server (not `file://`). Check: `navigator.serviceWorker.controller`

## File Dependencies & Known Issues
- **icons.svg**: INCOMPLETE - SVG sprite referenced in HTML but not implemented; uses emoji fallback (🌞/🌙)
- **DJSResume.pdf**: Resume file loaded in `<iframe>` on resume section
- **images/**: Project thumbnails and full-size images referenced in `projects.json`
- **No build process**: Direct file editing, no npm/webpack/bundler - refresh browser to see changes

## Contact Configuration
- Email in `index.html` form action (line ~134): `https://formsubmit.co/dstein35@gatech.edu`
- Email in `main.js` copyEmail function (search for "copyEmail"): `dstein35@gatech.edu`
