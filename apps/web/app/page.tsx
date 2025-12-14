"use client";


import { useAuth } from "@/components/auth-provider";
import { AddVocabModal } from "@/components/features/vocab/add-vocab-modal";
import { Button } from "@repo/ui";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/lib/hooks/use-realtime";

import { useRouter } from "next/navigation";
import { VocabDetailsModal } from "@/components/features/vocab/vocab-details-modal";
import { Settings } from "lucide-react";

export default function Page() {
    const { user, isLoading, signOut } = useAuth();
    const router = useRouter();
    const [vocabList, setVocabList] = useState<any[]>([]);
    const [selectedVocab, setSelectedVocab] = useState<any>(null);
    const supabase = createClient();

    const fetchVocab = async () => {
        if (!user) return;
        const { data } = await supabase
            .from("vocabulary")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (data) setVocabList(data);
    };

    // Subscribe to realtime updates
    useRealtime("vocabulary", fetchVocab);

    // Initial fetch
    useEffect(() => {
        fetchVocab();
    }, [user, supabase]);


    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-24 space-y-4">
                <h1 className="text-4xl font-bold">Vocabulary App</h1>
                <p>Please log in to continue.</p>
                <Button>Login</Button>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
                        <span className="text-sm text-gray-500 hidden sm:inline-block">{user.email}</span>
                        <div className="flex gap-2">
                            <Button onClick={() => router.push("/settings")} variant="ghost" size="icon">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h2 className="text-xl font-semibold">Your Vocabulary</h2>
                        <AddVocabModal onVocabAdded={fetchVocab} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {vocabList.map((vocab) => (
                            <div
                                key={vocab.id}
                                onClick={() => setSelectedVocab(vocab)}
                                className={`
                                    group relative flex items-center justify-center p-4 min-h-[80px]
                                    rounded-lg border bg-card text-card-foreground shadow-sm transition-all
                                    hover:bg-muted/50 cursor-pointer overflow-hidden
                                    ${vocab.is_generating ? 'animate-pulse border-blue-200 bg-blue-50/50' : ''}
                                `}
                            >
                                <span className="text-center font-medium line-clamp-2 break-words">
                                    {vocab.term}
                                </span>

                                {vocab.is_generating && (
                                    <span className="absolute top-1 right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                )}
                            </div>
                        ))}
                        {vocabList.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No words yet. Add one to get started!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <VocabDetailsModal
                vocab={selectedVocab}
                // selectedVocabがあればtrue，なければfalse
                open={!!selectedVocab}
                // 閉じたときにselectedVocabをnullにする
                onOpenChange={(open) => !open && setSelectedVocab(null)}
            />
        </main>
    );
}
