import React, { useEffect, useState } from 'react';
import { supabase, TeamMember } from '../utils/supabase';
import { Contract, Site } from '../types';
import { toDbJob, fromDbContract, toDbContract } from '../utils/mappers';
import { Plus, Repeat, Trash2, Edit2, Check, X, Building2, CalendarPlus, Pause, Play } from 'lucide-react';
import { canUserEdit } from '../utils/auth';

interface ContractListProps {
  sites: Site[];
  teamMembers: TeamMember[];
  onJobCreated?: () => void;
}

const emptyContract = (siteId: string): Partial<Contract> => ({
  siteId, title: '', frequencyMonths: 12, nextDueDate: new Date().toISOString().split('T')[0],
  jobType: 'assessment', defaultAssignedTo: [], notes: '', active: true,
});

const addMonths = (dateStr: string, months: number) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

const daysUntil = (dateStr: string): number => {
  const ms = new Date(dateStr + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86400000);
};

export const ContractList: React.FC<ContractListProps> = ({ sites, teamMembers, onJobCreated }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Contract> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingJobFor, setCreatingJobFor] = useState<string | null>(null);
  const canEdit = canUserEdit();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('contracts').select('*').is('deleted_at', null).order('next_due_date');
    setContracts((data || []).map(fromDbContract));
    setLoading(false);
  };

  const siteName = (id: string) => sites.find(s => s.id === id)?.name || 'Unknown site';
  const site = (id: string) => sites.find(s => s.id === id);

  const handleSave = async () => {
    if (!editing?.siteId) { setError('Choose a site'); return; }
    if (!editing?.title?.trim()) { setError('Give this contract a name'); return; }
    setSaving(true);
    setError(null);
    try {
      const full: Contract = {
        id: editing.id || crypto.randomUUID(),
        siteId: editing.siteId,
        title: editing.title,
        frequencyMonths: editing.frequencyMonths || 12,
        nextDueDate: editing.nextDueDate || new Date().toISOString().split('T')[0],
        jobType: (editing.jobType as any) || 'assessment',
        defaultAssignedTo: editing.defaultAssignedTo || [],
        notes: editing.notes || '',
        active: editing.active !== false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { error } = await supabase.from('contracts').upsert(toDbContract(full));
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
    if (!confirm('Remove this contract?')) return;
    await supabase.from('contracts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    await load();
  };

  const handleToggleActive = async (contract: Contract) => {
    await supabase.from('contracts').update({ active: !contract.active }).eq('id', contract.id);
    await load();
  };

  // Creates the next visit as a real Job, pre-filled from the contract and
  // site, then rolls the contract's due date forward by its frequency.
  // Deliberately one click per visit rather than fully automatic, so nothing
  // gets booked onto the calendar without a person seeing it happen.
  const handleCreateJob = async (contract: Contract) => {
    const s = site(contract.siteId);
    if (!s) return;
    setCreatingJobFor(contract.id);
    try {
      const job = {
        id: crypto.randomUUID(),
        title: contract.title || `${s.name} maintenance visit`,
        clientName: s.clientName,
        location: s.address,
        date: contract.nextDueDate,
        startTime: '', endTime: '', timeSpent: 0,
        workCompleted: '', workToComplete: '',
        notes: contract.notes || '',
        status: 'scheduled' as const,
        jobType: contract.jobType,
        hourlyRate: 0, totalCost: 0,
        assignedTo: contract.defaultAssignedTo,
        createdAt: Date.now(), updatedAt: Date.now(),
        siteId: contract.siteId,
      };
      const { error: jobError } = await supabase.from('jobs').insert(toDbJob(job));
      if (jobError) throw jobError;

      const nextDue = addMonths(contract.nextDueDate, contract.frequencyMonths);
      await supabase.from('contracts').update({ next_due_date: nextDue }).eq('id', contract.id);
      await load();
      onJobCreated?.();
    } catch (err: any) {
      alert(`Couldn't create job: ${err.message}`);
    } finally {
      setCreatingJobFor(null);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>;

  const active = contracts.filter(c => c.active);
  const paused = contracts.filter(c => !c.active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '32px', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Contracts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{active.length} active recurring contract{active.length === 1 ? '' : 's'}</p>
        </div>
        {canEdit && sites.length > 0 && (
          <button className="btn-primary" onClick={() => { setEditing(emptyContract(sites[0].id)); setIsNew(true); setError(null); }}>
            <Plus size={16} /> Add Contract
          </button>
        )}
      </div>

      {editing && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            {isNew ? 'Add Contract' : 'Edit Contract'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Site</label>
              <select className="input-field" value={editing.siteId || ''} onChange={e => setEditing({ ...editing, siteId: e.target.value })}>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Contract Name</label>
              <input className="input-field" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Annual street tree prune" />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Repeats Every</label>
              <select className="input-field" value={editing.frequencyMonths || 12} onChange={e => setEditing({ ...editing, frequencyMonths: parseInt(e.target.value) })}>
                <option value={1}>1 month</option>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Next Due</label>
              <input className="input-field" type="date" value={editing.nextDueDate || ''} onChange={e => setEditing({ ...editing, nextDueDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Job Type</label>
              <select className="input-field" value={editing.jobType || 'assessment'} onChange={e => setEditing({ ...editing, jobType: e.target.value as any })}>
                <option value="assessment">Assessment</option>
                <option value="pruning">Pruning</option>
                <option value="removal">Removal</option>
                <option value="treatment">Treatment</option>
                <option value="consultation">Consultation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Default Crew</label>
              <select multiple className="input-field" style={{ height: '76px' }} value={editing.defaultAssignedTo || []} onChange={e => setEditing({ ...editing, defaultAssignedTo: Array.from(e.target.selectedOptions).map(o => o.value) })}>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Notes</label>
              <input className="input-field" value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Scope of work for each visit" />
            </div>
          </div>
          {error && <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(179,67,61,0.1)', border: '1px solid rgba(179,67,61,0.25)', color: 'var(--danger)', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}><Check size={16} /> {saving ? 'Saving...' : 'Save'}</button>
            <button className="btn-secondary" onClick={() => { setEditing(null); setIsNew(false); }}><X size={16} /> Cancel</button>
          </div>
        </div>
      )}

      {contracts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Repeat size={24} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No recurring contracts yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Set up scheduled maintenance visits — like an annual prune — and they'll show up here when due</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...active, ...paused].map(contract => {
            const days = daysUntil(contract.nextDueDate);
            const due = contract.active && days <= 14;
            return (
              <div key={contract.id} className="card" style={{ padding: '16px 20px', opacity: contract.active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{contract.title}</h3>
                      <span className="badge badge-gray">Every {contract.frequencyMonths}mo</span>
                      {!contract.active && <span className="badge badge-gray">Paused</span>}
                      {due && <span className="badge badge-red">{days < 0 ? `Overdue ${Math.abs(days)}d` : days === 0 ? 'Due today' : `Due in ${days}d`}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Building2 size={13} color="var(--text-muted)" />{siteName(contract.siteId)}</span>
                      <span>Next visit {new Date(contract.nextDueDate + 'T00:00:00').toLocaleDateString()}</span>
                      <span>{contract.jobType}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {contract.active && (
                        <button onClick={() => handleCreateJob(contract)} disabled={creatingJobFor === contract.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-strong)', color: 'var(--accent)' }}>
                          <CalendarPlus size={13} /> {creatingJobFor === contract.id ? 'Creating...' : 'Create Job'}
                        </button>
                      )}
                      <button onClick={() => handleToggleActive(contract)} title={contract.active ? 'Pause' : 'Resume'} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex' }}>
                        {contract.active ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button onClick={() => { setEditing(contract); setIsNew(false); setError(null); }} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex' }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(contract.id)} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(179,67,61,0.3)', color: 'var(--danger)', display: 'flex' }}><Trash2 size={14} /></button>
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
