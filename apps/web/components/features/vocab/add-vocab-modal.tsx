"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { VocabForm } from "./vocab-form";

export function AddVocabModal({ onVocabAdded }: { onVocabAdded?: () => void }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Add Wordを押すと単語追加のモーダルが出てくる */}
            <Button onClick={() => setOpen(true)}>Add Word</Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Vocabulary</DialogTitle>
                    </DialogHeader>
                    {/* VocabFormのonSuccessがtrueになったらモーダルを閉じる */}
                    <VocabForm onSuccess={() => {
                        setOpen(false);
                        onVocabAdded?.();
                    }} />
                </DialogContent>
            </Dialog>
        </>
    );
}
