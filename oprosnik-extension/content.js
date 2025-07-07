console.log("Sidebar control script v2.2 (Aggressive CSS Override) loaded!");

// Инжектим мощный CSS для принудительного скрытия
const aggressiveCSS = `
  /* Принудительно скрываем сайдбар */
  .sidebar-hidden .main-sidebar {
    display: none !important;
    width: 0 !important;
    min-width: 0 !important;
    position: absolute !important;
    left: -9999px !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }

  /* КРИТИЧНО: Убираем ВСЕ возможные отступы */
  .sidebar-hidden .content-wrapper,
  .sidebar-hidden .main-header,
  .sidebar-hidden .main-footer {
    margin-left: 0 !important;
  }

  /* Убираем все transitions чтобы избежать артефактов */
  .sidebar-hidden .content-wrapper,
  .sidebar-hidden .main-header,
  .sidebar-hidden .main-footer {
    transition: none !important;
  }
`;

// Добавляем стили
const styleSheet = document.createElement("style");
styleSheet.innerText = aggressiveCSS;
document.head.appendChild(styleSheet);

let observer = new MutationObserver((mutations) => {
  // Проверяем только если сайдбар скрыт
  if (document.body.classList.contains('sidebar-hidden')) {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.matches('.content-wrapper, .main-header, .main-footer')) {
          if (target.style.marginLeft !== '0px') {
            target.style.marginLeft = '0px';
          }
        }
      }
    });
  }
});

const observerConfig = {
  attributes: true,
  subtree: true,
  attributeFilter: ['style']
};

function forceRemoveMargins() {
  const elements = document.querySelectorAll('.content-wrapper, .main-header, .main-footer');
  elements.forEach(el => {
    if (el.style.marginLeft !== '0px') {
      el.style.setProperty('margin-left', '0px', 'important');
    }
  });
}

function toggleSidebar() {
  const sidebar = document.querySelector('.main-sidebar');
  if (!sidebar) {
    console.error("Sidebar element not found.");
    return "Error: Sidebar not found.";
  }

  if (!document.body.classList.contains('sidebar-hidden')) {
    // --- СКРЫВАЕМ САЙДБАР ---
    console.log("Hiding sidebar with aggressive approach...");
    document.body.classList.add('sidebar-hidden');
    forceRemoveMargins();
    observer.observe(document.body, observerConfig);
    return "hidden";
  } else {
    // --- ПОКАЗЫВАЕМ САЙДБАР ---
    console.log("Showing sidebar...");
    observer.disconnect();
    document.body.classList.remove('sidebar-hidden');
    const elements = document.querySelectorAll('.content-wrapper, .main-header, .main-footer');
    elements.forEach(el => {
      el.style.removeProperty('margin-left');
    });
    return "visible";
  }
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true;
});