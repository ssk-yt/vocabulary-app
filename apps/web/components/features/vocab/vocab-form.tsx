"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vocabularySchema, VocabularyInput } from "@repo/schema";
import { Button, Input, Label } from "@repo/ui";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useSessionStore } from "@/stores/use-session-store";
import { ChatInput } from "@repo/ui";
import { useRef } from "react";

export function VocabForm({ onSuccess }: { onSuccess?: () => void }) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const chatInputRef = useRef("");
    const supabase = createClient();

    const {
        // inputされた値の参照
        register,
        // バリデーション成功時にフォームのデータを受け取る
        handleSubmit,
        reset,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<VocabularyInput>({
        // Zodでバリデーションするときに使う
        resolver: zodResolver(vocabularySchema),
    });

    const onSubmit = async (data: VocabularyInput) => {
        // ログインしていなければ何もしない
        if (!user) return;

        // Custom Validation: Require either term OR chatInput
        // Note: validating against placeholders if Auto API was used
        if (!data.term && !chatInputRef.current.trim()) {
            alert("Please enter a term or provide context for auto-generation.");
            return;
        }

        setIsLoading(true);

        try {
            // If term is empty (but bypassed validation via placeholder logic in handleAutoApi), 
            // ensure we send something. If we are here, data.term might be "Generating..." or a valid term.
            const termToInsert = data.term || "Generating...";

            const { data: insertedData, error } = await supabase.from("vocabulary").insert({
                user_id: user.id,
                term: termToInsert,
                definition: data.definition,
                part_of_speech: data.part_of_speech,
                example: data.example,
                etymology: data.etymology,
                // Split by comma, space, newline, etc.
                synonyms: data.synonyms ? data.synonyms.split(/[,\s\n]+/).map(s => s.trim()).filter(Boolean) : [],
                collocations: data.collocations ? data.collocations.split(/[,\s\n]+/).map(s => s.trim()).filter(Boolean) : [],
                source_memo: data.source_memo,
                status: "uninput",
                is_generating: true,
            }).select();

            if (error) throw error;

            // Invoke Edge Function
            const { apiKey } = useSessionStore.getState();
            console.log("Submitting vocabulary...", { insertedId: insertedData?.[0]?.id, hasApiKey: !!apiKey });

            if (apiKey) {
                console.log("Invoking process-vocabulary...");
                // Fire and forget - don't await to keep UI responsive
                supabase.functions.invoke("process-vocabulary", {
                    body: {
                        record_id: insertedData ? insertedData[0]?.id : null,
                        chat_context: chatInputRef.current, // Pass chat instructions directly
                        mode: "register"
                    },
                    headers: {
                        "X-OpenAI-Key": apiKey
                    }
                }).then(({ data, error }) => {
                    console.log("Edge Function response:", { data, error });
                }).catch(err => {
                    console.error("Edge Function invocation error:", err);
                });
            } else {
                console.warn("No API key found in session store. Skipping AI processing.");
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

    // Handler for ChatPanel submit
    const handleChatSubmit = async (message: string) => {
        if (!message.trim()) {
            alert("Please provide context to generate.");
            return;
        }

        chatInputRef.current = message;

        // If term is empty, fill it with placeholder to pass Zod validation
        const currentTerm = getValues("term");
        if (!currentTerm) {
            setValue("term", "Generating...", { shouldValidate: true });
        }

        // Submit the form
        await handleSubmit(onSubmit)();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Chat / Context Input Area */}
            <div className="space-y-2">
                <Label className="text-base font-semibold text-primary">
                    AI Auto-Complete
                </Label>
                <ChatInput
                    placeholder="Paste context, sentence, or instructions here..."
                    onSendMessage={handleChatSubmit}
                    isSending={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                    Enter context above and click the send button to auto-generate details (even without a term).
                </p>
            </div>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or Manual Input
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="term">単語 <span className="text-red-500">*</span></Label>
                <Input id="term" placeholder="例: Serendipity" {...register("term")} />
                {errors.term && (
                    <p className="text-sm text-red-500">{errors.term.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="definition">意味</Label>
                <Input
                    id="definition"
                    placeholder="単語の意味"
                    {...register("definition")}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="part_of_speech">品詞</Label>
                <Input
                    id="part_of_speech"
                    placeholder="例: 名詞, 動詞"
                    {...register("part_of_speech")}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="example">例文</Label>
                <Input
                    id="example"
                    placeholder="文脈や使用例"
                    {...register("example")}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="source_memo">出典 / メモ</Label>
                <Input
                    id="source_memo"
                    placeholder="どこで見つけましたか？"
                    {...register("source_memo")}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="etymology">語源</Label>
                    <Input
                        id="etymology"
                        placeholder="単語の由来"
                        {...register("etymology")}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="synonyms">類義語</Label>
                <Input
                    id="synonyms"
                    placeholder="スペースやカンマで区切って入力"
                    {...register("synonyms")}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="collocations">コロケーション</Label>
                <Input
                    id="collocations"
                    placeholder="関連語句を入力"
                    {...register("collocations")}
                />
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? "追加中..." : "単語を追加"}
            </Button>
        </form>
    );
}
