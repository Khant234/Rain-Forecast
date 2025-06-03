import React, { useState, useEffect } from 'react';
import { Activity, Database, TrendingUp, Users } from 'lucide-react';

const ProxyStats = ({ darkMode }) => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001/api/weather';
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${proxyUrl.replace('/api/weather', '')}/api/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [proxyUrl]);
  
  if (error) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
        <p className="text-red-500">Proxy Stats Error: {error}</p>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <p className="animate-pulse">Loading proxy stats...</p>
      </div>
    );
  }
  
  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className={`p-3 sm:p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {label}
          </p>
          <p className={`text-lg sm:text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {value}
          </p>
        </div>
        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${color}`} />
      </div>
    </div>
  );
  
  return (
    <div className="space-y-3 sm:space-y-4">
      <h2 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        Proxy Server Statistics
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          icon={Activity}
          label="Total Requests"
          value={stats.stats?.totalRequests || 0}
          color="text-blue-500"
        />
        <StatCard
          icon={Database}
          label="Cache Hit Rate"
          value={stats.stats?.cacheHitRate || '0%'}
          color="text-green-500"
        />
        <StatCard
          icon={TrendingUp}
          label="API Calls Saved"
          value={stats.stats?.cacheHits || 0}
          color="text-purple-500"
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={stats.estimatedUsers || 0}
          color="text-orange-500"
        />
      </div>
      
      {/* API Key Usage */}
      <div className={`p-3 sm:p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <h3 className={`text-sm sm:text-base font-semibold mb-2 sm:mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          API Key Usage
        </h3>
        <div className="space-y-2">
          {stats.apiKeys?.map((key) => (
            <div key={key.id} className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Key {key.id}
                </span>
                <span className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Daily: {key.daily} | Hourly: {key.hourly}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(parseInt(key.daily.split('/')[0]) / 500) * 100}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Capacity Indicator */}
      <div className={`p-3 sm:p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="flex justify-between items-center">
          <div>
            <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Max User Capacity
            </p>
            <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {stats.maxCapacity?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Savings Rate
            </p>
            <p className={`text-lg sm:text-xl md:text-2xl font-bold text-green-500`}>
              {stats.stats?.savingsRate || '0%'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProxyStats;