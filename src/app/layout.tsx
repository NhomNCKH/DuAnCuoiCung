import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/feedback/ToastProvider'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'TOEIC AI Learning Platform',
  description: 'Nền tảng học TOEIC thông minh với AI',
  icons: {
    icon: [
      {
        url: '/icon/tab_favicon.svg?v=6',
        type: 'image/svg+xml',
        sizes: 'any',
      },
    ],
    shortcut: '/icon/tab_favicon.svg?v=6',
    apple: '/icon/tab_favicon.svg?v=6',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <head>
        <link
          rel="icon"
          href="/icon/tab_favicon.svg?v=6"
          type="image/svg+xml"
          sizes="any"
        />
        <link
          rel="shortcut icon"
          href="/icon/tab_favicon.svg?v=6"
        />
      </head>
      <body className={jakarta.className}>
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
