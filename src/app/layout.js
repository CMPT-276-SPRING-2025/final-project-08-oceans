import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {Suspense} from 'react';
import Head from 'next/head';

export const metadata = {
  title: "Love At First Paw",
  description: "Find your purrfect pet today!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body
        className={`antialiased min-h-screen flex flex-col`}
      >
       <Navbar/>
       <Suspense fallback={<div>Loading...</div>}>
       <main className="flex-grow">{children}</main>
       </Suspense>
        <Footer/>
      </body>
    </html>
  );
}
