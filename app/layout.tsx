import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider }   from "@/providers/QueryProvider";
import { SessionProvider } from "@/providers/SessionProvider";
import { ThemeProvider }   from "@/providers/ThemeProvider";

export const metadata: Metadata = {
  title:       "MSP Intelligence Portal",
  description: "ServiceNow MSP reporting and analytics platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ── FIX (INFO): The `lang` attribute is intentionally hard-coded to "en"
    //    as this application is currently English-only. If internationalisation
    //    is introduced in future, replace this with a dynamic value derived
    //    from an i18n utility (e.g. `import { getLocale } from '@/lib/i18n'`).
    <html lang="en" className="dark">
      <body>
        <SessionProvider>
          <QueryProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
