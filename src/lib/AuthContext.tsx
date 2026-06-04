import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getPermissionsForRole, resolveRole, type AppPermissions, type AppRole } from './permissions';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  role: AppRole;
  permissions: AppPermissions;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  role: 'pendiente',
  permissions: getPermissionsForRole('pendiente'),
  loading: true,
  signOut: async () => {},
});

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getUserProfile] Supabase error:', error);
    return null;
  }

  return data as UserProfile | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applySessionUser = async (sessionUser: User | null) => {
      setUser(sessionUser);
      setProfile(sessionUser ? await getUserProfile(sessionUser.id) : null);
      setLoading(false);
    };

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySessionUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySessionUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAdmin: resolveRole(profile?.role || user?.app_metadata?.role || user?.user_metadata?.role) === 'admin',
      role: resolveRole(profile?.role || user?.app_metadata?.role || user?.user_metadata?.role),
      permissions: getPermissionsForRole(profile?.role || user?.app_metadata?.role || user?.user_metadata?.role),
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
