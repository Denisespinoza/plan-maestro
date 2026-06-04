import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getPermissionsForRole, resolveRole, type AppPermissions, type AppRole } from './permissions';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

type AuthStatus = 'loading' | 'anonymous' | 'admin' | 'empleado' | 'pendiente' | 'error';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  role: AppRole | null;
  authStatus: AuthStatus;
  authError: string | null;
  permissions: AppPermissions;
  loading: boolean;
  signOut: () => Promise<void>;
}

const pendingPermissions = getPermissionsForRole('pendiente');

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  role: null,
  authStatus: 'loading',
  authError: null,
  permissions: pendingPermissions,
  loading: true,
  signOut: async () => {},
});

async function getUserProfile(userId: string, userEmail?: string): Promise<UserProfile> {
  console.info('[getUserProfile] Buscando perfil con user_profiles.id = auth user.id:', userId);

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getUserProfile] Supabase error leyendo public.user_profiles por id:', error);
    throw new Error(`No se pudo leer el perfil de usuario: ${error.message}`);
  }

  const profile = data as UserProfile | null;

  if (!profile) {
    console.error('[getUserProfile] No existe perfil en user_profiles para auth user.id:', {
      authUserId: userId,
      authEmail: userEmail,
    });
    throw new Error(`No existe un perfil en public.user_profiles para el auth user.id ${userId}. Verificá que user_profiles.id coincida con el ID del usuario autenticado, no solo con el email${userEmail ? ` (${userEmail})` : ''}.`);
  }

  if (profile.id !== userId) {
    console.error('[getUserProfile] Mismatch entre auth user.id y user_profiles.id:', {
      authUserId: userId,
      profileId: profile.id,
      email: profile.email,
    });
    throw new Error('El perfil encontrado no coincide con el usuario autenticado.');
  }

  console.info('[getUserProfile] Perfil cargado correctamente:', {
    authUserId: userId,
    profileId: profile.id,
    email: profile.email,
    role: profile.role,
  });

  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applySessionUser = async (sessionUser: User | null) => {
      setLoading(true);
      setAuthStatus('loading');
      setAuthError(null);
      setUser(sessionUser);
      setProfile(null);
      setRole(null);

      if (!sessionUser) {
        if (cancelled) return;
        setAuthStatus('anonymous');
        setLoading(false);
        return;
      }

      try {
        const loadedProfile = await getUserProfile(sessionUser.id, sessionUser.email);
        if (cancelled) return;

        setProfile(loadedProfile);

        const resolvedRole = resolveRole(loadedProfile.role);
        setRole(resolvedRole);
        setAuthStatus(resolvedRole);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Error desconocido al verificar el rol del usuario.';
        console.error('[AuthProvider] Error verificando usuario/rol:', err);
        setAuthError(message);
        setAuthStatus('error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthProvider] Error obteniendo sesión de Supabase Auth:', error);
        setAuthError(`No se pudo obtener la sesión: ${error.message}`);
        setAuthStatus('error');
        setLoading(false);
        return;
      }

      applySessionUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Evita correr consultas async directamente dentro del callback de auth.
      setTimeout(() => applySessionUser(session?.user ?? null), 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setAuthStatus('anonymous');
    setAuthError(null);
  };

  const permissions = useMemo(() => getPermissionsForRole(role), [role]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAdmin: role === 'admin',
      role,
      authStatus,
      authError,
      permissions,
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
