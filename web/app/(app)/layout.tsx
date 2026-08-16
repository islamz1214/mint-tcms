import AuthGuard from '@/components/auth-guard';
import AgentFeaturePanel from '@/components/agent-feature-panel';
import Navbar from '@/components/navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <AgentFeaturePanel />
      </div>
    </AuthGuard>
  );
}
