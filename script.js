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
});
