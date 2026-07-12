'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, type FC } from 'react';
import { INDUSTRY_LABELS, type IndustryType, EMIRATES } from '@/types/database';

const FilterBar: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeFilter = searchParams.get('filter') || 'all';
  const activeIndustry = searchParams.get('industry') || '';
  const activeEmirate = searchParams.get('emirate') || '';

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset page when filter changes
      params.delete('page');
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="filter-bar">
      <button
        className={`filter-chip ${activeFilter === 'all' && !activeIndustry && !activeEmirate ? 'active' : ''}`}
        onClick={() => router.push('/')}
      >
        All Leads
      </button>
      <button
        className={`filter-chip ${activeFilter === 'high' ? 'active' : ''}`}
        onClick={() => setFilter('filter', activeFilter === 'high' ? '' : 'high')}
      >
        🔥 High Relevance
      </button>

      {/* Industry chips */}
      {(Object.entries(INDUSTRY_LABELS) as [IndustryType, string][]).map(([key, label]) => (
        <button
          key={key}
          className={`filter-chip ${activeIndustry === key ? 'active' : ''}`}
          onClick={() => setFilter('industry', activeIndustry === key ? '' : key)}
        >
          {label}
        </button>
      ))}

      {/* Emirate chips */}
      {EMIRATES.map((emirate) => (
        <button
          key={emirate}
          className={`filter-chip ${activeEmirate === emirate ? 'active' : ''}`}
          onClick={() => setFilter('emirate', activeEmirate === emirate ? '' : emirate)}
        >
          📍 {emirate}
        </button>
      ))}
    </div>
  );
};

export default FilterBar;
