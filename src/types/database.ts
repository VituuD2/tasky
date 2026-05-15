export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = "admin" | "user";
export type CustomFieldType = "text" | "number" | "select" | "status" | "date" | "person" | "checkbox" | "url" | "email";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: ProfileRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      error_reports: {
        Row: {
          id: string;
          human_id: number;
          title: string;
          description: string | null;
          error_date: string | null;
          affected_area: string | null;
          error_type: string | null;
          severity: string | null;
          financial_impact: number | null;
          status: string | null;
          responsible_profile_id: string | null;
          opened_at: string | null;
          resolved_at: string | null;
          happened_before: boolean | null;
          corrective_action: string | null;
          reported_by_profile_id: string | null;
          reported_by_name: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          human_id?: number;
          title: string;
          description?: string | null;
          error_date?: string | null;
          affected_area?: string | null;
          error_type?: string | null;
          severity?: string | null;
          financial_impact?: number | null;
          status?: string | null;
          responsible_profile_id?: string | null;
          opened_at?: string | null;
          resolved_at?: string | null;
          happened_before?: boolean | null;
          corrective_action?: string | null;
          reported_by_profile_id?: string | null;
          reported_by_name?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          human_id?: number;
          title?: string;
          description?: string | null;
          error_date?: string | null;
          affected_area?: string | null;
          error_type?: string | null;
          severity?: string | null;
          financial_impact?: number | null;
          status?: string | null;
          responsible_profile_id?: string | null;
          opened_at?: string | null;
          resolved_at?: string | null;
          happened_before?: boolean | null;
          corrective_action?: string | null;
          reported_by_profile_id?: string | null;
          reported_by_name?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          error_report_id: string;
          file_url: string | null;
          external_url: string | null;
          file_name: string | null;
          mime_type: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          error_report_id: string;
          file_url?: string | null;
          external_url?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          error_report_id?: string;
          file_url?: string | null;
          external_url?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      select_options: {
        Row: {
          id: string;
          type: string;
          label: string;
          value: string;
          color: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          label: string;
          value: string;
          color: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          label?: string;
          value?: string;
          color?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      table_layout_settings: {
        Row: {
          id: string;
          table_name: string;
          column_key: string;
          column_label: string;
          visible: boolean;
          width: number;
          position: number;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          column_key: string;
          column_label: string;
          visible?: boolean;
          width?: number;
          position?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          column_key?: string;
          column_label?: string;
          visible?: boolean;
          width?: number;
          position?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reported_people: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      custom_fields: {
        Row: {
          id: string;
          table_name: string;
          label: string;
          field_key: string;
          field_type: CustomFieldType;
          is_required: boolean;
          is_active: boolean;
          width: number;
          position: number;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_name?: string;
          label: string;
          field_key: string;
          field_type: CustomFieldType;
          is_required?: boolean;
          is_active?: boolean;
          width?: number;
          position?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          label?: string;
          field_key?: string;
          field_type?: CustomFieldType;
          is_required?: boolean;
          is_active?: boolean;
          width?: number;
          position?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      custom_field_options: {
        Row: {
          id: string;
          field_id: string;
          label: string;
          value: string;
          color: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          field_id: string;
          label: string;
          value: string;
          color?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          field_id?: string;
          label?: string;
          value?: string;
          color?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      custom_field_values: {
        Row: {
          id: string;
          error_report_id: string;
          field_id: string;
          value: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          error_report_id: string;
          field_id: string;
          value?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          error_report_id?: string;
          field_id?: string;
          value?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      profile_role: ProfileRole;
    };
  };
};
