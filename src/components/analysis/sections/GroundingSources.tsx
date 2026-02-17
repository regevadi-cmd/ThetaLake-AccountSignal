import { Link as LinkIcon } from 'lucide-react';
import { isValidHttpUrl } from '@/lib/utils';

interface GroundingSourcesProps {
  sources: string[];
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function GroundingSources({ sources }: GroundingSourcesProps) {
  const validSources = (sources || []).filter(isValidHttpUrl);
  if (validSources.length === 0) return null;

  return (
    <div className="mt-8 p-5 bg-card/50 dark:bg-muted/50 rounded-xl border border-border">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <LinkIcon className="w-4 h-4" />
        Grounding Sources
      </h3>
      <div className="flex flex-wrap gap-2">
        {validSources.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 sm:py-1 bg-muted hover:bg-accent rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[calc(50vw-2rem)] sm:max-w-xs"
          >
            {extractHostname(url)}
          </a>
        ))}
      </div>
    </div>
  );
}
