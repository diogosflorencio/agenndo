export default function AuthCallbackLoading() {
  return (
    <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative z-10 text-center">
        <div className="size-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 relative">
          <span className="material-symbols-outlined text-primary text-4xl">calendar_month</span>
          <div className="absolute inset-0 rounded-3xl border border-primary/30 animate-ping" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Autenticando...</h1>
        <p className="text-gray-400 text-sm">Aguarde, estamos preparando tudo para você</p>
      </div>
    </div>
  );
}
