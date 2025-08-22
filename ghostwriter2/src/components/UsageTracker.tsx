import React, { useState, useEffect } from 'react';
import './UsageTracker.css';

interface UsageStats {
  provider: string;
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
}

interface UsageTrackerProps {
  onRateLimitWarning?: (provider: string, message: string) => void;
}

const UsageTracker: React.FC<UsageTrackerProps> = ({ onRateLimitWarning }) => {
  const [todayStats, setTodayStats] = useState<UsageStats[]>([]);
  const [weekStats, setWeekStats] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load usage stats
  const loadUsageStats = async () => {
    if (!window.electronAPI) return;

    try {
      setLoading(true);
      
      // Get today's stats
      const todayResult = await window.electronAPI.getUsageStats({ timeframe: 'today' });
      if (todayResult.success && todayResult.stats) {
        setTodayStats(todayResult.stats);
      }

      // Get week's stats
      const weekResult = await window.electronAPI.getUsageStats({ timeframe: 'week' });
      if (weekResult.success && weekResult.stats) {
        setWeekStats(weekResult.stats);
      }

      setError('');
    } catch (err) {
      console.error('Error loading usage stats:', err);
      setError('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  // Load stats on mount and set up refresh interval
  useEffect(() => {
    loadUsageStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUsageStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate totals
  const todayTotals = todayStats.reduce((acc, stat) => ({
    calls: acc.calls + stat.total_calls,
    tokens: acc.tokens + stat.total_tokens,
    cost: acc.cost + stat.total_cost_usd
  }), { calls: 0, tokens: 0, cost: 0 });

  const weekTotals = weekStats.reduce((acc, stat) => ({
    calls: acc.calls + stat.total_calls,
    tokens: acc.tokens + stat.total_tokens,
    cost: acc.cost + stat.total_cost_usd
  }), { calls: 0, tokens: 0, cost: 0 });

  // Provider icons and colors
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖';
      case 'claude': return '🧠';
      case 'gemini': return '💎';
      case 'grok': return '🚀';
      default: return '🔧';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return '#10a37f';
      case 'claude': return '#cc785c';
      case 'gemini': return '#4285f4';
      case 'grok': return '#1d9bf0';
      default: return '#6b7280';
    }
  };

  // Format cost
  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="usage-tracker">
        <div className="usage-header">
          <h3>📊 API Usage</h3>
        </div>
        <div className="usage-loading">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usage-tracker">
        <div className="usage-header">
          <h3>📊 API Usage</h3>
        </div>
        <div className="usage-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="usage-tracker">
      <div className="usage-header">
        <h3>📊 API Usage</h3>
        <button 
          className="refresh-button" 
          onClick={loadUsageStats}
          title="Refresh statistics"
        >
          🔄
        </button>
      </div>

      {/* Today's Usage */}
      <div className="usage-section">
        <h4>Today</h4>
        <div className="usage-summary">
          <div className="usage-metric">
            <span className="metric-value">{todayTotals.calls}</span>
            <span className="metric-label">Requests</span>
          </div>
          <div className="usage-metric">
            <span className="metric-value">{formatNumber(todayTotals.tokens)}</span>
            <span className="metric-label">Tokens</span>
          </div>
          <div className="usage-metric">
            <span className="metric-value">{formatCost(todayTotals.cost)}</span>
            <span className="metric-label">Cost</span>
          </div>
        </div>

        {todayStats.length > 0 && (
          <div className="provider-breakdown">
            {todayStats.map(stat => (
              <div key={stat.provider} className="provider-stat">
                <div 
                  className="provider-indicator"
                  style={{ backgroundColor: getProviderColor(stat.provider) }}
                >
                  {getProviderIcon(stat.provider)}
                </div>
                <div className="provider-details">
                  <span className="provider-name">
                    {stat.provider.charAt(0).toUpperCase() + stat.provider.slice(1)}
                  </span>
                  <span className="provider-usage">
                    {stat.total_calls} calls, {formatCost(stat.total_cost_usd)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week Summary */}
      {weekTotals.calls > 0 && (
        <div className="usage-section">
          <h4>This Week</h4>
          <div className="usage-summary">
            <div className="usage-metric">
              <span className="metric-value">{weekTotals.calls}</span>
              <span className="metric-label">Requests</span>
            </div>
            <div className="usage-metric">
              <span className="metric-value">{formatNumber(weekTotals.tokens)}</span>
              <span className="metric-label">Tokens</span>
            </div>
            <div className="usage-metric">
              <span className="metric-value">{formatCost(weekTotals.cost)}</span>
              <span className="metric-label">Cost</span>
            </div>
          </div>
        </div>
      )}

      {/* No usage message */}
      {todayTotals.calls === 0 && weekTotals.calls === 0 && (
        <div className="no-usage">
          <p>No API usage yet</p>
          <small>Usage will appear here once you start using AI features</small>
        </div>
      )}
    </div>
  );
};

export default UsageTracker;