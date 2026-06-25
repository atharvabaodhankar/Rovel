'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Settings, User, Cpu, ShieldAlert, ExternalLink, HelpCircle, HardDrive, BookOpen } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

interface SystemStats {
  cpu: number;
  memory: number;
  disk: number;
}

export default function GlobalSettings() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats>({ cpu: 0, memory: 0, disk: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load system stats in settings:', e);
    }
  };

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

        await fetchStats();
      } catch (e) {
        console.error('Settings initialization failed:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Poll system stats every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING SETTINGS...</p>
      </div>
    );
  }

  return (
    <SidebarLayout user={user} activeLink="settings">
      
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight">Platform Settings</h1>
        <p className="font-body-md text-body-md text-neutral-500 text-sm font-light">
          Manage your connected accounts, monitor server specifications, and review system configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* Left Column: Account Profile & System Specs (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* GitHub Account Profile */}
          <div className="border border-layout bg-[#0B0B0B] p-6 rounded-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <User size={18} className="text-neutral-400" />
              Connected GitHub Profile
            </h3>
            
            {user && (
              <div className="flex items-start gap-4 mt-2">
                <img 
                  src={user.avatarUrl} 
                  alt={user.username} 
                  className="w-16 h-16 rounded-lg border border-layout object-cover"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold text-primary">{user.username}</span>
                  <span className="text-xs font-mono text-neutral-400">{user.email}</span>
                  <a 
                    href={`https://github.com/${user.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white mt-1.5 hover:underline"
                  >
                    View GitHub Account
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
            
            <div className="border-t border-layout pt-4 mt-2">
              <span className="text-neutral-500 text-[10px] font-mono uppercase">User Session token ID</span>
              <div className="font-mono text-neutral-300 text-xs bg-black border border-layout px-3 py-1.5 rounded select-all mt-1 truncate max-w-lg">
                {user?.id}
              </div>
            </div>
          </div>

          {/* VPS Hardware Specs */}
          <div className="border border-layout bg-[#0B0B0B] p-6 rounded-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Cpu size={18} className="text-neutral-400" />
              VPS System Resources
            </h3>
            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              Real-time resource utilization of the host machine running your application containers and proxy layers.
            </p>
            
            <div className="flex flex-col gap-4 mt-2">
              {/* CPU */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono uppercase text-neutral-500">CPU Load</span>
                  <span className="text-xs font-mono text-primary font-medium">{systemStats.cpu}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.cpu}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Memory */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono uppercase text-neutral-500">Memory Utilization</span>
                  <span className="text-xs font-mono text-primary font-medium">{systemStats.memory}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.memory}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Disk */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono uppercase text-neutral-500">System Disk Space</span>
                  <span className="text-xs font-mono text-primary font-medium">{systemStats.disk}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.disk}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Versioning & Support (Span 1) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Versioning & Meta */}
          <div className="border border-layout bg-[#0B0B0B] p-6 rounded-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Settings size={18} className="text-neutral-400" />
              Platform Meta
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-layout pb-2.5">
                <span className="text-sm text-neutral-500">Control Plane Version</span>
                <span className="font-mono text-xs text-primary font-semibold">v2.4.0</span>
              </div>
              <div className="flex justify-between items-center border-b border-layout pb-2.5">
                <span className="text-sm text-neutral-500">Active Pipeline</span>
                <span className="font-mono text-xs text-primary">BullMQ Node Workers</span>
              </div>
              <div className="flex justify-between items-center border-b border-layout pb-2.5">
                <span className="text-sm text-neutral-500">Reverse Proxy</span>
                <span className="font-mono text-xs text-primary">Nginx Server block</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">OS Environment</span>
                <span className="font-mono text-xs text-primary capitalize">{process.platform}</span>
              </div>
            </div>
          </div>

          {/* Support & Docs */}
          <div className="border border-layout bg-[#0B0B0B] p-6 rounded-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <BookOpen size={18} className="text-neutral-400" />
              Help & Resources
            </h3>
            
            <div className="flex flex-col gap-3">
              <a 
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center px-3 py-2 border border-layout hover:border-neutral-500 rounded text-sm transition-colors text-neutral-300 hover:text-white hover:bg-neutral-900/40"
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={14} className="text-neutral-400" />
                  Documentation
                </span>
                <ExternalLink size={12} className="text-neutral-500" />
              </a>
              
              <a 
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center px-3 py-2 border border-layout hover:border-neutral-500 rounded text-sm transition-colors text-neutral-300 hover:text-white hover:bg-neutral-900/40"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-neutral-400" />
                  Get Platform Support
                </span>
                <ExternalLink size={12} className="text-neutral-500" />
              </a>
              
              <a 
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center px-3 py-2 border border-layout hover:border-neutral-500 rounded text-sm transition-colors text-neutral-300 hover:text-white hover:bg-neutral-900/40"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-neutral-400" />
                  System Security
                </span>
                <ExternalLink size={12} className="text-neutral-500" />
              </a>
            </div>
          </div>

        </div>

      </div>

    </SidebarLayout>
  );
}
