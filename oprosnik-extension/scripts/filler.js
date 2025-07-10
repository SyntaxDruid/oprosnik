/**
 * filler.js - Улучшенная версия с диагностикой
 * Версия: 2.0
 * 
 * Работает на странице опросника.
 * 1. Добавляет кнопку "Вставить данные о звонке".
 * 2. По клику на кнопку инициирует процесс получения данных.
 * 3. Получив данные, форматирует их и вставляет в поле "Комментарий".
 */

// ===== ДИАГНОСТИКА И ИНИЦИАЛИЗАЦИЯ =====
console.log('🚀 Oprosnik Helper: Filler Script начинает загрузку...', {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    readyState: document.readyState
});

// Проверка доступности Chrome API
const diagnostics = {
    chromeAvailable: typeof chrome !== 'undefined',
    runtimeAvailable: typeof chrome !== 'undefined' && chrome.runtime,
    sendMessageAvailable: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage,
    browserAvailable: typeof browser !== 'undefined',
    inIframe: window !== window.top,
    protocol: window.location.protocol,
    contentScriptContext: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id
};

console.log('📊 Диагностика окружения:', diagnostics);

// Глобальная переменная для хранения API
let messageAPI = null;

// Инициализация API для обмена сообщениями
function initializeMessageAPI() {
    if (diagnostics.sendMessageAvailable) {
        messageAPI = chrome.runtime;
        console.log('✅ Chrome API доступен и инициализирован');
        return true;
    } else if (diagnostics.browserAvailable && browser.runtime && browser.runtime.sendMessage) {
        messageAPI = browser.runtime;
        console.log('✅ Browser API (Firefox) доступен и инициализирован');
        return true;
    } else {
        console.error('❌ API расширения недоступен!');
        return false;
    }
}

// Безопасная отправка сообщений
function safeSendMessage(message, callback) {
    if (!messageAPI) {
        console.error('❌ Message API не инициализирован');
        callback({ status: 'error', message: 'API расширения недоступен' });
        return;
    }

    try {
        console.log('📤 Отправка сообщения:', message);
        messageAPI.sendMessage(message, (response) => {
            if (messageAPI.lastError) {
                console.error('❌ Ошибка при отправке:', messageAPI.lastError);
                callback({ 
                    status: 'error', 
                    message: messageAPI.lastError.message || 'Неизвестная ошибка' 
                });
            } else {
                console.log('📥 Получен ответ:', response);
                callback(response);
            }
        });
    } catch (error) {
        console.error('❌ Исключение при отправке сообщения:', error);
        callback({ 
            status: 'error', 
            message: 'Ошибка выполнения: ' + error.message 
        });
    }
}

// ===== ОСНОВНАЯ ЛОГИКА =====

/**
 * Главная функция, которая создает и настраивает кнопку.
 */
