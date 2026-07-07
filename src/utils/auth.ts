import { supabase } from './supabase';
import type { Profile } from './supabase';

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string, name: string, inviteCode: string) => {
  const VALID_CODES = ['ARBOR2024', 'ARBORPRO', 'TREEPRO'];
  if (!VALID_CODES.includes(inviteCode.toUpperCase())) throw new Error('Invalid invite code');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
};

export const canUserEdit = (): boolean => true;

// Lightweight synchronous view of the signed-in user, kept in sync with Supabase
// auth so components can read the current user without awaiting a promise.
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

let cachedUser: CurrentUser | null = null;

const userFromSession = (session: { user?: any } | null): CurrentUser | null => {
  const user = session?.user;
  if (!user) return null;
  const name = user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'User');
  return { id: user.id, name, email: user.email || '' };
};

// Prime the cache and keep it updated as the auth state changes.
supabase.auth.getSession().then(({ data: { session } }) => {
  cachedUser = userFromSession(session);
});
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = userFromSession(session);
});

export const getCurrentUser = (): CurrentUser | null => cachedUser;

export const getUserDisplayName = (): string => cachedUser?.name || 'Unknown';
