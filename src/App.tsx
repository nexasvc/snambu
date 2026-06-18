import { useState } from 'react';
import MapContainer from './components/Map/MapContainer';
import Sidebar from './components/Layout/Sidebar';
import MobileOverlay from './components/Layout/MobileOverlay';
import IndustryFilter from './components/Layout/IndustryFilter';
import CompanyDetail from './components/Company/CompanyDetail';
import CompanyLogo from './components/Company/CompanyLogo';
import AboutPage from './components/About/AboutPage';
import { useCompanies } from './hooks/useCompanies';
import { Company } from './types/company';
import { usePageTracking } from './hooks/usePageTracking';
import { motion, AnimatePresence } from 'framer-motion';
import { List, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from './lib/utils';

const CERT_FULL_NAMES: Record<string, string> = {
  '지역우수': '지역우수',
  '지역맞춤': '지역맞춤형 고용촉진장려금 참여기업',
  '청년도약': '청년일자자리도약장려금 참여기업'
};

function App() {
  const { companies, lastUpdated, loading, error, filters } = useCompanies();
  const { selectedCompanyId, setSelectedCompanyId } = filters;
  
  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;
  const [showAbout, setShowAbout] = useState(false);
  
  // GA4 페이지 뷰 추적 활성화
  usePageTracking(companies.length, selectedCompany?.id);
  const [hoveredCompanyId, setHoveredCompanyId] = useState<string | null>(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState<'compact' | 'expanded'>('compact');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSelectCompany = (company: Company | null) => {
    setSelectedCompanyId(company?.id || null);
    if (company) {
      setIsListOpen(false); // Close list when a company is selected
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-gray-400">기업 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <List size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">데이터 로드 실패</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gray-900 text-white font-bold rounded-2xl"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white">
      {/* Desktop Sidebar Container (md:flex) */}
      <div className="hidden md:flex h-full flex-shrink-0 relative z-30">
        <motion.div 
          initial={false}
          animate={{ 
            width: isSidebarCollapsed ? 0 : 400,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full overflow-hidden"
        >
          <div className="w-[400px] h-full">
            <Sidebar 
              companies={companies} 
              lastUpdated={lastUpdated}
              filters={filters} 
              onSelectCompany={handleSelectCompany}
              onHoverCompany={(id) => setHoveredCompanyId(id)}
              selectedCompanyId={selectedCompany?.id}
              hoveredCompanyId={hoveredCompanyId}
              onShowAbout={() => setShowAbout(true)}
            />
          </div>
        </motion.div>
        
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-16 bg-white border border-gray-100 shadow-xl rounded-r-2xl flex items-center justify-center text-gray-400 hover:text-brand-primary transition-colors z-50 group"
          title={isSidebarCollapsed ? "목록 펴기" : "목록 접기"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight size={20} className="group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft size={20} className="group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative h-full">
        {/* Mobile Overlay Filters */}
        <div className="md:hidden">
          <MobileOverlay filters={filters} onShowAbout={() => setShowAbout(true)} />
        </div>

        <MapContainer 
          companies={companies} 
          filters={filters}
          onSelectCompany={handleSelectCompany}
          onHoverCompany={(id) => setHoveredCompanyId(id)}
          selectedCompanyId={selectedCompany?.id}
          hoveredCompanyId={hoveredCompanyId}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Industry Filter Overlay (Top - Desktop Only) */}
        <div className="hidden md:block absolute top-6 left-6 z-20 pointer-events-none">
          <IndustryFilter 
            selectedIndustry={filters.selectedIndustry}
            onSelectIndustry={filters.setSelectedIndustry}
            className="pointer-events-auto"
          />
        </div>

        {/* Mobile Collapsible List Button */}
        <div className="md:hidden absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => {
              setIsListOpen(true);
              setDrawerHeight('compact');
            }}
            className="flex items-center gap-2.5 px-7 py-4 bg-gray-900 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] font-bold text-sm transition-all active:scale-95 hover:bg-black"
          >
            <List size={20} className="text-brand-primary" />
            기업 목록
            <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-[10px] font-black">
              {companies.length}
            </span>
          </button>
        </div>

        {/* Mobile List Drawer */}
        <AnimatePresence mode="wait">
          {isListOpen && (
            <div className="md:hidden fixed inset-0 z-[120] pointer-events-none">
              {/* Semi-transparent backdrop for better focus, but allow tapping through if needed */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsListOpen(false)}
                className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
              />
              
              <motion.div
                key="mobile-drawer"
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.05}
                onDragEnd={(_, info) => {
                  const velocity = info.velocity.y;
                  const offset = info.offset.y;

                  if (offset > 150 || velocity > 400) {
                    setIsListOpen(false);
                  } else if (offset < -100 || velocity < -400) {
                    setDrawerHeight('expanded');
                  } else {
                    setDrawerHeight('compact');
                  }
                }}
                initial={{ y: '100%' }}
                animate={{ 
                  y: drawerHeight === 'compact' ? '50%' : '10%' 
                }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] h-full flex flex-col overflow-hidden shadow-[0_-12px_40px_rgba(0,0,0,0.15)] pointer-events-auto will-change-transform"
              >
                {/* Drawer Handle & Header */}
                <div 
                  className="pt-3 pb-5 flex flex-col items-center cursor-grab active:cursor-grabbing border-b border-gray-50 bg-white"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-5" />
                  <div className="w-full px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-900 text-lg">기업 리스트</h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold">{companies.length}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsListOpen(false);
                      }}
                      className="p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 bg-gray-50/50 pb-32">
                  {companies.map(company => (
                    <button
                      key={company.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCompany(company);
                        setIsListOpen(false);
                      }}
                      className="w-full p-5 rounded-[24px] text-left bg-white border border-gray-100 shadow-sm active:scale-[0.98] active:bg-gray-50 transition-all cursor-pointer group"
                    >
                      <div className="flex gap-4">
                        <CompanyLogo 
                          src={company.logo} 
                          name={company.name} 
                          className="w-14 h-14 rounded-2xl border border-gray-50 shadow-xs"
                          iconSize={24}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                company.region === '강서구' ? "bg-gangseo" :
                                company.region === '양천구' ? "bg-yangcheon" : "bg-yeongdeungpo"
                              )} />
                              <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-tight">{company.industry}</p>
                            </div>
                            {(company.jobs?.saramin || company.jobs?.jobkorea || company.jobs?.work24) && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-500 text-[9px] font-black rounded uppercase">
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                                채용중
                              </span>
                            )}
                          </div>
                          <h3 className="font-black text-gray-900 text-base truncate group-active:text-brand-primary transition-colors">{company.name}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {company.certifications.slice(0, 3).map(cert => (
                              <span 
                                key={cert} 
                                className="text-[10px] font-black text-brand-primary px-2 py-0.5 bg-brand-primary/5 rounded-md"
                              >
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {companies.length === 0 && (
                    <div className="py-24 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <List size={32} className="text-gray-300" />
                      </div>
                      <p className="text-base font-bold text-gray-400">조건에 맞는 기업이 없습니다.</p>
                      <button 
                        onClick={() => filters.resetFilters()}
                        className="mt-4 text-sm font-black text-brand-primary"
                      >
                        필터 초기화
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail View (Modal/Bottom Sheet) */}
      <CompanyDetail 
        company={selectedCompany} 
        onClose={() => setSelectedCompanyId(null)} 
      />

      {/* About Page Overlay */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[200]"
          >
            <AboutPage onBack={() => setShowAbout(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
