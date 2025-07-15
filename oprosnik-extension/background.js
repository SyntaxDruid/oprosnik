/**
 * background.js - Версия с активным мониторингом
 * Основная логика парсинга перенесена в background service worker
 */

console.log('🚀 Background Service Worker с активным мониторингом запущен');

// Функции для выполнения на странице (должны быть вне класса)
function extractAgentStatus() {
    const statusEl = document.querySelector('#voice-state-select-headerOptionText');
    return {
        status: statusEl ? statusEl.textContent.trim() : null,
        timestamp: Date.now()
    };
}

function extractCallData() {
    const data = {
        phone: null,
        duration: null,
        region: null,
        timestamp: Date.now()
    };
    
    // Ищем номер телефона
    const phoneEl = document.querySelector('[aria-label*="Участник"]');
    if (phoneEl) {
        data.phone = phoneEl.textContent.trim();
    }
    
    // Селекторы для поиска времени звонка
    const timerSelectors = [
        '[role="timer"]',
        '[class*="timer-timer"]',
        '[id*="call-timer"]',
        '[aria-label*="Общее время"]',
        '.callcontrol-timer-7KaNm [role="timer"]',
        '[id$="call-timer"]',
        '.timer-timer-2ZG4P',
        '[class*="callcontrol-timer"] [role="timer"]'
    ];
    
    // Поиск времени по селекторам
    for (const selector of timerSelectors) {
        try {
            const timerEl = document.querySelector(selector);
            if (timerEl && timerEl.textContent.trim()) {
                const timerText = timerEl.textContent.trim();
                if (/\d{2}:\d{2}:\d{2}/.test(timerText)) {
                    data.duration = timerText;
                    break;
                }
            }
        } catch (e) {
            // Игнорируем ошибки селекторов
        }
    }
    
    // Fallback: поиск времени во всех элементах
    if (!data.duration) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            const text = el.textContent?.trim() || '';
            if (/^\d{2}:\d{2}:\d{2}$/.test(text)) {
                data.duration = text;
                break;
            }
        }
    }
    
    // Поиск региона
    const regionEl = document.querySelector('[class*="callVariableValue"] span') ||
                     document.querySelector('[id*="call-header-variable-value"]');
    if (regionEl) {
        data.region = regionEl.textContent.trim();
    }
    
    return data;
}

// Основной класс для мониторинга Finesse
class FinesseActiveMonitor {
    constructor() {
        this.finesseTabId = null;
        this.monitoringActive = false;
        this.currentCallData = null;
        this.callHistory = [];
        this.lastAgentStatus = null;
        this.isInCall = false;
        
        // Отслеживание времени звонка
        this.callStartTime = null;
        this.callEndTime = null;
        this.calculatedDuration = null;
        
        // Интервалы мониторинга
        this.statusCheckInterval = 3000; // Проверка статуса каждые 3 сек
        this.activeCallInterval = 1000;  // Во время звонка каждую секунду
        
        this.init();
    }
    
    // Форматирование длительности из миллисекунд в ЧЧ:ММ:СС
    formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    async init() {
        console.log('📡 Инициализация FinesseActiveMonitor...');
        
        // Загружаем сохраненные данные
        await this.loadStoredData();
        
        // Находим вкладку Finesse
        await this.findFinesseTab();
        
        // Создаем alarm для периодической проверки
        chrome.alarms.create('finesseStatusCheck', {
            periodInMinutes: 0.05 // каждые 3 секунды
        });
        
        // Слушаем изменения вкладок
        chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
        chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    }
    
    async findFinesseTab() {
        const tabs = await chrome.tabs.query({
            url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*"
        });
        
        if (tabs.length > 0) {
            this.finesseTabId = tabs[0].id;
            console.log('✅ Найдена вкладка Finesse:', this.finesseTabId);
            this.monitoringActive = true;
            return true;
        }
        
        this.monitoringActive = false;
        return false;
    }
    
    // Обработка обновления вкладок
    handleTabUpdate(tabId, changeInfo, tab) {
        if (tabId === this.finesseTabId && changeInfo.status === 'complete') {
            setTimeout(() => this.checkAgentStatus(), 3000);
        }
    }
    
    // Обработка закрытия вкладок
    handleTabRemoved(tabId) {
        if (tabId === this.finesseTabId) {
            this.finesseTabId = null;
            this.monitoringActive = false;
        }
    }
    
