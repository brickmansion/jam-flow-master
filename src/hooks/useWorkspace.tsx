import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan: 'free' | 'pro';
  trial_start_at: string | null;
  trial_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceStorageUsage {
  workspace_id: string;
  workspace_name: string;
  storage_gb: number;
}

export function useWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [storageUsage, setStorageUsage] = useState<WorkspaceStorageUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const isProAccess = (ws: Workspace): boolean => {
    if (ws.plan === 'pro') return true;
    if (ws.plan === 'free' && ws.trial_expires_at) {
      return new Date(ws.trial_expires_at) > new Date();
    }
    return false;
  };

  const getTrialDaysLeft = (ws: Workspace): number => {
    if (!ws.trial_expires_at) return 0;
    const expiresAt = new Date(ws.trial_expires_at);
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const fetchWorkspace = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (workspaceError && workspaceError.code !== 'PGRST116') {
        console.error('Error fetching workspace:', workspaceError);
        return;
      }

      // If no workspace exists, create one with trial
      if (!workspaceData) {
        const now = new Date();
        const trialExpires = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days

        const { data: newWorkspace, error: createError } = await supabase
          .from('workspaces')
          .insert({
            name: 'My Workspace',
            owner_id: user.id,
            plan: 'free',
            trial_start_at: now.toISOString(),
            trial_expires_at: trialExpires.toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating workspace:', createError);
          return;
        }

        setWorkspace(newWorkspace as Workspace);
      } else {
        setWorkspace(workspaceData as Workspace);
      }

      // Get storage usage
      const { data: storageData, error: storageError } = await supabase
        .from('workspace_storage_usage_gb')
        .select('*')
        .eq('workspace_id', workspaceData?.id || (await supabase.from('workspaces').select('id').eq('owner_id', user.id).single()).data?.id)
        .single();

      if (storageError && storageError.code !== 'PGRST116') {
        console.error('Error fetching storage usage:', storageError);
      } else if (storageData) {
        setStorageUsage(storageData);
      }
    } finally {
      setLoading(false);
    }
  };

  const startTrial = async () => {
    if (!workspace || !user) return;

    const now = new Date();
    const trialExpires = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days

    const { data, error } = await supabase
      .from('workspaces')
      .update({
        trial_start_at: now.toISOString(),
        trial_expires_at: trialExpires.toISOString()
      })
      .eq('id', workspace.id)
      .select()
      .single();

    if (error) {
      console.error('Error starting trial:', error);
      return;
    }

    setWorkspace(data as Workspace);
  };

  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  return {
    workspace,
    storageUsage,
    loading,
    isProAccess: workspace ? isProAccess(workspace) : false,
    trialDaysLeft: workspace ? getTrialDaysLeft(workspace) : 0,
    isTrialActive: workspace ? workspace.trial_expires_at && new Date(workspace.trial_expires_at) > new Date() : false,
    isTrialExpired: workspace ? workspace.trial_expires_at && new Date(workspace.trial_expires_at) <= new Date() && workspace.plan === 'free' : false,
    startTrial,
    refetch: fetchWorkspace
  };
}