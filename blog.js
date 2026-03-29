// blog.js — Renders blog cards from posts.json
// Follows same pattern as projects.js / projects.json

async function loadBlogPosts() {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;

  try {
    const res = await fetch('./posts.json');
    const posts = await res.json();
    const latestPublished = (Array.isArray(posts) ? posts : [])
      .map(normalizePostForCards)
      .filter((post) => post.published)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);

    grid.innerHTML = latestPublished.map((post, i) => `
      <article
        class="blog-card ${i === 0 ? 'blog-card--featured' : ''}"
        style="--card-bg: ${post.color}; animation-delay: ${i * 0.08}s"
        data-id="${post.id}"
      >
        <div class="blog-card__inner">
          <div class="blog-card__meta">
            <span class="blog-tag">${post.category}</span>
            <span class="blog-tag blog-tag--secondary">${post.tag}</span>
          </div>
          <h3 class="blog-card__title">${post.title}</h3>
          ${(i === 0 || i === 3) ? `<p class="blog-card__excerpt">${post.excerpt}</p>` : ''}
          <div class="blog-card__footer">
            <time class="blog-date">${formatDate(post.date)}</time>
            <span class="blog-read-time">${post.readTime} read</span>
          </div>
        </div>
      </article>
    `).join('');

    if (!latestPublished.length) {
      grid.innerHTML = '<p class="loading-text">No published blog posts yet.</p>';
    }

    // Animate in on scroll
    observeBlogCards();

    // Route to post pages
    grid.querySelectorAll('.blog-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (!id) return;
        if (typeof window.navigateToBlog === 'function') {
          window.navigateToBlog(id);
        } else {
          window.location.hash = `/blog/${encodeURIComponent(id)}`;
        }
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Open blog post: ${card.querySelector('.blog-card__title')?.textContent || id}`);
    });
  } catch (err) {
    console.error('Failed to load blog posts:', err);
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function observeBlogCards() {
  const cards = document.querySelectorAll('.blog-card');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('blog-card--visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  cards.forEach((c) => io.observe(c));
}

document.addEventListener('DOMContentLoaded', loadBlogPosts);

function normalizePostForCards(post) {
  return {
    ...post,
    id: String(post.id || ''),
    title: post.title || 'Untitled Post',
    category: post.category || 'Blog',
    tag: post.tag || '',
    date: post.date || new Date().toISOString().slice(0, 10),
    readTime: post.readTime || '5 min',
    excerpt: post.excerpt || '',
    color: post.color || '#0f172a',
    published: typeof post.published === 'boolean' ? post.published : true
  };
}