    // Основная функция проверки статуса агента
    async checkAgentStatus() {
        if (!this.monitoringActive || !this.finesseTabId) {
            await this.findFinesseTab();
            if (!this.finesseTabId) return;
        }
        
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: this.finesseTabId },
                func: extractAgentStatus,
                world: 'MAIN'
            });
            
            if (results && results[0] && results[0].result) {
                await this.processStatusData(results[0].result);
            }
        } catch (error) {
            this.monitoringActive = false;
        }
    }
    
    
    // Обработка данных статуса
    async processStatusData(data) {
        if (!data.status) return;
        
        const currentStatus = data.status;
        const previousStatus = this.lastAgentStatus;
        
        // Проверяем изменение статуса
        if (currentStatus !== previousStatus) {
            // Начало разговора
            if (currentStatus === 'Разговор' && !this.isInCall) {
                this.isInCall = true;
                this.callStartTime = Date.now();
                this.callEndTime = null;
                this.calculatedDuration = null;
                this.startActiveCallMonitoring();
            }
            
            // Завершение звонка
            if (previousStatus === 'Разговор' && currentStatus === 'Завершение') {
                this.callEndTime = Date.now();
                const callDurationMs = this.callEndTime - this.callStartTime;
                this.calculatedDuration = this.formatDuration(callDurationMs);
                console.log('📊 Вычисленная длительность:', this.calculatedDuration);
                this.startPostCallCapture();
            }
            
            // Переход в статус "Готов" после звонка
            if (previousStatus === 'Завершение' && currentStatus === 'Готов') {
                console.log('✅ Агент готов к новым звонкам');
                // В статусе "Готов" время уже пропадает из интерфейса, 
                // поэтому дополнительную проверку не делаем
            }
            
            this.lastAgentStatus = currentStatus;
        }
    }
    
    // Начинаем активный мониторинг звонка
    startActiveCallMonitoring() {
        chrome.alarms.create('activeCallMonitor', {
            periodInMinutes: 0.0167 // каждую секунду
        });
        this.captureCallData();
    }
    
    // Захват данных активного звонка
    async captureCallData() {
        if (!this.finesseTabId) return;
        
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: this.finesseTabId },
                func: extractCallData,
                world: 'MAIN'
            });
            
            if (results && results[0] && results[0].result) {
                const callData = results[0].result;
                if (callData.phone || callData.duration) {
                    this.currentCallData = callData;
                }
            }
        } catch (error) {
            // Игнорируем ошибки захвата
        }
    }
    
    
    // Быстрый захват в статусе "Завершение"
    async startPostCallCapture() {
        this.isInCall = false;
        chrome.alarms.clear('activeCallMonitor');
        
        let captureAttempts = 0;
        const maxAttempts = 10; // Увеличиваем количество попыток
        const captureWindow = 3000;
        const startTime = Date.now();
        
        console.log('🔄 Начинаем захват времени из интерфейса в течение 3 секунд...');
        
        const attemptCapture = async () => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed > captureWindow) {
                console.log('⏰ Время вышло, завершаем с расчётным временем');
                await this.finalizeCallWithCalculatedDuration();
                return;
            }
            
            captureAttempts++;
            console.log(`🔍 Попытка ${captureAttempts}/${maxAttempts} захвата времени (${elapsed}ms)`);
            await this.captureCallData();
            
            const hasValidDuration = this.currentCallData?.duration && 
                                   this.currentCallData.duration !== '00:00:00' &&
                                   /\d{2}:\d{2}:\d{2}/.test(this.currentCallData.duration);
            
            if (hasValidDuration) {
                console.log('✅ Получено время из интерфейса:', this.currentCallData.duration);
                await this.finalizeCall();
                return;
            }
            
            // Если это последняя попытка или истекло время - используем вычисленную длительность
            if (captureAttempts >= maxAttempts) {
                console.log('⏰ Исчерпаны попытки быстрого захвата, используем вычисленную длительность');
                await this.finalizeCallWithCalculatedDuration();
                return;
            }
            
            // Следующая попытка через 300мс (более частые проверки)
            setTimeout(attemptCapture, 300);
        };
        
        // Начинаем сразу, без задержки
        attemptCapture();
    }
    
    // Финализация с использованием вычисленной длительности
    async finalizeCallWithCalculatedDuration() {
        // Используем данные из currentCallData, но заменяем длительность на вычисленную
        const callData = {
            phone: this.currentCallData?.phone || 'Неизвестно',
            duration: this.calculatedDuration || '00:00:00',
            region: this.currentCallData?.region || 'Не указан',
            timestamp: Date.now(),
            source: 'calculated' // Помечаем, что длительность вычислена
        };
        
        console.log('💾 Финализация с вычисленной длительностью:', callData);
        
        // Добавляем метаданные
        const finalCallData = {
            ...callData,
            completedAt: new Date().toISOString(),
            savedAt: Date.now(),
            callStartTime: this.callStartTime,
            callEndTime: this.callEndTime
        };
        
        // Добавляем в историю
        this.callHistory.unshift(finalCallData);
        if (this.callHistory.length > 10) {
            this.callHistory = this.callHistory.slice(0, 10);
        }
        
        // Сохраняем в chrome.storage
        await this.saveData();
        
        // Очищаем данные звонка
        this.currentCallData = null;
        this.callStartTime = null;
        this.callEndTime = null;
        this.calculatedDuration = null;
        
        console.log('✅ Звонок сохранен с вычисленной длительностью');
    }
    
    // Финализация и сохранение звонка (с данными из интерфейса)
    async finalizeCall() {
        if (!this.currentCallData) {
            console.warn('⚠️ Нет данных для сохранения, используем вычисленную длительность');
            await this.finalizeCallWithCalculatedDuration();
            return;
        }
        
        console.log('💾 Финализация звонка с данными из интерфейса:', this.currentCallData);
        
        const interfaceDuration = this.currentCallData.duration;
        const calculatedDuration = this.calculatedDuration;
        
        // Определяем лучшее время: приоритет интерфейсу, fallback на расчётное
        let finalDuration = calculatedDuration || '00:00:00';
        let durationSource = 'calculated';
        
        // Проверяем валидность времени из интерфейса
        const isInterfaceValid = interfaceDuration && 
                               interfaceDuration !== '00:00:00' &&
                               /\d{2}:\d{2}:\d{2}/.test(interfaceDuration) &&
                               !this.isDurationTooShort(interfaceDuration);
        
        if (isInterfaceValid) {
            finalDuration = interfaceDuration;
            durationSource = 'interface';
            console.log('🕐 Используем время из интерфейса:', interfaceDuration);
        } else {
            console.log('🕐 Время из интерфейса невалидно, используем расчётное:', calculatedDuration);
        }
        
        // Добавляем метаданные
        const finalCallData = {
            ...this.currentCallData,
            duration: finalDuration, // Используем лучшее доступное время
            completedAt: new Date().toISOString(),
            savedAt: Date.now(),
            source: durationSource, // Помечаем источник времени
            callStartTime: this.callStartTime,
            callEndTime: this.callEndTime,
            calculatedDuration: this.calculatedDuration, // Сохраняем и вычисленную для сравнения
            interfaceDuration: interfaceDuration // Сохраняем исходное время из интерфейса
        };
        
        console.log('🕐 Выбрано время:', {
            interface: interfaceDuration,
            calculated: calculatedDuration,
            final: finalDuration,
            source: durationSource
        });
        
        // Добавляем в историю
        this.callHistory.unshift(finalCallData);
        if (this.callHistory.length > 10) {
            this.callHistory = this.callHistory.slice(0, 10);
        }
        
        // Сохраняем в chrome.storage
        await this.saveData();
        
        // Очищаем данные звонка
        this.currentCallData = null;
        this.callStartTime = null;
        this.callEndTime = null;
        this.calculatedDuration = null;
        
        console.log('✅ Звонок сохранен с оптимальным временем');
    }
    
    // Проверяет, слишком ли короткое время (менее 10 секунд)
    isDurationTooShort(duration) {
        if (!duration || duration === '00:00:00') return true;
        
        const match = duration.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (!match) return true;
        
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        return totalSeconds < 10; // Менее 10 секунд считается слишком коротким
    }
    
    // Сохранение данных в chrome.storage
    async saveData() {
        try {
            await chrome.storage.local.set({
                callHistory: this.callHistory,
                lastCallData: this.callHistory[0] || null,
                lastAgentStatus: this.lastAgentStatus,
                lastUpdate: Date.now()
            });
            console.log('💾 Данные сохранены в storage');
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
        }
    }
    
    // Загрузка сохраненных данных
    async loadStoredData() {
        try {
            const data = await chrome.storage.local.get([
                'callHistory', 
                'lastAgentStatus'
            ]);
            
            if (data.callHistory) {
                this.callHistory = data.callHistory;
                console.log(`📚 Загружена история: ${this.callHistory.length} звонков`);
            }
            
            if (data.lastAgentStatus) {
                this.lastAgentStatus = data.lastAgentStatus;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
        }
    }
}

