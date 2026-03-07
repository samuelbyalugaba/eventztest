import { Users, Zap, TrendingUp, CheckCircle, ArrowRight, Video, DollarSign, BarChart3, Globe, Shield, Headphones, PenTool, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { updateProfile, getPlatformStats, getProfile } from '../utils/supabase/api';

const isAbortError = (error: any) => {
  if (!error) return false;
  const name = (error as any).name;
  const message = (error as any).message;
  const details = (error as any).details;
  if (name === 'AbortError') return true;
  if (typeof message === 'string' && message.includes('AbortError')) return true;
  if (details && typeof details === 'object' && (details as any).name === 'AbortError') return true;
  if (typeof details === 'string' && details.includes('AbortError')) return true;
  return false;
};

interface BecomeOrganizerProps {
  onComplete: () => void;
}

export function BecomeOrganizer({ onComplete }: BecomeOrganizerProps) {
  const [stats, setStats] = useState({ activeUsers: 0, ticketsSold: 0, eventsHosted: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getPlatformStats();
        setStats(data);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.error('Error fetching platform stats:', error);
      }
    };
    fetchStats();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K+';
    return num.toString();
  };

  const handleBecomeOrganizer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to become an organizer');
        return;
      }

      // Check if profile exists first
      const profile = await getProfile(user.id);
      if (!profile) {
        toast.error('User profile not found. Please update your profile first.');
        return;
      }

      // Proceed to setup directly - we don't update profile here due to RLS policies
      onComplete();
    } catch (error: any) {
      console.error('Error becoming organizer:', error);
      toast.error(error.message || 'Failed to proceed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-purple-50 pb-20">
      {/* Hero Section */}
      <div className="relative bg-[#8A2BE2] px-6 pt-16 pb-20 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Icon - Smaller */}
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce">
            <Star className="w-8 h-8 text-white" fill="currentColor" />
          </div>

          {/* Title - Smaller Font */}
          <h1 className="text-white text-3xl sm:text-4xl mb-4">
            Become a Creator
          </h1>
          <p className="text-white/95 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
            Create events, stream live in HD, and reach thousands of people worldwide.
          </p>

          {/* Stats - Professional & Compact */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex flex-col items-center gap-2">
                <Users className="w-7 h-7 text-white/90" />
                <p className="text-white text-2xl">{formatNumber(stats.activeUsers)}</p>
                <p className="text-white/80 text-xs leading-tight">Active Users</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className="w-7 h-7 text-white/90" />
                <p className="text-white text-2xl">{formatNumber(stats.ticketsSold)}</p>
                <p className="text-white/80 text-xs leading-tight">Tickets Sold</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex flex-col items-center gap-2">
                <Zap className="w-7 h-7 text-white/90" />
                <p className="text-white text-2xl">{formatNumber(stats.eventsHosted)}</p>
                <p className="text-white/80 text-xs leading-tight">Events Hosted</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button 
            onClick={handleBecomeOrganizer}
            className="bg-white text-purple-700 px-10 py-5 rounded-2xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 mx-auto group text-lg"
          >
            <span>Start Creating Events</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-gray-900 text-3xl mb-3">Why Choose EVENTZ?</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Everything you need to create, manage, and monetize world-class events
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-gray-900 text-xl mb-2">HD Live Streaming</h3>
            <p className="text-gray-600 leading-relaxed">
              Stream your events in crystal-clear HD with multi-camera angles, live chat, and interactive features
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-gray-900 text-xl mb-2">Monetization Tools</h3>
            <p className="text-gray-600 leading-relaxed">
              Sell tickets, offer VIP packages, and generate revenue with virtual tickets and exclusive content
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-pink-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-gray-900 text-xl mb-2">Real-Time Analytics</h3>
            <p className="text-gray-600 leading-relaxed">
              Track attendance, engagement, revenue, and viewer insights with powerful analytics dashboard
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
            <div className="w-16 h-16 bg-[#8A2BE2] rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-gray-900 text-xl mb-2">Massive Reach</h3>
            <p className="text-gray-600 leading-relaxed">
              Connect with 50,000+ active users actively searching for events and experiences
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-gray-900 text-xl mb-2">Global Distribution</h3>
            <p className="text-gray-600 leading-relaxed">
              Reach audiences worldwide with location-based discovery and international payment support
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-purple-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-gray-900 text-xl mb-2">Secure & Reliable</h3>
            <p className="text-gray-600 leading-relaxed">
              Enterprise-grade security, reliable streaming infrastructure, and instant payouts
            </p>
          </div>
        </div>

        {/* What You'll Get Section */}
        <div className="bg-purple-50 rounded-3xl p-8 md:p-12 border border-purple-100">
          <h3 className="text-gray-900 text-2xl mb-6 text-center">What You'll Get</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 mb-1">Unlimited Events & Live Streams</p>
                <p className="text-gray-600 text-sm">Create as many events as you want with no restrictions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 mb-1">Advanced Analytics Dashboard</p>
                <p className="text-gray-600 text-sm">Real-time insights into attendance and revenue</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 mb-1">Ticket Management System</p>
                <p className="text-gray-600 text-sm">QR codes, digital tickets, and instant validation</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 mb-1">HD Streaming Infrastructure</p>
                <p className="text-gray-600 text-sm">Multi-camera support, chat, reactions, and replays</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 mb-1">Payment Processing</p>
                <p className="text-gray-600 text-sm">Secure payments with instant payouts to your account</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 mb-1">24/7 Support</p>
                <p className="text-gray-600 text-sm">Dedicated support team to help you succeed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-12">
          <button 
            onClick={handleBecomeOrganizer}
            className="bg-[#8A2BE2] text-white px-12 py-5 rounded-2xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto group text-lg"
          >
            <Star className="w-6 h-6" fill="currentColor" />
            <span>Get Started Now</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
          <p className="text-gray-500 text-sm mt-4">
            Free to start • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
