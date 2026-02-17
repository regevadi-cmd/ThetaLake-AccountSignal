'use client';

import { AlertTriangle, ExternalLink, DollarSign, Calendar, Building2, Newspaper } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { RegulatoryEventItem } from '@/types/analysis';
import { isValidHttpUrl } from '@/lib/utils';

interface RegulatoryEventsProps {
  events: RegulatoryEventItem[];
}

// Event type colors and labels (light mode / dark mode)
const EVENT_TYPE_INFO: Record<string, { color: string; label: string }> = {
  fine: { color: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30', label: 'Fine' },
  penalty: { color: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30', label: 'Penalty' },
  settlement: { color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30', label: 'Settlement' },
  enforcement: { color: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30', label: 'Enforcement' },
  investigation: { color: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30', label: 'Investigation' },
  consent: { color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30', label: 'Consent Order' },
  order: { color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30', label: 'Order' },
  action: { color: 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-300 dark:border-pink-500/30', label: 'Action' },
  other: { color: 'bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground border-gray-300 dark:border-border', label: 'Other' },
};

function getEventTypeInfo(eventType: string) {
  return EVENT_TYPE_INFO[eventType] || EVENT_TYPE_INFO.other;
}

export function RegulatoryEvents({ events }: RegulatoryEventsProps) {
  return (
    <SectionCard title="Regulatory Events" icon={AlertTriangle} color="red">
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs mb-3">
          Enforcement actions, fines, and settlements from the past 5 years
        </p>

        {events.length > 0 ? (
          events.map((event, i) => {
            const typeInfo = getEventTypeInfo(event.eventType);
            const hasUrl = event.url && isValidHttpUrl(event.url);

            const content = (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Building2 className="w-3 h-3" />
                    {event.regulatoryBody}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Calendar className="w-3 h-3" />
                    {event.date}
                  </span>
                  {event.amount && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium">
                      <DollarSign className="w-3 h-3" />
                      {event.amount}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <p className="text-foreground text-sm line-clamp-2 group-hover:text-foreground/80 transition-colors">
                    {event.description}
                  </p>
                  {hasUrl && (
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                  )}
                </div>

                {/* Additional sources for deduplicated events */}
                {event.sources && event.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Newspaper className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {event.sources.length + 1} sources reporting this event
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {event.sources.filter(source => isValidHttpUrl(source.url)).map((source, j) => (
                        <a
                          key={j}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-muted/50 hover:bg-muted rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                          title={source.title || source.url}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate max-w-[160px] sm:max-w-[120px]">
                            {source.regulatoryBody || new URL(source.url).hostname.replace('www.', '')}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );

            return hasUrl ? (
              <a
                key={i}
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-card/50 dark:bg-muted/50 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                {content}
              </a>
            ) : (
              <div
                key={i}
                className="block p-3 bg-card/50 dark:bg-muted/50 rounded-lg group"
              >
                {content}
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            No regulatory events found in the past 5 years
          </div>
        )}
      </div>
    </SectionCard>
  );
}
