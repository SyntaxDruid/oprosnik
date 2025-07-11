/**
 * parser.js - Улучшенная версия с диагностикой
 * Версия: 2.0
 * Работает на странице-источнике. Отслеживает завершение звонков
 * и сохраняет данные последнего из них, чтобы передать по запросу.
 */

// Диагностика при загрузке
console.log('🚀 Oprosnik Helper: Parser Script загружается...', {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    extensionId: chrome.runtime?.id,
    version: '2.0'
});

// Проверяем доступность Chrome API
if (!chrome || !chrome.runtime) {
    console.error('❌ Parser: Chrome API недоступен!');
} else {
    console.log('✅ Parser: Chrome API доступен');
}

class CallEndTracker {
    constructor() {
        // Данные последнего завершенного звонка
        this.lastEndedCallData = null;
        
        // Статусы завершения разговора
        this.endCallStatuses = ['Поствызов', 'Готов', 'Ready', 'Not Ready', 'Wrap Up'];
        
        // Предыдущий статус агента
        this.previousAgentStatus = null;
        
        // Счетчики для диагностики
        this.stats = {
            statusChanges: 0,
            callsTracked: 0,
            errors: 0
        };
        
        // Тестовые данные для отладки
        this.testData = {
            phone: '89991234567',
            duration: '00:00:00',
            region: 'ТЕСТ',
            capturedAt: new Date().toLocaleTimeString()
        };

        this.init();
    }

    /**
     * Инициализирует все необходимые наблюдатели.
     */
    init() {
        console.log('📡 CallTracker: Инициализация...');
        
        // Добавляем глобальный объект для отладки
        window._oprosnikHelper = {
            tracker: this,
            getLastCall: () => this.getLastCallData(),
            getStats: () => this.stats,
            setTestData: () => {
                this.lastEndedCallData = this.testData;
                this.saveToLocalStorage(this.testData);
                console.log('✅ Тестовые данные установлены:', this.testData);
                return this.testData;
            },
            findCallElements: () => this.debugFindElements()
        };
        
        console.log('💡 Команды для отладки:');
        console.log('   window._oprosnikHelper.setTestData() - установить тестовые данные');
        console.log('   window._oprosnikHelper.getLastCall() - получить последние данные');
        console.log('   window._oprosnikHelper.findCallElements() - найти элементы звонка');
        
        // Загружаем последние данные из localStorage при старте
        this.loadFromLocalStorage();
        
        // Запускаем мониторинг статуса
        this.startStatusMonitoring();
        
        // Показываем визуальный индикатор
        this.showVisualIndicator();
    }

    /**
     * Запускает MutationObserver для отслеживания изменения статуса оператора.
     */
    startStatusMonitoring() {
        let attempts = 0;
        const maxAttempts = 30; // 15 секунд
        
        const waitForStatusElement = setInterval(() => {
            attempts++;
            
            // Пробуем разные селекторы для статуса
            const statusSelectors = [
                '#voice-state-select-headerOptionText',
                '[id*="voice-state"]',
                '[id*="agent-state"]',
                '.agent-state-select',
                '[class*="state-select"]',
                '[class*="voice-state"]'
            ];
            
            let statusContainer = null;
            for (const selector of statusSelectors) {
                statusContainer = document.querySelector(selector);
                if (statusContainer && statusContainer.textContent) {
                    console.log(`✅ Найден элемент статуса по селектору: ${selector}`);
                    break;
                }
            }
            
            if (statusContainer) {
                clearInterval(waitForStatusElement);
                console.log('✅ CallTracker: Контейнер статуса найден');
                console.log('   Текущий статус:', statusContainer.textContent.trim());

                // Сохраняем начальный статус
                this.previousAgentStatus = statusContainer.textContent.trim();

                // Создаем наблюдатель
                const observer = new MutationObserver(() => {
                    this.handleStatusChange(statusContainer);
                });

                observer.observe(statusContainer, {
                    characterData: true,
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['textContent', 'innerText']
                });
                
                console.log('✅ CallTracker: MutationObserver установлен');
                
            } else if (attempts >= maxAttempts) {
                clearInterval(waitForStatusElement);
                console.error('❌ CallTracker: Не удалось найти элемент статуса после', maxAttempts, 'попыток');
                this.stats.errors++;
                
                // Показываем найденные элементы для отладки
                this.debugFindElements();
            } else if (attempts % 10 === 0) {
                console.log(`⏳ Поиск элемента статуса... попытка ${attempts}/${maxAttempts}`);
            }
        }, 500);
    }
    
