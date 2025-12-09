"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Textarea, Skeleton } from "@repo/ui";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SmartEditFunc } from "./smart-edit-func";

interface VocabDetailsModalProps {
    vocab: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function VocabDetailsModal({ vocab: initialVocab, open, onOpenChange }: VocabDetailsModalProps) {
    const [saving, setSaving] = useState(false);
    const [generatingFields, setGeneratingFields] = useState<string[]>([]);
    const [vocab, setVocab] = useState(initialVocab);
    const supabase = createClient();

    // Helper to check if a specific field should show skeleton
    const isFieldGenerating = (field: string) => {
        return generatingFields.includes(field) || (vocab?.is_generating && generatingFields.length === 0);
    };

    // Global loading state for when we don't have specific targets (fallback)
    const isGlobalGenerating = vocab?.is_generating && generatingFields.length === 0;

    // Local state for array inputs to handle comma separation editing
    const [synonymsInput, setSynonymsInput] = useState("");
    const [collocationsInput, setCollocationsInput] = useState("");

    // Sync from prop if it changes
    useEffect(() => {
        if (initialVocab) {
            setVocab(initialVocab);
        }
    }, [initialVocab]);

    // Sync input fields when vocab state changes
    useEffect(() => {
        if (vocab) {
            setSynonymsInput(vocab.synonyms?.join(", ") || "");
            setCollocationsInput(vocab.collocations?.join(", ") || "");
        }
    }, [vocab]);

    // Realtime Subscription
    useEffect(() => {
        if (!vocab?.id) return;

        const channel = supabase
            .channel(`vocab-${vocab.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "vocabulary",
                    filter: `id=eq.${vocab.id}`,
                },
                (payload) => {
                    console.log("Realtime update received", payload);
                    const newVocab = payload.new as any;
                    setVocab((prev: any) => ({ ...prev, ...newVocab }));

                    if (newVocab.is_generating === false) {
                        setGeneratingFields([]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [vocab?.id, supabase]);

    if (!vocab) return null;

    const handleSave = async (field: string, value: any) => {
        console.log(`Saving ${field}:`, value);
        setSaving(true);

        try {
            const { error } = await supabase
                .from("vocabulary")
                .update({ [field]: value })
                .eq("id", vocab.id);

            if (error) throw error;
            console.log("Saved successfully");
        } catch (error) {
            console.error("Failed to save:", error);
            // Optionally revert UI state or show error
        } finally {
            setSaving(false);
        }
    };

    const handleArraySave = (field: string, textValue: string) => {
        const arrayValue = textValue.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
        handleSave(field, arrayValue);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl px-0 pb-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b">
                    <DialogHeader className="p-0">
                        <div className="flex justify-between items-start mr-8">
                            <div className="flex-1">
                                {isFieldGenerating("term") ? (
                                    <Skeleton className="h-9 w-full mb-1" />
                                ) : (
                                    <Input
                                        className="text-2xl font-bold border-none shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 px-0 h-auto py-1"
                                        defaultValue={vocab.term}
                                        key={`term-${vocab.term}`}
                                        onBlur={(e) => handleSave("term", e.target.value)}
                                    />
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-base font-normal text-gray-400">/</span>
                                    {isFieldGenerating("ipa") ? (
                                        <Skeleton className="h-6 w-32" />
                                    ) : (
                                        <Input
                                            className="text-base font-normal text-gray-400 border-none shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 px-0 h-auto py-0 w-32 inline-block"
                                            defaultValue={vocab.ipa || ""}
                                            key={`ipa-${vocab.ipa}`}
                                            placeholder="ipa"
                                            onBlur={(e) => handleSave("ipa", e.target.value)}
                                        />
                                    )}
                                    <span className="text-base font-normal text-gray-400">/</span>
                                </div>
                            </div>
                            {(isGlobalGenerating || generatingFields.length > 0) && (
                                <span className="text-xs text-blue-500 animate-pulse font-medium">
                                    AI Generating...
                                </span>
                            )}
                            {(saving && !isGlobalGenerating && generatingFields.length === 0) && (
                                <span className="text-xs text-blue-500 animate-pulse font-medium">
                                    Saving...
                                </span>
                            )}
                        </div>
                        <div className="mt-2">
                            {isFieldGenerating("part_of_speech") ? (
                                <Skeleton className="h-5 w-1/3" />
                            ) : (
                                <Input
                                    className="text-sm text-gray-500 italic border-none shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 px-0 h-auto py-1 w-full"
                                    defaultValue={vocab.part_of_speech || ""}
                                    key={`pos-${vocab.part_of_speech}`}
                                    placeholder="Part of Speech"
                                    onBlur={(e) => handleSave("part_of_speech", e.target.value)}
                                />
                            )}
                        </div>
                    </DialogHeader>
                </div>

                <div className="space-y-6 p-6 overflow-y-auto flex-1">
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">意味</h3>
                        {isFieldGenerating("definition") ? (
                            <Skeleton className="h-20 w-full" />
                        ) : (
                            <Textarea
                                className="bg-transparent border-transparent hover:border-input focus:border-input resize-none"
                                defaultValue={vocab.definition || ""}
                                key={`def-${vocab.definition}`}
                                placeholder="Add definition..."
                                onBlur={(e) => handleSave("definition", e.target.value)}
                            />
                        )}
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">例文</h3>
                        <div className="bg-gray-50 p-3 rounded-md ">
                            {isFieldGenerating("example") ? (
                                <Skeleton className="h-16 w-full" />
                            ) : (
                                <Textarea
                                    className="bg-transparent border-transparent hover:border-input focus:border-input resize-none italic text-gray-700 min-h-[60px]"
                                    defaultValue={vocab.example || ""}
                                    key={`ex-${vocab.example}`}
                                    placeholder="Add example sentence..."
                                    onBlur={(e) => handleSave("example", e.target.value)}
                                />
                            )}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">類義語</h3>
                            {isFieldGenerating("synonyms") ? (
                                <Skeleton className="h-16 w-full" />
                            ) : (
                                <Textarea
                                    className="bg-transparent border-transparent hover:border-input focus:border-input resize-none"
                                    value={synonymsInput}
                                    onChange={(e) => setSynonymsInput(e.target.value)}
                                    onBlur={(e) => handleArraySave("synonyms", e.target.value)}
                                    placeholder="Comma separated..."
                                />
                            )}
                        </section>

                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">コロケーション</h3>
                            {isFieldGenerating("collocations") ? (
                                <Skeleton className="h-16 w-full" />
                            ) : (
                                <Textarea
                                    className="bg-transparent border-transparent hover:border-input focus:border-input resize-none"
                                    value={collocationsInput}
                                    onChange={(e) => setCollocationsInput(e.target.value)}
                                    onBlur={(e) => handleArraySave("collocations", e.target.value)}
                                    placeholder="Comma separated..."
                                />
                            )}
                        </section>
                    </div>

                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">語源</h3>
                        {isFieldGenerating("etymology") ? (
                            <Skeleton className="h-16 w-full" />
                        ) : (
                            <Textarea
                                className="bg-transparent border-transparent hover:border-input focus:border-input resize-none"
                                defaultValue={vocab.etymology || ""}
                                key={`ety-${vocab.etymology}`}
                                placeholder="Add etymology..."
                                onBlur={(e) => handleSave("etymology", e.target.value)}
                            />
                        )}
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">出典 / メモ</h3>
                        {isFieldGenerating("source_memo") ? (
                            <Skeleton className="h-16 w-full" />
                        ) : (
                            <Textarea
                                className="bg-transparent border-transparent hover:border-input focus:border-input resize-none"
                                defaultValue={vocab.source_memo || ""}
                                key={`src-${vocab.source_memo}`}
                                placeholder="Add memo..."
                                onBlur={(e) => handleSave("source_memo", e.target.value)}
                            />
                        )}
                    </section>
                </div>

                {/* Chat Panel Fixed at Bottom */}
                <SmartEditFunc
                    vocabId={vocab.id}
                    vocabTerm={vocab.term}
                    onSetGeneratingFields={setGeneratingFields}
                />
            </DialogContent>
        </Dialog>
    );
}