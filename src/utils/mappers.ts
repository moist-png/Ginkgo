// ---------------------------------------------------------------------------
//  Data mappers
//
//  The database stores rows in snake_case (e.g. client_name), while the editor
//  components were written for the older camelCase shape (e.g. clientName).
//  These helpers translate between the two and, just as importantly, fill in
//  sensible defaults so an editor never receives `undefined` where it expects
//  a string / number / array. That double duty is what stops the blank-screen
//  crashes AND lets the forms populate and save correctly.
//
//  Nested JSON fields (tree_data, hazards, hazard_controls, signatures,
//  job_description, recommendations) live in `jsonb` columns, so their inner
//  shape is preserved verbatim on a round-trip.
// ---------------------------------------------------------------------------

import type {
  ArboristReport, Tree, TreeData, Job, Site, Quote, DailyRisk, ChlorophyllReading,
  TeamCertification, Equipment, Permit, Contract,
} from '../types';

const nowIso = () => new Date().toISOString();
const str = (v: any, d = '') => (v === null || v === undefined ? d : String(v));
const num = (v: any, d = 0) => (typeof v === 'number' && isFinite(v) ? v : (parseFloat(v) || d));
const arr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

// ---- TreeData -------------------------------------------------------------
export const defaultTreeData = (): TreeData => ({
  treeNumber: '',
  species: '',
  commonName: '',
  dbh: 0,
  height: 0,
  canopySpreadNS: 0,
  canopySpreadEW: 0,
  treeHealth: 'Good',
  extensionGrowth: 0,
  structure: 'Good',
  woundWoodDevelopment: 'Good',
  canopyCover: 0,
  location: '',
  notes: [],
});

export const normaliseTreeData = (v: any): TreeData => ({ ...defaultTreeData(), ...(v || {}) });

