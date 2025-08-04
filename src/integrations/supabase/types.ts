export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      collection_members: {
        Row: {
          accepted_at: string | null
          collection_id: string
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          collection_id: string
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          collection_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_members_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          artist: string | null
          created_at: string
          due_date: string | null
          id: string
          producer_id: string
          release_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          producer_id: string
          release_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          producer_id?: string
          release_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_uploads: {
        Row: {
          category: Database["public"]["Enums"]["file_category"]
          created_at: string
          description: string | null
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          original_filename: string
          project_id: string
          updated_at: string
          uploaded_by: string
          version: number
          workspace_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["file_category"]
          created_at?: string
          description?: string | null
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          original_filename: string
          project_id: string
          updated_at?: string
          uploaded_by: string
          version?: number
          workspace_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["file_category"]
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          original_filename?: string
          project_id?: string
          updated_at?: string
          uploaded_by?: string
          version?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      invitation_rate_limit: {
        Row: {
          created_at: string
          id: string
          invited_email: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      invitation_tokens: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          project_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          project_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          project_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          project_id: string
          role: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          project_id: string
          role: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          artist: string
          bpm: number
          collection_id: string | null
          created_at: string
          due_date: string | null
          id: string
          producer_id: string
          sample_rate: number
          song_key: Database["public"]["Enums"]["song_key"]
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          artist: string
          bpm: number
          collection_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          producer_id: string
          sample_rate: number
          song_key?: Database["public"]["Enums"]["song_key"]
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          artist?: string
          bpm?: number
          collection_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          producer_id?: string
          sample_rate?: number
          song_key?: Database["public"]["Enums"]["song_key"]
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_storage_usage_gb"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          member_id: string
          new_role: string
          old_role: string | null
          project_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          member_id: string
          new_role: string
          old_role?: string | null
          project_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          member_id?: string
          new_role?: string
          old_role?: string | null
          project_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          external_link: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_link?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_link?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          prefs: Json | null
          premium_uploads: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id: string
          prefs?: Json | null
          premium_uploads?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          prefs?: Json | null
          premium_uploads?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: string | null
          trial_expires_at: string | null
          trial_start_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: string | null
          trial_expires_at?: string | null
          trial_start_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string | null
          trial_expires_at?: string | null
          trial_start_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      workspace_storage_usage_gb: {
        Row: {
          storage_gb: number | null
          workspace_id: string | null
          workspace_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_project: {
        Args: { project_uuid: string }
        Returns: boolean
      }
      check_invitation_rate_limit: {
        Args: { p_user_id: string; p_project_id: string; p_email: string }
        Returns: boolean
      }
      get_next_file_version: {
        Args: {
          p_project_id: string
          p_category: Database["public"]["Enums"]["file_category"]
        }
        Returns: number
      }
      is_producer_of_any_project: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { project_uuid: string }
        Returns: boolean
      }
      workspace_has_pro_access: {
        Args: { workspace_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      file_category: "stems" | "mixes" | "references" | "notes" | "sessions"
      song_key:
        | "C major"
        | "C minor"
        | "C♯ major"
        | "C♯ minor"
        | "D major"
        | "D minor"
        | "E♭ major"
        | "E♭ minor"
        | "E major"
        | "E minor"
        | "F major"
        | "F minor"
        | "F♯ major"
        | "F♯ minor"
        | "G major"
        | "G minor"
        | "A♭ major"
        | "A♭ minor"
        | "A major"
        | "A minor"
        | "B♭ major"
        | "B♭ minor"
        | "B major"
        | "B minor"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      file_category: ["stems", "mixes", "references", "notes", "sessions"],
      song_key: [
        "C major",
        "C minor",
        "C♯ major",
        "C♯ minor",
        "D major",
        "D minor",
        "E♭ major",
        "E♭ minor",
        "E major",
        "E minor",
        "F major",
        "F minor",
        "F♯ major",
        "F♯ minor",
        "G major",
        "G minor",
        "A♭ major",
        "A♭ minor",
        "A major",
        "A minor",
        "B♭ major",
        "B♭ minor",
        "B major",
        "B minor",
      ],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "completed"],
    },
  },
} as const
