import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';
import { getProfile } from '../utils/supabase/api';
import { useProfileStore } from '../store/profileStore';
import { prefetchUserStats } from '../utils/statsPrefetch';
import { syncExistingPushSubscription, unsubscribeFromPushNotifications } from '../utils/pushNotifications';

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

declare global {
  var __eventzAuthContext: React.Context<AuthContextType | undefined> | undefined;
}

const AuthContext =
  globalThis.__eventzAuthContext ??
  (globalThis.__eventzAuthContext = createContext<AuthContextType | undefined>(undefined));

const slugifyUsername = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const buildUsernameCandidates = (seed: string) => {
  const base = slugifyUsername(seed) || 'user';
  const suffix = Date.now().toString(36).slice(-4);
  return [
    base,
    `${base}${suffix}`,
    `${base}${Math.floor(Math.random() * 9000) + 1000}`,
    `user${Date.now().toString().slice(-6)}`
  ];
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const storeProfile = useProfileStore(s => s.profile);
  const storeIsOrganizer = useProfileStore(s => s.isOrganizer);
  const hasOrganizerProfile = storeProfile ? (storeProfile.is_organizer || !!storeProfile.organizer_type) : false;

  const syncProfileState = (data: any | null) => {
    if (data) {
      useProfileStore.getState().setProfile(data);
    } else {
      useProfileStore.getState().clear();
    }
  };

  const ensureProfile = async (sessionUser: SupabaseUser) => {
    try {
      const existing = await getProfile(sessionUser.id);
      if (existing) {
        syncProfileState(existing);
        return existing;
      }

      const meta: any = sessionUser.user_metadata || {};
      const nameCandidate =
        meta.full_name ||
        meta.name ||
        (typeof sessionUser.email === 'string' ? sessionUser.email.split('@')[0] : null) ||
        'User';
      const avatarCandidate = meta.avatar_url || meta.picture || null;
      const usernameCandidates = buildUsernameCandidates(String(nameCandidate));

      for (const username of usernameCandidates) {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            [
              {
                id: sessionUser.id,
                email: sessionUser.email,
                full_name: nameCandidate,
                username,
                avatar_url: avatarCandidate,
              },
            ],
            { onConflict: 'id', ignoreDuplicates: true }
          );

        if (!error) {
          break;
        }
      }

      const created = await getProfile(sessionUser.id);
      syncProfileState(created || null);
      return created;
    } catch (_error) {
      return null;
    }
  };

  const prefetchDashboardData = async (sessionUser: SupabaseUser) => {
    await prefetchUserStats(sessionUser.id, sessionUser.email || '');
  };

  const startProfileBootstrap = (sessionUser: SupabaseUser) => {
    void ensureProfile(sessionUser);
    void prefetchDashboardData(sessionUser);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const data = await getProfile(userId);
      syncProfileState(data || null);
    } catch (error) {
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message && (error.message.includes("Invalid Refresh Token") || error.message.includes("Refresh Token Not Found"))) {
             await supabase.auth.signOut();
          }
          setUser(null);
          setIsAuthenticated(false);
        } else if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          void syncExistingPushSubscription(session.user.id);
          startProfileBootstrap(session.user);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          syncProfileState(null);
        }
      } catch (err) {
        setUser(null);
        setIsAuthenticated(false);
        syncProfileState(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setIsAuthenticated(true);
        void syncExistingPushSubscription(session.user.id);
        startProfileBootstrap(session.user);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        syncProfileState(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else if (event === 'USER_UPDATED' && session) {
        setUser(session.user);
        void ensureProfile(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (user?.id) {
      await unsubscribeFromPushNotifications(user.id).catch(() => undefined);
    }
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
      profile: storeProfile,
      isAuthenticated,
      isLoading,
      isOrganizer: storeIsOrganizer,
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
