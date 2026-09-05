const stored = localStorage.getItem('theme')
if (stored === 'dark') {
  document.documentElement.classList.add('dark')
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark')
  localStorage.setItem('theme', isDark ? 'dark' : 'light')
}
