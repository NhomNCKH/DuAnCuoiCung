// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "TOEIC MASTER",
  description: "Nền tảng học TOEIC thông minh với AI",
  icons: {
    icon: [
      {
        url: "/icon/tab_favicon.svg?v=6",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/icon/tab_favicon.svg?v=6",
    apple: "/icon/tab_favicon.svg?v=6",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="/icon/tab_favicon.svg?v=6"
          type="image/svg+xml"
          sizes="any"
        />
        <link rel="shortcut icon" href="/icon/tab_favicon.svg?v=6" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body>
        <ThemeProvider>
          {" "}
          {/* ThemeProvider phải ở ngoài cùng */}
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
