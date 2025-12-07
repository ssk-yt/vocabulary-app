import { createBrowserClient } from "@supabase/ssr";

// supabaseのブラウザ用クライアントを作成する関数
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
