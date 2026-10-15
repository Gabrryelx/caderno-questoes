import './globals.css';
import { Bricolage_Grotesque, Public_Sans, Source_Serif_4 } from 'next/font/google';

const head = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-head' });
const body = Public_Sans({ subsets: ['latin'], variable: '--font-body' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif' });

export const metadata = { title: 'Caderno PAS', description: 'Questões, simulados e caderno de erros' };
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${head.variable} ${body.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
