import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type DbUserProfile = Database['public']['Tables']['user_profiles']['Row'];

export interface UserProfile {
  id: string;
  avatar_url?: string;
  display_name: string;
  bio?: string;
  prefs: {
    theme?: 'system' | 'dark' | 'light';
    dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY';
    notifications?: {
      invite?: boolean;
      taskReady?: boolean;
      commentMention?: boolean;
    };
    slackWebhook?: string;
  };
  created_at: string;
  updated_at: string;
}

const parseUserProfile = (dbProfile: DbUserProfile): UserProfile => {
  return {
    ...dbProfile,
    prefs: typeof dbProfile.prefs === 'object' && dbProfile.prefs !== null 
      ? dbProfile.prefs as UserProfile['prefs']
      : {
          theme: 'system',
          dateFormat: 'MM/DD/YYYY',
          notifications: {
            invite: true,
            taskReady: true,
            commentMention: true
          }
        }
  };
};

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default profile if it doesn't exist
        const defaultProfile = {
          id: user.id,
          display_name: user.email?.split('@')[0] || '',
          prefs: {
            theme: 'system' as const,
            dateFormat: 'MM/DD/YYYY' as const,
            notifications: {
              invite: true,
              taskReady: true,
              commentMention: true
            }
          }
        };

        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(defaultProfile)
          .select()
          .single();

        if (createError) throw createError;
        setProfile(parseUserProfile(newProfile));
      } else {
        setProfile(parseUserProfile(data));
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      const parsedProfile = parseUserProfile(data);
      setProfile(parsedProfile);
      return parsedProfile;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  const updatePreferences = async (newPrefs: Partial<UserProfile['prefs']>) => {
    if (!profile) return;

    const updatedPrefs = { ...profile.prefs, ...newPrefs };
    return updateProfile({ prefs: updatedPrefs });
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    updatePreferences,
    refetch: fetchProfile
  };
}