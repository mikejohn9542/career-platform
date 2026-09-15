import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Platform",
  description: "Career portfolio scaffold for the personal resume platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