// ---- Tree -------------------------------------------------------------
export const fromDbTree = (t: any): Tree => ({
  id: str(t?.id) || crypto.randomUUID(),
  siteId: str(t?.site_id ?? t?.siteId),
  treeNumber: str(t?.tree_number ?? t?.treeNumber),
  species: str(t?.species),
  commonName: str(t?.common_name ?? t?.commonName),
  dbh: num(t?.dbh),
  height: num(t?.height),
  canopySpreadNS: num(t?.canopy_spread_ns ?? t?.canopySpreadNS),
  canopySpreadEW: num(t?.canopy_spread_ew ?? t?.canopySpreadEW),
  treeHealth: (t?.tree_health ?? t?.treeHealth) || 'Good',
  extensionGrowth: num(t?.extension_growth ?? t?.extensionGrowth),
  structure: (t?.structure) || 'Good',
  woundWoodDevelopment: (t?.wound_wood_development ?? t?.woundWoodDevelopment) || 'Good',
  canopyCover: num(t?.canopy_cover ?? t?.canopyCover),
  location: str(t?.location),
  coordinates: (t?.lat != null && t?.lng != null) ? { lat: num(t.lat), lng: num(t.lng) } : undefined,
  notes: arr(t?.notes),
  protectionZone: (t?.protection_zone ?? t?.protectionZone) || undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbTree = (t: Tree): Record<string, any> => ({
  id: t.id,
  site_id: t.siteId,
  tree_number: str(t.treeNumber),
  species: str(t.species),
  common_name: str(t.commonName),
  dbh: num(t.dbh),
  height: num(t.height),
  canopy_spread_ns: num(t.canopySpreadNS),
  canopy_spread_ew: num(t.canopySpreadEW),
  tree_health: t.treeHealth || 'Good',
  extension_growth: num(t.extensionGrowth),
  structure: t.structure || 'Good',
  wound_wood_development: t.woundWoodDevelopment || 'Good',
  canopy_cover: num(t.canopyCover),
  location: str(t.location),
  lat: t.coordinates?.lat ?? null,
  lng: t.coordinates?.lng ?? null,
  notes: t.notes ?? [],
  protection_zone: t.protectionZone ?? null,
  updated_at: nowIso(),
});

// ---- Report ---------------------------------------------------------------
// `trees` is passed in separately since it comes from a join against
// report_trees + trees, not from a column on the reports row itself.
export const fromDbReport = (r: any, trees: Tree[] = []): ArboristReport => ({
  id: str(r?.id) || crypto.randomUUID(),
  siteId: str(r?.site_id ?? r?.siteId),
  title: str(r?.title),
  clientName: str(r?.client_name ?? r?.clientName),
  address: str(r?.address),
  inspector: str(r?.inspector),
  date: str(r?.date) || nowIso().split('T')[0],
  trees,
  photos: arr(r?.photos),
  notes: arr(r?.notes),
  recommendations: arr<string>(r?.recommendations),
  status: (r?.status as ArboristReport['status']) || 'draft',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbReport = (r: ArboristReport): Record<string, any> => ({
  id: r.id,
  site_id: r.siteId,
  title: str(r.title),
  client_name: str(r.clientName),
  address: str(r.address),
  inspector: str(r.inspector),
  date: r.date,
  recommendations: r.recommendations ?? [],
  status: r.status || 'draft',
  updated_at: nowIso(),
});

// ---- Job ------------------------------------------------------------------
export const fromDbJob = (j: any): Job => ({
  id: str(j?.id) || crypto.randomUUID(),
  title: str(j?.title),
  clientName: str(j?.client_name ?? j?.clientName),
  location: str(j?.location),
  date: str(j?.date) || nowIso().split('T')[0],
  startTime: str(j?.start_time ?? j?.startTime),
  endTime: str(j?.end_time ?? j?.endTime),
  timeSpent: num(j?.time_spent ?? j?.timeSpent),
  workCompleted: str(j?.work_completed ?? j?.workCompleted),
  workToComplete: str(j?.work_to_complete ?? j?.workToComplete),
  notes: str(j?.notes),
  status: (j?.status as Job['status']) || 'scheduled',
  jobType: (j?.job_type ?? j?.jobType) as Job['jobType'] || 'assessment',
  hourlyRate: num(j?.hourly_rate ?? j?.hourlyRate),
  totalCost: num(j?.total_cost ?? j?.totalCost),
  assignedTo: arr<string>(j?.assigned_to ?? j?.assignedTo),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  siteId: j?.site_id ?? j?.siteId ?? undefined,
});

export const toDbJob = (j: Job): Record<string, any> => ({
  id: j.id,
  site_id: j.siteId ?? null,
  title: str(j.title),
  client_name: str(j.clientName),
  location: str(j.location),
  date: j.date,
  start_time: str(j.startTime),
  end_time: str(j.endTime),
  time_spent: num(j.timeSpent),
  work_completed: str(j.workCompleted),
  work_to_complete: str(j.workToComplete),
  notes: str(j.notes),
  status: j.status || 'scheduled',
  job_type: j.jobType || 'assessment',
  hourly_rate: num(j.hourlyRate),
  total_cost: num(j.totalCost),
  assigned_to: arr<string>(j.assignedTo),
  updated_at: nowIso(),
});

// ---- Site -----------------------------------------------------------------
export const fromDbSite = (s: any): Site => ({
  id: str(s?.id) || crypto.randomUUID(),
  name: str(s?.name),
  description: str(s?.description),
  address: str(s?.address),
  clientName: str(s?.client_name ?? s?.clientName),
  clientPhone: str(s?.client_phone ?? s?.clientPhone),
  clientEmail: str(s?.client_email ?? s?.clientEmail),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbSite = (s: Site): Record<string, any> => ({
  id: s.id,
  name: str(s.name),
  description: str(s.description),
  address: str(s.address),
  client_name: str(s.clientName),
  client_phone: str(s.clientPhone),
  client_email: str(s.clientEmail),
  updated_at: nowIso(),
});

// ---- Quote ----------------------------------------------------------------
export const fromDbQuote = (q: any): Quote => ({
  id: str(q?.id) || crypto.randomUUID(),
  clientName: str(q?.client_name ?? q?.clientName),
  address: str(q?.address),
  mobile: str(q?.mobile),
  siteContact: str(q?.site_contact ?? q?.siteContact),
  scheduledDate: str(q?.scheduled_date ?? q?.scheduledDate) || nowIso().split('T')[0],
  scheduledTime: str(q?.scheduled_time ?? q?.scheduledTime) || '09:00',
  jobDescription: (() => {
    const list = arr<any>(q?.job_description ?? q?.jobDescription);
    return list.length ? list : [{ id: crypto.randomUUID(), description: '' }];
  })(),
  additionalEquipment: str(q?.additional_equipment ?? q?.additionalEquipment),
  accessParking: str(q?.access_parking ?? q?.accessParking),
  status: (q?.status as Quote['status']) || 'new',
  archived: Boolean(q?.archived),
  assignedTo: arr<string>(q?.assigned_to ?? q?.assignedTo),
  followUpDate: q?.follow_up_date ?? q?.followUpDate ?? undefined,
  followUpNote: str(q?.follow_up_note ?? q?.followUpNote),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbQuote = (q: Quote): Record<string, any> => ({
  id: q.id,
  client_name: str(q.clientName),
  address: str(q.address),
  mobile: str(q.mobile),
  site_contact: str(q.siteContact),
  scheduled_date: q.scheduledDate,
  scheduled_time: q.scheduledTime,
  job_description: q.jobDescription ?? [],
  additional_equipment: str(q.additionalEquipment),
  access_parking: str(q.accessParking),
  status: q.status || 'new',
  archived: Boolean(q.archived),
  assigned_to: arr<string>(q.assignedTo),
  follow_up_date: q.followUpDate || null,
  follow_up_note: str(q.followUpNote),
  updated_at: nowIso(),
});

// ---- Daily Risk -----------------------------------------------------------
export const fromDbRisk = (r: any): DailyRisk => ({
  id: str(r?.id) || crypto.randomUUID(),
  siteAddress: str(r?.site_address ?? r?.siteAddress),
  date: str(r?.date) || nowIso().split('T')[0],
  clientName: str(r?.client_name ?? r?.clientName),
  clientMobile: str(r?.client_mobile ?? r?.clientMobile),
  firstAidLocation: str(r?.first_aid_location ?? r?.firstAidLocation),
  nearestHospital: str(r?.nearest_hospital ?? r?.nearestHospital),
  hazards: (r?.hazards && typeof r.hazards === 'object') ? r.hazards : {},
  hazardControls: arr(r?.hazard_controls ?? r?.hazardControls),
  signatures: arr(r?.signatures),
  createdAt: Date.now(),
  updatedAt: Date.now(),
} as DailyRisk);

export const toDbRisk = (r: DailyRisk): Record<string, any> => ({
  id: r.id,
  site_address: str(r.siteAddress),
  date: r.date,
  client_name: str(r.clientName),
  client_mobile: str(r.clientMobile),
  first_aid_location: str(r.firstAidLocation),
  nearest_hospital: str(r.nearestHospital),
  hazards: r.hazards ?? {},
  hazard_controls: r.hazardControls ?? [],
  signatures: r.signatures ?? [],
  updated_at: nowIso(),
});

// ---- Chlorophyll ----------------------------------------------------------
export const fromDbChlorophyll = (c: any): ChlorophyllReading => ({
  id: str(c?.id) || crypto.randomUUID(),
  treeId: str(c?.tree_id ?? c?.treeId) || crypto.randomUUID(),
  treeSpecies: str(c?.tree_species ?? c?.treeSpecies),
  treeLocation: str(c?.tree_location ?? c?.treeLocation),
  treeMaturity: (c?.tree_maturity ?? c?.treeMaturity) as ChlorophyllReading['treeMaturity'] || 'Juvenile',
  date: str(c?.date) || nowIso().split('T')[0],
  chlorophyllLevel: num(c?.chlorophyll_level ?? c?.chlorophyllLevel),
  extensionGrowth: num(c?.extension_growth ?? c?.extensionGrowth),
  notes: str(c?.notes),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbChlorophyll = (c: ChlorophyllReading): Record<string, any> => ({
  id: c.id,
  tree_id: c.treeId,
  tree_species: str(c.treeSpecies),
  tree_location: str(c.treeLocation),
  tree_maturity: c.treeMaturity || 'Juvenile',
  date: c.date,
  chlorophyll_level: num(c.chlorophyllLevel),
  extension_growth: num(c.extensionGrowth),
  notes: str(c.notes),
  updated_at: nowIso(),
});

// ---- Team Certification ----------------------------------------------------
export const fromDbCertification = (c: any): TeamCertification => ({
  id: str(c?.id) || crypto.randomUUID(),
  teamMemberId: str(c?.team_member_id ?? c?.teamMemberId),
  certType: (c?.cert_type ?? c?.certType) || 'Other',
  certLabel: str(c?.cert_label ?? c?.certLabel),
  certNumber: str(c?.cert_number ?? c?.certNumber),
  issuedDate: c?.issued_date ?? c?.issuedDate ?? undefined,
  expiryDate: c?.expiry_date ?? c?.expiryDate ?? undefined,
  notes: str(c?.notes),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbCertification = (c: TeamCertification): Record<string, any> => ({
  id: c.id,
  team_member_id: c.teamMemberId,
  cert_type: c.certType || 'Other',
  cert_label: str(c.certLabel),
  cert_number: str(c.certNumber),
  issued_date: c.issuedDate || null,
  expiry_date: c.expiryDate || null,
  notes: str(c.notes),
  updated_at: nowIso(),
});

// ---- Equipment --------------------------------------------------------------
export const fromDbEquipment = (e: any): Equipment => ({
  id: str(e?.id) || crypto.randomUUID(),
  name: str(e?.name),
  category: (e?.category as Equipment['category']) || 'Other',
  serialNumber: str(e?.serial_number ?? e?.serialNumber),
  purchaseDate: e?.purchase_date ?? e?.purchaseDate ?? undefined,
  lastServiceDate: e?.last_service_date ?? e?.lastServiceDate ?? undefined,
  nextServiceDue: e?.next_service_due ?? e?.nextServiceDue ?? undefined,
  status: (e?.status as Equipment['status']) || 'active',
  notes: str(e?.notes),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbEquipment = (e: Equipment): Record<string, any> => ({
  id: e.id,
  name: str(e.name),
  category: e.category || 'Other',
  serial_number: str(e.serialNumber),
  purchase_date: e.purchaseDate || null,
  last_service_date: e.lastServiceDate || null,
  next_service_due: e.nextServiceDue || null,
  status: e.status || 'active',
  notes: str(e.notes),
  updated_at: nowIso(),
});

// ---- Permit -------------------------------------------------------------
export const fromDbPermit = (p: any): Permit => ({
  id: str(p?.id) || crypto.randomUUID(),
  siteId: str(p?.site_id ?? p?.siteId),
  permitType: (p?.permit_type ?? p?.permitType) || 'Removal',
  authority: str(p?.authority),
  referenceNumber: str(p?.reference_number ?? p?.referenceNumber),
  status: (p?.status as Permit['status']) || 'draft',
  submittedDate: p?.submitted_date ?? p?.submittedDate ?? undefined,
  decisionDate: p?.decision_date ?? p?.decisionDate ?? undefined,
  expiryDate: p?.expiry_date ?? p?.expiryDate ?? undefined,
  conditions: str(p?.conditions),
  notes: str(p?.notes),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbPermit = (p: Permit): Record<string, any> => ({
  id: p.id,
  site_id: p.siteId,
  permit_type: p.permitType || 'Removal',
  authority: str(p.authority),
  reference_number: str(p.referenceNumber),
  status: p.status || 'draft',
  submitted_date: p.submittedDate || null,
  decision_date: p.decisionDate || null,
  expiry_date: p.expiryDate || null,
  conditions: str(p.conditions),
  notes: str(p.notes),
  updated_at: nowIso(),
});

// ---- Contract (recurring maintenance) -------------------------------------
export const fromDbContract = (c: any): Contract => ({
  id: str(c?.id) || crypto.randomUUID(),
  siteId: str(c?.site_id ?? c?.siteId),
  title: str(c?.title),
  frequencyMonths: num(c?.frequency_months ?? c?.frequencyMonths, 12),
  nextDueDate: str(c?.next_due_date ?? c?.nextDueDate) || nowIso().split('T')[0],
  jobType: (c?.job_type ?? c?.jobType) || 'assessment',
  defaultAssignedTo: arr<string>(c?.default_assigned_to ?? c?.defaultAssignedTo),
  notes: str(c?.notes),
  active: c?.active !== false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const toDbContract = (c: Contract): Record<string, any> => ({
  id: c.id,
  site_id: c.siteId,
  title: str(c.title),
  frequency_months: num(c.frequencyMonths, 12),
  next_due_date: c.nextDueDate,
  job_type: c.jobType || 'assessment',
  default_assigned_to: arr<string>(c.defaultAssignedTo),
  notes: str(c.notes),
  active: c.active !== false,
  updated_at: nowIso(),
});
