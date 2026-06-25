'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Rocket, Terminal, Calendar, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

interface Deployment {
  id: string;
  commitHash: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  project: {
    id: string;
    name: string;
    slug: string;
  };
}

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export default function GlobalDeployments() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const depRes = await fetch('/api/deployments');
        if (depRes.ok) {
          const depData = await depRes.json();
          setDeployments(depData.deployments || []);
        }
      } catch (e) {
        console.error('Failed to load deployments:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
            <span className="font-metadata text-primary text-xs">Ready</span>
          </div>
        );
      case 'BUILDING':
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit animate-pulse">
            <RefreshCw size={12} className="text-primary animate-spin" />
            <span className="font-metadata text-primary text-xs">Building</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 inline-block animate-pulse"></span>
            <span className="font-metadata text-neutral-400 text-xs">Queued</span>
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit bg-red-950/20 border-red-900/30">
            <AlertTriangle size={12} className="text-red-500" />
            <span className="font-metadata text-red-500 text-xs">Failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit">
            <span className="font-metadata text-neutral-400 text-xs">{status}</span>
          </div>
        );
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return '—';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const totalSeconds = Math.floor(durationMs / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING BUILD FEED...</p>
      </div>
    );
  }

  return (
    <SidebarLayout user={user} activeLink="deployments">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight">Global Deployments</h1>
        <p className="font-body-md text-body-md text-neutral-500 text-sm font-light">Chronological build feed across all your hosted projects.</p>
      </div>

      <div className="card-bg border border-layout rounded-lg overflow-hidden mt-2">
        <div className="p-4 border-b border-layout bg-[#0B0B0B] flex justify-between items-center">
          <h2 className="font-headline-md text-primary font-semibold flex items-center gap-2 text-sm uppercase font-mono tracking-wider">
            <Rocket size={14} />
            Build History Feed
          </h2>
          <span className="text-xs font-mono text-neutral-500">{deployments.length} total builds</span>
        </div>

        <div className="overflow-x-auto w-full">
          {deployments.length === 0 ? (
            <div className="border-t border-layout p-12 text-center flex flex-col justify-center items-center bg-neutral-950/20">
              <Terminal className="text-neutral-700 mb-4" size={40} />
              <h3 className="font-semibold text-lg mb-2">No deployments found</h3>
              <p className="text-neutral-500 text-sm max-w-sm font-light">
                Connect and deploy projects to see their build logs and statuses compiled here in real-time.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#050505] border-b border-layout">
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Project</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Deployment ID</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Commit</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Status</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Duration</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Triggered</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-[#1A1A1A] text-sm text-neutral-300">
                {deployments.map((dep) => (
                  <tr 
                    key={dep.id}
                    onClick={() => router.push(`/projects/${dep.project.id}`)}
                    className="hover-bg transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 text-primary font-semibold group-hover:underline decoration-neutral-500">
                      {dep.project.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-neutral-400">
                      {dep.id.slice(0, 18)}...
                    </td>
                    <td className="py-3.5 px-4">
                      {dep.commitHash ? (
                        <span className="font-mono bg-neutral-900 border border-layout px-2 py-0.5 rounded text-xs text-white">
                          {dep.commitHash.slice(0, 7)}
                        </span>
                      ) : (
                        <span className="text-neutral-600 font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(dep.status)}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-neutral-400">
                      {calculateDuration(dep.startedAt, dep.completedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 font-light flex items-center gap-1.5">
                      <Calendar size={12} className="text-neutral-600" />
                      {getTimeAgo(dep.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
