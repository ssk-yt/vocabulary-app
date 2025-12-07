"use client";


import { useAuth } from "@/components/auth-provider";
import { AddVocabModal } from "@/components/features/vocab/add-vocab-modal";
import { Button } from "@repo/ui";
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
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{user.email}</span>
                        <Button onClick={() => router.push("/settings")} className="bg-gray-100 text-gray-900 hover:bg-gray-200">Settings</Button>
                        <Button onClick={signOut} className="bg-red-100 text-red-700 hover:bg-red-200">
                            Sign Out
                        </Button>
                    </div>
                </div>
            </header>
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Your Vocabulary</h2>
                        <AddVocabModal onVocabAdded={fetchVocab} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {vocabList.map((vocab) => (
                            <div
                                key={vocab.id}
                                className="bg-white overflow-hidden shadow rounded-lg p-6 relative hover:shadow-md transition-shadow cursor-pointer h-full"
                                onClick={() => setSelectedVocab(vocab)}
                            >
                                {vocab.is_generating && (
                                    <div className="absolute top-2 right-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                                            AI Generating...
                                        </span>
                                    </div>
                                )}
                                <h3 className="text-lg font-medium text-gray-900">{vocab.term}</h3>
                                <p className="mt-1 text-sm text-gray-500 italic">{vocab.part_of_speech}</p>
                                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{vocab.definition || "No definition yet..."}</p>
                                {vocab.example && (
                                    <div className="mt-4 p-2 bg-gray-50 rounded text-sm text-gray-700 line-clamp-2">
                                        "{vocab.example}"
                                    </div>
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
