/**
 * background.js - Версия с активным мониторингом
 * Основная логика парсинга перенесена в background service worker
 */

console.log('🚀 Background Service Worker с активным мониторингом запущен');

// Глобальная конфигурация
let CONFIG = null;

// Загружаем конфигурацию
async function loadConfig() {
    try {
        const response = await fetch(chrome.runtime.getURL('config.json'));
        CONFIG = await response.json();
        console.log('✅ Конфигурация загружена:', CONFIG.version);
    } catch (error) {
        console.error('❌ Ошибка загрузки конфигурации:', error);
        // Fallback конфигурация
        CONFIG = {
            selectors: {
                agentStatus: { selector: '#voice-state-select-headerOptionText' },
                phoneNumber: { selector: '[aria-label*="Участник"]' },
                region: { 
                    primary: '[class*="callVariableValue"] span',
                    fallback: '[id*="call-header-variable-value"]'
                }
            },
            monitoring: {
                finesseUrl: 'https://ssial000ap008.si.rt.ru:8445/desktop/container/*',
                statusCheckInterval: 3000,
                activeCallInterval: 1000,
                maxCallHistory: 10
            }
        };
    }
}

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
        region: null,
        timestamp: Date.now()
    };
    
    // Ищем номер телефона
    const phoneEl = document.querySelector('[aria-label*="Участник"]');
    if (phoneEl) {
        data.phone = phoneEl.textContent.trim();
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
        
        // Загружаем конфигурацию
        await loadConfig();
        
        // Загружаем сохраненные данные
        await this.loadStoredData();
        
        // Находим вкладку Finesse
        await this.findFinesseTab();
        
        // Создаем alarm для периодической проверки
        chrome.alarms.create('finesseStatusCheck', {
            periodInMinutes: CONFIG.monitoring.statusCheckInterval / 60000 // конвертируем мс в минуты
        });
        
        // Слушаем изменения вкладок
        chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
        chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    }
    
    async findFinesseTab() {
        // Ищем вкладки по всем URL из конфигурации
        let tabs = [];
        
        if (CONFIG.monitoring.finesseUrls) {
            // Новый формат с массивом URL
            for (const url of CONFIG.monitoring.finesseUrls) {
                const urlTabs = await chrome.tabs.query({ url });
                tabs.push(...urlTabs);
            }
        } else {
            // Fallback для старого формата
            const urlTabs = await chrome.tabs.query({
                url: CONFIG.monitoring.finesseUrl
            });
            tabs.push(...urlTabs);
        }
        
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
                this.finalizeCall();
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
            periodInMinutes: CONFIG.monitoring.activeCallInterval / 60000 // конвертируем мс в минуты
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
                if (callData.phone || callData.region) {
                    this.currentCallData = callData;
                }
            }
        } catch (error) {
            // Игнорируем ошибки захвата
        }
    }
    
    
    
    
    // Финализация и сохранение звонка (только с расчётным временем)
    async finalizeCall() {
        this.isInCall = false;
        chrome.alarms.clear('activeCallMonitor');
        
        // Создаём данные звонка только с расчётным временем
        const callData = {
            phone: this.currentCallData?.phone || 'Неизвестно',
            duration: this.calculatedDuration || '00:00:00',
            region: this.currentCallData?.region || 'Не указан',
            timestamp: Date.now(),
            source: 'calculated'
        };
        
        console.log('💾 Финализация звонка с расчётным временем:', callData);
        
        // Добавляем метаданные
        const finalCallData = {
            ...callData,
            completedAt: new Date().toISOString(),
            savedAt: Date.now(),
            callStartTime: this.callStartTime,
            callEndTime: this.callEndTime,
            calculatedDuration: this.calculatedDuration
        };
        
        // Добавляем в историю
        this.callHistory.unshift(finalCallData);
        if (this.callHistory.length > CONFIG.monitoring.maxCallHistory) {
            this.callHistory = this.callHistory.slice(0, CONFIG.monitoring.maxCallHistory);
        }
        
        // Сохраняем в chrome.storage
        await this.saveData();
        
        // Очищаем данные звонка
        this.currentCallData = null;
        this.callStartTime = null;
        this.callEndTime = null;
        this.calculatedDuration = null;
        
        console.log('✅ Звонок сохранен с расчётным временем');
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