import React, { useMemo } from 'react';
import { Tree } from '../types';
import { Compass, AlertTriangle, MapPinOff } from 'lucide-react';

interface SiteProtectionZoneOverviewProps {
  trees: Tree[];
}

// Flat-earth (equirectangular) projection of lat/lng to local metres.
// Good enough at property scale (tens to low hundreds of metres) — the
// same approximation used by most simple site-plan tools.
const toLocalMetres = (lat: number, lng: number, refLat: number, refLng: number) => {
  const y = (lat - refLat) * 110540; // metres per degree latitude, ~constant
  const x = (lng - refLng) * 111320 * Math.cos((refLat * Math.PI) / 180);
  return { x, y };
};

const VB_W = 700;
const VB_H = 480;
const PADDING = 50;

export const SiteProtectionZoneOverview: React.FC<SiteProtectionZoneOverviewProps> = ({ trees }) => {
  const plottable = trees.filter(t => t.protectionZone && t.coordinates);
  const noCoords = trees.filter(t => t.protectionZone && !t.coordinates);
  const noZone = trees.filter(t => !t.protectionZone);

  const { positioned, scale, overlaps } = useMemo(() => {
    if (plottable.length === 0) return { positioned: [], scale: 1, overlaps: [] as string[] };

    const refLat = plottable[0].coordinates!.lat;
    const refLng = plottable[0].coordinates!.lng;
    const withXY = plottable.map(t => ({
      tree: t,
      ...toLocalMetres(t.coordinates!.lat, t.coordinates!.lng, refLat, refLng),
      tpzR: t.protectionZone!.tpzRadiusM,
      srzR: t.protectionZone!.srzRadiusM,
    }));

    const maxExtent = Math.max(
      1,
      ...withXY.map(p => Math.abs(p.x) + p.tpzR),
      ...withXY.map(p => Math.abs(p.y) + p.tpzR)
    );
    const s = Math.min((VB_W / 2 - PADDING), (VB_H / 2 - PADDING)) / maxExtent;

    const positioned = withXY.map(p => ({
      ...p,
      cx: VB_W / 2 + p.x * s,
      cy: VB_H / 2 - p.y * s,
      tpzPx: p.tpzR * s,
      srzPx: p.srzR * s,
    }));

    // Flag pairs whose TPZ circles overlap (trunk-to-trunk distance is less
    // than the sum of their TPZ radii). This is a heads-up, not a precise
    // overlap area — useful when planning works across a multi-tree site.
    const overlaps: string[] = [];
    for (let i = 0; i < withXY.length; i++) {
      for (let j = i + 1; j < withXY.length; j++) {
        const a = withXY[i], b = withXY[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < a.tpzR + b.tpzR) {
          const aLabel = a.tree.treeNumber || a.tree.species || 'Tree';
          const bLabel = b.tree.treeNumber || b.tree.species || 'Tree';
          overlaps.push(`${aLabel} and ${bLabel} — trunks ${dist.toFixed(1)}m apart, TPZs overlap by ~${(a.tpzR + b.tpzR - dist).toFixed(1)}m`);
        }
      }
    }

    return { positioned, scale: s, overlaps };
  }, [plottable]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '4px' }}>Protection Zones — Whole Site</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Every tree with a saved TPZ/SRZ result and a GPS location, plotted together using their real relative positions.
        </p>
      </div>

      {plottable.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Compass size={24} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Nothing to plot yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Trees need both a saved TPZ/SRZ calculation and a GPS location to appear here. Open a tree and use the TPZ/SRZ calculator tab, capturing its location while you're there.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" style={{ maxWidth: '700px' }}>
            {positioned.map(p => (
              <g key={p.tree.id}>
                <circle cx={p.cx} cy={p.cy} r={p.tpzPx} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 4" />
                <circle cx={p.cx} cy={p.cy} r={p.srzPx} fill="var(--accent-soft)" stroke="var(--text-primary)" strokeWidth="1.2" />
                <circle cx={p.cx} cy={p.cy} r="3" fill="var(--text-primary)" />
                <text x={p.cx} y={p.cy - p.tpzPx - 6} textAnchor="middle" fontSize="11" fontWeight={600} fill="var(--text-primary)">
                  {p.tree.treeNumber || p.tree.species || 'Tree'}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {overlaps.length > 0 && (
        <div className="card" style={{ padding: '14px 18px', borderColor: 'rgba(179,67,61,0.3)', background: 'rgba(179,67,61,0.06)' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)', marginBottom: '6px' }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
            Overlapping protection zones
          </p>
          {overlaps.map((line, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{line}</p>
          ))}
        </div>
      )}

      {(noCoords.length > 0 || noZone.length > 0) && (
        <div className="card" style={{ padding: '14px 18px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
            <MapPinOff size={12} style={{ display: 'inline', marginRight: '5px', verticalAlign: '-1px' }} />
            Not shown on the diagram
          </p>
          {noCoords.length > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Has a TPZ/SRZ result but no GPS location: {noCoords.map(t => t.treeNumber || t.species || 'Unnamed').join(', ')}
            </p>
          )}
          {noZone.length > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              No TPZ/SRZ calculated yet: {noZone.map(t => t.treeNumber || t.species || 'Unnamed').join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
