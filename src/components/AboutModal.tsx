'use client';

import { Info, Github, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import packageJson from '../../package.json';

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  const version = packageJson.version;
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE
    ? new Date(process.env.NEXT_PUBLIC_BUILD_DATE).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Development';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Info className="w-5 h-5 text-emerald-400" />
            About MarketPulse
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* App Description */}
          <div className="space-y-3">
            <p className="text-zinc-300 text-sm leading-relaxed">
              MarketPulse is an AI-powered corporate intelligence platform that provides
              comprehensive company analysis including financials, news, competitive
              landscape, and market positioning.
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Powered by advanced AI models from OpenAI, Anthropic, Google, and Perplexity
              to deliver accurate, real-time business insights.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-200">Key Features</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Real-time stock data and financials
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                AI-generated executive summaries
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Competitive landscape analysis
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Leadership changes tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                M&A activity monitoring
              </li>
            </ul>
          </div>

          {/* Version Info */}
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Version</span>
              <span className="text-white font-mono text-sm">v{version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Build</span>
              <span className="text-zinc-300 font-mono text-sm">{buildId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Built</span>
              <span className="text-zinc-300 text-sm">{buildDate}</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href="https://github.com/regevadi-cmd/MarketPulse"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Copyright */}
          <p className="text-center text-zinc-500 text-xs">
            &copy; {new Date().getFullYear()} MarketPulse. All rights reserved.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
