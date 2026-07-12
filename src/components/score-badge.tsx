import type { FC } from 'react';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

const ScoreBadge: FC<ScoreBadgeProps> = ({ score, size = 'md' }) => {
  const className = score >= 7 ? 'score-high' : score >= 4 ? 'score-medium' : 'score-low';
  const sizeStyle = size === 'sm'
    ? { minWidth: '28px', height: '28px', fontSize: '12px', borderRadius: '8px' }
    : {};

  return (
    <span className={`score-badge ${className}`} style={sizeStyle} title={`Relevance: ${score}/10`}>
      {score}
    </span>
  );
};

export default ScoreBadge;
