"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { VocabForm } from "./vocab-form";

export function AddVocabModal() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Add Word</Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Vocabulary</DialogTitle>
                    </DialogHeader>
                    <VocabForm onSuccess={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
}
