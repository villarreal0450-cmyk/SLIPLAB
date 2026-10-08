/**
 * Hand-maintained Database types mirroring supabase/migrations.
 * Once the Supabase CLI is linked, replace with:
 *   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 */
import type { Json } from "./json";

export type { Json };

type Timestamps = { created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
        } & Timestamps;
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      bankroll_settings: {
        Row: {
          user_id: string;
          bankroll: number | null;
          unit_size: number | null;
          currency: string;
          max_exposure_pct: number;
        } & Timestamps;
        Insert: Partial<Database["public"]["Tables"]["bankroll_settings"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["bankroll_settings"]["Row"]>;
        Relationships: [];
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          sport: string;
          event_id: string | null;
          sportsbook: string | null;
          stake: number | null;
          odds: number | null;
          potential_payout: number | null;
          status: "draft" | "pending" | "won" | "lost" | "void";
          analysis_score: number | null;
          cohesion_score: number | null;
          risk_level: "low" | "medium" | "high" | null;
          notes: string | null;
          settled_at: string | null;
        } & Timestamps;
        Insert: Omit<Partial<Database["public"]["Tables"]["bets"]["Row"]>, "user_id"> & { sport: string };
        Update: Partial<Database["public"]["Tables"]["bets"]["Row"]>;
        Relationships: [];
      };
      bet_legs: {
        Row: {
          id: string;
          bet_id: string;
          player_id: string | null;
          player_name: string;
          team: string;
          opponent: string;
          market: string;
          direction: "over" | "under" | "yes" | "no";
          line: number | null;
          odds: number | null;
          status: "pending" | "won" | "lost" | "void";
          result_value: number | null;
          analysis_score: number | null;
          process_review: "good_process_bad_result" | "bad_process" | "good_read" | "high_variance_result" | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["bet_legs"]["Row"]> & {
          bet_id: string;
          player_name: string;
          team: string;
          opponent: string;
          market: string;
          direction: "over" | "under" | "yes" | "no";
        };
        Update: Partial<Database["public"]["Tables"]["bet_legs"]["Row"]>;
        Relationships: [];
      };
      pick_analysis: {
        Row: {
          id: string;
          bet_leg_id: string;
          score: number;
          tier: string;
          verdict: string;
          summary: string;
          bull_case: Json;
          bear_case: Json;
          key_factors: Json;
          risk_factors: Json;
          projection: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["pick_analysis"]["Row"]> & { bet_leg_id: string; score: number; tier: string; verdict: string; summary: string };
        Update: Partial<Database["public"]["Tables"]["pick_analysis"]["Row"]>;
        Relationships: [];
      };
      parlay_analysis: {
        Row: {
          id: string;
          bet_id: string;
          score: number;
          tier: string;
          cohesion_score: number;
          risk_level: "low" | "medium" | "high";
          weakest_leg_id: string | null;
          summary: string;
          game_script: Json | null;
          correlations: Json;
          recommended_changes: Json;
          data_source: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["parlay_analysis"]["Row"]> & { bet_id: string; score: number; tier: string; cohesion_score: number; risk_level: "low" | "medium" | "high"; summary: string };
        Update: Partial<Database["public"]["Tables"]["parlay_analysis"]["Row"]>;
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          user_id: string;
          bet_id: string | null;
          title: string | null;
          context: Json;
        } & Timestamps;
        Insert: Omit<Partial<Database["public"]["Tables"]["chat_threads"]["Row"]>, "user_id">;
        Update: Partial<Database["public"]["Tables"]["chat_threads"]["Row"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["chat_messages"]["Row"]> & { thread_id: string; role: "user" | "assistant" | "system"; content: string };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Row"]>;
        Relationships: [];
      };
      user_insights: {
        Row: {
          user_id: string;
          computed_at: string;
          totals: Json;
          by_sport: Json;
          by_market: Json;
          by_leg_count: Json;
          by_risk: Json;
          highlights: Json;
        };
        Insert: Partial<Database["public"]["Tables"]["user_insights"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["user_insights"]["Row"]>;
        Relationships: [];
      };
      saved_games: {
        Row: { user_id: string; game_id: string; sport: string; created_at: string };
        Insert: { user_id?: string; game_id: string; sport: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["saved_games"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      bet_status: "draft" | "pending" | "won" | "lost" | "void";
      leg_status: "pending" | "won" | "lost" | "void";
      risk_level: "low" | "medium" | "high";
      pick_direction: "over" | "under" | "yes" | "no";
      process_review: "good_process_bad_result" | "bad_process" | "good_read" | "high_variance_result";
      chat_role: "user" | "assistant" | "system";
    };
    CompositeTypes: Record<string, never>;
  };
};
