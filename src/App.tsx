import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import { signOut } from './utils/auth';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { TeamManagement } from './components/TeamManagement';
import { ReportList } from './components/ReportList';
import { ReportEditor } from './components/ReportEditor';
import { ChlorophyllList } from './components/ChlorophyllList';
import { ChlorophyllEditor } from './components/ChlorophyllEditor';
import { SiteList } from './components/SiteList';
import { SiteEditor } from './components/SiteEditor';
import { SiteDetailScreen } from './components/SiteDetailScreen';
import { JobList } from './components/JobList';
import { JobEditor } from './components/JobEditor';
import { DailyRiskList } from './components/DailyRiskList';
import { DailyRiskEditor } from './components/DailyRiskEditor';
import { QuoteList } from './components/QuoteList';
import { QuoteEditor } from './components/QuoteEditor';
import { RecentlyDeleted } from './components/RecentlyDeleted';
import { PortalView } from './components/ClientPortal';
import { getPendingCount, syncQueue } from './utils/offline';
import {
  Home, Leaf, TreePine, Shield, FileText, Menu, X,
  LogOut, Trash2, Users, LayoutDashboard, RefreshCw, Wifi, WifiOff
} from 'lucide-react';

type AppView = 'dashboard' | 'sites' | 'chlorophyll' | 'jobs' | 'daily-risk' | 'quotes' | 'team';