// Создаем экземпляр монитора
const monitor = new FinesseActiveMonitor();

// Обработчик alarm событий
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'finesseStatusCheck') {
        await monitor.checkAgentStatus();
    } else if (alarm.name === 'activeCallMonitor') {
        await monitor.captureCallData();
    }
});

// Обработчик сообщений от content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Получен запрос:', request.action);
    
    if (request.action === 'getCallData') {
        // Возвращаем данные из нашего монитора
        sendResponse({
            status: 'success',
            data: monitor.callHistory
        });
        return true;
    }
    
    if (request.action === 'test') {
        sendResponse({ 
            status: 'success', 
            message: 'Background service работает',
            monitorActive: monitor.monitoringActive,
            historyCount: monitor.callHistory.length
        });
        return true;
    }
});

// Диагностические функции
globalThis.monitorStatus = async function() {
    console.group('📊 Статус мониторинга');
    console.log('Активен:', monitor.monitoringActive);
    console.log('Tab ID:', monitor.finesseTabId);
    console.log('Последний статус:', monitor.lastAgentStatus);
    console.log('В звонке:', monitor.isInCall);
    console.log('Текущие данные:', monitor.currentCallData);
    console.log('История:', monitor.callHistory.length, 'звонков');
    console.groupEnd();
};

globalThis.forceCheck = async function() {
    console.log('🔄 Принудительная проверка...');
    await monitor.checkAgentStatus();
};

console.log('✅ Background Service Worker готов к работе');
console.log('💡 Команды: monitorStatus(), forceCheck()');