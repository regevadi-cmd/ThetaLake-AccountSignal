import { Briefcase, ExternalLink, Link as LinkIcon, Lock, FileText, Presentation } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { LinkItem } from '@/types/analysis';
import { CompanyInfo } from '@/components/layout/Header';

interface InvestorDocumentsProps {
  documents: LinkItem[];
  companyInfo?: CompanyInfo | null;
}

function isPresentationItem(doc: LinkItem): boolean {
  const titleLower = (doc.title || '').toLowerCase();
  return titleLower.includes('investor presentation') ||
    titleLower.includes('investor day') ||
    (doc.title === 'Investor Presentation' && !doc.url);
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

export function InvestorDocuments({ documents, companyInfo }: InvestorDocumentsProps) {
  const isPrivate = companyInfo && (
    companyInfo.publicStatus === 'private' ||
    companyInfo.publicStatus === 'went_private' ||
    companyInfo.publicStatus === 'pre_ipo'
  );

  const getPrivateMessage = () => {
    if (!companyInfo?.publicStatus) return null;
    switch (companyInfo.publicStatus) {
      case 'private':
        return {
          title: 'Private Company',
          message: 'As a private company, there are no public SEC filings or investor documents available.',
          hint: null
        };
      case 'went_private':
        return {
          title: 'Formerly Public Company',
          message: 'This company was taken private. Historical SEC filings from when the company was public may still be available.',
          hint: 'Search SEC EDGAR for historical filings.'
        };
      case 'pre_ipo':
        return {
          title: 'Pre-IPO Company',
          message: 'This company is preparing for a potential IPO. Limited public filings may be available.',
          hint: 'Watch for S-1 registration statements if the company files for an IPO.'
        };
      default:
        return null;
    }
  };

  // Show private company message if no valid documents and company is private
  const hasValidDocs = documents.some(doc => isValidHttpUrl(doc.url));

  if (isPrivate && !hasValidDocs) {
    const privateMsg = getPrivateMessage();
    return (
      <SectionCard title="Investor Documents" icon={Briefcase} color="amber">
        <div className="py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">{privateMsg?.title}</h4>
          <p className="text-muted-foreground text-xs">{privateMsg?.message}</p>
          {privateMsg?.hint && (
            <p className="text-amber-600/70 dark:text-amber-400/70 text-xs mt-2 flex items-center justify-center gap-1">
              <FileText className="w-3 h-3" />
              {privateMsg.hint}
            </p>
          )}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Investor Documents" icon={Briefcase} color="amber">
      <div className="space-y-1">
        {/* Show context for formerly public or pre-IPO companies */}
        {isPrivate && hasValidDocs && (
          <div className="mb-3 pb-3 border-b border-border">
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
              {companyInfo?.publicStatus === 'went_private' && 'Historical filings from when the company was public:'}
              {companyInfo?.publicStatus === 'pre_ipo' && 'Available filings for this pre-IPO company:'}
            </p>
          </div>
        )}
        {documents.map((doc, i) => {
          const hasValidUrl = isValidHttpUrl(doc.url);
          const isPresentation = i === 0 && isPresentationItem(doc);
          const Icon = isPresentation ? Presentation : LinkIcon;
          return (
            <div key={i} className={`py-2 border-b border-border/50 last:border-0 ${isPresentation ? 'rounded-md border border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 px-3 mb-2' : ''}`}>
              {hasValidUrl ? (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPresentation ? 'text-amber-700 dark:text-amber-300' : 'text-amber-600 dark:text-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {isPresentation && (
                          <span className="text-xs font-semibold uppercase tracking-wider bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded mr-1">
                            Presentation
                          </span>
                        )}
                        <span className="text-amber-600 dark:text-amber-400 group-hover:text-amber-500 dark:group-hover:text-amber-300 group-hover:underline transition-colors font-medium text-sm">
                          {doc.title}
                        </span>
                        <ExternalLink className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      </div>
                      {doc.summary && (
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{doc.summary}</p>
                      )}
                    </div>
                  </div>
                </a>
              ) : (
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPresentation ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    {isPresentation && (
                      <span className="text-xs font-semibold uppercase tracking-wider bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded mr-1">
                        Presentation
                      </span>
                    )}
                    <span className="text-foreground font-medium text-sm">{doc.title}</span>
                    {doc.summary && (
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{doc.summary}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {documents.length === 0 && !isPrivate && (
          <p className="text-muted-foreground text-sm">No documents found</p>
        )}
      </div>
    </SectionCard>
  );
}
