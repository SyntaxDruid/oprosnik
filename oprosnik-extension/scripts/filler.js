/**
 * filler.js - Полная обновленная версия
 * Версия: 2.1
 * 
 * Работает на странице опросника.
 * 1. Добавляет кнопку "Вставить данные о звонке".
 * 2. По клику на кнопку инициирует процесс получения данных.
 * 3. Получив данные, форматирует их и вставляет в поле "Комментарий".
 */

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

/**
 * Главная функция, которая создает и настраивает кнопку.
 */
function createPasteButton() {
    console.log('🔍 Поиск места для размещения кнопки...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryCreateButton = () => {
        attempts++;
        let targetButton = document.getElementById('create_inst');
        
        if (!targetButton) {
            console.log(`⏳ Попытка ${attempts}/${maxAttempts}: Кнопка "Ответить" не найдена`);
            
            // Пробуем найти альтернативные селекторы
            const alternativeSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                '.btn-primary',
                'button.btn'
            ];
            
            let found = false;
            for (const selector of alternativeSelectors) {
                try {
                    const buttons = document.querySelectorAll(selector);
                    for (const btn of buttons) {
                        if (btn.innerText && btn.innerText.includes('Ответить')) {
                            console.log(`✅ Найдена кнопка по альтернативному селектору: ${selector}`);
                            targetButton = btn;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                } catch (e) {
                    console.error('Ошибка при поиске по селектору:', selector, e);
                }
            }
            
            if (!targetButton) {
                if (attempts < maxAttempts) {
                    setTimeout(tryCreateButton, 500);
                } else {
                    console.error('❌ Не удалось найти кнопку "Ответить" после', maxAttempts, 'попыток');
                    showDiagnosticInfo();
                }
                return;
            }
        }

        // Более точная проверка существования кнопки
        const nearbyButtons = targetButton.parentElement ? 
            targetButton.parentElement.querySelectorAll('.oprosnik-helper-btn') : [];
        
        let validButtonExists = false;
        nearbyButtons.forEach(btn => {
            if (btn.tagName === 'BUTTON' && btn.innerText.includes('Вставить данные')) {
                validButtonExists = true;
                console.log('✅ Наша кнопка уже существует и работает');
            } else {
                console.log('🔧 Удаляем невалидный элемент:', btn);
                btn.remove();
            }
        });
        
        if (validButtonExists) {
            return;
        }

        // Создаем нашу новую кнопку
        const pasteButton = document.createElement('button');
        pasteButton.innerText = 'Вставить данные о звонке';
        pasteButton.type = 'button';
        pasteButton.className = 'btn btn-success ml-2 oprosnik-helper-btn';
        
        // Добавляем стили для гарантии видимости
        pasteButton.style.cssText = 'margin-left: 10px !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important;';
        
        // Добавляем data-атрибуты для диагностики
        pasteButton.setAttribute('data-extension-id', chrome.runtime?.id || 'unknown');
        pasteButton.setAttribute('data-version', '2.1');
        pasteButton.setAttribute('data-created-at', new Date().toISOString());

        // Добавляем обработчик клика
        pasteButton.addEventListener('click', handlePasteButtonClick);

        // Определяем, куда вставить кнопку
        let inserted = false;
        
        // Стратегия 1: После целевой кнопки
        try {
            targetButton.insertAdjacentElement('afterend', pasteButton);
            inserted = true;
            console.log('✅ Кнопка вставлена после целевой кнопки');
        } catch (e) {
            console.warn('⚠️ Не удалось вставить после кнопки:', e);
        }
        
        // Стратегия 2: В родительский контейнер
        if (!inserted && targetButton.parentElement) {
            try {
                targetButton.parentElement.appendChild(pasteButton);
                inserted = true;
                console.log('✅ Кнопка добавлена в родительский контейнер');
            } catch (e) {
                console.warn('⚠️ Не удалось добавить в контейнер:', e);
            }
        }
        
        // Стратегия 3: В форму
        if (!inserted) {
            const form = document.querySelector('form');
            if (form) {
                const actionsDiv = form.querySelector('.form-actions') || form.querySelector('.btn-group') || form;
                actionsDiv.appendChild(pasteButton);
                inserted = true;
                console.log('✅ Кнопка добавлена в форму');
            }
        }
        
        if (inserted) {
            console.log('✅ Кнопка "Вставить данные о звонке" успешно добавлена');
            
            // Проверяем, что кнопка действительно видима
            setTimeout(() => {
                if (pasteButton.offsetParent === null) {
                    console.error('⚠️ Кнопка добавлена, но не видима! Проверьте CSS.');
                } else {
                    console.log('✅ Кнопка видима и готова к использованию');
                }
            }, 100);
            
            // Добавляем индикатор статуса API
            addStatusIndicator();
        } else {
            console.error('❌ Не удалось добавить кнопку ни одним способом');
        }
    };
    
    tryCreateButton();
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
    
    let commentTextarea = document.getElementById('comment_');
    if (!commentTextarea) {
        console.error('❌ Не найдено поле для комментария (#comment_)');
        // Пробуем найти по другим селекторам
        const alternativeSelectors = [
            'textarea[name="comment"]',
            'textarea[id*="comment"]',
            '.form-control[placeholder*="комментарий"]',
            'textarea.form-control'
        ];
        
        for (const selector of alternativeSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log('✅ Найдено альтернативное поле:', selector);
                commentTextarea = element;
                break;
            }
        }
        
        if (!commentTextarea) {
            alert('Ошибка: Не найдено поле для вставки комментария');
            return;
        }
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

/**
 * Дополнительная функция для принудительного пересоздания кнопки
 * Можно вызвать из консоли: recreateHelperButton()
 */
window.recreateHelperButton = function() {
    console.log('🔄 Принудительное пересоздание кнопки...');
    
    // Удаляем все существующие кнопки
    document.querySelectorAll('.oprosnik-helper-btn').forEach(btn => {
        console.log('🗑️ Удаляем:', btn);
        btn.remove();
    });
    
    // Пересоздаем
    createPasteButton();
};

// Добавляем глобальную функцию для отладки
window.debugOprosnikHelper = function() {
    console.group('🐛 Debug Oprosnik Helper');
    console.log('Кнопка "Ответить":', document.getElementById('create_inst'));
    console.log('Наша кнопка:', document.querySelector('.oprosnik-helper-btn'));
    console.log('Chrome API:', typeof chrome !== 'undefined' && chrome.runtime);
    console.log('Extension ID:', chrome.runtime?.id);
    console.groupEnd();
};

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

console.log('✅ Oprosnik Helper: Filler Script полностью загружен');