'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Globe, ShieldCheck, ExternalLink, Link2 } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

interface Project {
  id: string;
  name: string;
  slug: string;
  framework: string;
  status: string;
  assignedPort: number | null;
  createdAt: string;
}

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export default function GlobalDomains() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
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

        const projectsRes = await fetch('/api/projects');
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          // Filter projects that have been assigned a port
          setProjects(projectsData.projects || []);
        }
      } catch (e) {
        console.error('Failed to load projects for domains:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';
  const readyProjects = projects.filter(p => p.status === 'READY' && p.assignedPort);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING DOMAINS...</p>
      </div>
    );
  }

  return (
    <SidebarLayout user={user} activeLink="domains">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight">Domains Directory</h1>
        <p className="font-body-md text-body-md text-neutral-500 text-sm font-light">
          Active routing subdomains mapped to your isolated container instances.
        </p>
      </div>

      <div className="card-bg border border-layout rounded-lg overflow-hidden mt-2">
        <div className="p-4 border-b border-layout bg-[#0B0B0B] flex justify-between items-center">
          <h2 className="font-headline-md text-primary font-semibold flex items-center gap-2 text-sm uppercase font-mono tracking-wider">
            <Globe size={14} />
            Configured Subdomains
          </h2>
          <span className="text-xs font-mono text-neutral-500">{readyProjects.length} active routes</span>
        </div>

        <div className="overflow-x-auto w-full">
          {readyProjects.length === 0 ? (
            <div className="border-t border-layout p-12 text-center flex flex-col justify-center items-center bg-neutral-950/20">
              <Link2 className="text-neutral-700 mb-4" size={40} />
              <h3 className="font-semibold text-lg mb-2">No active domains</h3>
              <p className="text-neutral-500 text-sm max-w-sm font-light">
                Once your projects compile and deploy successfully, their Nginx-routed subdomains will be listed here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#050505] border-b border-layout">
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Project</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Domain Name / Route</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Target VPS Port</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">SSL Status</th>
                  <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Actions</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-[#1A1A1A] text-sm text-neutral-300">
                {readyProjects.map((project) => {
                  const projectUrl = baseDomain === 'localhost'
                    ? `http://${project.slug}.localhost:${project.assignedPort || '3001'}`
                    : `http://${project.slug}.${baseDomain}`;

                  return (
                    <tr 
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="hover-bg transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 text-primary font-semibold group-hover:underline decoration-neutral-500">
                        {project.name}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-white">
                        {baseDomain === 'localhost' ? `${project.slug}.localhost` : `${project.slug}.${baseDomain}`}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-neutral-400">
                        {project.assignedPort} → internal
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-light text-white font-mono">
                          <ShieldCheck size={14} className="text-white" />
                          {baseDomain === 'localhost' ? 'Local HTTP' : 'Wildcard SSL Verified'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <a 
                          href={projectUrl}
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 hover:text-white transition-colors text-xs font-mono text-neutral-400 group-hover:text-white"
                        >
                          Visit App
                          <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
