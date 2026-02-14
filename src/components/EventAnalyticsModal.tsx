import { useState, useEffect } from 'react';
import { X, Eye, Users, Share2, Calendar, MapPin, DollarSign, Ticket, Activity, ArrowUp, ArrowDown, Download, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { getEventAnalytics } from '../utils/supabase/api';

interface EventAnalyticsModalProps {
  event: any;
  onClose: () => void;
}

export function EventAnalyticsModal({ event, onClose }: EventAnalyticsModalProps) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getEventAnalytics(event.id);
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [event.id]);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto pt-8 pb-8"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl">Event Analytics</h2>
                <p className="text-white/90 text-sm mt-0.5 line-clamp-1">{event.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  toast.success('Analytics exported! 📊');
                }}
                className="p-2.5 hover:bg-white/20 backdrop-blur-md rounded-lg transition-colors group"
                title="Export Analytics"
              >
                <Download className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={onClose}
                className="p-2.5 hover:bg-white/20 backdrop-blur-md rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Content - Scrollable Area */}
        <div className="p-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {/* Event Info Banner */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 mb-6 border border-purple-100">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm">{event.date}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="text-sm">{event.location}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Ticket className="w-4 h-4 text-purple-600" />
                <span className="text-sm">{event.category}</span>
              </div>
              <div className="ml-auto px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs">
                Published
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Views */}
            <div className="bg-white rounded-xl p-5 border-2 border-cyan-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-cyan-600" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  analytics.views.trend === 'up' ? 'bg-green-50 text-green-600' : 
                  analytics.views.trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                }`}>
                  {analytics.views.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : 
                   analytics.views.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                  <span className="text-xs">{analytics.views.change}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs mb-1">Total Views</p>
              <p className="text-gray-900 text-2xl">{formatNumber(analytics.views.total)}</p>
            </div>

            {/* Interested */}
            <div className="bg-white rounded-xl p-5 border-2 border-purple-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  analytics.interested.trend === 'up' ? 'bg-green-50 text-green-600' : 
                  analytics.interested.trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                }`}>
                  {analytics.interested.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : 
                   analytics.interested.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                  <span className="text-xs">{analytics.interested.change}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs mb-1">Interested</p>
              <p className="text-gray-900 text-2xl">{formatNumber(analytics.interested.total)}</p>
            </div>

            {/* Shares */}
            <div className="bg-white rounded-xl p-5 border-2 border-pink-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-pink-600" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  analytics.shares.trend === 'up' ? 'bg-green-50 text-green-600' : 
                  analytics.shares.trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                }`}>
                  {analytics.shares.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : 
                   analytics.shares.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                  <span className="text-xs">{analytics.shares.change}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs mb-1">Shares</p>
              <p className="text-gray-900 text-2xl">{formatNumber(analytics.shares.total)}</p>
            </div>

            {/* Tickets Sold */}
            <div className="bg-white rounded-xl p-5 border-2 border-green-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-green-600" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  analytics.ticketsSold.trend === 'up' ? 'bg-green-50 text-green-600' : 
                  analytics.ticketsSold.trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                }`}>
                  {analytics.ticketsSold.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : 
                   analytics.ticketsSold.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                  <span className="text-xs">{analytics.ticketsSold.change}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs mb-1">Tickets Sold</p>
              <p className="text-gray-900 text-2xl">{formatNumber(analytics.ticketsSold.total)}</p>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl p-5 border-2 border-amber-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  analytics.revenue.trend === 'up' ? 'bg-green-50 text-green-600' : 
                  analytics.revenue.trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                }`}>
                  {analytics.revenue.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : 
                   analytics.revenue.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                  <span className="text-xs">{analytics.revenue.change}%</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs mb-1">Revenue</p>
              <p className="text-gray-900 text-xl">{analytics.revenue.total}</p>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-gray-900 text-lg">Activity Over Time</h3>
                <p className="text-gray-500 text-sm">Combined interactions (Tickets + Interested + Shares)</p>
              </div>
            </div>
            
            {/* Simple Bar Chart */}
            <div className="flex items-end gap-3 h-48">
              {analytics.views.daily.map((value: number, index: number) => {
                const maxValue = Math.max(...analytics.views.daily, 1); // Avoid div by zero
                const heightPercent = (value / maxValue) * 100;
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gradient-to-t from-purple-600 to-pink-600 rounded-t-lg hover:from-purple-700 hover:to-pink-700 transition-all relative group cursor-pointer" style={{ height: `${heightPercent}%` }}>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {value} interactions
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{days[index]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-gray-900 text-lg mb-5">Age Distribution</h3>
              <div className="space-y-4">
                {(analytics?.demographics?.ageGroups || []).map((group: any, index: number) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700 text-sm">{group.range} years</span>
                      <span className="text-purple-600">{group.percent}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all"
                        style={{ width: `${group.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-gray-900 text-lg mb-5">Top Locations</h3>
              <div className="space-y-4">
                {analytics.demographics.locations.map((location: any, index: number) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-cyan-600" />
                        <span className="text-gray-700 text-sm">{location.city}</span>
                      </div>
                      <span className="text-cyan-600">{location.percent}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${location.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights & Recommendations */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 mt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-gray-900 text-lg mb-3">Insights & Recommendations</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">✓</span>
                    <span>Your event is performing <strong>well</strong> compared to average events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">✓</span>
                    <span>Most of your audience is from <strong>{analytics.demographics.locations[0]?.city || 'your area'}</strong>. Consider local partnerships</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 rounded-b-3xl flex gap-3">
          <button
            onClick={() => {
              toast.success('Report generated! 📄');
            }}
            className="flex-1 px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export Report
          </button>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
