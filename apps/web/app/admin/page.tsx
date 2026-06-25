'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Server, Users, GitBranch, Terminal, RefreshCw, 
  Play, Square, Trash2, Database, HardDrive, Cpu, Loader2, 
  Check, AlertTriangle, ChevronRight, X, ExternalLink
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

interface AdminStats {
  metrics: {
    users: number;
    projects: number;
    deployments: number;
  };
  services: {
    database: string;
    redis: string;
    docker: string;
  };
  docker: {
    version: string;
    runningContainers: number;
    totalContainers: number;
  };
  queue: {
    active: number;
    waiting: number;
    completed: number;
    failed: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
  createdAt: string;
  projectCount: number;
}

interface AdminProject {
  id: string;
  name: string;
  slug: string;
  githubRepo: string;
  framework: string;
  status: string;
  assignedPort: number | null;
  containerId: string | null;
  createdAt: string;
  dockerStatus: string;
  owner: {
    username: string;
    email: string;
    avatarUrl: string;
  };
}

export default function AdminPortal() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects' | 'maintenance'>('overview');

  // Telemetry state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  
  // Loading sub-states
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Operation sub-states
  const [operatingProjectId, setOperatingProjectId] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null);

  // Delete confirmation modal state
  const [projectToDelete, setProjectToDelete] = useState<AdminProject | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  // Maintenance action states
  const [pruningTarget, setPruningTarget] = useState<string | null>(null);
  const [maintenanceOutput, setMaintenanceOutput] = useState<string>('');
  const [maintenanceStatus, setMaintenanceStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  // Dynamic base domain resolver for local vs production routing
  const [baseDomain, setBaseDomain] = useState('localhost');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host.startsWith('deploy.')) {
        setBaseDomain(host.replace(/^deploy\./, 'apps.'));
      } else {
        setBaseDomain(host);
      }
    }
  }, []);

  // Verify Admin Authentication
  useEffect(() => {
    async function checkAdminAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data = await res.json();
        
        // Strictly restrict to you
        if (data.user.username.toLowerCase() !== 'atharvabaodhankar') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
        setLoading(false);
      } catch (err) {
        console.error('Authentication check failed:', err);
        router.push('/');
      }
    }
    checkAdminAuth();
  }, [router]);

  // Load stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load projects
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/admin/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load tab-specific data on change
  useEffect(() => {
    if (loading) return;
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'projects') {
      fetchProjects();
    }
  }, [activeTab, loading]);

  // Handle container operations (start, stop, restart)
  const handleContainerAction = async (projectId: string, action: 'start' | 'stop' | 'restart') => {
    setOperatingProjectId(projectId);
    setOperationError(null);
    setOperationSuccess(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setOperationSuccess(`Action '${action}' executed successfully.`);
        // Refresh project list
        await fetchProjects();
      } else {
        setOperationError(data.error || `Failed to execute action '${action}'.`);
      }
    } catch (err: any) {
      setOperationError(err.message || 'An error occurred during execution.');
    } finally {
      setOperatingProjectId(null);
    }
  };

  // Handle project deletion
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setDeletingProject(true);
    setOperationError(null);
    setOperationSuccess(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectToDelete.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      const data = await res.json();
      if (res.ok) {
        setOperationSuccess(`Project "${projectToDelete.name}" successfully deleted.`);
        setProjectToDelete(null);
        await fetchProjects();
      } else {
        setOperationError(data.error || 'Failed to delete project.');
      }
    } catch (err: any) {
      setOperationError(err.message || 'An error occurred during deletion.');
    } finally {
      setDeletingProject(false);
    }
  };

  // Handle maintenance prunes
  const handleMaintenancePrune = async (target: 'images' | 'containers' | 'builds') => {
    setPruningTarget(target);
    setMaintenanceStatus('running');
    setMaintenanceOutput(`$ Executing system prune for: ${target}...\n`);
    try {
      const res = await fetch('/api/admin/system/prune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (res.ok) {
        setMaintenanceStatus('success');
        let output = data.message + '\n';
        if (data.output) output += '\n' + data.output;
        setMaintenanceOutput(prev => prev + output);
        // Refresh stats if on overview
        await fetchStats();
      } else {
        setMaintenanceStatus('error');
        setMaintenanceOutput(prev => prev + `[Error] ${data.error || 'Operation failed'}\n`);
      }
    } catch (err: any) {
      setMaintenanceStatus('error');
      setMaintenanceOutput(prev => prev + `[Error] ${err.message || 'Network request failed'}\n`);
    } finally {
      setPruningTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">VALIDATING SECURITY CREDENTIALS...</p>
      </div>
    );
  }

  return (
    <SidebarLayout user={user} activeLink="admin" breadcrumbs="Admin Portal">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-end border-b border-[#1E1E22] pb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight flex items-center gap-2.5">
            <Shield className="text-neutral-400 animate-pulse" size={24} /> Admin Control Plane
          </h1>
          <p className="font-body-md text-neutral-500 text-sm font-light">
            Platform control tower restricted to host administrator <span className="text-white font-mono font-bold">atharvabaodhankar</span>.
          </p>
        </div>
        <button 
          onClick={() => {
            if (activeTab === 'overview') fetchStats();
            else if (activeTab === 'users') fetchUsers();
            else if (activeTab === 'projects') fetchProjects();
          }}
          className="border border-[#1E1E22] hover:border-neutral-500 px-3 py-1.5 rounded transition-all bg-[#131316] text-xs font-mono flex items-center gap-1.5 w-full sm:w-auto justify-center"
        >
          <RefreshCw size={12} className={(loadingStats || loadingUsers || loadingProjects) ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Global Status/Error Banners */}
      {operationError && (
        <div className="border border-red-900/30 bg-red-950/10 px-4 py-3 rounded text-sm text-red-400 font-mono flex items-center gap-2">
          <AlertTriangle size={16} /> {operationError}
        </div>
      )}
      {operationSuccess && (
        <div className="border border-neutral-800 bg-neutral-900/40 px-4 py-3 rounded text-sm text-neutral-200 font-mono flex items-center gap-2">
          <Check size={16} className="text-white" /> {operationSuccess}
        </div>
      )}

      {/* Admin Tabs Bar */}
      <div className="flex border-b border-[#1E1E22] gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        {(['overview', 'users', 'projects', 'maintenance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-mono uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
              activeTab === tab 
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Services Connectivity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PostgreSQL */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="text-neutral-400" size={22} />
                <div>
                  <div className="text-sm font-semibold text-primary">PostgreSQL Database</div>
                  <div className="text-[10px] text-neutral-500 font-mono">Platform State</div>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                stats?.services.database === 'ACTIVE'
                  ? 'bg-neutral-950 text-white border-neutral-800'
                  : 'bg-red-950/20 text-red-500 border-red-900/30'
              }`}>
                {stats?.services.database || 'SCANNING...'}
              </span>
            </div>

            {/* Redis & BullMQ */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="text-neutral-400" size={22} />
                <div>
                  <div className="text-sm font-semibold text-primary">Redis Broker & Queue</div>
                  <div className="text-[10px] text-neutral-500 font-mono">BullMQ Engine</div>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                stats?.services.redis === 'ACTIVE'
                  ? 'bg-neutral-950 text-white border-neutral-800'
                  : 'bg-red-950/20 text-red-500 border-red-900/30'
              }`}>
                {stats?.services.redis || 'SCANNING...'}
              </span>
            </div>

            {/* Docker Socket */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="text-neutral-400" size={22} />
                <div>
                  <div className="text-sm font-semibold text-primary">Docker Unix Socket</div>
                  <div className="text-[10px] text-neutral-500 font-mono">Container Runtime</div>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                stats?.services.docker === 'ACTIVE'
                  ? 'bg-neutral-950 text-white border-neutral-800'
                  : 'bg-red-950/20 text-red-500 border-red-900/30'
              }`}>
                {stats?.services.docker || 'SCANNING...'}
              </span>
            </div>
          </div>

          {/* Infrastructure Metrics & Queue Stats Bento Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Core Counts */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-400 border-b border-[#1E1E22] pb-2 mb-4">
                  Platform Registry Counts
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-neutral-500 text-[10px] font-mono uppercase">Users</span>
                    <span className="text-2xl font-bold text-white">{stats?.metrics.users ?? '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500 text-[10px] font-mono uppercase">Projects</span>
                    <span className="text-2xl font-bold text-white">{stats?.metrics.projects ?? '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500 text-[10px] font-mono uppercase">Builds</span>
                    <span className="text-2xl font-bold text-white">{stats?.metrics.deployments ?? '-'}</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-neutral-600 font-mono font-light mt-4">
                Stats pulled directly from active PostgreSQL schemas.
              </div>
            </div>

            {/* Docker Runtime Statistics */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-400 border-b border-[#1E1E22] pb-2 mb-4">
                  Docker Daemon Stats
                </h3>
                <div className="flex flex-col gap-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Engine Version:</span>
                    <span className="text-neutral-300 truncate max-w-[180px]">{stats?.docker.version ?? 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Active Containers:</span>
                    <span className="text-white font-bold">{stats?.docker.runningContainers ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total System Containers:</span>
                    <span className="text-neutral-300">{stats?.docker.totalContainers ?? '-'}</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-neutral-600 font-mono font-light">
                Docker metrics retrieved dynamically from `/var/run/docker.sock`.
              </div>
            </div>

            {/* BullMQ Queues Status */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-400 border-b border-[#1E1E22] pb-2 mb-4">
                  Deployment Queue Status
                </h3>
                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div className="flex justify-between border-b border-neutral-900 pb-1">
                    <span className="text-neutral-500">Active:</span>
                    <span className={`font-bold ${stats?.queue.active ? 'text-white' : 'text-neutral-500'}`}>
                      {stats?.queue.active ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-900 pb-1">
                    <span className="text-neutral-500">Waiting:</span>
                    <span className="text-neutral-300">{stats?.queue.waiting ?? '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-900 pb-1">
                    <span className="text-neutral-500">Completed:</span>
                    <span className="text-neutral-400">{stats?.queue.completed ?? '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-900 pb-1">
                    <span className="text-neutral-500">Failed:</span>
                    <span className={`font-bold ${stats?.queue.failed ? 'text-red-400' : 'text-neutral-500'}`}>
                      {stats?.queue.failed ?? '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-neutral-600 font-mono font-light">
                BullMQ deployment pipeline monitored via Redis client.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && (
        <div className="card-bg border border-[#1E1E22] rounded-lg overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-[#1E1E22] bg-black/20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400">
              Registered Developer Directory
            </h2>
          </div>
          
          {loadingUsers ? (
            <div className="flex justify-center items-center py-16 gap-2">
              <Loader2 className="animate-spin text-neutral-500" size={20} />
              <span className="text-xs font-mono text-neutral-500 uppercase">Fetching users data...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-neutral-600 text-xs py-16 font-light font-mono uppercase">
              No users registered on this host
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#1E1E22] text-neutral-500 uppercase text-[10px]">
                    <th className="p-4">Developer</th>
                    <th className="p-4">GitHub Account</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Registered Date</th>
                    <th className="p-4 text-center">Active Projects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E1E22]">
                  {users.map((item) => (
                    <tr key={item.id} className="hover:bg-[#111114] transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img src={item.avatarUrl} alt={item.username} className="w-7 h-7 rounded-full object-cover border border-neutral-800" />
                        <span className="font-semibold text-white">{item.username}</span>
                      </td>
                      <td className="p-4">
                        <a href={`https://github.com/${item.username}`} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white underline decoration-neutral-700">
                          github.com/{item.username}
                        </a>
                      </td>
                      <td className="p-4 text-neutral-400">{item.email}</td>
                      <td className="p-4 text-neutral-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-center font-bold text-white">{item.projectCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="card-bg border border-[#1E1E22] rounded-lg overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-[#1E1E22] bg-black/20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400">
              Global Applications & Running Containers
            </h2>
          </div>

          {loadingProjects ? (
            <div className="flex justify-center items-center py-16 gap-2">
              <Loader2 className="animate-spin text-neutral-500" size={20} />
              <span className="text-xs font-mono text-neutral-500 uppercase">Scanning running docker instances...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center text-neutral-600 text-xs py-16 font-light font-mono uppercase">
              No projects deployed on this platform
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#1E1E22] text-neutral-500 uppercase text-[10px]">
                    <th className="p-4">Project</th>
                    <th className="p-4">Owner</th>
                    <th className="p-4">Port</th>
                    <th className="p-4">Runtime Status (Docker)</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E1E22]">
                  {projects.map((project) => {
                    const isOperating = operatingProjectId === project.id;
                    const isLive = project.dockerStatus.toLowerCase().includes('up') || project.dockerStatus === 'READY';
                    
                    return (
                      <tr key={project.id} className="hover:bg-[#111114] transition-colors">
                        {/* Name & Slug */}
                        <td className="p-4">
                          <div className="font-semibold text-white">{project.name}</div>
                          <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                            <span className="text-neutral-600 font-sans">Slug:</span>
                            <span>{project.slug}</span>
                            {project.status === 'READY' && project.assignedPort && (
                              <>
                                <span className="text-neutral-700">•</span>
                                <a
                                  href={`http://${project.slug}.${baseDomain}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-neutral-400 hover:text-white underline decoration-neutral-700 flex items-center gap-0.5"
                                >
                                  Visit App <ExternalLink size={10} />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                        {/* Owner Profile & GitHub Repo */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <img src={project.owner.avatarUrl} alt={project.owner.username} className="w-5 h-5 rounded-full object-cover border border-neutral-800" />
                            <span className="text-neutral-300 font-semibold">{project.owner.username}</span>
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                            <GitBranch size={10} className="text-neutral-600" />
                            <a
                              href={`https://github.com/${project.githubRepo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neutral-400 hover:text-white underline decoration-neutral-700 truncate max-w-[150px]"
                              title={project.githubRepo}
                            >
                              {project.githubRepo}
                            </a>
                          </div>
                        </td>
                        {/* Bound Port */}
                        <td className="p-4 text-neutral-400">
                          {project.assignedPort ? `:${project.assignedPort}` : 'N/A'}
                        </td>
                        {/* Real docker container status */}
                        <td className="p-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                            isLive
                              ? 'bg-neutral-950 text-white border-neutral-800'
                              : 'bg-red-950/20 text-red-500 border-red-900/30'
                          }`}>
                            {project.dockerStatus}
                          </span>
                        </td>
                        {/* Operations Buttons */}
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isLive ? (
                              <button
                                onClick={() => handleContainerAction(project.id, 'stop')}
                                disabled={isOperating}
                                title="Stop Container"
                                className="border border-[#1E1E22] hover:border-red-800 p-1.5 rounded transition-all text-neutral-400 hover:text-red-500 hover:bg-red-950/10 disabled:opacity-50"
                              >
                                <Square size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleContainerAction(project.id, 'start')}
                                disabled={isOperating || !project.containerId || project.dockerStatus === 'CONTAINER_MISSING'}
                                title="Start Container"
                                className="border border-[#1E1E22] hover:border-white p-1.5 rounded transition-all text-neutral-400 hover:text-white hover:bg-neutral-950 disabled:opacity-30"
                              >
                                <Play size={12} />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleContainerAction(project.id, 'restart')}
                              disabled={isOperating || !project.containerId || project.dockerStatus === 'CONTAINER_MISSING'}
                              title="Restart Container"
                              className="border border-[#1E1E22] hover:border-white p-1.5 rounded transition-all text-neutral-400 hover:text-white hover:bg-neutral-950 disabled:opacity-30"
                            >
                              <RefreshCw size={12} className={isOperating ? 'animate-spin' : ''} />
                            </button>
                            
                            <button
                              onClick={() => setProjectToDelete(project)}
                              disabled={isOperating}
                              title="Delete Project (Admin)"
                              className="border border-[#1E1E22] hover:border-red-800 p-1.5 rounded transition-all text-neutral-500 hover:text-red-500 hover:bg-red-950/10 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Maintenance Tools List (Span 1) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Prune Docker Images */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <HardDrive size={16} className="text-neutral-400" /> Prune Docker Images
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1 font-light font-sans leading-relaxed">
                  Removes all unused, dangling, and intermediate build stages. Clears cached repository layers to free up host disk space.
                </p>
              </div>
              <button
                onClick={() => handleMaintenancePrune('images')}
                disabled={pruningTarget !== null}
                className="bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs py-2 rounded transition-all active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {pruningTarget === 'images' && <Loader2 size={12} className="animate-spin" />}
                Wipe Build Images Cache
              </button>
            </div>

            {/* Prune Stopped Containers */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Server size={16} className="text-neutral-400" /> Prune Dead Containers
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1 font-light font-sans leading-relaxed">
                  Purges stopped, exited, or dead containers that are no longer actively routing. Completely safe for active deployments.
                </p>
              </div>
              <button
                onClick={() => handleMaintenancePrune('containers')}
                disabled={pruningTarget !== null}
                className="bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs py-2 rounded transition-all active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {pruningTarget === 'containers' && <Loader2 size={12} className="animate-spin" />}
                Purge Exited Containers
              </button>
            </div>

            {/* Clear Builds workspace folder */}
            <div className="card-bg border border-[#1E1E22] rounded-lg p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Terminal size={16} className="text-neutral-400" /> Safe Workspace Purge
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1 font-light font-sans leading-relaxed">
                  Safely clears old cloned Git repos in the builds directory. Protects active builds and avoids server memory locks.
                </p>
              </div>
              <button
                onClick={() => handleMaintenancePrune('builds')}
                disabled={pruningTarget !== null}
                className="bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs py-2 rounded transition-all active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {pruningTarget === 'builds' && <Loader2 size={12} className="animate-spin" />}
                Clean Cloned Repos
              </button>
            </div>
          </div>

          {/* Live Terminal Output Console (Span 2) */}
          <div className="lg:col-span-2 flex flex-col min-h-[360px]">
            <div className="bg-black border border-[#1E1E22] rounded-lg p-4 flex-grow flex flex-col font-mono text-xs text-neutral-400 relative">
              <div className="flex justify-between items-center border-b border-[#1E1E22] pb-2 mb-3">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <Terminal size={14} className="text-neutral-500" /> Maintenance Output Terminal
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  maintenanceStatus === 'running' 
                    ? 'bg-neutral-500 animate-pulse' 
                    : maintenanceStatus === 'success' 
                    ? 'bg-white' 
                    : maintenanceStatus === 'error' 
                    ? 'bg-red-500' 
                    : 'bg-neutral-800'
                }`}></span>
              </div>
              <textarea
                value={maintenanceOutput || 'Awaiting system commands...\nOutput will stream here.'}
                readOnly
                className="bg-black text-[#888] flex-grow w-full h-64 focus:outline-none resize-none overflow-y-auto leading-relaxed font-mono select-text"
              />
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6 z-50 animate-fade-in">
          <div className="bg-[#131316] border border-[#1E1E22] w-full max-w-md p-6 rounded shadow-2xl relative flex flex-col gap-4">
            <button 
              onClick={() => setProjectToDelete(null)}
              disabled={deletingProject}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} /> Danger: Permanent Deletion
              </h3>
              <p className="text-neutral-400 text-xs mt-1 leading-normal font-sans">
                You are about to delete the project <span className="text-white font-mono font-semibold">{projectToDelete.name}</span>. This will stop/remove its container, delete Nginx proxies, and wipe all DB deployments.
              </p>
            </div>

            <div className="border border-red-950/20 bg-red-950/5 p-3 rounded text-[10px] text-red-400 font-mono leading-normal">
              WARNING: This action is irreversible. All build history and environment variables will be permanently purged.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={deletingProject}
                className="border border-[#1E1E22] hover:border-neutral-500 px-4 py-2 rounded transition-all text-xs font-mono text-neutral-400 bg-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deletingProject}
                className="bg-white text-black font-mono font-bold text-xs px-4 py-2 rounded hover:bg-red-200 transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deletingProject && <Loader2 size={12} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
