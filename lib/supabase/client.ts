import { createBrowserClient } from '@supabase/ssr';

export function getSupabaseConfig() {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('supabase_project_url');
    const localKey = localStorage.getItem('supabase_anon_key');
    if (localUrl && localKey) {
      return { url: localUrl, key: localKey, isCustom: true };
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url: envUrl && !envUrl.includes('placeholder') ? envUrl : 'https://placeholder-project.supabase.co',
    key: envKey && !envKey.includes('placeholder') ? envKey : 'placeholder-anon-key',
    isCustom: false,
  };
}

export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key);
}
