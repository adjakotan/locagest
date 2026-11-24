export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-10">
      <div className="mb-6 text-center text-white">
        <p className="text-3xl font-bold">LocaGest</p>
        <p className="mt-1 text-sm text-brand-100">Loyers, quittances et caisse de vos biens, au même endroit.</p>
      </div>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">{children}</div>
    </div>
  );
}
