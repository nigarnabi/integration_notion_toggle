import "./globals.css";
import { NavbarServer } from "./components/NavbarServer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <NavbarServer />

        <div className="pt-16">{children}</div>
      </body>
    </html>
  );
}