    /**
     * Обрабатывает изменение статуса.
     */
    handleStatusChange(statusContainer) {
        const currentStatus = statusContainer.textContent.trim();
        const previousStatus = this.previousAgentStatus;

        if (currentStatus !== previousStatus) {
            this.stats.statusChanges++;
            console.log(`📞 CallTracker: Статус изменился с "${previousStatus}" на "${currentStatus}"`);

            // Проверяем завершение звонка
            if (!this.endCallStatuses.some(s => previousStatus.includes(s)) && 
                this.endCallStatuses.some(s => currentStatus.includes(s))) {
                console.log('☎️ CallTracker: Обнаружено завершение звонка! Собираю данные...');
                
                // Небольшая задержка, чтобы DOM успел обновиться
                setTimeout(() => this.captureLastCallData(), 500);
            }

            this.previousAgentStatus = currentStatus;
        }
    }

    /**
     * Находит на странице информацию о звонке и сохраняет ее.
     */
    captureLastCallData() {
        console.log('📊 Сбор данных о звонке...');
        
        // Пробуем разные селекторы для контейнера звонка
        const containerSelectors = [
            '.callcontrol-grid-cell-NIrSA',
            '[class^="callcontrol-grid-cell-"]',
            '[class*="callcontrol-grid-cell"]',
            '[class*="call-control"]',
            '[class*="active-call"]',
            '.call-info',
            '#call-info-panel'
        ];
        
        let callContainer = null;
        for (const selector of containerSelectors) {
            callContainer = document.querySelector(selector);
            if (callContainer) {
                console.log(`✅ Найден контейнер по селектору: ${selector}`);
                break;
            }
        }
        
        if (!callContainer) {
            console.error('❌ CallTracker: Не удалось найти контейнер звонка');
            this.stats.errors++;
            this.debugFindElements();
            return;
        }
        
        // Ищем элементы с данными с помощью гибких селекторов
        const phoneEl = this.findElementBySelectors(callContainer, [
            '[aria-label*="Участник"]',
            '[aria-label*="участник"]',
            '[aria-label*="Caller"]',
            '[aria-label*="Phone"]',
            '[class*="participant"]',
            '[class*="phone-number"]',
            '.callcontrol-participant-number'
        ]);
        
        const durationEl = this.findElementBySelectors(callContainer, [
            '[role="timer"]',
            '[class*="timer"]',
            '[class*="duration"]',
            '.call-timer',
            '#call-timer'
        ]);
        
        const regionEl = this.findElementBySelectors(callContainer, [
            '.callcontrol-callVariableValue-290jv span',
            '[class^="callcontrol-callVariableValue"] span',
            '[class*="callVariableValue"] span',
            '[class*="call-variable"]',
            '[class*="region"]',
            '.call-info-value'
        ]);

        // Извлекаем данные
        const phone = phoneEl?.textContent?.trim() || 'Не найден';
        const duration = durationEl?.textContent?.trim() || 'Не найдена';
        const region = regionEl?.textContent?.trim() || 'Не найден';

        this.lastEndedCallData = {
            phone: phone,
            duration: duration,
            region: region,
            capturedAt: new Date().toLocaleTimeString()
        };

        console.log('✅ CallTracker: Данные последнего звонка зафиксированы:', this.lastEndedCallData);
        this.stats.callsTracked++;
        
        // Сохраняем в localStorage
        this.saveToLocalStorage(this.lastEndedCallData);
        
        // Показываем уведомление
        this.showNotification('Данные звонка сохранены');
    }
    
    /**
     * Ищет элемент по списку селекторов
     */
    findElementBySelectors(container, selectors) {
        for (const selector of selectors) {
            try {
                const element = container.querySelector(selector);
                if (element && element.textContent) {
                    console.log(`  ✓ Найден элемент по селектору: ${selector}`);
                    return element;
                }
            } catch (e) {
                // Игнорируем ошибки невалидных селекторов
            }
        }
        return null;
    }
    
