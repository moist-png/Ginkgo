import React, { useEffect, useState } from 'react';
import { supabase, TeamMember } from '../utils/supabase';
import { Plus, User, Phone, Mail, Trash2, Edit2, Check, X } from 'lucide-react';

const ROLE_STYLES: Record<TeamMember['role'], { bg: string; color: string; border: string }> = {
  admin: { bg: 'rgba(180,60,60,0.15)', color: '#e88', border: 'rgba(180,60,60,0.3)' },
  supervisor: { bg: 'rgba(212,160,23,0.15)', color: 'var(--amber-light)', border: 'rgba(212,160,23,0.3)' },
  arborist: { bg: 'rgba(90,143,90,0.15)', color: 'var(--leaf)', border: 'rgba(90,143,90,0.3)' },
  apprentice: { bg: 'rgba(60,120,200,0.15)', color: '#88aaee', border: 'rgba(60,120,200,0.3)' },
};

const COLOURS = ['#5a8f5a', '#d4a017', '#e88080', '#88aaee', '#bb99ee', '#88ccee', '#f0a060', '#a8c8a8'];

const emptyMember = (): Partial<TeamMember> => ({
  name: '', email: '', phone: '', role: 'arborist', colour: '#5a8f5a', active: true
});

export const TeamManagement: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<TeamMember> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('team_members').select('*').order('name');
    if (!error) setMembers(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing?.name?.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const { error } = await supabase.from('team_members').insert(editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('team_members').update(editing).eq('id', editing.id!);
        if (error) throw error;
      }
      await loadMembers();
      setEditing(null);
      setIsNew(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await supabase.from('team_members').delete().eq('id', id);
    await loadMembers();
  };

  const handleToggleActive = async (member: TeamMember) => {
    await supabase.from('team_members').update({ active: !member.active }).eq('id', member.id);
    await loadMembers();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '32px', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Team</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{members.filter(m => m.active).length} active members</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(emptyMember()); setIsNew(true); setError(null); }}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Editor */}
      {editing && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            {isNew ? 'Add Team Member' : 'Edit Team Member'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label>Name *</label>
              <input className="input-field" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label>Role</label>
              <select className="input-field" value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value as TeamMember['role'] })}>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="arborist">Arborist</option>
                <option value="apprentice">Apprentice</option>
              </select>
            </div>
            <div>
              <label>Email</label>
              <input className="input-field" type="email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label>Phone</label>
              <input className="input-field" type="tel" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="04XX XXX XXX" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Colour</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {COLOURS.map(c => (
                  <button key={c} onClick={() => setEditing({ ...editing, colour: c })} style={{
                    width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer',
                    border: editing.colour === c ? '2px solid var(--cream)' : '2px solid transparent',
                    outline: editing.colour === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px'
                  }} />
                ))}
              </div>
            </div>
          </div>
          {error && (
            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(180,60,60,0.1)', border: '1px solid rgba(180,60,60,0.25)', color: '#e88', fontSize: '13px' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              <Check size={16} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn-secondary" onClick={() => { setEditing(null); setIsNew(false); }}>
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Member list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <User size={24} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No team members yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Add your first team member to start assigning jobs</p>
          <button className="btn-primary" onClick={() => { setEditing(emptyMember()); setIsNew(true); }}>
            <Plus size={16} /> Add First Member
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {members.map(member => {
            const roleStyle = ROLE_STYLES[member.role];
            return (
              <div key={member.id} className="card" style={{ padding: '16px 20px', opacity: member.active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: member.colour + '33', border: `2px solid ${member.colour}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: '700', color: member.colour
                  }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{member.name}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', background: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.border}` }}>{member.role}</span>
                      {!member.active && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>inactive</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {member.email && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}><Mail size={12} color="var(--text-muted)" />{member.email}</span>}
                      {member.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}><Phone size={12} color="var(--text-muted)" />{member.phone}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handleToggleActive(member)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {member.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => { setEditing(member); setIsNew(false); setError(null); }} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(member.id)} style={{ padding: '7px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(180,60,60,0.3)', color: '#e88', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