function createPasteButton() {
    console.log('🔍 Поиск места для размещения кнопки...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryCreateButton = () => {
        attempts++;
        const targetButton = document.getElementById('create_inst');
        
        if (!targetButton) {
            console.log(`⏳ Попытка ${attempts}/${maxAttempts}: Кнопка "Ответить" не найдена`);
            
            // Пробуем найти альтернативные селекторы
            const alternativeSelectors = [
                'button[type="submit"]',
                'input[type="submit"][value*="Ответить"]',
                '.btn-primary:contains("Ответить")',
                'button.btn:contains("Ответить")'
            ];
            
            let found = false;
            for (const selector of alternativeSelectors) {
                try {
                    const altButton = document.querySelector(selector);
                    if (altButton && altButton.innerText?.includes('Ответить')) {
                        console.log(`✅ Найдена кнопка по альтернативному селектору: ${selector}`);
                        targetButton = altButton;
                        found = true;
                        break;
                    }
                } catch (e) {}
            }
            
            if (!found) {
                if (attempts < maxAttempts) {
                    setTimeout(tryCreateButton, 500);
                } else {
                    console.error('❌ Не удалось найти кнопку "Ответить" после', maxAttempts, 'попыток');
                    showDiagnosticInfo();
                }
                return;
            }
        }

/**
 * Добавляет визуальный индикатор статуса API
 */
function addStatusIndicator() {
    const button = document.querySelector('.oprosnik-helper-btn');
    if (!button) return;
    
    const indicator = document.createElement('span');
    indicator.style.cssText = 'margin-left: 5px; font-size: 12px;';
    
    if (messageAPI) {
        indicator.innerHTML = '🟢';
        indicator.title = 'API доступен';
    } else {
        indicator.innerHTML = '🔴';
        indicator.title = 'API недоступен';
    }
    
    button.appendChild(indicator);
}

/**
 * Обработчик нажатия на нашу кнопку.
 */
function handlePasteButtonClick(event) {
    console.log('🖱️ Кнопка нажата', {
        timestamp: new Date().toISOString(),
        apiAvailable: !!messageAPI
    });
    
    const button = event.target.closest('.oprosnik-helper-btn');
    
    // Проверяем инициализацию API
    if (!messageAPI && !initializeMessageAPI()) {
        console.error('❌ Не удалось инициализировать API');
        alert('Ошибка: API расширения недоступен.\n\nВозможные причины:\n' +
              '1. Расширение не установлено или отключено\n' +
              '2. Страница требует перезагрузки\n' +
              '3. Конфликт с другими расширениями\n\n' +
              'Попробуйте перезагрузить страницу (F5)');
        return;
    }
    
    // Показываем пользователю, что идет процесс
    const originalText = button.innerText;
    button.innerText = 'Получение данных...';
    button.disabled = true;

    // Отправляем сообщение в background.js с запросом данных
    safeSendMessage({ action: 'getCallData' }, (response) => {
        console.log('📨 Обработка ответа:', response);
        
        if (response && response.status === 'success') {
            console.log('✅ Данные успешно получены:', response.data);
            pasteDataIntoComment(response.data);
            button.innerText = 'Данные вставлены!';
            button.style.backgroundColor = '#28a745';
            
            // Возвращаем кнопку в исходное состояние через 2 секунды
            setTimeout(() => {
                button.innerText = originalText;
                button.disabled = false;
                button.style.backgroundColor = '';
            }, 2000);

        } else {
            // Если произошла ошибка
            const errorMessage = response?.message || 'Неизвестная ошибка';
            console.error('❌ Ошибка при получении данных:', errorMessage);
            
            // Детальное сообщение об ошибке
            let userMessage = 'Ошибка: ' + errorMessage;
            
            if (errorMessage.includes('Вкладка-источник не найдена')) {
                userMessage += '\n\nУбедитесь, что открыта вкладка Cisco Finesse:\n' +
                              'https://ssial000ap008.si.rt.ru:8445/desktop/container/';
            } else if (errorMessage.includes('Данные о последнем завершенном звонке еще не были зафиксированы')) {
                userMessage += '\n\nСначала завершите звонок в Cisco Finesse,\n' +
                              'затем попробуйте снова.';
            }
            
            alert(userMessage);
            
            button.innerText = 'Ошибка!';
            button.style.backgroundColor = '#dc3545';
            
            setTimeout(() => {
                button.innerText = originalText;
                button.disabled = false;
                button.style.backgroundColor = '';
            }, 2000);
        }
    });
}

/**
 * Вставляет полученные данные в поле "Комментарий".
 * @param {object} callData - Объект с данными о звонке.
 */
function pasteDataIntoComment(callData) {
    console.log('📝 Вставка данных в комментарий...');
    
    const commentTextarea = document.getElementById('comment_');
    if (!commentTextarea) {
        console.error('❌ Не найдено поле для комментария (#comment_)');
        // Пробуем найти по другим селекторам
        const alternativeSelectors = [
            'textarea[name="comment"]',
            'textarea[id*="comment"]',
            '.form-control[placeholder*="комментарий"]'
        ];
        
        for (const selector of alternativeSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log('✅ Найдено альтернативное поле:', selector);
                insertDataIntoField(element, callData);
                return;
            }
        }
        
        alert('Ошибка: Не найдено поле для вставки комментария');
        return;
    }
    
    insertDataIntoField(commentTextarea, callData);
}

/**
 * Вставляет данные в указанное поле
 */
function insertDataIntoField(field, callData) {
    // Форматируем данные в красивую строку для вставки
    const formattedData = `--------------------------------
Данные о последнем звонке:
- Номер телефона: ${callData.phone}
- Длительность: ${callData.duration}
- Регион: ${callData.region}
- Время фиксации: ${callData.capturedAt}
--------------------------------`;

    // Сохраняем текущее значение
    const currentValue = field.value;
    
    // Вставляем отформатированные данные в начало комментария
    field.value = formattedData.trim() + '\n\n' + currentValue;
    
    // Фокусируемся на поле и устанавливаем курсор в конец
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    
    // Вызываем событие изменения для активации валидации формы
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('✅ Данные успешно вставлены в поле');
}

/**
 * Показывает диагностическую информацию
 */
function showDiagnosticInfo() {
    console.group('🔧 Диагностическая информация');
    console.log('URL страницы:', window.location.href);
    console.log('Доступные элементы формы:');
    console.log('- Кнопки:', Array.from(document.querySelectorAll('button')).map(b => ({
        id: b.id,
        class: b.className,
        text: b.innerText
    })));
    console.log('- Текстовые поля:', Array.from(document.querySelectorAll('textarea')).map(t => ({
        id: t.id,
        name: t.name,
        class: t.className
    })));
    console.groupEnd();
}

// ===== ЗАПУСК =====
console.log('🏁 Инициализация расширения...');

// Инициализируем API
const apiInitialized = initializeMessageAPI();
console.log('📡 API инициализирован:', apiInitialized);

// Ждем, пока страница полностью загрузится
if (document.readyState === 'loading') {
    console.log('⏳ Ожидание загрузки DOM...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM загружен');
        createPasteButton();
    });
} else {
    console.log('✅ DOM уже загружен');
    createPasteButton();
}

// Добавляем слушатель для отладки всех сообщений
if (messageAPI) {
    console.log('🎧 Установка слушателя сообщений для отладки...');
}

console.log('✅ Oprosnik Helper: Filler Script полностью загружен');