/**
 * sidebar-hider.js
 * Версия: 4.1
 *
 * Этот скрипт отвечает только за логику скрытия сайдбара.
 * Стили загружаются отдельно через manifest.json.
 */
console.log('Oprosnik Helper: Sidebar Hider Script v4.1 Loaded.');

/**
 * Функция для создания и добавления кнопки на панель навигации.
 */
function createSidebarToggleButton() {
  // Находим левую часть навигационной панели, куда мы добавим кнопку.
  const navBar = document.querySelector('.main-header .navbar-nav');

  if (!navBar) {
    console.error('Не удалось найти панель навигации для добавления кнопки.');
    return;
  }

  // Создаем кнопку
  const toggleBtn = document.createElement('button');
  toggleBtn.innerText = 'Скрыть/Показать сайдбар';
  // Используем классы со страницы для единообразия + наш собственный класс
  toggleBtn.className = 'btn oprosnik-helper-btn'; 
  toggleBtn.type = 'button';

  // Добавляем обработчик клика, который будет вызывать нашу функцию переключения
  toggleBtn.addEventListener('click', toggleSidebarVisibility);

  // Создаем элемент списка <li>, чтобы кнопка вписалась в структуру страницы
  const navItem = document.createElement('li');
  navItem.className = 'nav-item';
  navItem.appendChild(toggleBtn);

  // Добавляем наш новый элемент в навигационную панель
  navBar.appendChild(navItem);
}

/**
 * Функция, которая переключает видимость сайдбара.
 * Она просто добавляет или убирает наш кастомный класс на теге <body>.
 */
function toggleSidebarVisibility() {
  document.body.classList.toggle('sidebar-hidden-by-extension');
  const isHidden = document.body.classList.contains('sidebar-hidden-by-extension');
  console.log(`Сайдбар теперь ${isHidden ? 'скрыт' : 'видим'}.`);
}

// --- ЗАПУСК ---
// Ждем, пока весь контент страницы загрузится, чтобы гарантированно
// найти панель навигации, и только потом вызываем функцию создания кнопки.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createSidebarToggleButton);
} else {
  // Если DOM уже готов, вызываем сразу.
  createSidebarToggleButton();
}