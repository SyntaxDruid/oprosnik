/**
 * filler.js - Версия с поддержкой истории звонков
 * Версия: 2.2
 * 
 * Работает на странице опросника.
 * Позволяет выбрать данные из последних звонков.
 */

console.log('🚀 Oprosnik Helper: Filler Script начинает загрузку...', {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    readyState: document.readyState,
    version: '2.2'
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
 * Создает модальное окно для выбора звонка из истории
 */
function showCallHistoryModal(callHistory) {
    console.log('📚 Показываем историю звонков:', callHistory.length);
    
    // Создаем оверлей
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;
    
    // Заголовок
    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">Выберите звонок для вставки</h3>
        <p style="color: #666; margin-bottom: 20px;">Найдено звонков в истории: ${callHistory.length}</p>
    `;
    
    // Создаем список звонков
    const callList = document.createElement('div');
    callList.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
    
    callHistory.forEach((call, index) => {
        const callItem = document.createElement('div');
        callItem.style.cssText = `
            border: 2px solid #e0e0e0;
            border-radius: 5px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s;
            background: #f9f9f9;
        `;
        
        callItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <strong style="color: #333;">📞 ${call.phone}</strong>
                    <div style="color: #666; font-size: 14px; margin-top: 5px;">
                        ⏱ Длительность: ${call.duration}<br>
                        📍 Регион: ${call.region}<br>
                        🕐 Время: ${call.capturedAt}
                        ${call.capturedDate ? `<br>📅 Дата: ${new Date(call.capturedDate).toLocaleDateString()}` : ''}
                    </div>
                </div>
                <div style="text-align: right; color: #999; font-size: 12px;">
                    ${index === 0 ? '<span style="color: #4CAF50; font-weight: bold;">Последний</span>' : `#${index + 1}`}
                </div>
            </div>
        `;
        
        // Эффекты при наведении
        callItem.onmouseenter = () => {
            callItem.style.borderColor = '#4CAF50';
            callItem.style.background = '#f0f8f0';
        };
        
        callItem.onmouseleave = () => {
            callItem.style.borderColor = '#e0e0e0';
            callItem.style.background = '#f9f9f9';
        };
        
        // Обработчик клика
        callItem.onclick = () => {
            pasteDataIntoComment(call);
            document.body.removeChild(overlay);
        };
        
        callList.appendChild(callItem);
    });
    
    modal.appendChild(callList);
    

    // Закрытие по клику на оверлей
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
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
        pasteButton.setAttribute('data-version', '2.2');
        pasteButton.setAttribute('data-created-at', new Date().toISOString());

        // Добавляем обработчик клика
        pasteButton.addEventListener('click', handlePasteButtonClick);

        // Вставляем кнопку
        try {
            targetButton.insertAdjacentElement('afterend', pasteButton);
            console.log('✅ Кнопка вставлена после целевой кнопки');
            
            // Проверяем видимость
            setTimeout(() => {
                if (pasteButton.offsetParent === null) {
                    console.error('⚠️ Кнопка добавлена, но не видима!');
                } else {
                    console.log('✅ Кнопка видима и готова к использованию');
                }
            }, 100);
            
            // Добавляем индикатор статуса API
            addStatusIndicator();
            
        } catch (e) {
            console.error('❌ Ошибка при добавлении кнопки:', e);
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
/**
 * Обработчик нажатия на нашу кнопку. (ИСПРАВЛЕННАЯ ВЕРСИЯ)
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
        tryLocalStorageFallback(button);
        return;
    }
    
    // Показываем пользователю, что идет процесс
    const originalText = button.innerText;
    button.innerText = 'Получение данных...';
    button.disabled = true;

    // Отправляем сообщение в background.js с запросом данных
    safeSendMessage({ action: 'getCallData' }, (response) => {
        console.log('📨 Обработка ответа:', response);
        
        button.innerText = originalText; // Возвращаем текст кнопки в любом случае
        button.disabled = false;

        if (response && response.status === 'success' && response.data) {
            console.log('✅ Данные успешно получены:', response.data);
            
            // ПРОВЕРКА: response.data должен быть массивом истории.
            // Если это массив и в нем больше одного звонка, показываем модальное окно.
            if (Array.isArray(response.data) && response.data.length > 1) {
                console.log(`📚 Найдена история из ${response.data.length} звонков. Показываем выбор.`);
                showCallHistoryModal(response.data);
            
            // Если это массив, но в нем только один звонок
            } else if (Array.isArray(response.data) && response.data.length === 1) {
                console.log('📝 В истории только один звонок. Вставляем его.');
                pasteDataIntoComment(response.data[0]);
                button.innerText = 'Данные вставлены!';
                
            // Если это не массив, а просто объект одного звонка (для обратной совместимости)
            } else if (typeof response.data === 'object' && response.data !== null && !Array.isArray(response.data)) {
                console.log('📝 Получен один звонок. Вставляем его.');
                pasteDataIntoComment(response.data);
                button.innerText = 'Данные вставлены!';
            
            // Если данные пустые
            } else {
                 console.log('⚠️ Получены пустые данные. Пробуем fallback.');
                 tryLocalStorageFallback(button);
                 return; // Выходим, чтобы не показывать "Данные вставлены!"
            }

            // Возвращаем кнопку в исходное состояние через 2 секунды, если что-то вставили
            if (button.innerText === 'Данные вставлены!') {
                button.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    button.innerText = originalText;
                    button.disabled = false;
                    button.style.backgroundColor = '';
                }, 2000);
            }

        } else {
            // Если произошла ошибка
            const errorMessage = response?.message || 'Неизвестная ошибка';
            console.error('❌ Ошибка при получении данных:', errorMessage);
            tryLocalStorageFallback(button);
        }
    });
}
/**
 * Пробует получить данные из localStorage как fallback
 */
function tryLocalStorageFallback(button) {
    console.log('🔄 Пробуем получить данные из localStorage...');
    
    try {
        const history = localStorage.getItem('oprosnik_call_history');
        const lastCall = localStorage.getItem('oprosnik_last_call');
        
        if (history) {
            const callHistory = JSON.parse(history);
            if (callHistory && callHistory.length > 0) {
                console.log('✅ История найдена в localStorage:', callHistory.length);
                button.innerText = 'Вставить данные о звонке';
                button.disabled = false;
                showCallHistoryModal(callHistory);
                return;
            }
        }
        
        if (lastCall) {
            const data = JSON.parse(lastCall);
            console.log('✅ Последний звонок найден в localStorage:', data);
            pasteDataIntoComment(data);
            button.innerText = 'Данные вставлены!';
            setTimeout(() => {
                button.innerText = 'Вставить данные о звонке';
                button.disabled = false;
            }, 2000);
            return;
        }
        
        throw new Error('Нет данных в localStorage');
        
    } catch (e) {
        console.error('❌ Ошибка при чтении localStorage:', e);
        alert('Ошибка: Не удалось получить данные о звонках.\n\nУбедитесь, что:\n1. Открыта вкладка Cisco Finesse\n2. Был завершен хотя бы один звонок');
        button.innerText = 'Вставить данные о звонке';
        button.disabled = false;
    }
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
    const formattedData = `
Номер телефона: ${callData.phone}
Длительность: ${callData.duration}
Регион: ${callData.region}
`;

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
    
    // Проверяем localStorage
    try {
        const history = localStorage.getItem('oprosnik_call_history');
        const lastCall = localStorage.getItem('oprosnik_last_call');
        console.log('История в localStorage:', history ? JSON.parse(history).length + ' звонков' : 'нет');
        console.log('Последний звонок:', lastCall ? 'есть' : 'нет');
    } catch (e) {
        console.error('Ошибка чтения localStorage:', e);
    }
    
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