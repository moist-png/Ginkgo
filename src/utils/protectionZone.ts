import { Tree, TreeData } from '../types';

const fmt = (n: number, dp = 2) => (Number.isFinite(n) ? n.toFixed(dp) : '—');

const severityLabel = (severity: string): string => {
  switch (severity) {
    case 'srz': return 'Within the Structural Root Zone';
    case 'major': return 'Major encroachment (over 10% of TPZ area)';
    case 'minor': return 'Minor encroachment (10% or less of TPZ area)';
    default: return 'No encroachment';
  }
};

// Plain-text lines describing a tree's saved TPZ/SRZ (and optional
// encroachment) results, shared between the on-screen report preview and
// the .txt report exports so the wording stays consistent in both places.
export const protectionZoneTextLines = (tree: Tree | TreeData): string[] => {
  const pz = tree.protectionZone;
  if (!pz) return [];

  const lines = [
    `TPZ radius: ${fmt(pz.tpzRadiusM)} m (diameter ${fmt(pz.tpzRadiusM * 2)} m)`,
    `SRZ radius: ${fmt(pz.srzRadiusM)} m (diameter ${fmt(pz.srzRadiusM * 2)} m)`,
    `Calculated from DBH ${fmt(pz.dbhCm, 1)} cm, per AS 4970-2009`,
  ];

  const e = pz.encroachment;
  if (e?.mode === 'straight' && e.distanceM != null) {
    lines.push(`Encroachment check: works ${fmt(e.distanceM, 1)} m from trunk — ${fmt(e.areaPct, 1)}% of TPZ area — ${severityLabel(e.severity)}`);
  } else if (e?.mode === 'corner' && e.wallHorizontalM != null && e.wallVerticalM != null) {
    lines.push(`Encroachment check: building corner ${fmt(e.wallHorizontalM, 1)} m / ${fmt(e.wallVerticalM, 1)} m from trunk — ${fmt(e.areaPct, 1)}% of TPZ area — ${severityLabel(e.severity)}`);
  }

  return lines;
};
