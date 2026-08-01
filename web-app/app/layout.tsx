import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./lib/LanguageContext";
import PostHogAnalytics from "./components/PostHogAnalytics";

// display: "swap" — render text immediately in the fallback font and swap to
// Geist when it loads, instead of blocking paint (FOIT). Removes the font from
// the LCP critical path.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafafa",
  // The landing is a hardcoded light design; tell the UA so form controls and
  // scrollbars don't render in dark theme on dark-mode devices.
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "coconect:",
  description: "We find the people you need, in the places you'll love.",
  metadataBase: new URL('https://www.coconect.io'),
  applicationName: "coconect",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },

  openGraph: {
    title: "coconect:",
    description: "We find the people you need, in the places you'll love.",
    url: 'https://www.coconect.io',
    siteName: 'coconect',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'coconect — networking platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'coconect:',
    description: "We find the people you need, in the places you'll love.",
    images: ['/og-image.png'],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogAnalytics />
        <LanguageProvider>
            {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
