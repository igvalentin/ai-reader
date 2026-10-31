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
      admission_import_runs: {
        Row: {
          created_at: string
          errors: Json
          file_name: string | null
          id: string
          imported_by: string | null
          inserted_rows: number
          mode: string
          rejected_rows: number
          total_rows: number
        }
        Insert: {
          created_at?: string
          errors?: Json
          file_name?: string | null
          id?: string
          imported_by?: string | null
          inserted_rows?: number
          mode?: string
          rejected_rows?: number
          total_rows?: number
        }
        Update: {
          created_at?: string
          errors?: Json
          file_name?: string | null
          id?: string
          imported_by?: string | null
          inserted_rows?: number
          mode?: string
          rejected_rows?: number
          total_rows?: number
        }
        Relationships: []
      }
      admission_program_sources: {
        Row: {
          created_at: string
          document_title: string | null
          id: string
          program_id: string
          retrieved_at: string | null
          source_type: string
          url: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          document_title?: string | null
          id?: string
          program_id: string
          retrieved_at?: string | null
          source_type?: string
          url?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          document_title?: string | null
          id?: string
          program_id?: string
          retrieved_at?: string | null
          source_type?: string
          url?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "admission_program_sources_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "admission_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_programs: {
        Row: {
          active: boolean
          admission_subject: string | null
          admission_type: string | null
          annual_tuition: number | null
          budget_places: number | null
          city: string | null
          county: string | null
          created_at: string
          external_id: string | null
          faculty_id: string | null
          faculty_name: string | null
          field_of_study: string | null
          id: string
          language: string | null
          last_admission_grade_budget: number | null
          last_admission_grade_tax: number | null
          last_updated: string | null
          monitorul_oficial_code: string | null
          monitorul_oficial_source: string | null
          profile: string | null
          program_id: string | null
          program_name: string | null
          reference_year: number | null
          source_url: string | null
          special_budget_places: number | null
          specialization: string | null
          study_form: string | null
          tax_places: number | null
          university_id: string | null
          university_name: string
          university_type: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          active?: boolean
          admission_subject?: string | null
          admission_type?: string | null
          annual_tuition?: number | null
          budget_places?: number | null
          city?: string | null
          county?: string | null
          created_at?: string
          external_id?: string | null
          faculty_id?: string | null
          faculty_name?: string | null
          field_of_study?: string | null
          id?: string
          language?: string | null
          last_admission_grade_budget?: number | null
          last_admission_grade_tax?: number | null
          last_updated?: string | null
          monitorul_oficial_code?: string | null
          monitorul_oficial_source?: string | null
          profile?: string | null
          program_id?: string | null
          program_name?: string | null
          reference_year?: number | null
          source_url?: string | null
          special_budget_places?: number | null
          specialization?: string | null
          study_form?: string | null
          tax_places?: number | null
          university_id?: string | null
          university_name: string
          university_type?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          active?: boolean
          admission_subject?: string | null
          admission_type?: string | null
          annual_tuition?: number | null
          budget_places?: number | null
          city?: string | null
          county?: string | null
          created_at?: string
          external_id?: string | null
          faculty_id?: string | null
          faculty_name?: string | null
          field_of_study?: string | null
          id?: string
          language?: string | null
          last_admission_grade_budget?: number | null
          last_admission_grade_tax?: number | null
          last_updated?: string | null
          monitorul_oficial_code?: string | null
          monitorul_oficial_source?: string | null
          profile?: string | null
          program_id?: string | null
          program_name?: string | null
          reference_year?: number | null
          source_url?: string | null
          special_budget_places?: number | null
          specialization?: string | null
          study_form?: string | null
          tax_places?: number | null
          university_id?: string | null
          university_name?: string
          university_type?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      admitere_liceu_schools: {
        Row: {
          county: string
          created_at: string
          id: string
          last_rank_2024: number | null
          last_rank_2025: number | null
          max_grade_2024: number | null
          max_grade_2025: number | null
          min_grade_2024: number | null
          min_grade_2025: number | null
          profile: string | null
          school: string
          specialization: string | null
          study_form: string | null
        }
        Insert: {
          county: string
          created_at?: string
          id?: string
          last_rank_2024?: number | null
          last_rank_2025?: number | null
          max_grade_2024?: number | null
          max_grade_2025?: number | null
          min_grade_2024?: number | null
          min_grade_2025?: number | null
          profile?: string | null
          school: string
          specialization?: string | null
          study_form?: string | null
        }
        Update: {
          county?: string
          created_at?: string
          id?: string
          last_rank_2024?: number | null
          last_rank_2025?: number | null
          max_grade_2024?: number | null
          max_grade_2025?: number | null
          min_grade_2024?: number | null
          min_grade_2025?: number | null
          profile?: string | null
          school?: string
          specialization?: string | null
          study_form?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          kind: string
          provider: string
          provider_ref: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          kind: string
          provider?: string
          provider_ref?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          metadata: Json
          provider_ref: string | null
          recipient: string
          status: string
          subject: string | null
          template: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          provider_ref?: string | null
          recipient: string
          status?: string
          subject?: string | null
          template: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          provider_ref?: string | null
          recipient?: string
          status?: string
          subject?: string | null
          template?: string
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          app_id: string
          created_at: string
          id: string
          item_key: string
          label: string | null
          metadata: Json
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          item_key: string
          label?: string | null
          metadata?: Json
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          item_key?: string
          label?: string | null
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      feature_flag_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          flag_key: string
          id: string
          scope: string
          scope_id: string
        }
        Insert: {
          created_at?: string
          enabled: boolean
          flag_key: string
          id?: string
          scope: string
          scope_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag_key?: string
          id?: string
          scope?: string
          scope_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_overrides_flag_key_fkey"
            columns: ["flag_key"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["key"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          ends_at: string | null
          key: string
          premium_only: boolean
          rollout_percentage: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          ends_at?: string | null
          key: string
          premium_only?: boolean
          rollout_percentage?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          ends_at?: string | null
          key?: string
          premium_only?: boolean
          rollout_percentage?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          action: string
          app_id: string
          created_at: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          action: string
          app_id: string
          created_at?: string
          id?: string
          payload?: Json
          user_id: string
        }
        Update: {
          action?: string
          app_id?: string
          created_at?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          dismissed: boolean
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          dismissed?: boolean
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          dismissed?: boolean
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dismissible: boolean
          ends_at: string | null
          id: string
          kind: string
          link: string | null
          starts_at: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          dismissible?: boolean
          ends_at?: string | null
          id?: string
          kind?: string
          link?: string | null
          starts_at?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          dismissible?: boolean
          ends_at?: string | null
          id?: string
          kind?: string
          link?: string | null
          starts_at?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pension_retirement_rules: {
        Row: {
          age_months: number
          age_years: number
          created_at: string
          gender: string
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          age_months?: number
          age_years?: number
          created_at?: string
          gender: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          age_months?: number
          age_years?: number
          created_at?: string
          gender?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      pension_settings: {
        Row: {
          actuarial_coefficient: number
          average_gross_salary: number
          cas_percent: number
          created_at: string
          default_annual_return_percent: number
          default_life_expectancy_years: number
          id: string
          is_active: boolean
          notes: string | null
          pension_point_value: number
          pillar2_contribution_percent: number
          updated_at: string
          valid_from: string
        }
        Insert: {
          actuarial_coefficient?: number
          average_gross_salary?: number
          cas_percent?: number
          created_at?: string
          default_annual_return_percent?: number
          default_life_expectancy_years?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          pension_point_value?: number
          pillar2_contribution_percent?: number
          updated_at?: string
          valid_from?: string
        }
        Update: {
          actuarial_coefficient?: number
          average_gross_salary?: number
          cas_percent?: number
          created_at?: string
          default_annual_return_percent?: number
          default_life_expectancy_years?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          pension_point_value?: number
          pillar2_contribution_percent?: number
          updated_at?: string
          valid_from?: string
        }
        Relationships: []
      }
      pension_stability_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_years: number | null
          min_years: number
          notes: string | null
          points_per_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_years?: number | null
          min_years?: number
          notes?: string | null
          points_per_year?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_years?: number | null
          min_years?: number
          notes?: string | null
          points_per_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_tax_rule_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          rule_id: string
          snapshot: Json
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          rule_id: string
          snapshot?: Json
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          rule_id?: string
          snapshot?: Json
        }
        Relationships: []
      }
      salary_tax_rules: {
        Row: {
          cam_percent: number
          cas_percent: number
          cass_percent: number
          created_at: string
          id: string
          income_tax_percent: number
          is_active: boolean
          notes: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          cam_percent?: number
          cas_percent?: number
          cass_percent?: number
          created_at?: string
          id?: string
          income_tax_percent?: number
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          cam_percent?: number
          cas_percent?: number
          cass_percent?: number
          created_at?: string
          id?: string
          income_tax_percent?: number
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      saved_calculations: {
        Row: {
          app_id: string
          created_at: string
          id: string
          inputs: Json
          name: string
          results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          inputs?: Json
          name: string
          results?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          inputs?: Json
          name?: string
          results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vocational_content: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      vocational_dimensions: {
        Row: {
          activities: string[]
          code: string
          competencies: string[]
          created_at: string
          description: string
          label: string
          order_index: number
          short_label: string
          strengths: string[]
          updated_at: string
          weaknesses: string[]
        }
        Insert: {
          activities?: string[]
          code: string
          competencies?: string[]
          created_at?: string
          description: string
          label: string
          order_index?: number
          short_label: string
          strengths?: string[]
          updated_at?: string
          weaknesses?: string[]
        }
        Update: {
          activities?: string[]
          code?: string
          competencies?: string[]
          created_at?: string
          description?: string
          label?: string
          order_index?: number
          short_label?: string
          strengths?: string[]
          updated_at?: string
          weaknesses?: string[]
        }
        Relationships: []
      }
      vocational_professions: {
        Row: {
          a: number
          active: boolean
          activities: string[]
          c: number
          competencies: string[]
          created_at: string
          demand_level: string | null
          description: string
          e: number
          education_level: string | null
          future_outlook: string | null
          i: number
          id: string
          name: string
          r: number
          s: number
          typical_salary: string | null
          updated_at: string
        }
        Insert: {
          a?: number
          active?: boolean
          activities?: string[]
          c?: number
          competencies?: string[]
          created_at?: string
          demand_level?: string | null
          description?: string
          e?: number
          education_level?: string | null
          future_outlook?: string | null
          i?: number
          id?: string
          name: string
          r?: number
          s?: number
          typical_salary?: string | null
          updated_at?: string
        }
        Update: {
          a?: number
          active?: boolean
          activities?: string[]
          c?: number
          competencies?: string[]
          created_at?: string
          demand_level?: string | null
          description?: string
          e?: number
          education_level?: string | null
          future_outlook?: string | null
          i?: number
          id?: string
          name?: string
          r?: number
          s?: number
          typical_salary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vocational_programs: {
        Row: {
          active: boolean
          admission_link: string | null
          city: string
          created_at: string
          description: string | null
          faculty: string
          id: string
          profession_id: string
          program: string
          university: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          admission_link?: string | null
          city: string
          created_at?: string
          description?: string | null
          faculty: string
          id?: string
          profession_id: string
          program: string
          university: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          admission_link?: string | null
          city?: string
          created_at?: string
          description?: string | null
          faculty?: string
          id?: string
          profession_id?: string
          program?: string
          university?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocational_programs_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "vocational_professions"
            referencedColumns: ["id"]
          },
        ]
      }
      vocational_questions: {
        Row: {
          active: boolean
          created_at: string
          dimension: string
          id: string
          notes: string | null
          order_index: number
          text: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dimension: string
          id?: string
          notes?: string | null
          order_index?: number
          text: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dimension?: string
          id?: string
          notes?: string | null
          order_index?: number
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocational_questions_dimension_fkey"
            columns: ["dimension"]
            isOneToOne: false
            referencedRelation: "vocational_dimensions"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admission_programs_facets: {
        Args: { p_profile?: string }
        Returns: {
          kind: string
          value: string
        }[]
      }
      admission_programs_filter_options: {
        Args: {
          p_admission_subject?: string
          p_admission_type?: string
          p_city?: string
          p_profile?: string
          p_specialization?: string
          p_study_form?: string
          p_university_type?: string
        }
        Returns: {
          kind: string
          value: string
        }[]
      }
      admitere_liceu_list_counties: {
        Args: never
        Returns: {
          county: string
        }[]
      }
      admitere_liceu_list_profiles: {
        Args: never
        Returns: {
          profile: string
        }[]
      }
      admitere_liceu_list_specializations: {
        Args: { p_profile?: string }
        Returns: {
          specialization: string
        }[]
      }
      evaluate_feature_flags: {
        Args: { _app_id?: string }
        Returns: {
          enabled: boolean
          key: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "free" | "premium" | "donor" | "admin"
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
      app_role: ["free", "premium", "donor", "admin"],
    },
  },
} as const
