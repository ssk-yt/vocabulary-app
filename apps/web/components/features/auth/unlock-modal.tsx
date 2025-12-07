"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import { createClient } from "@/lib/supabase/client";
import { decryptAPIKey, EncryptedData } from "@/lib/crypto/encryption";
import { useSessionStore } from "@/stores/use-session-store";
import { useAuth } from "@/components/auth-provider";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@repo/ui";

export function UnlockModal() {
    const { user, isLoading: authLoading } = useAuth();
    const { apiKey, setApiKey } = useSessionStore();
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Check if we need to show the modal
    useEffect(() => {
        const checkStatus = async () => {
            if (authLoading || !user) return;
            if (apiKey) {
                setIsOpen(false);
                return;
            }

            const supabase = createClient();
            const { data } = await supabase
                .from("profiles")
                .select("encrypted_api_key")
                .eq("id", user.id)
                .single();

            // Only show modal if an encrypted key exists but no session key
            if (data?.encrypted_api_key && !apiKey) {
                setIsOpen(true);
            }
        };

        checkStatus();
    }, [user, authLoading, apiKey]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const supabase = createClient();
            if (!user) throw new Error("No user found");

            const { data } = await supabase
                .from("profiles")
                .select("encrypted_api_key")
                .eq("id", user.id)
                .single();

            if (!data?.encrypted_api_key) {
                throw new Error("No encrypted key found to unlock");
            }

            const encryptedData: EncryptedData = JSON.parse(data.encrypted_api_key);
            const decryptedKey = await decryptAPIKey(encryptedData, password);

            setApiKey(decryptedKey);
            setIsOpen(false);
            setPassword("");
        } catch (err: any) {
            console.error("Unlock failed:", err);
            setError("Incorrect password or decryption failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => {
            // Prevent closing by clicking outside if it's required
        }}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e: any) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Unlock AI Features</DialogTitle>
                    <DialogDescription>
                        Please enter your encryption password to unlock your API Key for this session.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Encryption Password"
                            required
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded"
                        >
                            Skip (Read Only)
                        </Button>
                        <Button type="submit" disabled={isLoading || !password} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded">
                            {isLoading ? "Unlocking..." : "Unlock"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
