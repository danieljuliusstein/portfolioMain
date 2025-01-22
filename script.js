document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  // Check for saved theme in localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    body.classList.add(savedTheme);
  } else {
    body.classList.add('light-mode');  // Default to light mode
  }

  themeToggle.addEventListener('click', () => {
      body.classList.toggle('light-mode');
      body.classList.toggle('dark-mode');
      
      // Save theme preference in localStorage
      const currentTheme = body.classList.contains('light-mode') ? 'light-mode' : 'dark-mode';
      localStorage.setItem('theme', currentTheme);
  });
});
