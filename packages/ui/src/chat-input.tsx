import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

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

    const handleSubmit = async () => {
        if (!input.trim() || isSending || disabled) return;

        await onSendMessage(input);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex items-center gap-2 p-3 bg-gray-50/50 border-t rounded-lg border">
            <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Sparkles className="w-4 h-4" />
                </div>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="pl-9 bg-white border-gray-200 focus-visible:ring-offset-0"
                    disabled={isSending || disabled}
                />
            </div>
            <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isSending || disabled}
                className={`shrink-0 h-10 w-10 p-2 flex items-center justify-center rounded-md transition-colors ${input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-transparent text-gray-400 hover:bg-gray-100"
                    }`}
            >
                <Send className="w-4 h-4" />
            </Button>
        </div>
    );
}
