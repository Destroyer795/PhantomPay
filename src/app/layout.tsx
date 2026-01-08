import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ResilientPay | Offline-First Payment Tracker",
    description: "Your payments are protected by our offline-sync technology. Even if everything goes down, ResilientPay saves every transaction.",
    keywords: ["payments", "offline", "fintech", "PWA", "sync"],
    authors: [{ name: "Build2Break Hackathon Team" }],
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "ResilientPay",
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
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/icon-192.png" />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    );
}
