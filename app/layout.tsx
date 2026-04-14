import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { createClient } from "@supabase/supabase-js";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_TITLE = "巨笑開運西遊";
const DEFAULT_DESC = "修行者轉生入口 — 2026 巨笑開運親證班";
const SITE_URL = "https://bigsmile.mindsuces.com";

export async function generateMetadata(): Promise<Metadata> {
  let ogTitle = DEFAULT_TITLE;
  let ogDescription = DEFAULT_DESC;
  let ogImage: string | undefined;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("SystemSettings")
        .select("SettingName, Value")
        .in("SettingName", ["OgTitle", "OgDescription", "OgImage", "SiteName"]);

      if (data) {
        const settings = data.reduce(
          (acc: Record<string, string>, row: { SettingName: string; Value: string }) => {
            acc[row.SettingName] = row.Value;
            return acc;
          },
          {}
        );
        ogTitle = settings.OgTitle || settings.SiteName || DEFAULT_TITLE;
        ogDescription = settings.OgDescription || DEFAULT_DESC;
        ogImage = settings.OgImage || undefined;
      }
    }
  } catch {
    // fallback to defaults on any error
  }

  return {
    title: ogTitle,
    description: ogDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: SITE_URL,
      siteName: ogTitle,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
      type: "website",
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try { if (localStorage.getItem('theme') === 'light') document.documentElement.classList.add('light'); } catch {}
        ` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
