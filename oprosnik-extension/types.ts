// types.ts - Типизация данных
interface CallData {
  phone: string;
  duration: string;
  region: string;
  timestamp: number;
  source?: 'interface' | 'calculated';
  capturedAt?: string;
  completedAt?: string;
  savedAt?: number;
  callStartTime?: number;
  callEndTime?: number;
  calculatedDuration?: string;
}

interface AgentStatus {
  status: string;
  timestamp: number;
}

// EventBus.ts - Централизованная система событий
class EventBus {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, handler: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    this.events.get(event)?.delete(handler);
  }

  emit(event: string, data?: any): void {
    this.events.get(event)?.forEach(handler => handler(data));
  }
}

// CallStorage.ts - Улучшенное хранилище с синхронизацией
class CallStorage {
  private readonly STORAGE_KEY = 'callHistory';
  private readonly MAX_HISTORY = 50;
  private cache: CallData[] = [];

  async initialize(): Promise<void> {
    const data = await chrome.storage.local.get(this.STORAGE_KEY);
    this.cache = data[this.STORAGE_KEY] || [];
  }

  async addCall(call: CallData): Promise<void> {
    this.cache.unshift(call);
    if (this.cache.length > this.MAX_HISTORY) {
      this.cache = this.cache.slice(0, this.MAX_HISTORY);
    }
    await this.save();
  }

  async getHistory(limit?: number): Promise<CallData[]> {
    return limit ? this.cache.slice(0, limit) : [...this.cache];
  }

  async getLastCall(): Promise<CallData | null> {
    return this.cache[0] || null;
  }

  async search(query: {
    phone?: string;
    region?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<CallData[]> {
    return this.cache.filter(call => {
      if (query.phone && !call.phone.includes(query.phone)) return false;
      if (query.region && call.region !== query.region) return false;
      if (query.dateFrom && call.timestamp < query.dateFrom.getTime()) return false;
      if (query.dateTo && call.timestamp > query.dateTo.getTime()) return false;
      return true;
    });
  }

  private async save(): Promise<void> {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: this.cache });
  }

  // Экспорт в CSV
  exportToCSV(): string {
    const headers = ['Телефон', 'Длительность', 'Регион', 'Время', 'Источник'];
    const rows = this.cache.map(call => [
      call.phone,
      call.duration,
      call.region,
      new Date(call.timestamp).toLocaleString('ru-RU'),
      call.source || 'unknown'
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csv;
  }
}

// FinesseMonitor.ts - Улучшенный мониторинг с retry и error handling
class FinesseMonitor {
  private tabId: number | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly eventBus: EventBus;
  private monitoringInterval: number | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async start(): Promise<void> {
    try {
      await this.findFinesseTab();
      this.startMonitoring();
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      this.scheduleRetry();
    }
  }

  private async findFinesseTab(): Promise<void> {
    const tabs = await chrome.tabs.query({
      url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*"
    });

    if (tabs.length === 0) {
      throw new Error('Finesse tab not found');
    }

    this.tabId = tabs[0].id;
    this.retryCount = 0;
    this.eventBus.emit('finesse:connected', { tabId: this.tabId });
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = window.setInterval(() => {
      this.checkStatus();
    }, 1000);
  }

  private async checkStatus(): Promise<void> {
    if (!this.tabId) return;

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: this.extractPageData,
        world: 'MAIN'
      });

      if (results?.[0]?.result) {
        this.processData(results[0].result);
      }
    } catch (error) {
      console.error('Status check failed:', error);
      this.handleError();
    }
  }

  private extractPageData(): any {
    // Улучшенная версия с более надежными селекторами
    const data: any = {
      status: null,
      callData: null,
      timestamp: Date.now()
    };

    // Извлечение статуса с fallback
    const statusSelectors = [
      '#voice-state-select-headerOptionText',
      '[data-testid="agent-status"]',
      '.agent-state-text'
    ];

    for (const selector of statusSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        data.status = element.textContent.trim();
        break;
      }
    }

    // Извлечение данных звонка
    if (data.status === 'Разговор' || data.status === 'Завершение') {
      data.callData = {
        phone: this.extractPhone(),
        duration: this.extractDuration(),
        region: this.extractRegion()
      };
    }

    return data;
  }

  private extractPhone(): string | null {
    const selectors = [
      '[aria-label*="Участник"]',
      '.participant-number',
      '[data-testid="caller-number"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        // Очистка номера от лишних символов
        return el.textContent.replace(/\D/g, '');
      }
    }
    return null;
  }

  private extractDuration(): string | null {
    // Поиск таймера с использованием регулярного выражения
    const allElements = document.querySelectorAll('*');
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;

    for (const element of allElements) {
      const text = element.textContent?.trim();
      if (text && timeRegex.test(text)) {
        // Проверяем, что это не вложенный элемент
        if (element.childElementCount === 0) {
          return text;
        }
      }
    }
    return null;
  }

  private extractRegion(): string | null {
    const selectors = [
      '[class*="callVariableValue"] span',
      '[id*="call-header-variable-value"]',
      '[data-testid="call-region"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        return el.textContent.trim();
      }
    }
    return null;
  }

  private processData(data: any): void {
    this.eventBus.emit('finesse:data', data);
  }

  private handleError(): void {
    this.tabId = null;
    this.eventBus.emit('finesse:disconnected');
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    if (this.retryCount >= this.MAX_RETRIES) {
      console.error('Max retries reached');
      return;
    }

    this.retryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    
    setTimeout(() => {
      this.start();
    }, delay);
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}