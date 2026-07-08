import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../utils/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../utils/legal';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthSubmit } from '../hooks/useAuthSubmit';
import { useOAuthNative } from '../hooks/useOAuthNative';
import { useEmailActions } from '../hooks/useEmailActions';
import { AuthHeader } from './auth/AuthHeader';
import { EmailField } from './auth/EmailField';
import { PasswordField } from './auth/PasswordField';
import { SubmitButton } from './auth/SubmitButton';
import { OAuthButtons } from './auth/OAuthButtons';
import { OrDivider } from './auth/OrDivider';

interface AuthScreenProps {
  onAuthSuccess: (accessToken: string, user: any) => void;
  embedded?: boolean;
}

export function AuthScreen({ onAuthSuccess, embedded = false }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);
    if (!configured) {
      toast.error('System Error', {
        description: 'Database connection is missing. Please check your configuration.',
        duration: 4500,
      });
    }
  }, []);

  const { formData, setFormData, handleInputChange, resetForm } = useAuthForm();
  const { handleSubmit, isSubmitting, resetSubmitState } = useAuthSubmit(
    isLogin,
    formData,
    isConfigured,
    onAuthSuccess,
    () => { setIsLogin(true); setFormData(prev => ({ ...prev, password: '' })); },
  );
  const { handleGoogleSignIn, handleAppleSignIn, isGoogleSubmitting, isAppleSubmitting, isOAuthSubmitting } = useOAuthNative(isConfigured, onAuthSuccess);
  const { handleResetPassword, handleResendVerification, isEmailActionSubmitting } = useEmailActions(isConfigured, formData);

  const handleTabChange = (v: string) => {
    const nextIsLogin = v === 'login';
    setIsLogin(nextIsLogin);
    resetForm();
    resetSubmitState();
    setShowPassword(false);
  };

  return (
    <div
      className={`w-full flex items-start justify-center px-4 pb-10 sm:px-6 ${
        embedded
          ? 'min-h-[60vh] bg-transparent pt-8'
          : 'min-h-[100dvh] bg-gray-50 pt-[clamp(4rem,13vh,7.5rem)]'
      }`}
    >
      <div className="w-full max-w-md">
        <AuthHeader isLogin={isLogin} />

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {!isConfigured && (
            <div className="flex items-center gap-2 border-b border-gray-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>Database configuration missing</span>
            </div>
          )}

          <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={handleTabChange} className="p-4">
            <TabsList className="w-full h-auto bg-gray-100 p-1 rounded-xl flex overflow-x-auto scrollbar-hide">
              <TabsTrigger
                className="flex-1 min-h-8 min-w-[76px] py-1.5 text-[0.76rem] font-semibold rounded-lg transition-all gap-1 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-500"
                value="login"
              >
                Log in
              </TabsTrigger>
              <TabsTrigger
                className="flex-1 min-h-8 min-w-[76px] py-1.5 text-[0.76rem] font-semibold rounded-lg transition-all gap-1 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-500"
                value="signup"
              >
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <EmailField
                  id="auth-login-email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  label="Your Email"
                />

                <PasswordField
                  id="auth-login-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  showPassword={showPassword}
                  onToggleShowPassword={() => setShowPassword(!showPassword)}
                  label="Password"
                  labelAction={
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isEmailActionSubmitting || isSubmitting || !isConfigured}
                      className="inline-flex min-h-0 items-center justify-center py-1 text-right text-xs font-semibold leading-tight text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  }
                />

                <SubmitButton isSubmitting={isSubmitting} disabled={!isConfigured} label="Sign in" />
              </form>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isEmailActionSubmitting || isSubmitting || !isConfigured}
                className="mt-3 inline-flex min-h-0 w-full items-center justify-center py-1 text-center text-xs font-semibold leading-tight text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50"
              >
                Resend verification email
              </button>

              <OrDivider />
              <OAuthButtons
                onGoogleSignIn={handleGoogleSignIn}
                onAppleSignIn={handleAppleSignIn}
                isOAuthSubmitting={isOAuthSubmitting}
                isGoogleSubmitting={isGoogleSubmitting}
                isAppleSubmitting={isAppleSubmitting}
                isSubmitting={isSubmitting}
                isConfigured={isConfigured}
              />
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="auth-signup-name" className="text-sm font-medium text-gray-800 block text-left">Your Name</label>
                  <input
                    id="auth-signup-name"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="block w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                    placeholder="Full Name"
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>

                <EmailField
                  id="auth-signup-email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  label="Your Email"
                />

                <PasswordField
                  id="auth-signup-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  showPassword={showPassword}
                  onToggleShowPassword={() => setShowPassword(!showPassword)}
                  label="Password"
                />

                <SubmitButton isSubmitting={isSubmitting} disabled={!isConfigured} label="Create account" />
              </form>

              <OrDivider />
              <OAuthButtons
                onGoogleSignIn={handleGoogleSignIn}
                onAppleSignIn={handleAppleSignIn}
                isOAuthSubmitting={isOAuthSubmitting}
                isGoogleSubmitting={isGoogleSubmitting}
                isAppleSubmitting={isAppleSubmitting}
                isSubmitting={isSubmitting}
                isConfigured={isConfigured}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-4 text-center text-xs leading-5 text-gray-500">
          By continuing, you agree to our{' '}
          <a href={TERMS_OF_SERVICE_URL} className="font-medium text-gray-800 underline underline-offset-2">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href={PRIVACY_POLICY_URL} className="font-medium text-gray-800 underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
}
