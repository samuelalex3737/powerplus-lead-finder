import Link from 'next/link';
import type { FC } from 'react';
import type { Lead } from '@/types/database';
import { INDUSTRY_LABELS } from '@/types/database';
import ScoreBadge from './score-badge';
import StatusBadge from './status-badge';

interface LeadCardProps {
  lead: Lead;
}

function getDeadlineInfo(dateStr: string | null): { text: string; urgent: boolean } | null {
  if (!dateStr) return null;
  const deadline = new Date(dateStr);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { text: 'Expired', urgent: true };
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: '1 day left', urgent: true };
  if (days <= 7) return { text: `${days} days left`, urgent: true };
  return { text: `${days} days left`, urgent: false };
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const LeadCard: FC<LeadCardProps> = ({ lead }) => {
  const deadline = getDeadlineInfo(lead.deadline_date);
  const sourceName = lead.sources?.name || 'Unknown';

  return (
    <Link href={`/leads/${lead.id}`} className="lead-card">
      <div className="glass-card lead-card-inner">
        <div className="lead-card-header">
          <div style={{ flex: 1 }}>
            <div className="lead-card-title">{lead.project_name}</div>
          </div>
          <ScoreBadge score={lead.relevance_score} />
        </div>

        <div className="lead-card-meta">
          <span className="tag tag-industry">{INDUSTRY_LABELS[lead.industry]}</span>
          {lead.estimated_kva_range && (
            <span className="tag tag-kva">⚡ {lead.estimated_kva_range}</span>
          )}
          {lead.location_emirate && (
            <span className="tag tag-emirate">{lead.location_emirate}</span>
          )}
          {deadline && (
            <span className={`tag tag-deadline ${deadline.urgent ? 'urgent' : ''}`}>
              ⏱ {deadline.text}
            </span>
          )}
        </div>

        {lead.summary && (
          <div className="lead-card-summary">{lead.summary}</div>
        )}

        <div className="lead-card-footer">
          <StatusBadge status={lead.status} />
          <span>{sourceName} · {timeAgo(lead.created_at)}</span>
        </div>
      </div>
    </Link>
  );
};

export default LeadCard;
