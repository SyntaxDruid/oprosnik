/**
 * background.js - Версия с диагностикой и автоинъекцией
 * "Мозговой центр" расширения.
 * Координирует обмен данными между вкладками.
 */

console.log('🚀 Oprosnik Helper: Background Service Worker Started.', new Date().toISOString());

// Добавляем слушатель для отслеживания установки/обновления расширения
chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 Расширение установлено/обновлено:', details.reason);
    
    // При обновлении показываем уведомление
    if (details.reason === 'update') {
        console.log('🔄 Расширение обновлено. Необходимо перезагрузить страницы.');
    }
});

// Функция для проверки, загружен ли content script
async function isContentScriptLoaded(tabId) {
    try {
        // Пробуем отправить тестовое сообщение
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        return true;
    } catch (error) {
        return false;
    }
}

// Функция для программной инъекции скриптов
async function injectContentScripts(tabId) {
    console.log(`💉 Инъекция content scripts в табу ${tabId}...`);
    
    try {
        // Сначала инъектируем parser.js
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['scripts/parser.js']
        });
        
        console.log('✅ parser.js успешно инъектирован');
        return true;
    } catch (error) {
        console.error('❌ Ошибка инъекции скрипта:', error);
        return false;
    }
}

// Основной обработчик сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Обработка тестовых запросов
    if (request.action === 'test') {
        console.log('🧪 Получен тестовый запрос от:', sender.tab?.url || 'unknown');
        sendResponse({ status: 'success', message: 'Background service работает' });
        return;
    }
    
    // Проверяем, что это запрос на получение данных о звонке
    if (request.action === 'getCallData') {
        console.log('📨 Background: Получен запрос на данные от filler.js');
        
        // Используем async/await для более чистого кода
        (async () => {
            try {
                // 1. Находим вкладку-источник (парсер)
                const tabs = await chrome.tabs.query({
                    url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*"
                });
                
                console.log(`🔍 Найдено вкладок Finesse: ${tabs.length}`);
                
                if (tabs.length === 0) {
                    console.error('❌ Background: Вкладка с Finesse не найдена');
                    sendResponse({ 
                        status: 'error', 
                        message: 'Вкладка Cisco Finesse не найдена. Убедитесь, что она открыта.' 
                    });
                    return;
                }
                
                const parserTab = tabs[0];
                console.log(`✅ Background: Найдена вкладка-парсер:`, {
                    id: parserTab.id,
                    url: parserTab.url,
                    status: parserTab.status
                });
                
                // 2. Проверяем, загружен ли content script
                const isLoaded = await isContentScriptLoaded(parserTab.id);
                
                if (!isLoaded) {
                    console.log('⚠️ Content script не загружен, пытаемся инъектировать...');
                    
                    // Пробуем инъектировать скрипт
                    const injected = await injectContentScripts(parserTab.id);
                    
                    if (!injected) {
                        sendResponse({ 
                            status: 'error', 
                            message: 'Не удалось загрузить скрипт на странице Finesse. Перезагрузите страницу Finesse и попробуйте снова.' 
                        });
                        return;
                    }
                    
                    // Даем скрипту время на инициализацию
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                // Стало:
                // 3. Отправляем команду на получение ИСТОРИИ в parser.js
                console.log('📤 Отправляем запрос на получение ИСТОРИИ в parser.js...');

                // Запрашиваем именно историю звонков
                chrome.tabs.sendMessage(parserTab.id, { action: 'getCallHistory' }, (parserResponse) => {
                    if (chrome.runtime.lastError) {
                        // ... (вся ваша обработка ошибок остается без изменений)
                        console.error('❌ Background: Ошибка при отправке сообщения в parser.js:', chrome.runtime.lastError.message);
                        // ...
                        sendResponse({ status: 'error', message: 'Не удалось получить данные со страницы Finesse.' });
                        return;
                    }
                    
                    console.log('✅ Background: Получен ответ с историей от parser.js:', parserResponse);
                    
                    // ВАЖНО: Адаптируем ответ для filler.js
                    // filler.js ожидает массив звонков в поле 'data'.
                    // А parser.js присылает его в поле 'history'.
                    // Поэтому мы "перекладываем" данные из одного поля в другое.
                    
                    if (parserResponse && parserResponse.status === 'success') {
                        const responseForFiller = {
                            status: 'success',
                            data: parserResponse.history // <--- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
                        };
                        
                        console.log('↪️ Пересылаем адаптированный ответ в filler.js:', responseForFiller);
                        sendResponse(responseForFiller);
                        
                    } else {
                        // Если от парсера пришла ошибка, просто пересылаем ее дальше
                        sendResponse(parserResponse);
                    }
                });
                    
                    console.log('✅ Background: Получен ответ от parser.js:', response);
                    
                    // Пересылаем полученный ответ обратно в filler.js
                    sendResponse(response);
                });
                
            } catch (error) {
                console.error('❌ Неожиданная ошибка в background.js:', error);
                sendResponse({ 
                    status: 'error', 
                    message: 'Произошла неожиданная ошибка: ' + error.message 
                });
            }
        })();
        
        // Возвращаем true для асинхронного ответа
        return true;
    }
});

// Добавляем обработчик для диагностики подключений
chrome.runtime.onConnect.addListener((port) => {
    console.log('🔌 Новое подключение:', {
        name: port.name,
        sender: port.sender?.tab?.url || 'unknown'
    });
});

// Функция для диагностики (можно вызвать из консоли service worker)
globalThis.diagnoseTabs = async function() {
    console.group('🔍 Диагностика вкладок');
    
    const allTabs = await chrome.tabs.query({});
    const finesseTabs = allTabs.filter(tab => tab.url?.includes('ssial000ap008.si.rt.ru'));
    const oprosnikTabs = allTabs.filter(tab => tab.url?.includes('ctp.rt.ru/quiz'));
    
    console.log('Всего вкладок:', allTabs.length);
    console.log('Вкладки Finesse:', finesseTabs.map(t => ({
        id: t.id,
        url: t.url,
        status: t.status
    })));
    console.log('Вкладки опросника:', oprosnikTabs.map(t => ({
        id: t.id,
        url: t.url,
        status: t.status
    })));
    
    // Проверяем загрузку content scripts
    for (const tab of finesseTabs) {
        const loaded = await isContentScriptLoaded(tab.id);
        console.log(`Finesse tab ${tab.id}: content script ${loaded ? '✅ загружен' : '❌ не загружен'}`);
    }
    
    console.groupEnd();
};

console.log('✅ Background service worker полностью загружен');
console.log('💡 Для диагностики используйте: diagnoseTabs()');