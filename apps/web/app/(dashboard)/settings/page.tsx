"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { encryptAPIKey, decryptAPIKey, EncryptedData } from "@/lib/crypto/encryption";
import { useSessionStore } from "@/stores/use-session-store";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const { apiKey, setApiKey } = useSessionStore();
    const [inputKey, setInputKey] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const supabase = createClient();

    // Load existing encrypted key if available
    useEffect(() => {
        async function loadKey() {
            if (!user) return;

            const { data, error } = await supabase
                .from("profiles")
                .select("encrypted_api_key")
                .eq("id", user.id)
                .single();

            if (data?.encrypted_api_key) {
                setMessage("An encrypted API key is saved. Enter password to decrypt/update.");
            }
        }
        loadKey();
    }, [user, supabase]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !inputKey || !password) return;

        setIsLoading(true);
        setStatus("idle");

        try {
            // 1. Encrypt the key locally
            const encrypted = await encryptAPIKey(inputKey, password);
            const encryptedString = JSON.stringify(encrypted);

            // 2. Save to Supabase
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    encrypted_api_key: encryptedString,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            // 3. Update session store
            setApiKey(inputKey);
            setStatus("success");
            setMessage("API Key saved and encrypted successfully!");
            setInputKey(""); // Clear input for security
        } catch (err: any) {
            setStatus("error");
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDecrypt = async () => {
        if (!user || !password) return;
        setIsLoading(true);

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("encrypted_api_key")
                .eq("id", user.id)
                .single();

            if (error || !data?.encrypted_api_key) throw new Error("No key found");

            const encryptedData: EncryptedData = JSON.parse(data.encrypted_api_key);
            const decrypted = await decryptAPIKey(encryptedData, password);

            setApiKey(decrypted);
            setStatus("success");
            setMessage("API Key decrypted and loaded into session!");
        } catch (err: any) {
            setStatus("error");
            setMessage("Failed to decrypt. Wrong password?");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="mb-6">
                <Link href="/" className="text-blue-500 hover:underline">
                    ← Back to Dashboard
                </Link>
            </div>
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            <div className="bg-white p-6 rounded-lg shadow space-y-6">
                <div>
                    <h2 className="text-lg font-semibold mb-2">OpenAI API Key</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Your API key is encrypted in your browser using your password before being stored.
                        We never see your raw API key.
                    </p>
                </div>

                <div className="space-y-4">
                    {apiKey ? (
                        <div className="p-4 bg-green-50 text-green-700 rounded-md flex justify-between items-center">
                            <span>API Key is loaded and ready to use.</span>
                            <Button onClick={() => setApiKey("")} className="bg-red-100 text-red-700 hover:bg-red-200">
                                Clear Session
                            </Button>
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md space-y-3">
                            <p>API Key is NOT loaded. You need to decrypt it to use AI features.</p>
                            {process.env.NEXT_PUBLIC_ENABLE_DEMO === "true" && (
                                <Button
                                    onClick={() => {
                                        setApiKey("DEMO_MODE_ACTIVE");
                                        setStatus("success");
                                        setMessage("Demo Mode Activated! You can now use AI features.");
                                    }}
                                    className="bg-green-600 text-white hover:bg-green-700 w-full md:w-auto"
                                >
                                    Try Demo Mode (No Key Required)
                                </Button>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">API Key (sk-...)</label>
                            <input
                                type="password"
                                value={inputKey}
                                onChange={(e) => setInputKey(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                placeholder="sk-..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Encryption Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                placeholder="Enter a strong password"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Do not forget this password. There is no way to recover your API key without it.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <Button type="submit" disabled={isLoading || !inputKey}>
                                Encrypt & Save
                            </Button>
                            <Button type="button" onClick={handleDecrypt} disabled={isLoading || !password} className="bg-gray-100 text-gray-900 hover:bg-gray-200">
                                Decrypt Existing
                            </Button>
                        </div>
                    </form>

                    {message && (
                        <div className={`p-3 rounded-md text-sm ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <Button onClick={signOut} variant="destructive" className="w-full sm:w-auto">
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
