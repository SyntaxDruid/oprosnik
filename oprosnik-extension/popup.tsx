import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Типы для данных расширения
interface CallData {
  phone: string;
  duration: string;
  region: string;
  timestamp: number;
  source?: 'interface' | 'calculated';
  completedAt: string;
}

interface ExtensionStatus {
  monitoring: boolean;
  finesse: boolean;
  agentStatus: string | null;
  lastUpdate: number | null;
}

interface Stats {
  todayCount: number;
  totalCount: number;
  avgDuration: number;
}

// Иконки как простые SVG
const Phone = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MapPin = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Search = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const Download = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const Activity = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const OprosnikHelperPopup: React.FC = () => {
  const [status, setStatus] = useState<ExtensionStatus>({
    monitoring: false,
    finesse: false,
    agentStatus: null,
    lastUpdate: null
  });
  
  const [callHistory, setCallHistory] = useState<CallData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'current' | 'history' | 'stats'>('current');
  const [loading, setLoading] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef<number>(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Получаем данные из chrome.storage
        const data = await chrome.storage.local.get([
          'callHistory',
          'lastAgentStatus',
          'lastUpdate'
        ]);
        
        // Проверяем наличие вкладки Finesse
        const tabs = await chrome.tabs.query({
          url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*"
        });

        setCallHistory(data.callHistory || []);
        setStatus({
          monitoring: tabs.length > 0,
          finesse: tabs.length > 0,
          agentStatus: data.lastAgentStatus || null,
          lastUpdate: data.lastUpdate || Date.now()
        });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Функция для обновления без сброса скролла
    const updateData = async () => {
      try {
        // Сохраняем текущую позицию скролла
        if (scrollRef.current) {
          scrollPosition.current = scrollRef.current.scrollTop;
        }
        
        const data = await chrome.storage.local.get([
          'callHistory',
          'lastAgentStatus',
          'lastUpdate'
        ]);
        
        const tabs = await chrome.tabs.query({
          url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*"
        });

        setCallHistory(data.callHistory || []);
        setStatus({
          monitoring: tabs.length > 0,
          finesse: tabs.length > 0,
          agentStatus: data.lastAgentStatus || null,
          lastUpdate: data.lastUpdate || Date.now()
        });
      } catch (error) {
        console.error('Error updating data:', error);
      }
    };

    loadData();
    const interval = setInterval(updateData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Восстановление позиции скролла после обновления данных
  useEffect(() => {
    if (scrollRef.current && !loading && scrollPosition.current > 0) {
      // Восстанавливаем позицию скролла после рендера
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollPosition.current;
        }
      });
    }
  }, [callHistory, loading]);

  // Фильтрация истории по поисковому запросу
  const filteredHistory = useMemo(() => {
    if (!searchQuery) return callHistory;
    
    const query = searchQuery.toLowerCase();
    return callHistory.filter(call => 
      call.phone.includes(query) ||
      call.region.toLowerCase().includes(query)
    );
  }, [callHistory, searchQuery]);

  // Статистика
  const stats = useMemo((): Stats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCalls = callHistory.filter(call => 
      new Date(call.timestamp) >= today
    );

    const totalDuration = callHistory.reduce((sum, call) => {
      const [h, m, s] = call.duration.split(':').map(Number);
      return sum + h * 3600 + m * 60 + s;
    }, 0);

    return {
      todayCount: todayCalls.length,
      totalCount: callHistory.length,
      avgDuration: callHistory.length ? Math.floor(totalDuration / callHistory.length) : 0
    };
  }, [callHistory]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    
    const days = Math.floor(hours / 24);
    return `${days} дн. назад`;
  };

  const exportToCSV = () => {
    const headers = ['Телефон', 'Длительность', 'Регион', 'Время', 'Источник'];
    const rows = callHistory.map(call => [
      call.phone,
      call.duration,
      call.region,
      new Date(call.timestamp).toLocaleString('ru-RU'),
      call.source || 'unknown'
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calls_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const StatusIndicator: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
      <span className={`text-sm ${active ? 'text-green-600' : 'text-red-600'}`}>{label}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="w-96 h-96 flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-96 bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Oprosnik Helper v4.0</h1>
          <Activity className="w-5 h-5" />
        </div>
        
        <div className="flex gap-4 text-sm">
          <StatusIndicator active={status.monitoring} label="Мониторинг" />
          <StatusIndicator active={status.finesse} label="Finesse" />
        </div>
        
        {status.agentStatus && (
          <div className="mt-2 text-sm opacity-90">
            Статус: <span className="font-medium">{status.agentStatus}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setSelectedTab('current')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'current' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Текущий статус
        </button>
        <button
          onClick={() => setSelectedTab('history')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'history' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          История ({callHistory.length})
        </button>
        <button
          onClick={() => setSelectedTab('stats')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'stats' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Статистика
        </button>
      </div>

      {/* Content */}
      <div 
        className="p-4 h-80 overflow-y-auto"
        ref={scrollRef}
      >
        {selectedTab === 'current' && (
          <div className="space-y-4">
            {callHistory.length > 0 ? (
              <>
                <h3 className="font-medium text-gray-700 mb-2">Последний звонок</h3>
                <CallCard call={callHistory[0]} isLast={true} />
                
                {!status.finesse && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Вкладка Finesse не найдена</p>
                      <p className="mt-1">Откройте Cisco Finesse для автоматического сбора данных</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Нет сохраненных звонков</p>
                <p className="text-sm mt-1">Данные появятся после первого звонка</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'history' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по телефону или региону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {filteredHistory.length > 0 ? (
              <div className="space-y-2">
                {filteredHistory.map((call, index) => (
                  <CallCard key={index} call={call} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Ничего не найдено</p>
              </div>
            )}

            <button
              onClick={exportToCSV}
              className="w-full mt-4 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Экспорт в CSV
            </button>
          </div>
        )}

        {selectedTab === 'stats' && (
          <div className="space-y-4">
            <StatCard
              icon={<Phone className="w-5 h-5 text-blue-500" />}
              label="Звонков сегодня"
              value={stats.todayCount.toString()}
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-green-500" />}
              label="Средняя длительность"
              value={formatDuration(stats.avgDuration)}
            />
            <StatCard
              icon={<Activity className="w-5 h-5 text-purple-500" />}
              label="Всего звонков"
              value={stats.totalCount.toString()}
            />
            
            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium text-gray-700 mb-3">Распределение по регионам</h3>
              <RegionChart history={callHistory} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CallCard: React.FC<{ call: CallData; isLast?: boolean }> = ({ call, isLast = false }) => {
  const sourceIcon = call.source === 'calculated' ? '⚡' : '📊';
  
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    
    const days = Math.floor(hours / 24);
    return `${days} дн. назад`;
  };
  
  return (
    <div className={`border rounded-lg p-3 hover:bg-gray-50 transition-colors ${
      isLast ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{call.phone}</span>
            {isLast && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Последний</span>}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {call.duration}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {call.region}
            </span>
            <span title={call.source === 'calculated' ? 'Вычислено' : 'Из интерфейса'}>
              {sourceIcon}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {formatRelativeTime(call.timestamp)}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
    {icon}
    <div className="flex-1">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

const RegionChart: React.FC<{ history: CallData[] }> = ({ history }) => {
  const regionCounts = history.reduce((acc, call) => {
    acc[call.region] = (acc[call.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const maxCount = Math.max(...Object.values(regionCounts));
  
  return (
    <div className="space-y-2">
      {Object.entries(regionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([region, count]) => (
          <div key={region} className="flex items-center gap-2">
            <span className="text-sm w-24 truncate">{region}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
              <span className="absolute right-2 top-0.5 text-xs text-gray-700">{count}</span>
            </div>
          </div>
        ))}
    </div>
  );
};

// Инициализация React приложения
const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<OprosnikHelperPopup />);
}

export default OprosnikHelperPopup;