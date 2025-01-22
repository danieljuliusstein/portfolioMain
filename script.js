document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const burgerIcon = document.getElementById('burger-icon');
  const body = document.body;
  const headerActions = document.querySelector('.header-actions');
  const dropdownMenu = document.getElementById('dropdown-menu');

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

  // Toggle dropdown menu on burger icon click
  burgerIcon.addEventListener('click', () => {
    headerActions.classList.toggle('open');
    dropdownMenu.classList.toggle('show');
  });
});
