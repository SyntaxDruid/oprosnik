/**
 * parser.js
 * Этот скрипт работает на странице-источнике (откуда берутся данные о звонке).
 * Его единственная задача — пассивно ждать команды от background.js,
 * находить на странице информацию о самом релевантном (первом найденном) звонке,
 * и отправлять собранные данные обратно.
 */

console.log('Oprosnik Helper: Parser Script Injected.');

// --- КОНФИГУРАЦИЯ СЕЛЕКТОРОВ ---
// Централизованное хранение селекторов. Если верстка страницы изменится,
// достаточно будет поправить только этот объект.
const SELECTORS = {
  // Селектор для основного контейнера одного звонка
  callContainer: '.callcontrol-grid-cell-NIrSA',
  // Селекторы для поиска номера телефона (в порядке приоритета)
  phone: [
    '[aria-label*="Участник"]',
    '.callcontrol-participant-number-2wl0W'
  ],
  // Селекторы для поиска длительности звонка
  duration: [
    '[aria-label*="Общее время"]',
    '.timer-timer-2ZG4P',
    '[role="timer"]'
  ],
  // Селекторы для поиска региона
  region: [
    '.callcontrol-callVariableValue-290jv span',
    '[id*="call-header-variable-value"]'
  ]
};

/**
 * Вспомогательная функция для надежного поиска текста.
 * Пробует найти элемент по каждому селектору из массива, пока не найдет первый.
 * @param {Element} parentElement - Родительский элемент, в котором будет производиться поиск.
 * @param {string[]} selectorArray - Массив CSS-селекторов для поиска.
 * @returns {string|null} - Текст найденного элемента или null, если ничего не найдено.
 */
function findAndGetText(parentElement, selectorArray) {
  for (const selector of selectorArray) {
    const element = parentElement.querySelector(selector);
    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }
  return null; // Возвращаем null, если ничего не найдено
}

/**
 * Основная функция парсинга.
 * Находит самый релевантный (первый) контейнер звонка на странице и извлекает из него данные.
 * @returns {object|null} - Объект с данными о звонке или null, если звонок не найден.
 */
function parseCallData() {
  // Находим первый контейнер, соответствующий селектору звонка
  const callContainer = document.querySelector(SELECTORS.callContainer);

  if (!callContainer) {
    console.log('Парсер: Контейнер звонка не найден на странице.');
    return null;
  }

  // Используем нашу вспомогательную функцию для извлечения данных
  const phone = findAndGetText(callContainer, SELECTORS.phone);
  const duration = findAndGetText(callContainer, SELECTORS.duration);
  const region = findAndGetText(callContainer, SELECTORS.region);

  // Проверяем, что удалось найти хотя бы какую-то информацию
  if (!phone && !duration && !region) {
    console.log('Парсер: Не удалось извлечь никаких данных из контейнера звонка.');
    return null;
  }

  // Формируем и возвращаем структурированный объект с данными
  const callData = {
    phone: phone || 'Не найден',
    duration: duration || 'Не найдена',
    region: region || 'Не найден',
    parsedAt: new Date().toISOString()
  };

  console.log('Парсер: Данные успешно собраны:', callData);
  return callData;
}


// --- ОБРАБОТЧИК СООБЩЕНИЙ ---
// Слушаем входящие команды от background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Проверяем, что это именно та команда, которую мы ждем
  if (request.action === 'parseCallData') {
    console.log('Парсер: Получена команда на сбор данных...');
    const data = parseCallData();

    if (data) {
      // Отправляем ответ с успешно собранными данными
      sendResponse({ status: 'success', data: data });
    } else {
      // Отправляем ответ об ошибке, если данные не найдены
      sendResponse({ status: 'error', message: 'Не удалось найти данные о звонке на странице.' });
    }
  }

  // Возвращаем true, чтобы указать, что ответ будет отправлен асинхронно (хорошая практика).
  return true;
});