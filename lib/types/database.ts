export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          whatsapp: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          whatsapp: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          whatsapp?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: "owner" | "admin";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: "owner" | "admin";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          role?: "owner" | "admin";
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          amount_cents: number;
          currency: "USD";
          status: "activa" | "gracia" | "suspendida" | "terminada";
          start_date: string;
          next_billing_date: string | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: string;
          amount_cents: number;
          currency?: "USD";
          status: "activa" | "gracia" | "suspendida" | "terminada";
          start_date: string;
          next_billing_date?: string | null;
          source: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: string;
          amount_cents?: number;
          currency?: "USD";
          status?: "activa" | "gracia" | "suspendida" | "terminada";
          start_date?: string;
          next_billing_date?: string | null;
          source?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          subscription_id: string;
          user_id: string;
          amount_cents: number;
          currency: "USD";
          status: "pending" | "paid" | "failed" | "refunded";
          paid_at: string | null;
          due_at: string;
          source: string;
          external_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          user_id: string;
          amount_cents: number;
          currency?: "USD";
          status: "pending" | "paid" | "failed" | "refunded";
          paid_at?: string | null;
          due_at: string;
          source?: string;
          external_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subscription_id?: string;
          user_id?: string;
          amount_cents?: number;
          currency?: "USD";
          status?: "pending" | "paid" | "failed" | "refunded";
          paid_at?: string | null;
          due_at?: string;
          source?: string;
          external_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          occurred_at: string;
          actor_admin_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          detail: Json;
          result: "ok" | "error";
        };
        Insert: {
          id?: number;
          occurred_at?: string;
          actor_admin_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          detail?: Json;
          result: "ok" | "error";
        };
        Update: {
          actor_admin_id?: string | null;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          detail?: Json;
          result?: "ok" | "error";
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          grace_days: number;
          payment_reminder_template: string;
          suspension_notice_template: string;
          timezone: string;
          date_format: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          grace_days: number;
          payment_reminder_template: string;
          suspension_notice_template: string;
          timezone: string;
          date_format: string;
          updated_at?: string;
        };
        Update: {
          grace_days?: number;
          payment_reminder_template?: string;
          suspension_notice_template?: string;
          timezone?: string;
          date_format?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
