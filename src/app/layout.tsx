import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Michael Johnson",
  description: "Resume and projects of Michael Johnson.",
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
