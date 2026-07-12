// TypeScript types mirroring the Supabase schema

export type IndustryType =
  | 'construction'
  | 'oil_gas'
  | 'healthcare'
  | 'data_centre'
  | 'hospitality'
  | 'infrastructure'
  | 'telecom'
  | 'other';

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost';

export type SourceType = 'government_portal' | 'tender_aggregator' | 'classifieds' | 'news' | 'manual';

export interface Lead {
  id: string;
  project_name: string;
  buyer_organization: string | null;
  location_emirate: string | null;
  estimated_kva_range: string | null;
  industry: IndustryType;
  deadline_date: string | null;
  contact_info: string | null;
  source_id: string | null;
  source_url: string | null;
  raw_text: string | null;
  relevance_score: number;
  summary: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  // Joined from sources table
  sources?: Source | null;
}

export interface LeadInsert {
  project_name: string;
  buyer_organization?: string | null;
  location_emirate?: string | null;
  estimated_kva_range?: string | null;
  industry?: IndustryType;
  deadline_date?: string | null;
  contact_info?: string | null;
  source_id?: string | null;
  source_url?: string | null;
  raw_text?: string | null;
  relevance_score?: number;
  summary?: string | null;
  status?: LeadStatus;
}

export interface Source {
  id: string;
  name: string;
  base_url: string;
  type: SourceType;
  enabled: boolean;
  last_checked_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Keyword {
  id: string;
  keyword: string;
  enabled: boolean;
  created_at: string;
}

// Industry display labels
export const INDUSTRY_LABELS: Record<IndustryType, string> = {
  construction: 'Construction',
  oil_gas: 'Oil & Gas',
  healthcare: 'Healthcare',
  data_centre: 'Data Centre',
  hospitality: 'Hospitality',
  infrastructure: 'Infrastructure',
  telecom: 'Telecom',
  other: 'Other',
};

// Status display labels
export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
};

// Emirates list for dropdowns
export const EMIRATES = [
  'Abu Dhabi',
  'Dubai',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
] as const;
