"use client";

import * as React from "react";

// Simplified Dialog for now since we had installation issues.
// Ideally this should use @radix-ui/react-dialog

export const Dialog = ({ children, open, onOpenChange }: any) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative">
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
                {children}
            </div>
        </div>
    );
};

export const DialogContent = ({ children }: any) => <div>{children}</div>;
export const DialogHeader = ({ children }: any) => <div className="mb-4">{children}</div>;
export const DialogTitle = ({ children }: any) => <h2 className="text-lg font-bold">{children}</h2>;
export const DialogTrigger = ({ children, onClick }: any) => (
    <div onClick={onClick}>{children}</div>
);
export const DialogDescription = ({ children }: any) => <p className="text-sm text-gray-500 mt-2">{children}</p>;
