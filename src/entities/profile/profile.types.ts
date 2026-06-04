import type { Database } from '@/integrations/supabase/types';

export type GlobalUserRole = 'user' | 'editor' | 'admin';

export type Profile = Omit<Database['public']['Tables']['profiles']['Row'], 'role'> & {
	role: GlobalUserRole;
};

export type ProfileInsert = Omit<Database['public']['Tables']['profiles']['Insert'], 'role'> & {
	role?: GlobalUserRole;
};

export type ProfileUpdate = Omit<Database['public']['Tables']['profiles']['Update'], 'role'> & {
	role?: GlobalUserRole;
};