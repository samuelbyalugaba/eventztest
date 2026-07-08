import { supabase } from './client';

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export const updateUserEmail = async (email: string) => {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
};

export const deleteAccount = async () => {
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST', body: {} });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
