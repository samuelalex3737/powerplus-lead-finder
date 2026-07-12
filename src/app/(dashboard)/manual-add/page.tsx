'use client';

import { useState } from 'react';
import { INDUSTRY_LABELS, type IndustryType, EMIRATES } from '@/types/database';

export default function ManualAddPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/leads/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to add lead');
      }

      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="dashboard-header">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Outfit, sans-serif' }}>Add Lead Manually</h1>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="glass-card" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
          {success && (
            <div className="success-msg" style={{ marginBottom: 20 }}>
              Lead added successfully!
            </div>
          )}

          {error && (
            <div className="login-error" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="project_name">Project Name / Opportunity Title *</label>
              <input type="text" id="project_name" name="project_name" className="form-input" required />
            </div>

            <div className="detail-grid" style={{ marginBottom: 20 }}>
              <div>
                <label className="form-label" htmlFor="buyer_organization">Buyer Organization</label>
                <input type="text" id="buyer_organization" name="buyer_organization" className="form-input" />
              </div>
              <div>
                <label className="form-label" htmlFor="location_emirate">Location</label>
                <select id="location_emirate" name="location_emirate" className="form-select">
                  <option value="">Select Emirate...</option>
                  {EMIRATES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div className="detail-grid" style={{ marginBottom: 20 }}>
              <div>
                <label className="form-label" htmlFor="industry">Industry *</label>
                <select id="industry" name="industry" className="form-select" required defaultValue="other">
                  {(Object.entries(INDUSTRY_LABELS) as [IndustryType, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="estimated_kva_range">Estimated kVA Range</label>
                <input type="text" id="estimated_kva_range" name="estimated_kva_range" placeholder="e.g. 500-1000 kVA" className="form-input" />
              </div>
            </div>

            <div className="detail-grid" style={{ marginBottom: 20 }}>
              <div>
                <label className="form-label" htmlFor="deadline_date">Deadline / Due Date</label>
                <input type="date" id="deadline_date" name="deadline_date" className="form-input" />
              </div>
              <div>
                <label className="form-label" htmlFor="source_url">Source URL (if any)</label>
                <input type="url" id="source_url" name="source_url" className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact_info">Contact Information</label>
              <textarea id="contact_info" name="contact_info" className="form-textarea" placeholder="Name, phone, email..."></textarea>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="summary">Notes / Summary</label>
              <textarea id="summary" name="summary" className="form-textarea" placeholder="Additional details..."></textarea>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Adding...' : 'Add Lead'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
