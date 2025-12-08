"use client";

import { useSessionStore } from "@/stores/use-session-store";
import { createClient } from "@/lib/supabase/client";
import { ChatInput } from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";

interface ChatPanelProps {
    vocabId: string;
    vocabTerm: string;
    onSetGeneratingFields?: (fields: string[]) => void;
}

export function ChatPanel({ vocabId, vocabTerm, onSetGeneratingFields }: ChatPanelProps) {
    const [isSending, setIsSending] = useState(false);
    const { apiKey } = useSessionStore();
    const supabase = createClient();

    const handleSendMessage = async (message: string) => {
        if (!apiKey) return;

        setIsSending(true);

        try {
            // Step 1: Predict targets
            const { data: predictData, error: predictError } = await supabase.functions.invoke("process-vocabulary", {
                body: {
                    record_id: vocabId,
                    chat_context: message,
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
                    chat_context: message,
                    mode: "edit"
                },
                headers: {
                    "X-OpenAI-Key": apiKey
                }
            });

            if (editError) throw editError;

            toast.success("AI has processed your request");
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
        <div className="mt-4">
            <ChatInput
                placeholder={`Tell AI to edit "${vocabTerm}"...`}
                onSendMessage={handleSendMessage}
                isSending={isSending}
            />
        </div>
    );
}
