import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { Permit, Site } from '../types';
import { fromDbPermit, toDbPermit } from '../utils/mappers';
import { Plus, Scroll, Trash2, Edit2, Check, X, Building2 } from 'lucide-react';
import { canUserEdit } from '../utils/auth';

interface PermitTrackerProps {
  sites: Site[];
  siteId?: string; // when provided, scoped to a single site (used inside Site Detail)
}

const emptyPermit = (siteId: string): Partial<Permit> => ({
  siteId, permitType: 'Removal', authority: '', referenceNumber: '', status: 'draft', conditions: '', notes: '',
});

const STATUS_STYLES: Record<Permit['status'], { bg: string; color: string }> = {
  draft: { bg: 'var(--surface-overlay)', color: 'var(--text-secondary)' },
  submitted: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  approved: { bg: 'var(--surface-overlay)', color: 'var(--text-secondary)' },
  rejected: { bg: 'rgba(179,67,61,0.1)', color: 'var(--danger)' },
  expired: { bg: 'rgba(179,67,61,0.1)', color: 'var(--danger)' },
};

export const PermitTracker: React.FC<PermitTrackerProps> = ({ sites, siteId }) => {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Permit> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = canUserEdit();

  useEffect(() => { load(); }, [siteId]);

  const load = async () => {
    setLoading(true);
    let query = supabase.from('permits').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (siteId) query = query.eq('site_id', siteId);
    const { data } = await query;
    setPermits((data || []).map(fromDbPermit));
    setLoading(false);
  };

  const siteName = (id: string) => sites.find(s => s.id === id)?.name || 'Unknown site';

  const handleSave = async () => {
    if (!editing?.siteId) { setError('Choose a site'); return; }
    setSaving(true);
    setError(null);
    try {
      const full: Permit = {
        id: editing.id || crypto.randomUUID(),
        siteId: editing.siteId,
        permitType: (editing.permitType as any) || 'Removal',
        authority: editing.authority || '',
        referenceNumber: editing.referenceNumber || '',
        status: (editing.status as any) || 'draft',
        submittedDate: editing.submittedDate,
        decisionDate: editing.decisionDate,
        expiryDate: editing.expiryDate,
        conditions: editing.conditions || '',
        notes: editing.notes || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { error } = await supabase.from('permits').upsert(toDbPermit(full));
      if (error) throw error;
      await load();
      setEditing(null);
      setIsNew(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this permit record?')) return;
    await supabase.from('permits').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    await load();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {!siteId && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '32px', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Permits</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{permits.length} across all sites</p>
          </div>
          {canEdit && (
            <button className="btn-primary" onClick={() => { setEditing(emptyPermit(sites[0]?.id || '')); setIsNew(true); setError(null); }}>
              <Plus size={16} /> Add Permit
            </button>
          )}
        </div>
      )}

      {siteId && canEdit && !editing && (
        <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => { setEditing(emptyPermit(siteId)); setIsNew(true); setError(null); }}>
          <Plus size={16} /> Add Permit
        </button>
      )}

      {editing && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            {isNew ? 'Add Permit' : 'Edit Permit'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {!siteId && (
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Site</label>
                <select className="input-field" value={editing.siteId || ''} onChange={e => setEditing({ ...editing, siteId: e.target.value })}>
                  <option value="">— Select —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Permit Type</label>
              <select className="input-field" value={editing.permitType || 'Removal'} onChange={e => setEditing({ ...editing, permitType: e.target.value as any })}>
                <option value="Removal">Removal</option>
                <option value="Pruning">Pruning</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Authority / Council</label>
              <input className="input-field" value={editing.authority || ''} onChange={e => setEditing({ ...editing, authority: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Reference Number</label>
              <input className="input-field" value={editing.referenceNumber || ''} onChange={e => setEditing({ ...editing, referenceNumber: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Status</label>
              <select className="input-field" value={editing.status || 'draft'} onChange={e => setEditing({ ...editing, status: e.target.value as any })}>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Submitted</label>
              <input className="input-field" type="date" value={editing.submittedDate || ''} onChange={e => setEditing({ ...editing, submittedDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Decision Date</label>
              <input className="input-field" type="date" value={editing.decisionDate || ''} onChange={e => setEditing({ ...editing, decisionDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Expiry</label>
              <input className="input-field" type="date" value={editing.expiryDate || ''} onChange={e => setEditing({ ...editing, expiryDate: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Conditions</label>
              <textarea className="input-field" rows={2} value={editing.conditions || ''} onChange={e => setEditing({ ...editing, conditions: e.target.value })} placeholder="Conditions attached to the approval" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Notes</label>
              <input className="input-field" value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
            </div>
          </div>
          {error && <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(179,67,61,0.1)', border: '1px solid rgba(179,67,61,0.25)', color: 'var(--danger)', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save'}</button>
            <button className="btn-secondary" onClick={() => { setEditing(null); setIsNew(false); }}><X size={16} /> Cancel</button>
          </div>
        </div>
      )}

      {permits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Scroll size={24} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No permits yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Track council approvals for removals and pruning here</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {permits.map(permit => {
            const statusStyle = STATUS_STYLES[permit.status];
            return (
              <div key={permit.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{permit.permitType} Permit</h3>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: statusStyle.bg, color: statusStyle.color }}>{permit.status}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {!siteId && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Building2 size={13} color="var(--text-muted)" />{siteName(permit.siteId)}</span>}
                      {permit.authority && <span>{permit.authority}</span>}
                      {permit.referenceNumber && <span>Ref {permit.referenceNumber}</span>}
                      {permit.expiryDate && <span>Expires {new Date(permit.expiryDate + 'T00:00:00').toLocaleDateString()}</span>}
                    </div>
                    {permit.conditions && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', background: 'var(--surface-overlay)', padding: '8px 10px', borderRadius: '6px' }}>{permit.conditions}</p>}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setEditing(permit); setIsNew(false); setError(null); }} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex' }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(permit.id)} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(179,67,61,0.3)', color: 'var(--danger)', display: 'flex' }}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
