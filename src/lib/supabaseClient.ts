import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ne bloque pas le build, mais avertit en dev
  // (les vraies valeurs viennent de .env.local / des variables Vercel)
  console.warn(
    "Variables Supabase manquantes : vérifie .env.local (voir .env.example)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
