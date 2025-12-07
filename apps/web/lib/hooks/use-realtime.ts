"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function useRealtime(table: string, onUpdate?: () => void) {
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        // realtime-vocabチャンネルを作成
        const channel = supabase
            .channel("realtime-vocab")
            // データベースの変更の監視を設定
            .on(
                "postgres_changes",
                {
                    // 追加・更新・削除のすべてを監視
                    event: "*",
                    // パブリックスキーマを監視
                    schema: "public",
                    // useRealtimeで渡されたテーブルを監視
                    table: table,
                },
                () => {
                    // ページを再読み込み
                    router.refresh();
                    // onUpdateがあれば実行
                    onUpdate?.();
                }
            )
            .subscribe();
        // ダッシュボードから離れる時，チャンネルを削除
        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, router, table, onUpdate]);
}
