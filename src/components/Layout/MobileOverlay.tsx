import { Search, Filter, X, Check, Info } from 'lucide-react';
import { Region, Certification } from '../../types/company';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IndustryFilter from './IndustryFilter';

interface MobileOverlayProps {
  filters: {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    selectedRegions: Region[];
    setSelectedRegions: (regions: Region[]) => void;
    selectedCerts: Certification[];
    setSelectedCerts: (certs: Certification[]) => void;
    selectedIndustry: string | null;
    setSelectedIndustry: (id: string | null) => void;
    onlyHiring: boolean;
    setOnlyHiring: (val: boolean) => void;
    resetFilters: () => void;
  };
  onShowAbout: () => void;
}

const REGIONS: Region[] = ['강서구', '양천구', '영등포구'];
const REGION_SELECT_COLORS: Record<Region, string> = {
  '강서구': 'bg-gangseo border-gangseo',
  '양천구': 'bg-yangcheon border-yangcheon',
  '영등포구': 'bg-yeongdeungpo border-yeongdeungpo'
};
const CERTS: Certification[] = ['지역우수', '지역맞춤', '청년도약'];

export default function MobileOverlay({ filters, onShowAbout }: MobileOverlayProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleRegion = (region: Region) => {
    if (filters.selectedRegions.includes(region)) {
      filters.setSelectedRegions(filters.selectedRegions.filter(r => r !== region));
    } else {
      filters.setSelectedRegions([...filters.selectedRegions, region]);
    }
  };

  const toggleCert = (cert: Certification) => {
    if (filters.selectedCerts.includes(cert)) {
      filters.setSelectedCerts(filters.selectedCerts.filter(c => c !== cert));
    } else {
      filters.setSelectedCerts([...filters.selectedCerts, cert]);
    }
  };

  const activeFilterCount = filters.selectedCerts.length + (filters.onlyHiring ? 1 : 0) + (filters.selectedIndustry ? 1 : 0);

  return (
    <>
      <div className="absolute top-4 left-4 right-4 z-20 space-y-3 pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto">
          <div className="px-1">
            <img 
              src={`${import.meta.env.BASE_URL}assets/common/seoulnambu_plus_web_optimized.webp`} 
              alt="서울남부 고용복지+센터" 
              className="h-6 w-auto object-contain" 
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="기업성장 브릿지 Map"
                value={filters.searchTerm}
                onChange={(e) => filters.setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl shadow-xl text-sm focus:outline-none border-none"
              />
            </div>
          <button 
            onClick={onShowAbout}
            className="p-3.5 bg-brand-primary text-white rounded-2xl shadow-xl transition-transform active:scale-95 pointer-events-auto"
          >
            <Info size={20} />
          </button>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className={cn(
              "p-3.5 bg-white rounded-2xl shadow-xl transition-colors relative pointer-events-auto",
              activeFilterCount > 0 ? "text-brand-primary" : "text-gray-400"
            )}
          >
            <Filter size={20} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pointer-events-auto">
          {REGIONS.map(region => (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              className={cn(
                "px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap shadow-lg transition-all border",
                filters.selectedRegions.includes(region)
                  ? cn(REGION_SELECT_COLORS[region], "text-white")
                  : "bg-white border-transparent text-gray-600"
              )}
            >
              {region}
            </button>
          ))}
          {filters.onlyHiring && (
            <button
              onClick={() => filters.setOnlyHiring(false)}
              className="px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap shadow-lg transition-all bg-blue-500 text-white border-blue-500 flex items-center gap-1.5"
            >
              채용중 <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
            </button>
          )}
        </div>

        <div className="pointer-events-auto">
          <IndustryFilter 
            selectedIndustry={filters.selectedIndustry}
            onSelectIndustry={filters.setSelectedIndustry}
          />
        </div>
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {isFilterOpen && (
          <div className="fixed inset-0 z-[110] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 pb-10 space-y-6 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">상세 필터</h3>
                  {(filters.selectedCerts.length > 0 || filters.onlyHiring) && (
                    <button 
                      onClick={filters.resetFilters}
                      className="text-[11px] font-bold text-brand-primary"
                    >
                      초기화
                    </button>
                  )}
                </div>
                <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-900">산업군</p>
                <IndustryFilter
                  selectedIndustry={filters.selectedIndustry}
                  onSelectIndustry={filters.setSelectedIndustry}
                />
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-900">기업 유형 및 상태</p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => filters.setOnlyHiring(!filters.onlyHiring)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all",
                      filters.onlyHiring
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-gray-100 text-gray-600"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold">지금 채용 중인 기업</span>
                      {filters.onlyHiring && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
                    </div>
                    {filters.onlyHiring && <Check size={18} />}
                  </button>
                  {CERTS.map((cert: Certification) => {
                    const isSelected = filters.selectedCerts.includes(cert);
                    return (
                      <button
                        key={cert}
                        onClick={() => toggleCert(cert)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all",
                          isSelected
                            ? "bg-brand-secondary/5 border-brand-secondary text-brand-secondary"
                            : "bg-white border-gray-100 text-gray-600"
                        )}
                      >
                        <span className="font-bold">{cert}</span>
                        {isSelected && <Check size={18} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={() => setIsFilterOpen(false)}
                className="w-full py-4 bg-brand-primary text-white font-bold rounded-2xl shadow-lg shadow-brand-primary/20 transition-transform active:scale-95"
              >
                필터 적용하기
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
