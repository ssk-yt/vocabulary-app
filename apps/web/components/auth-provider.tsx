"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

// ページ読み込み時に実行される．Auth関係の情報を読み込み時に更新する．eventがsign outだったらログイン画面に飛ばす
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            if (event === "SIGNED_OUT") {
                router.push("/login");
            }
        });
        // subscriptionを返すことで，ページが閉じられたときにサブスクリプションを解除する
        return () => {
            subscription.unsubscribe();
        };
    }, [router, supabase]);
    // サインアウトが最後まで完了してから遷移してログインさせるためにasync/awitを使う
    const signOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };
    // Auth関係の情報を全体に提供する
    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
