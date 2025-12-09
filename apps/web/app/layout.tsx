import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UnlockModal } from "@/components/features/auth/unlock-modal";
import { MobileFooter } from "@/components/layout/mobile-footer";

export const metadata: Metadata = {
    title: "Vocabulary App",
    description: "Context-Based Vocabulary App",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Added userScalable: false as per mobile implementation doc
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
                    <div className="pb-20 md:pb-0">
                        {children}
                    </div>
                    <MobileFooter />
                </Providers>
            </body>
        </html>
    );
}
