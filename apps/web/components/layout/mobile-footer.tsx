"use client";

import { LayoutDashboard, List, Plus, Gamepad2, User } from "lucide-react";
import { Button } from "@repo/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddVocabModal } from "../features/vocab/add-vocab-modal";

export function MobileFooter() {
    const pathname = usePathname();

    // Helper to determine active state (simple exact match for now)
    const isActive = (path: string) => pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around z-50 md:hidden pb-safe">
            {/* 1. Dashboard (Future) */}
            <Button variant="ghost" size="icon" className="flex flex-col items-center gap-1 h-full w-full rounded-none" disabled>
                <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Dash</span>
            </Button>

            {/* 2. List (Current Home) */}
            <Link href="/" className="w-full h-full">
                <Button variant="ghost" size="icon" className={`flex flex-col items-center gap-1 h-full w-full rounded-none ${isActive("/") ? "text-primary" : "text-muted-foreground"}`}>
                    <List className="h-6 w-6" />
                    <span className="text-[10px]">List</span>
                </Button>
            </Link>

            {/* 3. Add (Central Button) */}
            <div className="relative -top-5">
                <AddVocabModal
                    trigger={
                        <Button
                            size="icon"
                            className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-background"
                        >
                            <Plus className="h-8 w-8" />
                        </Button>
                    }
                />
            </div>

            {/* 4. Quiz (Future) */}
            <Link href="/quiz" className="w-full h-full">
                <Button variant="ghost" size="icon" className={`flex flex-col items-center gap-1 h-full w-full rounded-none ${isActive("/quiz") ? "text-primary" : "text-muted-foreground"}`}>
                    <Gamepad2 className="h-6 w-6" />
                    <span className="text-[10px]">Quiz</span>
                </Button>
            </Link>

            {/* 5. Profile */}
            <Link href="/settings" className="w-full h-full">
                <Button variant="ghost" size="icon" className={`flex flex-col items-center gap-1 h-full w-full rounded-none ${isActive("/settings") ? "text-primary" : "text-muted-foreground"}`}>
                    <User className="h-6 w-6" />
                    <span className="text-[10px]">Profile</span>
                </Button>
            </Link>
        </div>
    );
}
