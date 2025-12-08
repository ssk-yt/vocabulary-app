import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UnlockModal } from "@/components/features/auth/unlock-modal";

export const metadata: Metadata = {
    title: "Vocabulary App",
    description: "Context-Based Vocabulary App",
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {/* Auth関係の情報を提供するProviders */}
                <Providers>

                    <UnlockModal />
                    {children}
                </Providers>
            </body>
        </html>
    );
}
