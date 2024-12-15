import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSideBar";
import { AuthProvider } from "@/contexts/AuthContext";
import { Providers } from "./providers";
import Artboard18 from "@/assets/SVG/Artboard 18.svg";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Introducing First - MMA Fighter Stats and Analytics",
  description:
    "Comprehensive MMA fighter statistics, rankings, and analytics. Track fighter records, matchups, and performance metrics.",
  keywords:
    "MMA, UFC, fighter stats, MMA analytics, fighter rankings, Bellator, PFL, ONE Championship, kickboxing, boxing, grappling, MMA predictions, MMA betting, Introducing First",
  icons: {
    icon: Artboard18.src,
    shortcut: Artboard18.src,
    apple: Artboard18.src,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2190295271181025"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body
        className={cn(
          "min-h-screen bg-gray-950 font-sans antialiased",
          geistSans.variable,
          geistMono.variable
        )}
      >
        <AuthProvider>
          <SidebarProvider>
            <div className="group/sidebar-wrapper flex min-h-screen w-full">
              <AppSidebar />
              <main className="flex-1 overflow-hidden">
                <SidebarTrigger className="p-4" />
                <div className="h-full">
                  <Providers>{children}</Providers>
                </div>
              </main>
            </div>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
