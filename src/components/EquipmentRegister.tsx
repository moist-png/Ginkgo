import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { Equipment, EQUIPMENT_CATEGORIES } from '../types';
import { fromDbEquipment, toDbEquipment } from '../utils/mappers';
import { Plus, Wrench, Trash2, Edit2, Check, X, AlertTriangle, Search } from 'lucide-react';
import { isSupervisorOrAbove } from '../utils/auth';

const emptyEquipment = (): Partial<Equipment> => ({
  name: '', category: 'Chainsaw', serialNumber: '', status: 'active', notes: '',
});

const daysUntil = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const ms = new Date(dateStr + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86400000);
};

const STATUS_STYLES: Record<Equipment['status'], { bg: string; color: string }> = {
  active: { bg: 'var(--surface-overlay)', color: 'var(--text-secondary)' },
  'in-repair': { bg: 'rgba(179,67,61,0.1)', color: 'var(--danger)' },
  retired: { bg: 'var(--surface-overlay)', color: 'var(--text-muted)' },
};

export const EquipmentRegister: React.FC = () => {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Equipment> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const canManage = isSupervisorOrAbove();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('equipment').select('*').is('deleted_at', null).order('name');
    setItems((data || []).map(fromDbEquipment));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing?.name?.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const full: Equipment = {
        id: editing.id || crypto.randomUUID(),
        name: editing.name,
        category: (editing.category as any) || 'Other',
        serialNumber: editing.serialNumber || '',
        purchaseDate: editing.purchaseDate,
        lastServiceDate: editing.lastServiceDate,
        nextServiceDue: editing.nextServiceDue,
        status: (editing.status as any) || 'active',
        notes: editing.notes || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { error } = await supabase.from('equipment').upsert(toDbEquipment(full));
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
    if (!confirm('Remove this equipment record?')) return;
    await supabase.from('equipment').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    await load();
  };

  const q = searchQuery.toLowerCase();
  const filtered = items.filter(e =>
    e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.serialNumber.toLowerCase().includes(q)
  );
  const serviceDueSoonCount = items.filter(e => { const d = daysUntil(e.nextServiceDue); return d !== null && d <= 14 && e.status === 'active'; }).length;

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '32px', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Equipment</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{items.length} {items.length === 1 ? 'item' : 'items'} registered</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => { setEditing(emptyEquipment()); setIsNew(true); setError(null); }}>
            <Plus size={16} /> Add Equipment
          </button>
        )}
      </div>

      {serviceDueSoonCount > 0 && (
        <div className="card" style={{ padding: '14px 18px', borderColor: 'rgba(179,67,61,0.3)', background: 'rgba(179,67,61,0.06)' }}>
          <p style={{ fontSize: '13px', color: 'var(--danger)' }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
            {serviceDueSoonCount} item{serviceDueSoonCount === 1 ? '' : 's'} due for service within 14 days.
          </p>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Search equipment..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field" style={{ paddingLeft: '42px' }} />
      </div>

      {editing && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            {isNew ? 'Add Equipment' : 'Edit Equipment'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Name</label>
              <input className="input-field" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Stihl MS 261 #2" />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Category</label>
              <select className="input-field" value={editing.category || 'Chainsaw'} onChange={e => setEditing({ ...editing, category: e.target.value as any })}>
                {EQUIPMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Serial Number</label>
              <input className="input-field" value={editing.serialNumber || ''} onChange={e => setEditing({ ...editing, serialNumber: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Status</label>
              <select className="input-field" value={editing.status || 'active'} onChange={e => setEditing({ ...editing, status: e.target.value as any })}>
                <option value="active">Active</option>
                <option value="in-repair">In Repair</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Purchase Date</label>
              <input className="input-field" type="date" value={editing.purchaseDate || ''} onChange={e => setEditing({ ...editing, purchaseDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Last Serviced</label>
              <input className="input-field" type="date" value={editing.lastServiceDate || ''} onChange={e => setEditing({ ...editing, lastServiceDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Next Service Due</label>
              <input className="input-field" type="date" value={editing.nextServiceDue || ''} onChange={e => setEditing({ ...editing, nextServiceDue: e.target.value })} />
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

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Wrench size={24} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No equipment yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{searchQuery ? 'Try different search terms' : 'Add your chainsaws, chippers, EWP and more'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(item => {
            const statusStyle = STATUS_STYLES[item.status];
            const serviceDays = daysUntil(item.nextServiceDue);
            return (
              <div key={item.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</h3>
                      <span className="badge badge-gray">{item.category}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: statusStyle.bg, color: statusStyle.color }}>{item.status}</span>
                      {serviceDays !== null && item.status === 'active' && serviceDays <= 14 && (
                        <span className="badge badge-red">{serviceDays < 0 ? `Service overdue by ${Math.abs(serviceDays)}d` : `Service due in ${serviceDays}d`}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {item.serialNumber && <span>S/N {item.serialNumber}</span>}
                      {item.nextServiceDue && <span>Next service {new Date(item.nextServiceDue + 'T00:00:00').toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setEditing(item); setIsNew(false); setError(null); }} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex' }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(item.id)} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(179,67,61,0.3)', color: 'var(--danger)', display: 'flex' }}><Trash2 size={14} /></button>
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
