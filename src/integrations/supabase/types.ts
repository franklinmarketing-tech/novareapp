export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_items: {
        Row: {
          action_plan_id: string
          area: Database["public"]["Enums"]["action_area"]
          created_at: string
          deadline: string | null
          description: string
          financial_impact: number | null
          goal_id: string | null
          id: string
          objective: string | null
          parent_id: string | null
          responsible: string | null
          status: Database["public"]["Enums"]["action_status"]
          updated_at: string
        }
        Insert: {
          action_plan_id: string
          area: Database["public"]["Enums"]["action_area"]
          created_at?: string
          deadline?: string | null
          description: string
          financial_impact?: number | null
          goal_id?: string | null
          id?: string
          objective?: string | null
          parent_id?: string | null
          responsible?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
        }
        Update: {
          action_plan_id?: string
          area?: Database["public"]["Enums"]["action_area"]
          created_at?: string
          deadline?: string | null
          description?: string
          financial_impact?: number | null
          goal_id?: string | null
          id?: string
          objective?: string | null
          parent_id?: string | null
          responsible?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_action_plan_id_fkey"
            columns: ["action_plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      action_plans: {
        Row: {
          client_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      app_global_config: {
        Row: {
          allowed_email_domains: string[] | null
          failed_login_threshold: number
          failed_login_window_minutes: number
          id: number
          integrations: Json
          ip_allowlist_enforced: boolean
          maintenance_message: string | null
          maintenance_mode: boolean
          max_clients_per_admin: number
          max_storage_mb_per_client: number
          readonly_message: string | null
          readonly_mode: boolean
          require_password_for_destructive: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_email_domains?: string[] | null
          failed_login_threshold?: number
          failed_login_window_minutes?: number
          id?: number
          integrations?: Json
          ip_allowlist_enforced?: boolean
          maintenance_message?: string | null
          maintenance_mode?: boolean
          max_clients_per_admin?: number
          max_storage_mb_per_client?: number
          readonly_message?: string | null
          readonly_mode?: boolean
          require_password_for_destructive?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_email_domains?: string[] | null
          failed_login_threshold?: number
          failed_login_window_minutes?: number
          id?: number
          integrations?: Json
          ip_allowlist_enforced?: boolean
          maintenance_message?: string | null
          maintenance_mode?: boolean
          max_clients_per_admin?: number
          max_storage_mb_per_client?: number
          readonly_message?: string | null
          readonly_mode?: boolean
          require_password_for_destructive?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          brand_color: string
          company_name: string
          id: number
          logo_url: string | null
          support_email: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          brand_color?: string
          company_name?: string
          id?: number
          logo_url?: string | null
          support_email?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          brand_color?: string
          company_name?: string
          id?: number
          logo_url?: string | null
          support_email?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          estimated_value: number
          id: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          estimated_value?: number
          id?: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          estimated_value?: number
          id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          changes: Json | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_by: string
          banned_until: string | null
          created_at: string
          email: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_by: string
          banned_until?: string | null
          created_at?: string
          email: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          banned_by?: string
          banned_until?: string | null
          created_at?: string
          email?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          link_label: string | null
          link_url: string | null
          message: string
          severity: string
          target_roles: string[] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          message: string
          severity?: string
          target_roles?: string[] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          message?: string
          severity?: string
          target_roles?: string[] | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          assigned_consultant: string | null
          behavioral_profile: Json | null
          city: string | null
          client_code: number
          company: string | null
          cpf: string | null
          created_at: string
          date_of_birth: string | null
          dependents_ages: string | null
          dependents_count: number | null
          id: string
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          profession: string | null
          property_regime: Database["public"]["Enums"]["property_regime"] | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          user_id: string
          years_in_profession: number | null
        }
        Insert: {
          assigned_consultant?: string | null
          behavioral_profile?: Json | null
          city?: string | null
          client_code?: number
          company?: string | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          dependents_ages?: string | null
          dependents_count?: number | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          profession?: string | null
          property_regime?:
            | Database["public"]["Enums"]["property_regime"]
            | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          user_id: string
          years_in_profession?: number | null
        }
        Update: {
          assigned_consultant?: string | null
          behavioral_profile?: Json | null
          city?: string | null
          client_code?: number
          company?: string | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          dependents_ages?: string | null
          dependents_count?: number | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          profession?: string | null
          property_regime?:
            | Database["public"]["Enums"]["property_regime"]
            | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          user_id?: string
          years_in_profession?: number | null
        }
        Relationships: []
      }
      consultant_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      data_confirmations: {
        Row: {
          client_id: string
          confirmed_at: string
          id: string
          month_ref: string
          notes: string | null
        }
        Insert: {
          client_id: string
          confirmed_at?: string
          id?: string
          month_ref: string
          notes?: string | null
        }
        Update: {
          client_id?: string
          confirmed_at?: string
          id?: string
          month_ref?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_confirmations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          client_id: string
          created_at: string
          creditor: string | null
          id: string
          interest_rate: number | null
          monthly_payment: number | null
          remaining_months: number | null
          total_amount: number
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          creditor?: string | null
          id?: string
          interest_rate?: number | null
          monthly_payment?: number | null
          remaining_months?: number | null
          total_amount?: number
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          creditor?: string | null
          id?: string
          interest_rate?: number | null
          monthly_payment?: number | null
          remaining_months?: number | null
          total_amount?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis: {
        Row: {
          client_id: string
          created_at: string
          debt_ratio: number | null
          id: string
          notes: string | null
          risk_classification:
            | Database["public"]["Enums"]["risk_classification"]
            | null
          savings_capacity: number | null
          total_assets: number | null
          total_debts: number | null
          total_expenses: number | null
          total_income: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          debt_ratio?: number | null
          id?: string
          notes?: string | null
          risk_classification?:
            | Database["public"]["Enums"]["risk_classification"]
            | null
          savings_capacity?: number | null
          total_assets?: number | null
          total_debts?: number | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          debt_ratio?: number | null
          id?: string
          notes?: string | null
          risk_classification?:
            | Database["public"]["Enums"]["risk_classification"]
            | null
          savings_capacity?: number | null
          total_assets?: number | null
          total_debts?: number | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          client_id: string
          created_at: string
          description: string | null
          due_day: number | null
          id: string
          is_fixed: boolean | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          client_id: string
          created_at?: string
          description?: string | null
          due_day?: number | null
          id?: string
          is_fixed?: boolean | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          due_day?: number | null
          id?: string
          is_fixed?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          name: string
          rollout_pct: number
          target_roles: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          name: string
          rollout_pct?: number
          target_roles?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          rollout_pct?: number
          target_roles?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      founders: {
        Row: {
          active: boolean
          bio: string
          certs: string
          created_at: string
          display_order: number
          highlights: Json
          id: string
          image_url: string | null
          linkedin_url: string | null
          name: string
          role: string
          short_bio: string
          short_name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string
          certs?: string
          created_at?: string
          display_order?: number
          highlights?: Json
          id?: string
          image_url?: string | null
          linkedin_url?: string | null
          name: string
          role?: string
          short_bio?: string
          short_name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string
          certs?: string
          created_at?: string
          display_order?: number
          highlights?: Json
          id?: string
          image_url?: string | null
          linkedin_url?: string | null
          name?: string
          role?: string
          short_bio?: string
          short_name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          client_id: string
          created_at: string
          deadline: string | null
          description: string
          id: string
          priority: string | null
          target_amount: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          priority?: string | null
          target_amount?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          priority?: string | null
          target_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_sessions: {
        Row: {
          category: string
          client_id: string
          created_at: string
          id: string
          notes: string | null
          session_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string
          frequency: Database["public"]["Enums"]["income_frequency"]
          id: string
          is_primary: boolean | null
          stability: Database["public"]["Enums"]["income_stability"] | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          description: string
          frequency?: Database["public"]["Enums"]["income_frequency"]
          id?: string
          is_primary?: boolean | null
          stability?: Database["public"]["Enums"]["income_stability"] | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string
          frequency?: Database["public"]["Enums"]["income_frequency"]
          id?: string
          is_primary?: boolean | null
          stability?: Database["public"]["Enums"]["income_stability"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance: {
        Row: {
          client_id: string
          coverage_amount: number | null
          created_at: string
          id: string
          monthly_premium: number | null
          provider: string | null
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          coverage_amount?: number | null
          created_at?: string
          id?: string
          monthly_premium?: number | null
          provider?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          coverage_amount?: number | null
          created_at?: string
          id?: string
          monthly_premium?: number | null
          provider?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_recommendations: {
        Row: {
          allocation_pct: number
          client_id: string
          created_at: string
          expected_return: string | null
          id: string
          invested_amount: number | null
          liquidity: string | null
          min_investment: number | null
          priority: number
          product_name: string
          product_type: string
          rationale: string | null
          risk_level: string
          status: string
          updated_at: string
        }
        Insert: {
          allocation_pct?: number
          client_id: string
          created_at?: string
          expected_return?: string | null
          id?: string
          invested_amount?: number | null
          liquidity?: string | null
          min_investment?: number | null
          priority?: number
          product_name: string
          product_type?: string
          rationale?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Update: {
          allocation_pct?: number
          client_id?: string
          created_at?: string
          expected_return?: string | null
          id?: string
          invested_amount?: number | null
          liquidity?: string | null
          min_investment?: number | null
          priority?: number
          product_name?: string
          product_type?: string
          rationale?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_recommendations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_allowlist: {
        Row: {
          created_at: string
          created_by: string
          id: string
          ip_address: string
          label: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          ip_address: string
          label?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          ip_address?: string
          label?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      monitoring_snapshots: {
        Row: {
          client_id: string
          created_at: string
          emergency_reserve_months: number | null
          id: string
          notes: string | null
          plan_completion_pct: number | null
          savings_rate: number | null
          snapshot_date: string
          total_assets: number | null
          total_debts: number | null
          total_expenses: number | null
          total_income: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          emergency_reserve_months?: number | null
          id?: string
          notes?: string | null
          plan_completion_pct?: number | null
          savings_rate?: number | null
          snapshot_date?: string
          total_assets?: number | null
          total_debts?: number | null
          total_expenses?: number | null
          total_income?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          emergency_reserve_months?: number | null
          id?: string
          notes?: string | null
          plan_completion_pct?: number | null
          savings_rate?: number | null
          snapshot_date?: string
          total_assets?: number | null
          total_debts?: number | null
          total_expenses?: number | null
          total_income?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closings: {
        Row: {
          action_plan_snapshot: Json
          assets_snapshot: Json
          client_id: string
          closed_at: string
          closed_by: string
          created_at: string
          debts_snapshot: Json
          emergency_reserve_months: number | null
          expenses_snapshot: Json
          goals_snapshot: Json
          id: string
          income_snapshot: Json
          insurance_snapshot: Json
          month_ref: string
          monthly_debt_payments: number | null
          net_worth: number | null
          notes: string | null
          plan_completion_pct: number | null
          reopened_at: string | null
          reopened_by: string | null
          savings_rate: number | null
          status: string
          total_assets: number | null
          total_debts: number | null
          total_expenses: number | null
          total_income: number | null
          updated_at: string
        }
        Insert: {
          action_plan_snapshot?: Json
          assets_snapshot?: Json
          client_id: string
          closed_at?: string
          closed_by: string
          created_at?: string
          debts_snapshot?: Json
          emergency_reserve_months?: number | null
          expenses_snapshot?: Json
          goals_snapshot?: Json
          id?: string
          income_snapshot?: Json
          insurance_snapshot?: Json
          month_ref: string
          monthly_debt_payments?: number | null
          net_worth?: number | null
          notes?: string | null
          plan_completion_pct?: number | null
          reopened_at?: string | null
          reopened_by?: string | null
          savings_rate?: number | null
          status?: string
          total_assets?: number | null
          total_debts?: number | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
        }
        Update: {
          action_plan_snapshot?: Json
          assets_snapshot?: Json
          client_id?: string
          closed_at?: string
          closed_by?: string
          created_at?: string
          debts_snapshot?: Json
          emergency_reserve_months?: number | null
          expenses_snapshot?: Json
          goals_snapshot?: Json
          id?: string
          income_snapshot?: Json
          insurance_snapshot?: Json
          month_ref?: string
          monthly_debt_payments?: number | null
          net_worth?: number | null
          notes?: string | null
          plan_completion_pct?: number | null
          reopened_at?: string | null
          reopened_by?: string | null
          savings_rate?: number | null
          status?: string
          total_assets?: number | null
          total_debts?: number | null
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_lead_replies: {
        Row: {
          created_at: string
          email_status: string
          error_message: string | null
          id: string
          lead_id: string
          message: string
          replied_by_email: string | null
          replied_by_user_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_status?: string
          error_message?: string | null
          id?: string
          lead_id: string
          message: string
          replied_by_email?: string | null
          replied_by_user_id: string
          subject: string
        }
        Update: {
          created_at?: string
          email_status?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          message?: string
          replied_by_email?: string | null
          replied_by_user_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_lead_replies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "newsletter_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          last_replied_at: string | null
          name: string | null
          notes: string | null
          reply_count: number
          source: string
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          last_replied_at?: string | null
          name?: string | null
          notes?: string | null
          reply_count?: number
          source?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          last_replied_at?: string | null
          name?: string | null
          notes?: string | null
          reply_count?: number
          source?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          payload: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          payload?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          payload?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      super_admin_actions: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          reason: string | null
          target_email: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          reason?: string | null
          target_email?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          reason?: string | null
          target_email?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_backups: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          file_size_bytes: number | null
          file_url: string | null
          format: string
          id: string
          requested_by: string
          scope: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format?: string
          id?: string
          requested_by: string
          scope: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format?: string
          id?: string
          requested_by?: string
          scope?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_active_broadcasts: {
        Args: { _role: string }
        Returns: {
          active: boolean
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          link_label: string | null
          link_url: string | null
          message: string
          severity: string
          target_roles: string[] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "broadcast_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ip_allowed: {
        Args: { _ip: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      action_area:
        | "renda"
        | "despesas"
        | "dividas"
        | "investimentos"
        | "protecao"
        | "impostos"
      action_status: "pendente" | "em_andamento" | "concluido"
      app_role: "admin" | "client" | "super_admin"
      client_status:
        | "onboarding_pendente"
        | "em_diagnostico"
        | "em_acompanhamento"
      income_frequency: "mensal" | "anual" | "eventual"
      income_stability: "alta" | "media" | "baixa"
      marital_status:
        | "solteiro"
        | "casado"
        | "divorciado"
        | "viuvo"
        | "uniao_estavel"
      property_regime:
        | "comunhao_parcial"
        | "comunhao_universal"
        | "separacao_total"
        | "participacao_final"
      risk_classification: "A" | "B" | "C" | "D" | "E"
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
      action_area: [
        "renda",
        "despesas",
        "dividas",
        "investimentos",
        "protecao",
        "impostos",
      ],
      action_status: ["pendente", "em_andamento", "concluido"],
      app_role: ["admin", "client", "super_admin"],
      client_status: [
        "onboarding_pendente",
        "em_diagnostico",
        "em_acompanhamento",
      ],
      income_frequency: ["mensal", "anual", "eventual"],
      income_stability: ["alta", "media", "baixa"],
      marital_status: [
        "solteiro",
        "casado",
        "divorciado",
        "viuvo",
        "uniao_estavel",
      ],
      property_regime: [
        "comunhao_parcial",
        "comunhao_universal",
        "separacao_total",
        "participacao_final",
      ],
      risk_classification: ["A", "B", "C", "D", "E"],
    },
  },
} as const
