'use client';

import { useEffect, useState } from 'react';
import { Loader2, Moon, Zap, ArrowRight, ShieldCheck, Activity, Terminal } from 'lucide-react';

export default function WakeLoadingPage() {
  const [slug, setSlug] = useState<string>('');
  const [appName, setAppName] = useState<string>('Your Application');
  const [phase, setPhase] = useState<number>(1);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [bootSeconds, setBootSeconds] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing container boot sequence...');

  useEffect(() => {
    // Extract slug from the hostname (e.g. neo-brutalism-clock.apps.rovel.dev -> neo-brutalism-clock)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      let extractedSlug = parts[0];
      
      // If accessed directly with ?app=slug or on localhost
      const urlParams = new URLSearchParams(window.location.search);
      const querySlug = urlParams.get('app') || urlParams.get('slug');
      if (querySlug) {
        extractedSlug = querySlug;
      }

      setSlug(extractedSlug);
      setAppName(extractedSlug.replace(/-/g, ' '));
    }
  }, []);

  // Timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setBootSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Trigger wake sequence and poll health
  useEffect(() => {
    if (!slug) return;

    let isSubscribed = true;

    const wakeAndPoll = async () => {
      try {
        // Step 1: Fire wake trigger
        setPhase(1);
        setStatusMessage('Connecting to Docker engine and allocating 512MB RAM...');
        await fetch(`/api/wake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });

        // Step 2: Poll health until responsive
        setPhase(2);
        setStatusMessage('Starting application process and warming up port listener...');

        let attempts = 0;
        const maxAttempts = 30;

        const checkInterval = setInterval(async () => {
          if (!isSubscribed) {
            clearInterval(checkInterval);
            return;
          }

          attempts++;
          try {
            const checkRes = await fetch(`/api/wake?slug=${encodeURIComponent(slug)}`);
            if (checkRes.ok) {
              const data = await checkRes.json();
              if (data.project?.name) {
                setAppName(data.project.name);
              }
              if (data.project?.isReachable) {
                clearInterval(checkInterval);
                setPhase(3);
                setIsReady(true);
                setStatusMessage('Application is online! Redirecting...');
                // Reload current page to seamlessly enter the live container
                setTimeout(() => {
                  window.location.reload();
                }, 600);
              }
            }
          } catch (e) {
            // Container still warming up
          }

          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            setStatusMessage('Container boot is taking longer than expected. Click below to retry.');
          }
        }, 1200);

      } catch (err) {
        setStatusMessage('Automatic wake encountered an issue. Retrying...');
      }
    };

    wakeAndPoll();

    return () => {
      isSubscribed = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-purple-500/30">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Container Card */}
      <div className="relative z-10 w-full max-w-lg bg-[#0e0e12]/90 border border-neutral-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-6">
        
        {/* Animated Brand Header */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-700/60 flex items-center justify-center shadow-lg">
            {isReady ? (
              <Zap className="text-emerald-400 animate-bounce" size={28} />
            ) : (
              <Moon className="text-purple-400 animate-pulse" size={28} />
            )}
          </div>
        </div>

        {/* Title & App Info */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-800/40 bg-purple-950/30 text-purple-300 font-mono text-[11px] uppercase tracking-wider mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Scale-to-Zero · Cold Start
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-white capitalize">
            Waking Up {appName}
          </h1>
          
          <p className="text-neutral-400 text-xs font-light max-w-sm leading-relaxed mx-auto">
            This deployment was suspended to conserve server resources. Container is now spinning back into memory.
          </p>
        </div>

        {/* Progress Timeline Tracker */}
        <div className="w-full flex flex-col gap-3 bg-black/40 border border-neutral-800/60 p-4 rounded-xl text-left">
          
          <div className="flex items-center justify-between text-xs font-mono border-b border-neutral-800/50 pb-2">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Activity size={13} className="text-purple-400" />
              Boot Progress
            </span>
            <span className="text-neutral-500">
              {bootSeconds}s elapsed
            </span>
          </div>

          <div className="flex flex-col gap-2.5 pt-1 text-xs">
            <div className={`flex items-center gap-2.5 transition-colors ${phase >= 1 ? 'text-white' : 'text-neutral-600'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                phase > 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : phase === 1 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-neutral-900 border border-neutral-800'
              }`}>
                {phase > 1 ? '✓' : '1'}
              </div>
              <span className="font-mono text-[11px]">Connecting to Docker & resuming container</span>
            </div>

            <div className={`flex items-center gap-2.5 transition-colors ${phase >= 2 ? 'text-white' : 'text-neutral-600'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                phase > 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : phase === 2 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-neutral-900 border border-neutral-800'
              }`}>
                {phase > 2 ? '✓' : '2'}
              </div>
              <span className="font-mono text-[11px]">Initializing server listener & port bind</span>
            </div>

            <div className={`flex items-center gap-2.5 transition-colors ${phase >= 3 ? 'text-white' : 'text-neutral-600'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                isReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-900 border border-neutral-800'
              }`}>
                {isReady ? '✓' : '3'}
              </div>
              <span className="font-mono text-[11px]">Routing live reverse proxy traffic</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800/50 flex items-center gap-2">
            {!isReady ? (
              <Loader2 size={12} className="animate-spin text-purple-400 shrink-0" />
            ) : (
              <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{statusMessage}</span>
          </div>

        </div>

        {/* Action button if user wants to force reload */}
        <div className="flex items-center justify-between w-full pt-2">
          <span className="text-[11px] text-neutral-500 font-mono">
            Powered by <strong className="text-neutral-300 font-semibold">ROVEL PaaS</strong>
          </span>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-mono text-neutral-400 hover:text-white transition-colors flex items-center gap-1 hover:underline"
          >
            Manual Reload
            <ArrowRight size={12} />
          </button>
        </div>

      </div>

      {/* Footer System Details */}
      <div className="relative z-10 mt-8 text-center text-neutral-600 text-[11px] font-mono flex items-center gap-3">
        <span>Zero-Idle Architecture</span>
        <span>•</span>
        <span>Automatic HTTPS</span>
        <span>•</span>
        <span>Sub-second Wake</span>
      </div>

    </div>
  );
}
