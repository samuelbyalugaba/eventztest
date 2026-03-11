import { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Video, Loader2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';
import { checkUsernameUnique } from '../utils/supabase/api';
import { toast } from 'sonner';

interface AuthScreenProps {
  onAuthSuccess: (accessToken: string, user: any) => void;
  embedded?: boolean;
}

export function AuthScreen({ onAuthSuccess, embedded = false }: AuthScreenProps) {
  // Mode state
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  // Configuration check
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);
    if (!configured) {
      toast.error('System Error', {
        description: 'Database connection is missing. Please check your configuration.',
        duration: Infinity,
      });
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast.error('Missing Fields', { description: 'Please fill in all required fields.' });
      return false;
    }
    if (!isLogin && !formData.fullName) {
      toast.error('Missing Name', { description: 'Please enter your full name.' });
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Weak Password', { description: 'Password must be at least 6 characters long.' });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Invalid Email', { description: 'Please enter a valid email address.' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      toast.error('Configuration Error', { description: 'Cannot proceed without database connection.' });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isLogin) {
        // LOGIN FLOW
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        if (data.session && data.user) {
          let userName = data.user.user_metadata?.name || data.user.email || 'User';
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('id', data.user.id)
              .single();

            const displayFromProfile =
              profile?.full_name ||
              (profile?.username ? `@${String(profile.username).replace(/^@/, '')}` : null);

            if (displayFromProfile) userName = displayFromProfile;
          } catch {}

          toast.success('Welcome back!', { description: `Signed in as ${userName}` });
          onAuthSuccess(data.session.access_token, data.user);
        }
      } else {
        // SIGNUP FLOW
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.fullName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Create user profile
          if (data.session) {
            // Generate unique username
            const baseUsername = formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
            let finalUsername = baseUsername;
            let isUnique = await checkUsernameUnique(finalUsername);
            
            if (!isUnique) {
              let counter = 1;
              while (counter <= 10) {
                const candidate = `${baseUsername}${counter}`;
                if (await checkUsernameUnique(candidate)) {
                  finalUsername = candidate;
                  isUnique = true;
                  break;
                }
                counter++;
              }
              if (!isUnique) {
                 finalUsername = `${baseUsername}${Math.floor(Date.now() % 10000)}`;
              }
            }

            const { error: profileError } = await supabase
              .from('profiles')
              .upsert([
                {
                  id: data.user.id,
                  email: formData.email,
                  full_name: formData.fullName,
                  username: finalUsername,
                  avatar_url: null,
                }
              ], { onConflict: 'id', ignoreDuplicates: true });
            
            if (profileError) {
              console.error('Profile creation failed:', profileError);
              // Continue anyway as auth succeeded
            }

            toast.success('Account Created!', { description: `Welcome to Eventz, ${formData.fullName}!` });
            onAuthSuccess(data.session.access_token, data.user);
          } else {
            // Email confirmation required case
            toast.success('Signup Successful', { description: 'Please check your email to confirm your account.' });
            setIsLogin(true);
            setFormData(prev => ({ ...prev, password: '' }));
          }
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let message = error.message || 'An unexpected error occurred.';
      if (message.includes('Invalid login credentials')) message = 'Incorrect email or password.';
      if (message.includes('User already registered')) message = 'This email is already registered. Please login.';
      
      toast.error('Authentication Failed', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 ${embedded ? 'min-h-[60vh] bg-transparent' : 'min-h-[100dvh] bg-gradient-to-br from-indigo-50 via-white to-purple-50'}`}>
      <div className="w-full max-w-md space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">EVENTZ</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-gray-500">
            {isLogin 
              ? 'Enter your credentials to access your account' 
              : 'Start your journey with the ultimate event hub'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-100/50 relative overflow-hidden">
          
          {/* Config Error Banner */}
          {!isConfigured && (
            <div className="absolute inset-x-0 top-0 bg-red-500/10 border-b border-red-500/20 p-3 flex items-center justify-center gap-2 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>Database configuration missing</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            
            {/* Full Name (Signup only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 block text-left">Full Name</label>
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-0 w-12 flex items-center justify-center pointer-events-none text-gray-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="block w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none font-medium"
                    placeholder="John Doe"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1 block text-left">Email Address</label>
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-0 w-12 flex items-center justify-center pointer-events-none text-gray-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none font-medium"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1 block text-left">Password</label>
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-0 w-12 flex items-center justify-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none font-medium"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-0 bottom-0 right-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isConfigured}
              className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Processing...
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ email: '', password: '', fullName: '' });
                  setIsSubmitting(false);
                }}
                className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
