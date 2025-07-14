/**
 * sidebar-delay.js
 * Версия: 5.0
 *
 * Этот скрипт добавляет задержку на появление сайдбара при наведении мышки.
 * Это предотвращает случайное "цепляние" сайдбара курсором.
 */
console.log('Oprosnik Helper: Sidebar Delay Script v5.0 Loaded.');

// Настройки задержек (в миллисекундах)
const SHOW_DELAY = 800; // Задержка перед показом сайдбара
const HIDE_DELAY = 300; // Задержка перед скрытием сайдбара

let showTimeout = null;
let hideTimeout = null;
let isDelayActive = false;

/**
 * Функция для создания и добавления кнопки включения/выключения задержки
 */
function createDelayToggleButton() {
  const navBar = document.querySelector('.main-header .navbar-nav');

  if (!navBar) {
    console.error('Не удалось найти панель навигации для добавления кнопки.');
    return;
  }

  // Создаем кнопку
  const toggleBtn = document.createElement('button');
  toggleBtn.innerText = 'Задержка сайдбара: ВЫКЛ';
  toggleBtn.className = 'btn oprosnik-helper-btn';
  toggleBtn.type = 'button';

  // Обработчик клика для включения/выключения задержки
  toggleBtn.addEventListener('click', () => {
    isDelayActive = !isDelayActive;
    toggleBtn.innerText = `Задержка сайдбара: ${isDelayActive ? 'ВКЛ' : 'ВЫКЛ'}`;
    
    if (isDelayActive) {
      activateSidebarDelay();
      console.log('Задержка сайдбара активирована');
    } else {
      deactivateSidebarDelay();
      console.log('Задержка сайдбара деактивирована');
    }
  });

  // Создаем элемент списка для кнопки
  const navItem = document.createElement('li');
  navItem.className = 'nav-item';
  navItem.appendChild(toggleBtn);

  navBar.appendChild(navItem);
}

/**
 * Активирует задержку на сайдбаре
 */
function activateSidebarDelay() {
  // Находим сайдбар
  const sidebar = document.querySelector('.main-sidebar, .control-sidebar, aside.main-sidebar');
  
  if (!sidebar) {
    console.error('Сайдбар не найден');
    return;
  }

  // Добавляем класс для стилизации
  document.body.classList.add('sidebar-delay-active');

  // Обработчик наведения на сайдбар
  sidebar.addEventListener('mouseenter', handleSidebarMouseEnter);
  sidebar.addEventListener('mouseleave', handleSidebarMouseLeave);

  // Также отслеживаем область рядом с сайдбаром для более плавной работы
  const triggerZone = createTriggerZone();
  if (triggerZone) {
    triggerZone.addEventListener('mouseenter', handleTriggerZoneEnter);
    triggerZone.addEventListener('mouseleave', handleTriggerZoneLeave);
  }
}

/**
 * Деактивирует задержку на сайдбаре
 */
function deactivateSidebarDelay() {
  const sidebar = document.querySelector('.main-sidebar, .control-sidebar, aside.main-sidebar');
  
  if (sidebar) {
    sidebar.removeEventListener('mouseenter', handleSidebarMouseEnter);
    sidebar.removeEventListener('mouseleave', handleSidebarMouseLeave);
  }

  // Удаляем триггер-зону
  const existingZone = document.querySelector('.sidebar-trigger-zone');
  if (existingZone) {
    existingZone.remove();
  }

  // Очищаем таймауты
  clearTimeout(showTimeout);
  clearTimeout(hideTimeout);

  // Убираем классы
  document.body.classList.remove('sidebar-delay-active');
  document.body.classList.remove('sidebar-delayed-show');
}

/**
 * Создает невидимую зону для триггера появления сайдбара
 */
function createTriggerZone() {
  // Удаляем существующую зону, если есть
  const existingZone = document.querySelector('.sidebar-trigger-zone');
  if (existingZone) {
    existingZone.remove();
  }

  const zone = document.createElement('div');
  zone.className = 'sidebar-trigger-zone';
  zone.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 20px;
    height: 100vh;
    z-index: 1000;
    pointer-events: auto;
  `;
  
  document.body.appendChild(zone);
  return zone;
}

/**
 * Обработчики событий мыши
 */
function handleSidebarMouseEnter() {
  clearTimeout(hideTimeout);
  
  if (!document.body.classList.contains('sidebar-delayed-show')) {
    clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      document.body.classList.add('sidebar-delayed-show');
    }, SHOW_DELAY);
  }
}

function handleSidebarMouseLeave() {
  clearTimeout(showTimeout);
  
  hideTimeout = setTimeout(() => {
    document.body.classList.remove('sidebar-delayed-show');
  }, HIDE_DELAY);
}

function handleTriggerZoneEnter() {
  handleSidebarMouseEnter();
}

function handleTriggerZoneLeave(e) {
  // Проверяем, не перешли ли мы на сайдбар
  const sidebar = document.querySelector('.main-sidebar, .control-sidebar, aside.main-sidebar');
  if (sidebar && !sidebar.contains(e.relatedTarget)) {
    handleSidebarMouseLeave();
  }
}

/**
 * Добавляет необходимые стили
 */
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Стили для задержки сайдбара */
    .sidebar-delay-active .main-sidebar,
    .sidebar-delay-active .control-sidebar,
    .sidebar-delay-active aside.main-sidebar {
      transition: transform 0.3s ease-in-out !important;
      transform: translateX(-100%) !important;
    }
    
    .sidebar-delay-active.sidebar-delayed-show .main-sidebar,
    .sidebar-delay-active.sidebar-delayed-show .control-sidebar,
    .sidebar-delay-active.sidebar-delayed-show aside.main-sidebar {
      transform: translateX(0) !important;
    }
    
    /* Стиль для кнопки */
    .oprosnik-helper-btn {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 8px 16px;
      margin: 0 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s;
    }
    
    .oprosnik-helper-btn:hover {
      background-color: #0056b3;
    }
    
    /* Убираем margin у content-wrapper когда сайдбар скрыт */
    .sidebar-delay-active:not(.sidebar-delayed-show) .content-wrapper {
      margin-left: 0 !important;
    }
  `;
  
  document.head.appendChild(style);
}

// --- ЗАПУСК ---
// Инжектируем стили
injectStyles();

// Ждем загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createDelayToggleButton);
} else {
  createDelayToggleButton();
}