"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { VocabForm } from "./vocab-form";

export function AddVocabModal({ onVocabAdded, trigger }: { onVocabAdded?: () => void, trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : <Button>Add Word</Button>}
            </DialogTrigger>
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
    );
}
