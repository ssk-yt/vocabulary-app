import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SessionState {
    apiKey: string | null;
    setApiKey: (key: string) => void;
    clearApiKey: () => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            apiKey: null,
            setApiKey: (key) => set({ apiKey: key }),
            clearApiKey: () => set({ apiKey: null }),
        }),
        {
            name: "vocab-session-storage",
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