// Check if we're on a portal URL
const getPortalToken = () => {
  const path = window.location.pathname;
  const match = path.match(/^\/portal\/(.+)$/);
  return match ? match[1] : null;
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [sitesSubView, setSitesSubView] = useState<'sites' | 'registry'>('sites');
  const [siteDetailSubView, setSiteDetailSubView] = useState<'trees' | 'work-done'>('trees');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedReading, setSelectedReading] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRecentlyDeleted, setShowRecentlyDeleted] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [reports, setReports] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  // Check for portal URL first
  const portalToken = getPortalToken();
  if (portalToken) return <PortalView token={portalToken} />;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleOnline = () => { setOnline(true); syncQueue().then(() => setPendingSync(getPendingCount())); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setPendingSync(getPendingCount());

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (session) loadCoreData();
  }, [session]);

  const loadCoreData = async () => {
    const [sitesRes, reportsRes, jobsRes] = await Promise.all([
      supabase.from('sites').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
      supabase.from('reports').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
      supabase.from('jobs').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
    ]);
    if (sitesRes.data) setSites(sitesRes.data);
    if (reportsRes.data) setReports(reportsRes.data);
    if (jobsRes.data) setJobs(jobsRes.data);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <TreePine size={32} color="var(--leaf)" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: '14px' }}>Loading ArborPro...</p>
      </div>
    </div>
  );

  if (!session) return <LoginScreen onLogin={() => {}} />;

  const handleViewChange = (view: AppView | string) => {
    // Handle quick action strings
    if (view === 'new-job') { setCurrentView('jobs'); setSelectedJob({ id: crypto.randomUUID(), title: '', client_name: '', location: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', time_spent: 0, work_completed: '', work_to_complete: '', notes: '', status: 'scheduled', job_type: 'assessment', hourly_rate: 0, total_cost: 0, assigned_to: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); return; }
    if (view === 'new-site') { setCurrentView('sites'); setEditingSite({ id: crypto.randomUUID(), name: '', description: '', address: '', client_name: '', client_phone: '', client_email: '', portal_enabled: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); return; }
    if (view === 'new-quote') { setCurrentView('quotes'); setSelectedQuote({ id: crypto.randomUUID(), client_name: '', address: '', mobile: '', site_contact: '', scheduled_date: new Date().toISOString().split('T')[0], scheduled_time: '09:00', job_description: [{ id: crypto.randomUUID(), description: '' }], additional_equipment: '', access_parking: '', status: 'new', archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); return; }
    if (view === 'new-risk') { setCurrentView('daily-risk'); setSelectedRisk({ id: crypto.randomUUID(), site_address: '', date: new Date().toISOString().split('T')[0], client_name: '', client_mobile: '', first_aid_location: '', nearest_hospital: '', hazards: {}, hazard_controls: [], signatures: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); return; }
    if (view === 'team') { setCurrentView('team'); }
    else setCurrentView(view as AppView);
    setSearchQuery('');
    setSelectedReport(null); setSelectedReading(null); setSelectedSite(null);
    setSelectedJob(null); setSelectedRisk(null); setSelectedQuote(null);
    setEditingSite(null); setIsNewItem(false); setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => { await signOut(); setSession(null); };

  const getTreesForSite = (siteId: string) => reports.filter(r => r.site_id === siteId);
  const getJobsForSite = (siteId: string) => jobs.filter(j => j.site_id === siteId);
  const getTreeCountForSite = (siteId: string) => getTreesForSite(siteId).length;

  const navItems = [
    { view: 'dashboard' as AppView, icon: LayoutDashboard, label: 'Dashboard' },
    { view: 'sites' as AppView, icon: Home, label: 'Sites' },
    { view: 'chlorophyll' as AppView, icon: Leaf, label: 'Chlorophyll' },
    { view: 'jobs' as AppView, icon: TreePine, label: 'Jobs' },
    { view: 'daily-risk' as AppView, icon: Shield, label: 'Risk' },
    { view: 'quotes' as AppView, icon: FileText, label: 'Quotes' },
    { view: 'team' as AppView, icon: Users, label: 'Team' },
  ];

  // Full-screen editor views
  if (selectedReport) return <ReportEditor report={selectedReport} onSave={r => { setSelectedReport(null); loadCoreData(); }} onBack={() => setSelectedReport(null)} />;
  if (selectedReading) return <ChlorophyllEditor reading={selectedReading} onSave={() => { setSelectedReading(null); }} onDelete={() => setSelectedReading(null)} onBack={() => setSelectedReading(null)} isNew={isNewItem} allReadings={[]} />;
  if (editingSite) return <SiteEditor site={editingSite} onSave={s => { setEditingSite(null); setIsNewItem(false); loadCoreData(); if (isNewItem) setSelectedSite(s); }} onDelete={() => { setEditingSite(null); setSelectedSite(null); loadCoreData(); }} onBack={() => { setEditingSite(null); setIsNewItem(false); }} isNew={isNewItem} />;
  if (selectedJob) return <JobEditor job={selectedJob} onSave={() => { setSelectedJob(null); loadCoreData(); }} onDelete={() => { setSelectedJob(null); loadCoreData(); }} onBack={() => setSelectedJob(null)} isNew={isNewItem} />;
  if (selectedRisk) return <DailyRiskEditor risk={selectedRisk} onSave={() => { setSelectedRisk(null); }} onDelete={() => setSelectedRisk(null)} onBack={() => setSelectedRisk(null)} isNew={isNewItem} />;
  if (selectedQuote) return <QuoteEditor quote={selectedQuote} onSave={() => { setSelectedQuote(null); }} onDelete={() => setSelectedQuote(null)} onArchive={() => setSelectedQuote(null)} onBack={() => setSelectedQuote(null)} isNew={isNewItem} />;
  if (selectedSite) return (
    <SiteDetailScreen
      site={selectedSite}
      trees={getTreesForSite(selectedSite.id)}
      jobs={jobs}
      sitesSubView={siteDetailSubView}
      onSitesSubViewChange={setSiteDetailSubView}
      onSelectTree={setSelectedReport}
      onSelectJob={setSelectedJob}
      onCreateTree={() => { const r = { id: crypto.randomUUID(), site_id: selectedSite.id, title: '', client_name: selectedSite.client_name, address: selectedSite.address, inspector: '', date: new Date().toISOString().split('T')[0], tree_data: {}, recommendations: [], status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; setSelectedReport(r); setIsNewItem(true); }}
      onCreateJob={() => { const j = { id: crypto.randomUUID(), site_id: selectedSite.id, title: '', client_name: selectedSite.client_name, location: selectedSite.address, date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', time_spent: 0, work_completed: '', work_to_complete: '', notes: '', status: 'scheduled', job_type: 'assessment', hourly_rate: 0, total_cost: 0, assigned_to: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; setSelectedJob(j); setIsNewItem(true); }}
      onBackToSites={() => setSelectedSite(null)}
      onEditSite={() => { setEditingSite(selectedSite); setIsNewItem(false); }}
      onImportTrees={() => {}}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />
  );

  return (
    <div className="min-h-screen grain" style={{ background: 'var(--forest)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--canopy), var(--forest-light))', border: '1px solid var(--border-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TreePine size={20} color="var(--leaf)" />
              </div>
              <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>ArborPro</span>
            </div>

            <nav className="hidden md:flex" style={{ gap: '4px' }}>
              {navItems.map(({ view, icon: Icon, label }) => (
                <button key={view} onClick={() => handleViewChange(view)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.15s', border: currentView === view ? '1px solid rgba(90,143,90,0.35)' : '1px solid transparent', background: currentView === view ? 'rgba(90,143,90,0.15)' : 'transparent', color: currentView === view ? 'var(--leaf)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                  <Icon size={16} />{label}
                </button>
              ))}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Sync status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: online ? 'rgba(90,143,90,0.1)' : 'rgba(180,60,60,0.1)', border: `1px solid ${online ? 'rgba(90,143,90,0.2)' : 'rgba(180,60,60,0.2)'}`, color: online ? 'var(--leaf)' : '#e88' }}>
                {online ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span className="hidden md:inline">{online ? 'Online' : 'Offline'}</span>
                {pendingSync > 0 && <span style={{ background: 'var(--amber)', color: 'var(--forest)', borderRadius: '999px', padding: '1px 5px', fontSize: '10px' }}>{pendingSync}</span>}
              </div>

              <button onClick={() => setShowRecentlyDeleted(true)} className="hidden md:flex" style={{ alignItems: 'center', padding: '7px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }} title="Recently Deleted">
                <Trash2 size={15} />
              </button>

              {session?.user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--canopy), var(--forest-light))', border: '1px solid var(--border-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--leaf)' }}>{(session.user.email || 'U').charAt(0).toUpperCase()}</span>
                  </div>
                  <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent', cursor: 'pointer' }} title="Logout">
                    <LogOut size={14} />
                  </button>
                </div>
              )}

              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden" style={{ padding: '8px', borderRadius: '8px', color: 'var(--text-secondary)', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer' }}>
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden" style={{ paddingBottom: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navItems.map(({ view, icon: Icon, label }) => (
                  <button key={view} onClick={() => handleViewChange(view)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '500', cursor: 'pointer', border: currentView === view ? '1px solid rgba(90,143,90,0.35)' : '1px solid transparent', background: currentView === view ? 'rgba(90,143,90,0.15)' : 'transparent', color: currentView === view ? 'var(--leaf)' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                    <Icon size={18} />{label}
                  </button>
                ))}
              </nav>
              <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
              <button onClick={() => { setShowRecentlyDeleted(true); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: '1px solid transparent' }}>
                <Trash2 size={18} /> Recently Deleted
              </button>
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: '1px solid transparent' }}>
                <LogOut size={18} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }} className="fade-in">
        {currentView === 'dashboard' && <Dashboard onNavigate={handleViewChange} />}

        {currentView === 'team' && <TeamManagement />}

        {currentView === 'sites' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)' }}>
              {[{ id: 'sites', label: `Site Registry (${sites.length})` }, { id: 'registry', label: `Tree Registry (${reports.filter(r => !r.site_id).length})`, icon: true }].map(({ id, label, icon }) => (
                <button key={id} onClick={() => setSitesSubView(id as any)} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: sitesSubView === id ? '2px solid var(--moss)' : '2px solid transparent', color: sitesSubView === id ? 'var(--leaf)' : 'var(--text-muted)', marginBottom: '-1px', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
            {sitesSubView === 'sites'
              ? <SiteList sites={sites} onSelectSite={setSelectedSite} onCreateSite={() => { setEditingSite({ id: crypto.randomUUID(), name: '', description: '', address: '', client_name: '', client_phone: '', client_email: '', portal_enabled: false, client_portal_token: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); }} searchQuery={searchQuery} onSearchChange={setSearchQuery} getTreeCountForSite={getTreeCountForSite} />
              : <ReportList reports={reports.filter(r => !r.site_id)} onSelectReport={setSelectedReport} onCreateReport={() => { setSelectedReport({ id: crypto.randomUUID(), title: '', client_name: '', address: '', inspector: '', date: new Date().toISOString().split('T')[0], tree_data: {}, recommendations: [], status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); }} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            }
          </div>
        )}

        {currentView === 'chlorophyll' && <ChlorophyllList readings={[]} onSelectReading={setSelectedReading} onCreateReading={() => { setSelectedReading({ id: crypto.randomUUID(), tree_id: crypto.randomUUID(), tree_species: '', tree_location: '', tree_maturity: 'Juvenile', date: new Date().toISOString().split('T')[0], chlorophyll_level: 0, extension_growth: 0, notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); }} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}

        {currentView === 'jobs' && <JobList jobs={jobs} onSelectJob={setSelectedJob} onCreateJob={() => { setSelectedJob({ id: crypto.randomUUID(), title: '', client_name: '', location: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', time_spent: 0, work_completed: '', work_to_complete: '', notes: '', status: 'scheduled', job_type: 'assessment', hourly_rate: 0, total_cost: 0, assigned_to: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); }} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}

        {currentView === 'daily-risk' && <DailyRiskList risks={[]} onSelectRisk={setSelectedRisk} onCreateRisk={() => { setSelectedRisk({ id: crypto.randomUUID(), site_address: '', date: new Date().toISOString().split('T')[0], client_name: '', client_mobile: '', first_aid_location: '', nearest_hospital: '', hazards: {workingAtHeights:false,unstableGround:false,powerlines:false,undergroundServices:false,siteWorkers:false,pedestrians:false,traffic:false,noise:false,chainsaws:false,loweringDevices:false,ewp:false,crane:false,deadBranches:false,brokenBranches:false,deadTree:false,barkInclusions:false,treeLean:false,fallenTree:false,wildlife:false}, hazard_controls: [], signatures: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); }} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}

        {currentView === 'quotes' && <QuoteList quotes={[]} onSelectQuote={setSelectedQuote} onCreateQuote={() => { setSelectedQuote({ id: crypto.randomUUID(), client_name: '', address: '', mobile: '', site_contact: '', scheduled_date: new Date().toISOString().split('T')[0], scheduled_time: '09:00', job_description: [{ id: crypto.randomUUID(), description: '' }], additional_equipment: '', access_parking: '', status: 'new', archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); setIsNewItem(true); }} onImportQuotes={() => {}} onUpdateQuoteStatus={() => {}} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
      </main>

      <RecentlyDeleted isOpen={showRecentlyDeleted} onClose={() => setShowRecentlyDeleted(false)} onRecover={() => { loadCoreData(); setShowRecentlyDeleted(false); }} />
    </div>
  );
}

export default App;
