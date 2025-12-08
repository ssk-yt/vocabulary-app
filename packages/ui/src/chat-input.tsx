import { Button } from "./button";
import { Input } from "./input";
import { Send, Sparkles } from "lucide-react";
import { useState } from "react";

export interface ChatInputProps {
    placeholder?: string;
    isSending?: boolean;
    onSendMessage: (message: string) => void | Promise<void>;
    disabled?: boolean;
}

export function ChatInput({
    placeholder = "Type a message...",
    isSending = false,
    onSendMessage,
    disabled = false
}: ChatInputProps) {
    const [input, setInput] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending || disabled) return;

        await onSendMessage(input);
        setInput("");
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-gray-50/50 border-t rounded-lg border">
            <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Sparkles className="w-4 h-4" />
                </div>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder}
                    className="pl-9 bg-white border-gray-200 focus-visible:ring-offset-0"
                    disabled={isSending || disabled}
                />
            </div>
            <Button
                type="submit"
                disabled={!input.trim() || isSending || disabled}
                className={`shrink-0 h-10 w-10 p-2 flex items-center justify-center rounded-md transition-colors ${input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-transparent text-gray-400 hover:bg-gray-100"
                    }`}
            >
                <Send className="w-4 h-4" />
            </Button>
        </form>
    );
}
