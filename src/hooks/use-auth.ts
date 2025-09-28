import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

// Simple shared cache to avoid duplicate profile requests and rapid refetches
let inFlightProfileFetch: Promise<void> | null = null;
let cachedUserId: string | null = null;
let cachedAt = 0;
let cachedProfile: any = null;

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  citizen_id?: string;
  role: 'citizen' | 'officer' | 'admin';
  is_officer?: boolean;
  is_admin?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const getResolvedRole = (currentUser: User | null, currentProfile: Profile | null): Profile['role'] | null => {
    if (currentProfile?.is_admin) return 'admin';
    if (currentProfile?.is_officer) return 'officer';
    if (currentProfile?.role) return currentProfile.role;
    const metaRole = (currentUser?.user_metadata as any)?.role as Profile['role'] | undefined;
    return metaRole || null;
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes (debounced)
    let debounceTimer: number | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (import.meta.env.DEV) console.log('Auth state change:', event);
        if (debounceTimer) window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(async () => {
          setUser(session?.user || null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, 80);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const now = Date.now();
      // Serve recent cache (2s window)
      if (cachedUserId === userId && now - cachedAt < 2000 && cachedProfile) {
        setProfile(cachedProfile as Profile);
        return;
      }

      if (inFlightProfileFetch) {
        await inFlightProfileFetch; // wait for ongoing fetch
        if (cachedUserId === userId && cachedProfile) {
          setProfile(cachedProfile as Profile);
          return;
        }
      }

      if (import.meta.env.DEV) console.log('Fetching profile for user:', userId);
      const run = (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,user_id,full_name,phone,citizen_id,role,is_officer,is_admin,updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (import.meta.env.DEV) console.error('Profile fetch error:', error);
        // If no profile exists, create one for existing users
        if (error.code === 'PGRST116') {
          if (import.meta.env.DEV) console.log('No profile found, creating default profile');
          await createDefaultProfile(userId);
          // After attempting creation, try to read again
          const { data: created, error: readAfterCreateError } = await supabase
            .from('profiles')
            .select('id,user_id,full_name,phone,citizen_id,role,is_officer,is_admin,updated_at')
            .eq('user_id', userId)
            .single();
          if (!readAfterCreateError && created) {
            cachedUserId = userId;
            cachedAt = Date.now();
            cachedProfile = created as Profile;
            setProfile(created as Profile);
            return;
          }
          // If still not available (likely due to RLS), fall back to user metadata so app can proceed
          const { data: { user: latestUser } } = await supabase.auth.getUser();
          if (latestUser) {
            const userData = latestUser.user_metadata as any;
            const fallback: Profile = {
              id: userId, // placeholder to satisfy shape
              user_id: userId,
              full_name: userData?.full_name || latestUser.email?.split('@')[0] || 'User',
              phone: userData?.phone || '',
              citizen_id: userData?.citizen_id || '',
              role: (userData?.role as Profile['role']) || 'citizen',
              is_officer: false,
              is_admin: false,
            };
            cachedUserId = userId;
            cachedAt = Date.now();
            cachedProfile = fallback;
            setProfile(fallback);
            return;
          }
          return;
        }
        throw error;
      }
      if (import.meta.env.DEV) console.log('Profile fetched successfully:', data);
      cachedUserId = userId;
      cachedAt = Date.now();
      cachedProfile = data as Profile;
      setProfile(data as Profile);
      })();
      inFlightProfileFetch = run;
      await run;
      inFlightProfileFetch = null;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const createDefaultProfile = async (userId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const userData = user.user.user_metadata;
      if (import.meta.env.DEV) console.log('Creating default profile with data:', userData);
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: userData.full_name || userData.email?.split('@')[0] || 'User',
          phone: userData.phone || '',
          citizen_id: userData.citizen_id || '',
          role: userData.role || 'citizen',
          is_officer: false,
          is_admin: false,
        })
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) console.error('Error creating default profile:', error);
        throw error;
      }
      
      if (import.meta.env.DEV) console.log('Default profile created:', data);
      setProfile(data as Profile);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error creating default profile:', error);
      setProfile(null);
    }
  };
// at top of the module (next to your cache vars)
function resetProfileCache() {
  inFlightProfileFetch = null;
  cachedUserId = null;
  cachedAt = 0;
  cachedProfile = null;
}

function hardClearSupabaseStorage() {
  try {
    // derive project ref from your URL, e.g. https://<ref>.supabase.co
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/);
    const ref = match?.[1];
    if (ref) {
      // supabase-js v2 default auth storage keys
      localStorage.removeItem(`sb-${ref}-auth-token`);
      localStorage.removeItem(`sb-${ref}-auth-token.0`);
      localStorage.removeItem(`sb-${ref}-auth-token.1`);
    } else {
      // fallback: clear anything that looks like an auth token key
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) localStorage.removeItem(k);
      });
    }
  } catch {/* ignore */}
}
// inside useAuth
const signOut = async () => {
  // 0) proactively clear your app state so UI updates immediately
  resetProfileCache();
  setProfile(null);
  setUser(null);

  // 1) check if there is a session
  const { data: { session } } = await supabase.auth.getSession();

  // 2) attempt local sign-out only if a session exists
  if (session) {
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    // 3) ignore "no session" style errors; log others
    if (error && !/session_not_found|Auth session missing/i.test(error.message)) {
      console.warn('supabase signOut warning:', error.message);
    }
  }

  // 4) belt & suspenders: purge local storage tokens
  hardClearSupabaseStorage();
};


  return {
    user,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user,
    resolvedRole: getResolvedRole(user, profile),
    isOfficer: !!profile?.is_officer || !!profile?.is_admin,
    isCitizen: !profile?.is_officer && !profile?.is_admin,
    isAdmin: !!profile?.is_admin,
  };
};