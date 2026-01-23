'use client';

import { Shield, ExternalLink } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { RegulatoryBodyMention } from '@/types/analysis';

interface RegulatoryLandscapeProps {
  regulators: RegulatoryBodyMention[];
}

// Regulatory body colors for visual distinction (light mode / dark mode)
const REGULATOR_COLORS: Record<string, string> = {
  SEC: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30',
  FINRA: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30',
  FCA: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30',
  CFTC: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30',
  ESMA: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30',
  OCC: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30',
  FDIC: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30',
  'Federal Reserve': 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/30',
  PRA: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30',
  MAS: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30',
  ASIC: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-500/30',
  BaFin: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30',
  DOJ: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30',
};

function getRegulatorColor(body: string): string {
  // Check for exact match first
  if (REGULATOR_COLORS[body]) return REGULATOR_COLORS[body];

  // Check if body contains a known regulator
  for (const [key, value] of Object.entries(REGULATOR_COLORS)) {
    if (body.toUpperCase().includes(key.toUpperCase())) return value;
  }

  // Default color
  return 'bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground border-gray-300 dark:border-border';
}

export function RegulatoryLandscape({ regulators }: RegulatoryLandscapeProps) {
  return (
    <SectionCard title="Regulatory Landscape" icon={Shield} color="blue">
      <div className="space-y-3">
        {regulators.length > 0 ? (
          regulators.map((regulator, i) => (
            <div
              key={i}
              className="p-3 bg-card/50 dark:bg-muted/50 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${getRegulatorColor(regulator.body)}`}>
                  {regulator.body}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm">
                    {regulator.context}
                  </p>
                  {regulator.url && (
                    <a
                      href={regulator.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 text-xs mt-2 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View source
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">No regulatory information found</p>
        )}
      </div>
    </SectionCard>
  );
}
