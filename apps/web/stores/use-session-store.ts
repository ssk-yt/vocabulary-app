import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SessionState {
    apiKey: string | null;
    setApiKey: (key: string) => void;
    clearApiKey: () => void;
}
                            // ストアを作成（データ置き場）
export const useSessionStore = create<SessionState>()(
    // ストアの中身変更時，sessionStorageに保存する
    persist(
        (set) => ({
            apiKey: null,
            setApiKey: (key) => set({ apiKey: key }),
            clearApiKey: () => set({ apiKey: null }),
        }),
        {
            // ストアの名前
            name: "vocab-session-storage",
            // ブラウザのタブを閉じる
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
