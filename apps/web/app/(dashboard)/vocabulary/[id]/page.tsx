"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@repo/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function VocabularyDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [vocab, setVocab] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchVocab() {
            const { data, error } = await supabase
                .from("vocabulary")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error fetching vocabulary:", error);
                // router.push("/"); // Redirect if not found?
            } else {
                setVocab(data);
            }
            setIsLoading(false);
        }
        fetchVocab();
    }, [id, supabase, router]);

    if (isLoading) return <div className="p-8">Loading...</div>;
    if (!vocab) return <div className="p-8">Vocabulary not found.</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8">
                <div className="mb-6">
                    <Link href="/" className="text-blue-500 hover:underline">
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="border-b pb-4 mb-6">
                    <h1 className="text-4xl font-bold text-gray-900">{vocab.term}</h1>
                    <p className="text-lg text-gray-500 italic mt-2">{vocab.part_of_speech}</p>
                </div>

                <div className="space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Definition</h2>
                        <p className="text-gray-700 text-lg">{vocab.definition || "No definition available."}</p>
                    </section>

                    {vocab.example && (
                        <section>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Example</h2>
                            <div className="bg-gray-50 p-4 rounded-md border-l-4 border-blue-500">
                                <p className="text-gray-700 italic">"{vocab.example}"</p>
                            </div>
                        </section>
                    )}

                    {vocab.synonyms && vocab.synonyms.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Synonyms</h2>
                            <div className="flex flex-wrap gap-2">
                                {vocab.synonyms.map((syn: string, index: number) => (
                                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                        {syn}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {vocab.etymology && (
                        <section>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Etymology</h2>
                            <p className="text-gray-600">{vocab.etymology}</p>
                        </section>
                    )}

                    {vocab.source_memo && (
                        <section>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Source / Memo</h2>
                            <p className="text-gray-600">{vocab.source_memo}</p>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
