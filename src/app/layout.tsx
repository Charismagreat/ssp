import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corporate Dashboard | Financial Ops",
  description: "기업용 카드 사용량 및 금융 데이터 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
