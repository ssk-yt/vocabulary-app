"use client";


import { useAuth } from "@/components/auth-provider";
import { AddVocabModal } from "@/components/features/vocab/add-vocab-modal";
import { Button, Item, ItemContent, ItemHeader, ItemTitle, ItemDescription, Skeleton } from "@repo/ui";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/lib/hooks/use-realtime";

import { useRouter } from "next/navigation";
import { VocabDetailsModal } from "@/components/features/vocab/vocab-details-modal";

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
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-sm text-gray-500 hidden sm:inline-block">{user.email}</span>
                        <div className="flex gap-2">
                            <Button onClick={() => router.push("/settings")} variant="ghost" className="text-sm">Settings</Button>
                            <Button onClick={signOut} variant="destructive" className="text-sm">Sign Out</Button>
                        </div>
                    </div>
                </div>
            </header>
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h2 className="text-xl font-semibold">Your Vocabulary</h2>
                        <AddVocabModal onVocabAdded={fetchVocab} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {vocabList.map((vocab) => (
                            <div key={vocab.id} className="h-full" onClick={() => setSelectedVocab(vocab)}>
                                <Item size="sm" className="h-full hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden">
                                    {vocab.is_generating && (
                                        <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="flex flex-col gap-2 w-full p-4">
                                                <Skeleton className="h-4 w-3/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                                <div className="flex gap-2 mt-2">
                                                    <Skeleton className="h-8 w-16" />
                                                </div>
                                            </div>
                                            {/* <span className="absolute bottom-2 right-2 text-xs font-medium text-blue-600 animate-pulse">
                                                AI Generating...
                                            </span> */}
                                        </div>
                                    )}
                                    <ItemContent>
                                        <ItemHeader>
                                            <ItemTitle className="flex items-baseline gap-2">
                                                <span>{vocab.term}</span>
                                                <span className="text-sm font-normal text-muted-foreground">{vocab.part_of_speech}</span>
                                            </ItemTitle>
                                        </ItemHeader>
                                        <ItemDescription className="mt-2 line-clamp-2">
                                            {vocab.definition || "No definition yet..."}
                                        </ItemDescription>
                                        {vocab.example && (
                                            <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm text-foreground/90 italic line-clamp-2 border">
                                                "{vocab.example}"
                                            </div>
                                        )}
                                    </ItemContent>

                                </Item>
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
