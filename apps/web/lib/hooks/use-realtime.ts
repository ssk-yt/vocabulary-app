"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function useRealtime(table: string) {
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const channel = supabase
            .channel("realtime-vocab")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: table,
                },
                () => {
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, router, table]);
}
