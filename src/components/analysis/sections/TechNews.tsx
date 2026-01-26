import { Cpu, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { LinkItem } from '@/types/analysis';

interface TechNewsProps {
  news: LinkItem[];
}

function isValidHttpUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function TechNews({ news }: TechNewsProps) {
  return (
    <SectionCard title="AI & Technology News" icon={Cpu} color="cyan" className="xl:col-span-2">
      <div className="space-y-1">
        {news.slice(0, 10).map((item, i) => {
          const hasValidUrl = isValidHttpUrl(item.url);
          return (
            <div key={i} className="py-2 border-b border-gray-200 dark:border-zinc-800/50 last:border-0">
              {hasValidUrl ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group cursor-pointer relative z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-2">
                    <ExternalLink className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-cyan-400 group-hover:text-cyan-300 group-hover:underline transition-colors font-medium text-sm line-clamp-2">
                        {item.title}
                      </span>
                      {item.summary && (
                        <p className="text-gray-600 dark:text-muted-foreground text-xs mt-1 line-clamp-2">{item.summary}</p>
                      )}
                    </div>
                  </div>
                </a>
              ) : (
                <div className="flex items-start gap-2">
                  <LinkIcon className="w-4 h-4 text-gray-500 dark:text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-700 dark:text-muted-foreground font-medium text-sm line-clamp-2">{item.title}</span>
                    {item.summary && (
                      <p className="text-gray-600 dark:text-muted-foreground text-xs mt-1 line-clamp-2">{item.summary}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {news.length === 0 && (
          <p className="text-muted-foreground text-sm">No technology news found</p>
        )}
      </div>
    </SectionCard>
  );
}
