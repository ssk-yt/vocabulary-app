"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vocabularySchema, VocabularyInput } from "@repo/schema";
import { Button, Input, Label } from "@repo/ui";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useSessionStore } from "@/stores/use-session-store";

export function VocabForm({ onSuccess }: { onSuccess?: () => void }) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const {
        // inputされた値の参照
        register,
        // バリデーション成功時にフォームのデータを受け取る
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<VocabularyInput>({
        // Zodでバリデーションするときに使う
        resolver: zodResolver(vocabularySchema),
    });

    const onSubmit = async (data: VocabularyInput) => {
        // ログインしていなければ何もしない
        if (!user) return;
        setIsLoading(true);

        try {
            const { data: insertedData, error } = await supabase.from("vocabulary").insert({
                user_id: user.id,
                term: data.term,
                definition: data.definition,
                part_of_speech: data.part_of_speech,
                example: data.example,
                etymology: data.etymology,
                // Split by comma, space, newline, etc.
                synonyms: data.synonyms ? data.synonyms.split(/[,\s\n]+/).map(s => s.trim()).filter(Boolean) : [],
                collocations: data.collocations ? data.collocations.split(/[,\s\n]+/).map(s => s.trim()).filter(Boolean) : [],
                source_memo: data.source_memo,
                status: "uninput",
            }).select();

            if (error) throw error;

            // Invoke Edge Function
            const { apiKey } = useSessionStore.getState();
            console.log("Submitting vocabulary...", { insertedId: insertedData?.[0]?.id, hasApiKey: !!apiKey });

            if (apiKey) {
                console.log("Invoking process-vocabulary...");
                const { data: funcData, error: funcError } = await supabase.functions.invoke("process-vocabulary", {
                    body: { record_id: insertedData ? insertedData[0]?.id : null },
                    headers: {
                        "X-OpenAI-Key": apiKey
                    }
                });
                console.log("Edge Function response:", { data: funcData, error: funcError });
            } else {
                console.warn("No API key found in session store. Skipping AI processing.");
            }

            reset();
            onSuccess?.();
        } catch (error: any) {
            console.error("Failed to add vocabulary:", error);
            alert(`Failed to add vocabulary: ${error.message || error.toString()}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="term">単語</Label>
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

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "追加中..." : "単語を追加"}
            </Button>
        </form>
    );
}
