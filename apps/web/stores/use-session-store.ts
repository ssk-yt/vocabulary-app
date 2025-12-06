import { create } from "zustand";

interface SessionState {
    apiKey: string | null;
    setApiKey: (key: string) => void;
    clearApiKey: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    apiKey: null,
    setApiKey: (key) => set({ apiKey: key }),
    clearApiKey: () => set({ apiKey: null }),
}));
