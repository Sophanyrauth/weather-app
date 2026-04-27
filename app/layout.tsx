import type { Metadata } from "next";
import "./globals.css";
import FirebaseAnalytics from "./components/FirebaseAnalytics";

export const metadata: Metadata = {
  title: "Skycast — Weather App",
  description: "Real-feel weather intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
