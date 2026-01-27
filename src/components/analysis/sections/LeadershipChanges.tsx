'use client';

import { Users, ExternalLink } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { LeadershipChangeItem } from '@/types/analysis';

interface LeadershipChangesProps {
  changes: LeadershipChangeItem[];
}

export function LeadershipChanges({ changes }: LeadershipChangesProps) {
  return (
    <SectionCard title="Leadership News" icon={Users} color="blue" className="xl:col-span-1">
      <div className="space-y-2">
        {changes.length > 0 ? (
          changes.slice(0, 6).map((change, i) => (
            <a
              key={i}
              href={change.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 bg-card/50 dark:bg-muted/50 rounded-lg hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <ExternalLink className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground text-sm font-medium line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {change.name}
                  </h4>
                  {change.role && (
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                      {change.role}
                    </p>
                  )}
                  {(change.date || change.source) && (
                    <p className="text-blue-600/70 dark:text-blue-400/70 text-xs mt-1.5">
                      {change.date && change.source
                        ? `${change.date} • ${change.source}`
                        : change.date || change.source}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">No recent leadership news found</p>
        )}
      </div>
    </SectionCard>
  );
}
