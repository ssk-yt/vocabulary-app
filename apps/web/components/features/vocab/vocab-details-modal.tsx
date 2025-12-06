"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui";

interface VocabDetailsModalProps {
    vocab: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function VocabDetailsModal({ vocab, open, onOpenChange }: VocabDetailsModalProps) {
    if (!vocab) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{vocab.term}</DialogTitle>
                    <p className="text-sm text-gray-500 italic">{vocab.part_of_speech}</p>
                </DialogHeader>

                <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Definition</h3>
                        <p className="text-gray-700 mt-1">{vocab.definition || "No definition available."}</p>
                    </section>

                    {vocab.example && (
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Example</h3>
                            <div className="bg-gray-50 p-3 rounded-md border-l-4 border-blue-500 mt-1">
                                <p className="text-gray-700 italic">"{vocab.example}"</p>
                            </div>
                        </section>
                    )}

                    {vocab.synonyms && vocab.synonyms.length > 0 && (
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Synonyms</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {vocab.synonyms.map((syn: string, index: number) => (
                                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                        {syn}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {vocab.etymology && (
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Etymology</h3>
                            <p className="text-gray-600 text-sm mt-1">{vocab.etymology}</p>
                        </section>
                    )}

                    {vocab.source_memo && (
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Source / Memo</h3>
                            <p className="text-gray-600 text-sm mt-1">{vocab.source_memo}</p>
                        </section>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
