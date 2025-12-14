"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { Plus } from "lucide-react";
import { VocabForm } from "./vocab-form";

export function AddVocabModal({ onVocabAdded, trigger }: { onVocabAdded?: () => void, trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Word
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-[90%] rounded-md">
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
