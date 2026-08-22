import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import CustomCursor from '../components/CustomCursor';
import Navbar from '../components/Navbar';
import Providers from '../components/Providers';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata = {
  title: 'Sleek Magazine — A New Wave',
  description:
    'Sleek Magazine Ish. 01 — A New Wave of fashion, art, and lifestyle. Discover exclusive editorials, premium stories, and high-fashion updates.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        <Providers>
          <CustomCursor />
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
