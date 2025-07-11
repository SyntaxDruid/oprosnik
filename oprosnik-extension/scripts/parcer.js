/**
 * parser.js - Минимальная версия для диагностики
 * Эта версия гарантированно создаст объект _oprosnikHelper
 */

// Сразу логируем загрузку
console.log('🚀 Parser.js: Начало загрузки скрипта...', new Date().toISOString());

// Проверяем окружение
console.log('📍 URL:', window.location.href);
console.log('🔌 Chrome API:', typeof chrome !== 'undefined' && chrome.runtime ? 'Доступен' : 'Недоступен');

// Создаем глобальный объект сразу, без классов
try {
    window._oprosnikHelper = {
        version: 'minimal-1.0',
        initialized: false,
        lastEndedCallData: null,
        
        // Тестовые данные
        setTestData: function() {
            const testData = {
                phone: '89991234567',
                duration: '00:03:45',
                region: 'ТЕСТ_РЕГИОН',
                capturedAt: new Date().toLocaleTimeString()
            };
            
            this.lastEndedCallData = testData;
            
            // Сохраняем в localStorage
            try {
                localStorage.setItem('oprosnik_last_call', JSON.stringify({
                    ...testData,
                    savedAt: Date.now()
                }));
                console.log('✅ Тестовые данные установлены:', testData);
            } catch (e) {
                console.error('❌ Ошибка сохранения в localStorage:', e);
            }
            
            return testData;
        },
        
        // Получить последние данные
        getLastCall: function() {
            // Сначала пробуем вернуть из памяти
            if (this.lastEndedCallData) {
                return this.lastEndedCallData;
            }
            
            // Потом из localStorage
            try {
                const stored = localStorage.getItem('oprosnik_last_call');
                if (stored) {
                    const data = JSON.parse(stored);
                    console.log('📦 Данные загружены из localStorage:', data);
                    return data;
                }
            } catch (e) {
                console.error('❌ Ошибка чтения localStorage:', e);
            }
            
            return null;
        },
        
        // Найти элементы на странице
        findCallElements: function() {
            console.group('🔍 Поиск элементов звонка');
            
            const selectors = {
                'Статус': ['#voice-state-select-headerOptionText', '[id*="state"]', '[class*="state"]'],
                'Телефон': ['[aria-label*="Участник"]', '[class*="participant"]', '[class*="phone"]'],
                'Таймер': ['[role="timer"]', '[class*="timer"]', '[id*="timer"]'],
                'Регион': ['[class*="variable"]', '[class*="region"]']
            };
            
            for (const [name, selectorList] of Object.entries(selectors)) {
                console.log(`\n${name}:`);
                for (const selector of selectorList) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            console.log(`  ✅ ${selector}: найдено ${elements.length} элементов`);
                            if (elements[0].textContent) {
                                console.log(`     Пример: "${elements[0].textContent.trim().substring(0, 50)}"`);
                            }
                        }
                    } catch (e) {
                        // Игнорируем ошибки селекторов
                    }
                }
            }
            
            console.groupEnd();
        },
        
        // Статус инициализации
        getStatus: function() {
            return {
                version: this.version,
                initialized: this.initialized,
                hasData: !!this.lastEndedCallData,
                chromeAPI: typeof chrome !== 'undefined' && chrome.runtime
            };
        }
    };
    
    console.log('✅ Объект _oprosnikHelper создан успешно!');
    console.log('💡 Доступные команды:');
    console.log('   window._oprosnikHelper.setTestData()     - установить тестовые данные');
    console.log('   window._oprosnikHelper.getLastCall()     - получить последние данные');
    console.log('   window._oprosnikHelper.findCallElements() - найти элементы на странице');
    console.log('   window._oprosnikHelper.getStatus()       - проверить статус');
    
} catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА при создании _oprosnikHelper:', error);
}

// Обработчик сообщений от расширения
if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 Parser получил сообщение:', request.action);
        
        if (request.action === 'ping') {
            sendResponse({ 
                status: 'pong', 
                message: 'Parser (minimal) активен',
                version: window._oprosnikHelper?.version || 'unknown'
            });
            return true;
        }
        
        if (request.action === 'parseCallData') {
            const data = window._oprosnikHelper?.getLastCall();
            
            if (data) {
                console.log('✅ Отправляю данные:', data);
                sendResponse({ status: 'success', data: data });
            } else {
                console.log('⚠️ Нет данных для отправки');
                sendResponse({ 
                    status: 'error', 
                    message: 'Нет данных. Используйте window._oprosnikHelper.setTestData() для теста'
                });
            }
        }
        
        return true;
    });
    
    console.log('✅ Обработчик сообщений установлен');
} else {
    console.error('❌ Chrome API недоступен для обработки сообщений');
}

// Финальная проверка
setTimeout(() => {
    if (window._oprosnikHelper) {
        console.log('✅ PARSER.JS ЗАГРУЖЕН УСПЕШНО. Объект _oprosnikHelper доступен.');
        
        // Показываем визуальный индикатор
        try {
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 15px;
                background: #4CAF50;
                color: white;
                border-radius: 5px;
                font-size: 14px;
                z-index: 99999;
            `;
            indicator.textContent = '✅ Parser Minimal загружен';
            document.body.appendChild(indicator);
            setTimeout(() => indicator.remove(), 5000);
        } catch (e) {
            console.log('Не удалось создать индикатор:', e);
        }
    } else {
        console.error('❌ ОШИБКА: _oprosnikHelper не был создан!');
    }
}, 100);