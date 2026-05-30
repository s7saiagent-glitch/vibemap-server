'use client'
import './globals.css'
import type { Metadata } from 'next'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }))

  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <title>جامعة مملكة الأرض الافتراضية</title>
        <meta name="description" content="أول جامعة ذكاء اصطناعي عربية عالمية - Virtual Earth Kingdom University" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#d4a017" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="مملكة الأرض" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-uni-dark text-uni-text font-arabic antialiased" style={{ direction: 'rtl' }}>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}` }} />
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#111827',
                color: '#E2E8F0',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: '0.75rem',
                fontFamily: 'Cairo, sans-serif',
              },
              success: {
                iconTheme: { primary: '#D4AF37', secondary: '#0A0E1A' },
              },
              error: {
                iconTheme: { primary: '#EF4444', secondary: '#0A0E1A' },
              },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  )
}
