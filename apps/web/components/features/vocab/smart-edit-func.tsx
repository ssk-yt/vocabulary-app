"use client";

import { useSessionStore } from "@/stores/use-session-store";
import { createClient } from "@/lib/supabase/client";
import { ChatInput } from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";

interface SmartEditFuncProps {
    vocabId?: string;
    vocabTerm?: string;
    onSetGeneratingFields?: (fields: string[]) => void;
    placeholder?: string;
    onSendMessage?: (message: string) => void | Promise<void>;
    isSending?: boolean;
}

export function SmartEditFunc({
    vocabId,
    vocabTerm,
    onSetGeneratingFields,
    placeholder,
    onSendMessage: externalOnSendMessage,
    isSending: externalIsSending
}: SmartEditFuncProps) {
    const [internalIsSending, setInternalIsSending] = useState(false);
    const { apiKey } = useSessionStore();
    const supabase = createClient();

    const isSending = externalIsSending || internalIsSending;

    const handleSendMessage = async (message: string) => {
        // If external handler is provided (e.g. Register mode), use it
        if (externalOnSendMessage) {
            await externalOnSendMessage(message);
            return;
        }

        // Otherwise use internal logic (Edit mode)
        if (!apiKey || !vocabId) return;

        setInternalIsSending(true);

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

            // Step 2: Execute Edit
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
            let message = error.message;

            // Attempt to extract detailed error from Edge Function response
            if (error && typeof error === 'object' && 'context' in error) {
                try {
                    const errorContext = error.context;
                    // Check if context is a Response object
                    if (errorContext && typeof errorContext.json === 'function') {
                        const errorData = await errorContext.json();
                        if (errorData && errorData.error) {
                            message = errorData.error;
                        }
                    }
                } catch (e) {
                    console.warn("Failed to parse error context:", e);
                }
            }

            toast.error("Failed to process request: " + message);
        } finally {
            setInternalIsSending(false);
        }
    };

    if (!apiKey && !externalOnSendMessage) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
                Please configure your API key in settings to use Smart Edit.
            </div>
        );
    }

    return (
        <div className="mt-4">
            <ChatInput
                placeholder={placeholder || `Tell AI to edit "${vocabTerm}"...`}
                onSendMessage={handleSendMessage}
                isSending={isSending}
            />
        </div>
    );
}