    /**
     * Сохраняет данные в localStorage
     */
    saveToLocalStorage(data) {
        try {
            const dataWithMeta = {
                ...data,
                savedAt: Date.now(),
                extensionVersion: '2.0'
            };
            localStorage.setItem('oprosnik_last_call', JSON.stringify(dataWithMeta));
            console.log('💾 Данные сохранены в localStorage');
        } catch (e) {
            console.error('❌ Ошибка сохранения в localStorage:', e);
            this.stats.errors++;
        }
    }
    
    /**
     * Загружает данные из localStorage
     */
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('oprosnik_last_call');
            if (stored) {
                const data = JSON.parse(stored);
                // Проверяем актуальность (не старше 24 часов)
                const age = Date.now() - data.savedAt;
                if (age < 24 * 60 * 60 * 1000) {
                    this.lastEndedCallData = data;
                    console.log('💾 Загружены данные из localStorage:', data);
                }
            }
        } catch (e) {
            console.error('❌ Ошибка загрузки из localStorage:', e);
        }
    }

    /**
     * Возвращает данные последнего завершенного звонка
     */
    getLastCallData() {
        return this.lastEndedCallData;
    }
    
    /**
     * Отладочная функция для поиска элементов
     */
    debugFindElements() {
        console.group('🔍 Отладка: поиск элементов на странице');
        
        // Ищем все потенциальные контейнеры
        const patterns = ['call', 'phone', 'timer', 'participant', 'voice', 'agent'];
        patterns.forEach(pattern => {
            const elements = document.querySelectorAll(`[class*="${pattern}"], [id*="${pattern}"]`);
            if (elements.length > 0) {
                console.log(`Найдено элементов с "${pattern}":`, elements.length);
                elements.forEach((el, i) => {
                    if (i < 3) { // Показываем только первые 3
                        console.log(`  - ${el.tagName}.${el.className || el.id}:`, 
                                   el.textContent?.substring(0, 50));
                    }
                });
            }
        });
        
        console.groupEnd();
    }
    
    /**
     * Показывает визуальный индикатор
     */
    showVisualIndicator() {
        try {
            const indicator = document.createElement('div');
            indicator.id = 'oprosnik-helper-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 99999;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            `;
            indicator.innerHTML = '✅ Oprosnik Helper активен<br><small>Клик для информации</small>';
            
            indicator.onclick = () => {
                const info = `
Статистика:
- Изменений статуса: ${this.stats.statusChanges}
- Отслежено звонков: ${this.stats.callsTracked}
- Ошибок: ${this.stats.errors}

Последние данные:
${this.lastEndedCallData ? JSON.stringify(this.lastEndedCallData, null, 2) : 'Нет данных'}
                `;
                alert(info);
            };
            
            document.body.appendChild(indicator);
            
            // Удаляем через 10 секунд
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.remove(), 300);
            }, 10000);
            
        } catch (e) {
            console.error('Не удалось создать индикатор:', e);
        }
    }
    
    /**
     * Показывает уведомление
     */
    showNotification(message) {
        try {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2196F3;
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 99999;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease;
            `;
            notification.textContent = '📞 ' + message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
        } catch (e) {
            console.error('Не удалось показать уведомление:', e);
        }
    }
}

// Создаем единственный экземпляр трекера
const callTracker = new CallEndTracker();

// ОБРАБОТЧИК СООБЩЕНИЙ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Parser: Получено сообщение:', request.action);
    
    // Обработка ping для проверки загрузки
    if (request.action === 'ping') {
        console.log('🏓 Parser: Отвечаю на ping');
        sendResponse({ 
            status: 'pong', 
            message: 'Parser script активен',
            stats: callTracker.stats
        });
        return true;
    }
    
    // Запрос данных о звонке
    if (request.action === 'parseCallData') {
        console.log('📋 Parser: Запрос на получение данных...');
        const data = callTracker.getLastCallData();

        if (data) {
            console.log('✅ Parser: Отправляю данные:', data);
            sendResponse({ status: 'success', data: data });
        } else {
            console.log('⚠️ Parser: Данные о звонке отсутствуют');
            sendResponse({ 
                status: 'error', 
                message: 'Данные о последнем завершенном звонке еще не были зафиксированы. Сначала завершите звонок.',
                hint: 'Используйте window._oprosnikHelper.setTestData() для тестирования'
            });
        }
    }
    
    return true;
});

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Oprosnik Helper: Parser полностью загружен и готов к работе');
console.log('📊 URL:', window.location.href);
console.log('🆔 Extension ID:', chrome.runtime?.id);