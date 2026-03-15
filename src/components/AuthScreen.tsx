import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabase/client';
import { checkUsernameUnique } from '../utils/supabase/api';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface AuthScreenProps {
  onAuthSuccess: (accessToken: string, user: any) => void;
  embedded?: boolean;
}

export function AuthScreen({ onAuthSuccess, embedded = false }: AuthScreenProps) {
  // Mode state
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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

  const handleGoogleSignIn = async () => {
    if (!isConfigured) {
      toast.error('Configuration Error', { description: 'Cannot proceed without database connection.' });
      return;
    }
    setIsGoogleSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error: any) {
      const message = error?.message || 'Google sign-in failed.';
      toast.error('Authentication Failed', { description: message });
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div
      className={`w-full flex items-center justify-center px-4 py-10 sm:px-6 ${
        embedded ? 'min-h-[60vh] bg-transparent' : 'min-h-[100dvh] bg-gray-50'
      }`}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold tracking-[0.3em] text-gray-500">EVENTZ</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {isLogin ? 'Sign in' : 'Create account'}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {isLogin ? 'Use your email and password to continue.' : 'Create an account to get started.'}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {!isConfigured && (
            <div className="flex items-center gap-2 border-b border-gray-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>Database configuration missing</span>
            </div>
          )}

          <Tabs
            value={isLogin ? 'login' : 'signup'}
            onValueChange={(v) => {
              const nextIsLogin = v === 'login';
              setIsLogin(nextIsLogin);
              setFormData({ email: '', password: '', fullName: '' });
              setIsSubmitting(false);
              setShowPassword(false);
            }}
            className="p-4"
          >
            <TabsList className="w-full bg-gray-100 rounded-xl">
              <TabsTrigger className="data-[state=active]:bg-white data-[state=active]:shadow-sm" value="login">
                Log in
              </TabsTrigger>
              <TabsTrigger className="data-[state=active]:bg-white data-[state=active]:shadow-sm" value="signup">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-800 block text-left">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-800 block text-left">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="block w-full h-11 pl-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-0 bottom-0 right-0 w-11 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isConfigured}
                  className="w-full h-11 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center justify-center">
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <div className="text-xs font-medium text-gray-500">OR</div>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting || isSubmitting || !isConfigured}
                className="mt-4 w-full h-11 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
              >
                {isGoogleSubmitting ? (
                  <span className="inline-flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Redirecting...
                  </span>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.658 29.264 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.964 3.036l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.027 12 24 12c3.059 0 5.842 1.154 7.964 3.036l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.354 4.327-17.694 10.691z"/>
                      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.243 0-9.623-3.319-11.273-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.215-2.262 4.087-4.084 5.57l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-800 block text-left">Full name</label>
                  <input
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="block w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                    placeholder="John Doe"
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-800 block text-left">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-800 block text-left">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="block w-full h-11 pl-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                      placeholder="At least 6 characters"
                      disabled={isSubmitting}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-0 bottom-0 right-0 w-11 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isConfigured}
                  className="w-full h-11 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center justify-center">
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </span>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <div className="text-xs font-medium text-gray-500">OR</div>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting || isSubmitting || !isConfigured}
                className="mt-4 w-full h-11 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
              >
                {isGoogleSubmitting ? (
                  <span className="inline-flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Redirecting...
                  </span>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.658 29.264 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.964 3.036l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.027 12 24 12c3.059 0 5.842 1.154 7.964 3.036l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.354 4.327-17.694 10.691z"/>
                      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.243 0-9.623-3.319-11.273-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.215-2.262 4.087-4.084 5.57l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
}
