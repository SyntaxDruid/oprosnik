console.log("Sidebar control script v1.5 with enhanced CSS loaded!");

// Более комплексный CSS для полного скрытия сайдбара
const customCSS = `
  /* Скрываем все возможные варианты сайдбара */
  .sidebar-collapse .main-sidebar,
  .sidebar-collapse .sidebar,
  .sidebar-collapse .left-sidebar,
  .sidebar-collapse .side-nav,
  .sidebar-collapse .sidebar-wrapper,
  .sidebar-collapse .sidebar-container {
    display: none !important;
    width: 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;
    opacity: 0 !important;
    visibility: hidden !important;
    position: absolute !important;
    left: -9999px !important;
  }

  /* Убираем отступы и границы от всех основных контейнеров */
  .sidebar-collapse .content-wrapper,
  .sidebar-collapse .main-content,
  .sidebar-collapse .main-container,
  .sidebar-collapse .page-content,
  .sidebar-collapse .content-container,
  .sidebar-collapse .main-panel,
  .sidebar-collapse .page-wrapper {
    margin-left: 0 !important;
    padding-left: 0 !important;
    left: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  
  /* Корректируем верхнюю панель навигации */
  .sidebar-collapse .main-header,
  .sidebar-collapse .navbar,
  .sidebar-collapse .top-nav,
  .sidebar-collapse .header {
    margin-left: 0 !important;
    padding-left: 0 !important;
    left: 0 !important;
    width: 100% !important;
  }

  /* Убираем любые фоновые цвета и границы */
  .sidebar-collapse .main-sidebar::before,
  .sidebar-collapse .main-sidebar::after,
  .sidebar-collapse .sidebar::before,
  .sidebar-collapse .sidebar::after {
    display: none !important;
  }

  /* Скрываем возможные overlay или backdrop элементы */
  .sidebar-collapse .sidebar-overlay,
  .sidebar-collapse .sidebar-backdrop,
  .sidebar-collapse .menu-overlay {
    display: none !important;
  }

  /* Принудительно растягиваем основной контент */
  .sidebar-collapse body {
    overflow-x: hidden !important;
  }

  /* Убираем любые transitions которые могут создавать артефакты */
  .sidebar-collapse * {
    transition: none !important;
  }

  /* Дополнительная очистка для возможных white-space элементов */
  .sidebar-collapse .main-sidebar + *,
  .sidebar-collapse .sidebar + * {
    margin-left: 0 !important;
  }

  /* Форсируем полную ширину для основного контента */
  .sidebar-collapse .wrapper,
  .sidebar-collapse .main-wrapper,
  .sidebar-collapse .page-wrapper {
    width: 100vw !important;
    max-width: 100vw !important;
  }
`;

// Инжектим стили
const styleSheet = document.createElement("style");
styleSheet.innerText = customCSS;
document.head.appendChild(styleSheet);

// Функция для более агрессивного скрытия
function toggleSidebar() {
  document.body.classList.toggle('sidebar-collapse');
  
  // Дополнительная проверка и принудительное скрытие
  if (document.body.classList.contains('sidebar-collapse')) {
    // Находим все возможные элементы сайдбара и принудительно скрываем их
    const sidebarSelectors = [
      '.main-sidebar',
      '.sidebar',
      '.left-sidebar',
      '.side-nav',
      '.sidebar-wrapper',
      '.sidebar-container'
    ];
    
    sidebarSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
        el.style.width = '0';
        el.style.visibility = 'hidden';
        el.style.position = 'absolute';
        el.style.left = '-9999px';
      });
    });

    // Расширяем основной контент
    const contentSelectors = [
      '.content-wrapper',
      '.main-content',
      '.main-container',
      '.page-content',
      '.content-container',
      '.main-panel',
      '.page-wrapper'
    ];
    
    contentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.marginLeft = '0';
        el.style.paddingLeft = '0';
        el.style.width = '100%';
        el.style.left = '0';
      });
    });
  }
  
  return document.body.classList.contains('sidebar-collapse') ? 'hidden' : 'visible';
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    console.log(`Sidebar is now ${currentState}.`);
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true;
});

// Дополнительная проверка при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, checking for existing sidebar state...");
  
  // Если класс уже есть, применяем скрытие
  if (document.body.classList.contains('sidebar-collapse')) {
    toggleSidebar();
  }
});

// Наблюдатель за изменениями DOM для динамически добавляемых элементов
const observer = new MutationObserver((mutations) => {
  if (document.body.classList.contains('sidebar-collapse')) {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Проверяем, не является ли новый элемент сайдбаром
            if (node.matches && (
              node.matches('.main-sidebar') || 
              node.matches('.sidebar') ||
              node.matches('.left-sidebar') ||
              node.matches('.side-nav')
            )) {
              node.style.display = 'none';
            }
          }
        });
      }
    });
  }
});

// Запускаем наблюдатель
observer.observe(document.body, {
  childList: true,
  subtree: true
});