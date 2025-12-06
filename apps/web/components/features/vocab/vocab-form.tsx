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
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<VocabularyInput>({
        resolver: zodResolver(vocabularySchema),
    });

    const onSubmit = async (data: VocabularyInput) => {
        if (!user) return;
        setIsLoading(true);

        try {
            const { data: insertedData, error } = await supabase.from("vocabulary").insert({
                user_id: user.id,
                term: data.term,
                definition: data.definition,
                part_of_speech: data.part_of_speech,
                example: data.example,
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
        } catch (error) {
            console.error("Failed to add vocabulary:", error);
            alert("Failed to add vocabulary");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="term">Term</Label>
                <Input id="term" placeholder="e.g. Serendipity" {...register("term")} />
                {errors.term && (
                    <p className="text-sm text-red-500">{errors.term.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="definition">Definition</Label>
                <Input
                    id="definition"
                    placeholder="Meaning of the word"
                    {...register("definition")}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="part_of_speech">Part of Speech</Label>
                <Input
                    id="part_of_speech"
                    placeholder="e.g. noun, verb"
                    {...register("part_of_speech")}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="example">Example Sentence</Label>
                <Input
                    id="example"
                    placeholder="Context usage"
                    {...register("example")}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="source_memo">Source / Memo</Label>
                <Input
                    id="source_memo"
                    placeholder="Where did you find this?"
                    {...register("source_memo")}
                />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Vocabulary"}
            </Button>
        </form>
    );
}
