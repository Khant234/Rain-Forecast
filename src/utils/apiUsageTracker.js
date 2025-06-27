// API Usage Tracker for Tomorrow.io
class APIUsageTracker {
  constructor() {
    this.storageKey = 'tomorrow_api_usage';
    this.limits = {
      daily: 500,
      hourly: 25,
      perSecond: 3
    };
  }

  // Get current usage stats
  getUsage() {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return this.initializeUsage();
    }
    
    const usage = JSON.parse(stored);
    
    // Reset if new day
    const today = new Date().toDateString();
    if (usage.date !== today) {
      return this.initializeUsage();
    }
    
    return usage;
  }

  // Initialize usage tracking
  initializeUsage() {
    const usage = {
      date: new Date().toDateString(),
      daily: 0,
      hourly: {},
      calls: []
    };
    localStorage.setItem(this.storageKey, JSON.stringify(usage));
    return usage;
  }

  // Track an API call
  trackCall() {
    const usage = this.getUsage();
    const now = new Date();
    const hour = now.getHours();
    
    // Increment counters
    usage.daily++;
    usage.hourly[hour] = (usage.hourly[hour] || 0) + 1;
    usage.calls.push(now.toISOString());
    
    // Clean old calls (keep last 100)
    if (usage.calls.length > 100) {
      usage.calls = usage.calls.slice(-100);
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(usage));
    
    return this.checkLimits(usage);
  }

  // Check if approaching limits
  checkLimits(usage) {
    const currentHour = new Date().getHours();
    const hourlyUsage = usage.hourly[currentHour] || 0;
    
    const warnings = [];
    
    // Check daily limit
    if (usage.daily >= this.limits.daily * 0.9) {
      warnings.push(`⚠️ Approaching daily limit: ${usage.daily}/${this.limits.daily}`);
    }
    
    // Check hourly limit
    if (hourlyUsage >= this.limits.hourly * 0.8) {
      warnings.push(`⚠️ Approaching hourly limit: ${hourlyUsage}/${this.limits.hourly}`);
    }
    
    // Check rate limit (calls in last second)
    const oneSecondAgo = Date.now() - 1000;
    const recentCalls = usage.calls.filter(call => 
      new Date(call).getTime() > oneSecondAgo
    ).length;
    
    if (recentCalls >= this.limits.perSecond) {
      warnings.push(`⚠️ Rate limit reached: ${recentCalls}/${this.limits.perSecond} per second`);
    }
    
    return {
      daily: usage.daily,
      hourly: hourlyUsage,
      warnings,
      canMakeCall: usage.daily < this.limits.daily && 
                   hourlyUsage < this.limits.hourly &&
                   recentCalls < this.limits.perSecond
    };
  }

  // Get usage report
  getReport() {
    const usage = this.getUsage();
    const currentHour = new Date().getHours();
    
    return {
      date: usage.date,
      daily: {
        used: usage.daily,
        limit: this.limits.daily,
        remaining: this.limits.daily - usage.daily,
        percentage: Math.round((usage.daily / this.limits.daily) * 100)
      },
      hourly: {
        used: usage.hourly[currentHour] || 0,
        limit: this.limits.hourly,
        remaining: this.limits.hourly - (usage.hourly[currentHour] || 0)
      },
      hourlyBreakdown: usage.hourly,
      recommendations: this.getRecommendations(usage)
    };
  }

  // Get recommendations based on usage
  getRecommendations(usage) {
    const recommendations = [];
    
    if (usage.daily > 100) {
      recommendations.push("Consider implementing server-side caching");
    }
    
    if (usage.daily > 300) {
      recommendations.push("You're using 60%+ of daily limit - upgrade may be needed");
    }
    
    // Find peak hours
    const peakHours = Object.entries(usage.hourly)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
    
    if (peakHours.length > 0) {
      recommendations.push(`Peak usage hours: ${peakHours.join(', ')}:00`);
    }
    
    return recommendations;
  }

  // Display usage in console
  displayUsage() {
    const report = this.getReport();
    
    // // // console.log('%c=== Tomorrow.io API Usage ===', 'color: #3b82f6; font-weight: bold');
    // // // console.log(`📅 Date: ${report.date}`);
    // // // console.log(`📊 Daily: ${report.daily.used}/${report.daily.limit} (${report.daily.percentage}%)`);
    // // // console.log(`⏰ Hourly: ${report.hourly.used}/${report.hourly.limit}`);
    
    if (report.recommendations.length > 0) {
      // // // console.log('%c💡 Recommendations:', 'color: #10b981');
      // // // report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    // Visual bar
    const barLength = 20;
    const filledLength = Math.round((report.daily.percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    // // // console.log(`Progress: [${bar}] ${report.daily.percentage}%`);
    
    return report;
  }
}

// Export singleton instance
export const apiTracker = new APIUsageTracker();

// Add to window for debugging
if (typeof window !== 'undefined') {
  window.apiTracker = apiTracker;
}

// Wrapper functions for easy import
const trackApiCall = () => {
  return apiTracker.trackCall();
};

const getApiUsage = () => {
  return apiTracker.getReport();
};

const logApiUsage = () => {
  apiTracker.displayUsage();
};

export { trackApiCall, getApiUsage, logApiUsage };