import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "PhantomPay | Offline-First Payment Tracker",
    description: "Your payments are protected by our offline-sync technology. Even if everything goes down, PhantomPay saves every transaction.",
    keywords: ["payments", "offline", "fintech", "PWA", "sync"],
    authors: [{ name: "Build2Break Hackathon Team" }],
    manifest: "/manifest.json",
    icons: {
        icon: '/favicon.svg',
        apple: '/icon-192.png.svg',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "PhantomPay",
    },
};

export const viewport: Viewport = {
    themeColor: "#0a0a0b",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
