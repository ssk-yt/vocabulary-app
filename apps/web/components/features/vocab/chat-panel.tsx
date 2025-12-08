"use client";

import { useSessionStore } from "@/stores/use-session-store";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@repo/ui";
import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ChatPanelProps {
    vocabId: string;
    vocabTerm: string;
    onSetGeneratingFields?: (fields: string[]) => void;
}

export function ChatPanel({ vocabId, vocabTerm, onSetGeneratingFields }: ChatPanelProps) {
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { apiKey } = useSessionStore();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !apiKey) return;

        setIsSending(true);


        try {
            // Step 1: Predict targets
            const { data: predictData, error: predictError } = await supabase.functions.invoke("process-vocabulary", {
                body: {
                    record_id: vocabId,
                    chat_context: input,
                    mode: "predict"
                },
                headers: {
                    "X-OpenAI-Key": apiKey
                }
            });

            if (predictError) throw predictError;

            // Set skeleton based on predicted targets
            const targets = predictData?.targets || [];
            onSetGeneratingFields?.(targets);

            // Step 2: Execute Edit (Fire and Forget or Await? Await for now to show global loading if needed)
            const { error: editError } = await supabase.functions.invoke("process-vocabulary", {
                body: {
                    record_id: vocabId,
                    chat_context: input,
                    mode: "edit"
                },
                headers: {
                    "X-OpenAI-Key": apiKey
                }
            });

            if (editError) throw editError;

            toast.success("AI has processed your request");
            setInput("");
        } catch (error: any) {
            console.error("Smart Edit failed:", error);
            toast.error("Failed to process request: " + error.message);
        } finally {
            setIsSending(false);
            // We don't clear generating fields here; Realtime update from DB will handle it
            // OR if it fails, we should clear it
        }
    };

    if (!apiKey) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
                Please configure your API key in settings to use Smart Edit.
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-gray-50/50 border-t mt-4">
            <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Sparkles className="w-4 h-4" />
                </div>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Tell AI to edit "${vocabTerm}"...`}
                    className="pl-9 bg-white border-gray-200 focus-visible:ring-offset-0"
                    disabled={isSending}
                />
            </div>
            <Button
                type="submit"
                disabled={!input.trim() || isSending}
                className={`shrink-0 h-10 w-10 p-2 flex items-center justify-center rounded-md transition-colors ${input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-transparent text-gray-400 hover:bg-gray-100"
                    }`}
            >
                <Send className="w-4 h-4" />
            </Button>
        </form>
    );
}
