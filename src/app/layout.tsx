import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import ProtectedSidebar from "@/app/_components/protected-sidebar";
import { auth } from "@/server/auth";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { HydrateClient } from "@/trpc/server";
import PageTransition from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Scrum Poker",
  description: "Vote on sprint points with your team",
  authors: [{name: "Danny kruger", url: "kruger.dkk@gmail.com"}],

  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body className="bg-background min-h-screen overflow-x-hidden antialiased  relative">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <PageTransition>
            <SessionProvider session={session}>
            <TRPCReactProvider>
              <HydrateClient>
                {children}

                <ProtectedSidebar isAuthorized={Boolean(session)} />
              </HydrateClient>
              <Toaster closeButton position="bottom-right" expand />
            </TRPCReactProvider>
          </SessionProvider>
          </PageTransition>
        </ThemeProvider>
      </body>
    </html>
  );
}
