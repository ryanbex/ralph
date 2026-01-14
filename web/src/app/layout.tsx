import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import "@/styles/pixel-theme.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ralph Web",
  description: "Cloud-native platform for autonomous AI development workstreams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pressStart2P.variable} ${vt323.variable}`}>
      <body>{children}</body>
    </html>
  );
}
