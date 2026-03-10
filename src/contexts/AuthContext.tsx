import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';
import { getProfile } from '../utils/supabase/api';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOrganizer: boolean;
  hasOrganizerProfile: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [hasOrganizerProfile, setHasOrganizerProfile] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const data = await getProfile(userId);
      if (data) {
        setProfile(data);
        const isOrg = data.is_organizer || false;
        setIsOrganizer(isOrg);
        setHasOrganizerProfile(isOrg || !!data.organizer_type);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          if (error.message && (error.message.includes("Invalid Refresh Token") || error.message.includes("Refresh Token Not Found"))) {
             await supabase.auth.signOut();
          }
          setUser(null);
          setIsAuthenticated(false);
        } else if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setIsAuthenticated(true);
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        setIsOrganizer(false);
        setHasOrganizerProfile(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else if (event === 'USER_UPDATED' && session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Listen for manual profile updates
  useEffect(() => {
    const handleProfileUpdate = async () => {
      if (user) {
        await fetchProfile(user.id);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated,
      isLoading,
      isOrganizer,
      hasOrganizerProfile,
      refreshProfile,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
