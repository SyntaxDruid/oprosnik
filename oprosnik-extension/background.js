/**
 * background.js
 * "Мозговой центр" расширения.
 * Координирует обмен данными между вкладками.
 */

console.log('Oprosnik Helper: Background Service Worker Started.');

// Слушаем сообщения от content-скриптов (в нашем случае, от filler.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Проверяем, что это запрос на получение данных о звонке
  if (request.action === 'getCallData') {
    console.log('Background: Получен запрос на данные от filler.js.');
    
    // 1. Находим вкладку-источник (парсер)
    chrome.tabs.query({
      url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/?locale=ru_RU*"
    }, (tabs) => {
      if (tabs.length === 0) {
        console.error('Background: Вкладка с парсером не найдена.');
        sendResponse({ status: 'error', message: 'Вкладка-источник не найдена. Убедитесь, что она открыта.' });
        return;
      }

      const parserTab = tabs[0];
      console.log(`Background: Найдена вкладка-парсер с ID: ${parserTab.id}. Отправляю команду...`);

      // 2. Отправляем команду на парсинг в parser.js
      chrome.tabs.sendMessage(parserTab.id, { action: 'parseCallData' }, (response) => {
        // Эта функция выполнится, когда parser.js пришлет ответ
        if (chrome.runtime.lastError) {
          console.error('Background: Ошибка при отправке сообщения в parser.js:', chrome.runtime.lastError.message);
          sendResponse({ status: 'error', message: 'Не удалось связаться со скриптом на вкладке-источнике.' });
          return;
        }

        console.log('Background: Получен ответ от parser.js:', response);
        
        // 3. Пересылаем полученный ответ обратно в filler.js
        sendResponse(response);
      });
    });

    // Возвращаем true, чтобы указать, что ответ будет отправлен асинхронно
    return true;
  }
});
