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
    // Auth関係のloading状態とログインしているユーザー
    const { user, isLoading: authLoading } = useAuth();
    const { apiKey, setApiKey } = useSessionStore();
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState("");
    // 復号時のローディング
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Check if we need to show the modal
    useEffect(() => {
        const checkStatus = async () => {
            // ログイン済みか確認中もしくはログインしていなければ，DBからデータを引っ張る前に終了（useEffectはauthLoadingが変更されたらまた実行される）
            if (authLoading || !user) return;
            // もし複合済みのAPI Keyがあれば，supabaseクライアントをDBからデータを引っ張る前に終了
            if (apiKey) {
                setIsOpen(false);
                return;
            }

            const supabase = createClient();
            const { data } = await supabase
                // プロファイルから
                .from("profiles")
                // 暗号化済みのAPI Keyを取得
                .select("encrypted_api_key")
                // ログインしているユーザーのもののみ
                .eq("id", user.id)
                .single();

            // 暗号化されたAPI KeyがDBにあり（つまり一度もAPIキーを設定していない場合はモーダルが開かない），かつ複合済みのAPIキーがなければ，モーダルを開く（→）
            if (data?.encrypted_api_key && !apiKey) {
                setIsOpen(true);
            }
        };

        checkStatus();
    }, [user, authLoading, apiKey]);

    const handleUnlock = async (e: React.FormEvent) => {
        // モーダルのフォーム送信でページがリロードされないようにする
        e.preventDefault();
        // Unlockされたら，フォームのエラー表示を切る
        setError("");
        // Unlockの処理中にローディング表示を立てる
        setIsLoading(true);

        try {
            const supabase = createClient();
            // モーダルに情報を入力したのにユーザーがいない場合は，エラーを投げる
            if (!user) throw new Error("No user found");
            // もしモーダルが表示されてからDBの情報が変更されいても，対応できるように，再取得する
            const { data } = await supabase
                .from("profiles")
                .select("encrypted_api_key")
                .eq("id", user.id)
                .single();

            if (!data?.encrypted_api_key) {
                throw new Error("No encrypted key found to unlock");
            }
            // DBから持ってきた暗号化済みのAPI KeyをJSONにパースして復号
            const encryptedData: EncryptedData = JSON.parse(data.encrypted_api_key);
            const decryptedKey = await decryptAPIKey(encryptedData, password);
            // 復号したAPI Keyをセット
            setApiKey(decryptedKey);
            // モーダルを閉じる
            setIsOpen(false);
            // パスワードを空にする
            setPassword("");
        } catch (err: any) {
            // コンソールにエラー内容を記録
            console.error("Unlock failed:", err);
            // パスワードが違う場合にエラー
            setError("Incorrect password or decryption failed.");
        } finally {
            // Unlock中のローディングを切る
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
