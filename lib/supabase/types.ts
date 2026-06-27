export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          first_name: string | null;
          display_name: string | null;
          notifications_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          first_name?: string | null;
          display_name?: string | null;
          notifications_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          first_name?: string | null;
          display_name?: string | null;
          notifications_opt_in?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      plaid_items: {
        Row: {
          id: string;
          user_id: string;
          institution_id: string | null;
          institution_name: string | null;
          item_id: string;
          access_token_encrypted: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          institution_id?: string | null;
          institution_name?: string | null;
          item_id: string;
          access_token_encrypted: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          institution_id?: string | null;
          institution_name?: string | null;
          access_token_encrypted?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plaid_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      plaid_accounts: {
        Row: {
          id: string;
          user_id: string;
          plaid_item_id: string;
          account_id: string;
          name: string;
          official_name: string | null;
          mask: string | null;
          type: string;
          subtype: string | null;
          current_balance: number | null;
          available_balance: number | null;
          credit_limit: number | null;
          iso_currency_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plaid_item_id: string;
          account_id: string;
          name: string;
          official_name?: string | null;
          mask?: string | null;
          type: string;
          subtype?: string | null;
          current_balance?: number | null;
          available_balance?: number | null;
          credit_limit?: number | null;
          iso_currency_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          official_name?: string | null;
          mask?: string | null;
          type?: string;
          subtype?: string | null;
          current_balance?: number | null;
          available_balance?: number | null;
          credit_limit?: number | null;
          iso_currency_code?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plaid_accounts_plaid_item_id_fkey';
            columns: ['plaid_item_id'];
            isOneToOne: false;
            referencedRelation: 'plaid_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plaid_accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      plaid_transactions: {
        Row: {
          id: string;
          user_id: string;
          plaid_item_id: string;
          plaid_account_id: string | null;
          account_id: string;
          transaction_id: string;
          name: string;
          merchant_name: string | null;
          amount: number;
          iso_currency_code: string | null;
          date: string;
          authorized_date: string | null;
          pending: boolean;
          payment_channel: string | null;
          category: string[];
          category_id: string | null;
          personal_finance_category: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plaid_item_id: string;
          plaid_account_id?: string | null;
          account_id: string;
          transaction_id: string;
          name: string;
          merchant_name?: string | null;
          amount: number;
          iso_currency_code?: string | null;
          date: string;
          authorized_date?: string | null;
          pending?: boolean;
          payment_channel?: string | null;
          category?: string[];
          category_id?: string | null;
          personal_finance_category?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plaid_account_id?: string | null;
          name?: string;
          merchant_name?: string | null;
          amount?: number;
          iso_currency_code?: string | null;
          date?: string;
          authorized_date?: string | null;
          pending?: boolean;
          payment_channel?: string | null;
          category?: string[];
          category_id?: string | null;
          personal_finance_category?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plaid_transactions_plaid_item_id_fkey';
            columns: ['plaid_item_id'];
            isOneToOne: false;
            referencedRelation: 'plaid_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plaid_transactions_plaid_account_id_fkey';
            columns: ['plaid_account_id'];
            isOneToOne: false;
            referencedRelation: 'plaid_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plaid_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      card_products: {
        Row: {
          id: string;
          issuer: string;
          name: string;
          network: string | null;
          product_type: string;
          is_business: boolean;
          annual_fee: number;
          reward_currency: string | null;
          rewards: Json;
          benefits: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          issuer: string;
          name: string;
          network?: string | null;
          product_type?: string;
          is_business?: boolean;
          annual_fee?: number;
          reward_currency?: string | null;
          rewards?: Json;
          benefits?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          issuer?: string;
          name?: string;
          network?: string | null;
          product_type?: string;
          is_business?: boolean;
          annual_fee?: number;
          reward_currency?: string | null;
          rewards?: Json;
          benefits?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_card_matches: {
        Row: {
          id: string;
          user_id: string;
          plaid_account_id: string;
          card_product_id: string;
          match_status: string;
          match_confidence: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plaid_account_id: string;
          card_product_id: string;
          match_status?: string;
          match_confidence?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          card_product_id?: string;
          match_status?: string;
          match_confidence?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_card_matches_plaid_account_id_fkey';
            columns: ['plaid_account_id'];
            isOneToOne: false;
            referencedRelation: 'plaid_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_card_matches_card_product_id_fkey';
            columns: ['card_product_id'];
            isOneToOne: false;
            referencedRelation: 'card_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_card_matches_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
