import "./globals.css";
import type { Metadata } from "next";
import SiteLayout from "@/components/sitelayout/SiteLayout";
import { basePath, metadataBase, siteDescription, siteImage, siteTitle } from "@/app/siteMetadata";

export const metadata: Metadata = {
    metadataBase,
    title: siteTitle,
    description: siteDescription,
    authors: [{ name: "Arjun Kalburgi", url: "https://arjunkalburgi.com" }],
    creator: "Arjun Kalburgi",
    publisher: "Arjun Kalburgi",
    alternates: {
        canonical: `${basePath}/`,
    },
    icons: {
        icon: [{ url: siteImage, type: "image/svg+xml" }],
    },
    openGraph: {
        type: "website",
        url: `${basePath}/`,
        title: siteTitle,
        description: siteDescription,
        siteName: siteTitle,
        locale: "en_US",
        images: [{ url: siteImage, alt: "Arjun Kalburgi's icon" }],
    },
    twitter: {
        card: "summary",
        title: siteTitle,
        description: siteDescription,
        images: [{ url: siteImage, alt: "Arjun Kalburgi's icon" }],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <SiteLayout>{children}</SiteLayout>
            </body>
        </html>
    );
}
