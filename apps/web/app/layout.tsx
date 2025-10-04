import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import NavBar from '../src/components/NavBar';
import GlobalLoadingSpinner from '../src/components/GlobalLoadingSpinner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Onchain Notes',
  description: 'Decentralized note-taking on 0G Storage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <GlobalLoadingSpinner>
            <div className="min-h-screen bg-gray-50">
              <NavBar />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
            </div>
          </GlobalLoadingSpinner>
        </Providers>
      </body>
    </html>
  );
}
