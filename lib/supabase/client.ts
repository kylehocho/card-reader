import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublishableKey, getSupabaseUrl, isSupabasePublicConfigured } from './config';
import type { Database } from './types';

let browserClient: SupabaseClient<Database> | null = null;

export function isSupabaseBrowserConfigured() {
  return isSupabasePublicConfigured();
}

export function getBrowserSupabaseClient() {
  if (!isSupabaseBrowserConfigured()) return null;

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(getSupabaseUrl()!, getSupabasePublishableKey()!);
  }

  return browserClient;
}
