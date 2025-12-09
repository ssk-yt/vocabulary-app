"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vocabularySchema, VocabularyInput } from "@repo/schema";
import { Button, Input, Label, Textarea } from "@repo/ui";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useSessionStore } from "@/stores/use-session-store";
import { SmartEditFunc } from "./smart-edit-func";
import { motion, AnimatePresence } from "framer-motion";

export function VocabDrawerForm({ onSuccess }: { onSuccess?: () => void }) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const chatInputRef = useRef("");
    const supabase = createClient();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<VocabularyInput>({
        resolver: zodResolver(vocabularySchema),
    });

    const onSubmit = async (data: VocabularyInput) => {
        if (!user) return;

        if (!data.term && !chatInputRef.current.trim()) {
            alert("Please enter a term or provide context for auto-generation.");
            return;
        }

        setIsLoading(true);

        try {
            const termToInsert = data.term || "Generating...";

            const { data: insertedData, error } = await supabase.from("vocabulary").insert({
                user_id: user.id,
                term: termToInsert,
                definition: data.definition,
                part_of_speech: data.part_of_speech,
                example: data.example,
                etymology: data.etymology,
                synonyms: data.synonyms ? data.synonyms.split(/[,\s\n]+/).map(s => s.trim()).filter(Boolean) : [],
                collocations: data.collocations ? data.collocations.split(/[,\s\n]+/).map(s => s.trim()).filter(Boolean) : [],
                source_memo: data.source_memo,
                status: "uninput",
                is_generating: true,
            }).select();

            if (error) throw error;

            const { apiKey } = useSessionStore.getState();

            if (apiKey) {
                supabase.functions.invoke("process-vocabulary", {
                    body: {
                        record_id: insertedData ? insertedData[0]?.id : null,
                        chat_context: chatInputRef.current,
                        mode: "register"
                    },
                    headers: {
                        "X-OpenAI-Key": apiKey
                    }
                }).catch(err => {
                    console.error("Edge Function invocation error:", err);
                });
            }

            reset();
            chatInputRef.current = "";
            onSuccess?.();
        } catch (error: any) {
            console.error("Failed to add vocabulary:", error);
            alert(`Failed to add vocabulary: ${error.message || error.toString()}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChatSubmit = async (message: string) => {
        if (!message.trim()) {
            alert("Please provide context to generate.");
            return;
        }

        chatInputRef.current = message;

        const currentTerm = getValues("term");
        if (!currentTerm) {
            setValue("term", "Generating...", { shouldValidate: true });
        }

        await handleSubmit(onSubmit)();
    };

    const [activeTab, setActiveTab] = useState("basic");
    const tabs = [
        { id: "basic", label: "基本" },
        { id: "relations", label: "関連" },
        { id: "etymology", label: "語源" },
    ];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
            <div className="px-4 pb-4">
                <div className="w-full mb-4">
                    <div className="grid w-full grid-cols-3 bg-zinc-100 rounded-md p-1 relative">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveTab(tab.id);
                                }}
                                className={`relative z-10 py-1.5 text-sm font-medium transition-colors duration-200 ${activeTab === tab.id ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-700"
                                    }`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="active-tab-indicator"
                                        className="absolute inset-0 bg-white rounded-sm shadow-sm -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <motion.div
                    layout
                    className="overflow-hidden"
                    initial={false}
                    animate={{ height: "auto" }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {activeTab === "basic" && (
                            <motion.div
                                key="basic"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="term">単語 <span className="text-red-500">*</span></Label>
                                    <Input id="term" placeholder="例: Serendipity" {...register("term")} />
                                    {errors.term && <p className="text-sm text-red-500">{errors.term.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="definition">意味</Label>
                                    <Input id="definition" placeholder="単語の意味" {...register("definition")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="example">例文</Label>
                                    <Textarea id="example" placeholder="文脈や使用例" {...register("example")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="source_memo">出典 / メモ</Label>
                                    <Input id="source_memo" placeholder="どこで見つけましたか？" {...register("source_memo")} />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "relations" && (
                            <motion.div
                                key="relations"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="synonyms">類義語</Label>
                                    <Textarea id="synonyms" placeholder="スペースやカンマで区切って入力" {...register("synonyms")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="collocations">コロケーション</Label>
                                    <Textarea id="collocations" placeholder="関連語句を入力" {...register("collocations")} />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "etymology" && (
                            <motion.div
                                key="etymology"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="part_of_speech">品詞</Label>
                                    <Input id="part_of_speech" placeholder="例: 名詞, 動詞" {...register("part_of_speech")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="etymology">語源</Label>
                                    <Textarea id="etymology" placeholder="単語の由来" {...register("etymology")} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            <div className="border-t bg-white p-4 space-y-4 mt-auto">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-primary">AI Auto-Complete</Label>
                    <SmartEditFunc
                        placeholder="Paste context or instructions..."
                        onSendMessage={handleChatSubmit}
                        isSending={isLoading}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "追加中..." : "単語を追加"}
                </Button>
            </div>
        </form>
    );
}
