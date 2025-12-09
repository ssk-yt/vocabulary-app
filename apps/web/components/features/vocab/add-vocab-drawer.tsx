"use client";

import { useState } from "react";
import { Button, Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@repo/ui";
import { VocabDrawerForm } from "./vocab-drawer-form";

export function AddVocabDrawer({ onVocabAdded, trigger }: { onVocabAdded?: () => void, trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                {trigger ? trigger : <Button>Add Word</Button>}
            </DrawerTrigger>
            <DrawerContent className="max-h-[96vh]">
                <DrawerHeader>
                    <DrawerTitle>Add New Vocabulary</DrawerTitle>
                </DrawerHeader>
                <div className="flex-1 h-full overflow-hidden">
                    <VocabDrawerForm onSuccess={() => {
                        setOpen(false);
                        onVocabAdded?.();
                    }} />
                </div>
            </DrawerContent>
        </Drawer>
    );
}
