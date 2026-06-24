import Link from 'next/link';
import { ArrowRight, Terminal, Shield, GitBranch, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col justify-between bg-black text-white">
      {/* Navigation */}
      <header className="border-b border-neutral-900 px-6 py-4 flex justify-between items-center bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-wider select-none">
            [C] CODESHIP
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Docs
          </a>
          <a
            href="/api/auth/login"
            className="text-sm font-medium bg-white text-black px-4 py-2 rounded hover:bg-neutral-200 transition-all active:scale-95"
          >
            Sign In
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 border border-neutral-800 rounded-full px-3 py-1 text-xs text-neutral-400 mb-8 bg-neutral-950/50 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-gray" />
          CodeShip MVP v1.0 is now live
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white via-white to-neutral-500 bg-clip-text text-transparent">
          Code to container <br />
          in seconds.
        </h1>

        <p className="text-neutral-400 text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed">
          A lightweight, self-hosted PaaS inspired by Render and Vercel. 
          Deploy React, Next.js, and Express apps in isolated Docker containers instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="/api/auth/login"
            className="group inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-4 rounded hover:bg-neutral-200 transition-all active:scale-95 text-base"
          >
            Connect with GitHub
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 border border-neutral-800 text-neutral-400 px-8 py-4 rounded hover:text-white hover:border-neutral-600 transition-all text-base bg-neutral-950/20"
          >
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="border-t border-neutral-900 bg-neutral-950/40 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-16">
            Engineered for Simplicity.
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-neutral-900 bg-black p-6 rounded hover:border-neutral-700 transition-colors">
              <Terminal className="text-white mb-4" size={24} />
              <h3 className="font-semibold text-lg mb-2">Zero Config Builds</h3>
              <p className="text-neutral-400 text-sm font-light leading-relaxed">
                No Dockerfiles required. CodeShip automatically analyzes your project code to compile, build, and deploy.
              </p>
            </div>

            <div className="border border-neutral-900 bg-black p-6 rounded hover:border-neutral-700 transition-colors">
              <Shield className="text-white mb-4" size={24} />
              <h3 className="font-semibold text-lg mb-2">Isolated Containers</h3>
              <p className="text-neutral-400 text-sm font-light leading-relaxed">
                Every application runs in a sandboxed Docker container with strict CPU (0.5) and memory (512MB) limits.
              </p>
            </div>

            <div className="border border-neutral-900 bg-black p-6 rounded hover:border-neutral-700 transition-colors">
              <GitBranch className="text-white mb-4" size={24} />
              <h3 className="font-semibold text-lg mb-2">Git-Ops Redeployment</h3>
              <p className="text-neutral-400 text-sm font-light leading-relaxed">
                Integrated webhooks automatically trigger complete rebuilds and zero-downtime redeploys upon every git push.
              </p>
            </div>

            <div className="border border-neutral-900 bg-black p-6 rounded hover:border-neutral-700 transition-colors">
              <Zap className="text-white mb-4" size={24} />
              <h3 className="font-semibold text-lg mb-2">Instant DNS & Nginx</h3>
              <p className="text-neutral-400 text-sm font-light leading-relaxed">
                Each project gets an automatic, isolated subdomain routed instantly via dynamically reloaded Nginx blocks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-black">
        <span className="font-mono text-xs text-neutral-500 tracking-wider">
          © 2026 CODESHIP. ALL RIGHTS RESERVED.
        </span>
        <div className="flex gap-6 text-xs text-neutral-500">
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Status</a>
        </div>
      </footer>
    </div>
  );
}
