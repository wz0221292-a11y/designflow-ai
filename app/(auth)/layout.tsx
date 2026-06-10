export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="df-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute left-6 top-6 hidden w-72 rounded-[22px] border border-[#1e293b] bg-[#0f172a]/70 p-5 text-sm leading-6 text-[#64748b] lg:block">
        <p className="font-bold text-[#f1f5f9]">DesignFlow AI</p>
        <p className="mt-2">登录后保存项目、继续生成图片，并把方案导出为 PPT 或 PDF。</p>
      </div>
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
