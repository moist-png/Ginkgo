import React, { useEffect, useState } from 'react';
import { supabase, TeamMember } from '../utils/supabase';
import { TeamCertification, CERT_TYPES } from '../types';
import { fromDbCertification, toDbCertification } from '../utils/mappers';
import { Plus, Award, Trash2, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { isSupervisorOrAbove } from '../utils/auth';

const emptyCert = (teamMemberId: string): Partial<TeamCertification> => ({
  teamMemberId, certType: 'Chainsaw Ticket', certLabel: '', certNumber: '', notes: '',
});

const daysUntil = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const ms = new Date(dateStr + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86400000);
};

const ExpiryBadge: React.FC<{ expiryDate?: string }> = ({ expiryDate }) => {
  if (!expiryDate) return <span className="badge badge-gray">No expiry set</span>;
  const days = daysUntil(expiryDate);
  if (days === null) return null;
  if (days < 0) return <span className="badge badge-red"><AlertTriangle size={11} style={{ marginRight: '4px', display: 'inline' }} />Expired {Math.abs(days)}d ago</span>;
  if (days <= 30) return <span className="badge badge-red">Expires in {days}d</span>;
  return <span className="badge badge-green">Valid to {new Date(expiryDate + 'T00:00:00').toLocaleDateString()}</span>;
};

export const CertificationTracker: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [certs, setCerts] = useState<TeamCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<TeamCertification> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = isSupervisorOrAbove();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: memberData }, { data: certData }] = await Promise.all([
      supabase.from('team_members').select('*').order('name'),
      supabase.from('team_certifications').select('*').is('deleted_at', null),
    ]);
    setMembers(memberData || []);
    setCerts((certData || []).map(fromDbCertification));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing?.teamMemberId) { setError('Choose a team member'); return; }
    setSaving(true);
    setError(null);
    try {
      const full: TeamCertification = {
        id: editing.id || crypto.randomUUID(),
        teamMemberId: editing.teamMemberId,
        certType: (editing.certType as any) || 'Other',
        certLabel: editing.certLabel || '',
        certNumber: editing.certNumber || '',
        issuedDate: editing.issuedDate,
        expiryDate: editing.expiryDate,
        notes: editing.notes || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { error } = await supabase.from('team_certifications').upsert(toDbCertification(full));
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
    if (!confirm('Remove this certification record?')) return;
    await supabase.from('team_certifications').delete().eq('id', id);
    await load();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>;

  const activeMembers = members.filter(m => m.active);
  const expiringSoonCount = certs.filter(c => { const d = daysUntil(c.expiryDate); return d !== null && d <= 30; }).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {expiringSoonCount > 0 && (
        <div className="card" style={{ padding: '14px 18px', borderColor: 'rgba(179,67,61,0.3)', background: 'rgba(179,67,61,0.06)' }}>
          <p style={{ fontSize: '13px', color: 'var(--danger)' }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
            {expiringSoonCount} certification{expiringSoonCount === 1 ? '' : 's'} expired or expiring within 30 days.
          </p>
        </div>
      )}

      {editing && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            {isNew ? 'Add Certification' : 'Edit Certification'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Team Member</label>
              <select className="input-field" value={editing.teamMemberId || ''} onChange={e => setEditing({ ...editing, teamMemberId: e.target.value })}>
                <option value="">— Select —</option>
                {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Certification Type</label>
              <select className="input-field" value={editing.certType || 'Chainsaw Ticket'} onChange={e => setEditing({ ...editing, certType: e.target.value as any })}>
                {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {editing.certType === 'Other' && (
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Certification Name</label>
                <input className="input-field" value={editing.certLabel || ''} onChange={e => setEditing({ ...editing, certLabel: e.target.value })} placeholder="e.g. Traffic Control Ticket" />
              </div>
            )}
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Certificate / Licence Number</label>
              <input className="input-field" value={editing.certNumber || ''} onChange={e => setEditing({ ...editing, certNumber: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Issued</label>
              <input className="input-field" type="date" value={editing.issuedDate || ''} onChange={e => setEditing({ ...editing, issuedDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Expires</label>
              <input className="input-field" type="date" value={editing.expiryDate || ''} onChange={e => setEditing({ ...editing, expiryDate: e.target.value })} />
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

      {canManage && !editing && (
        <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => { setEditing(emptyCert(activeMembers[0]?.id || '')); setIsNew(true); setError(null); }}>
          <Plus size={16} /> Add Certification
        </button>
      )}

      {activeMembers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Add team members first.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeMembers.map(member => {
            const memberCerts = certs.filter(c => c.teamMemberId === member.id);
            if (memberCerts.length === 0 && !canManage) return null;
            return (
              <div key={member.id} className="card" style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: memberCerts.length ? '12px' : 0 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: member.colour + '33', border: `2px solid ${member.colour}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: member.colour }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</span>
                  {memberCerts.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>— no certifications on file</span>}
                </div>
                {memberCerts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {memberCerts.map(cert => (
                      <div key={cert.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'var(--surface-overlay)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Award size={14} color="var(--text-muted)" />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cert.certType === 'Other' ? (cert.certLabel || 'Other') : cert.certType}
                          </span>
                          {cert.certNumber && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>#{cert.certNumber}</span>}
                          <ExpiryBadge expiryDate={cert.expiryDate} />
                        </div>
                        {canManage && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setEditing(cert); setIsNew(false); setError(null); }} style={{ padding: '5px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex' }}><Edit2 size={12} /></button>
                            <button onClick={() => handleDelete(cert.id)} style={{ padding: '5px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(179,67,61,0.3)', color: 'var(--danger)', display: 'flex' }}><Trash2 size={12} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
