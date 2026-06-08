import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DesignFlow AI - 产品设计助手",
  description: "AI驱动的设计方案生成工具,帮助您快速创建完整的产品设计方案",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}