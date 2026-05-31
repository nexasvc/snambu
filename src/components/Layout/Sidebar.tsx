import { Search, Filter, MapPin, Building2, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { Company, Region, Certification } from '../../types/company';
import { cn } from '../../lib/utils';
import CompanyLogo from '../Company/CompanyLogo';

interface SidebarProps {
  companies: Company[];
  lastUpdated?: string | null;
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
  onSelectCompany: (company: Company | null) => void;
  onHoverCompany: (id: string | null) => void;
  selectedCompanyId?: string;
  hoveredCompanyId?: string | null;
  onShowAbout: () => void;
}

const REGIONS: Region[] = ['강서구', '양천구', '영등포구'];
const REGION_SELECT_COLORS: Record<Region, string> = {
  '강서구': 'bg-gangseo border-gangseo shadow-gangseo/20',
  '양천구': 'bg-yangcheon border-yangcheon shadow-yangcheon/20',
  '영등포구': 'bg-yeongdeungpo border-yeongdeungpo shadow-yeongdeungpo/20'
};
const CERTS: Certification[] = ['지역우수', '지역맞춤', '청년도약'];
const CERT_FULL_NAMES: Record<string, string> = {
  '지역우수': '지역우수',
  '지역맞춤': '지역맞춤형 고용촉진장려금 참여기업',
  '청년도약': '청년일자자리도약장려금 참여기업'
};

export default function Sidebar({ 
  companies, 
  lastUpdated,
  filters, 
  onSelectCompany, 
  onHoverCompany,
  selectedCompanyId,
  hoveredCompanyId,
  onShowAbout
}: SidebarProps) {
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

  const handleMouseEnter = (id: string) => {
    if (window.matchMedia('(hover: hover)').matches) {
      onHoverCompany(id);
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      onHoverCompany(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-gray-100 shadow-xl z-10">
      {/* Search & Filters */}
      <div className="p-5 border-b border-gray-50 space-y-3">
        <div className="flex flex-col gap-3">
          <div className="px-1">
            <img 
              src={`${import.meta.env.BASE_URL}assets/common/seoulnambu_plus_web_optimized.webp`} 
              alt="서울남부 고용복지+센터" 
              className="h-6 w-auto object-contain" 
            />
          </div>
          <div className="bg-brand-primary border border-brand-primary shadow-md shadow-brand-primary/20 rounded-2xl p-3.5">
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <MapPin className="text-white" fill="white" fillOpacity={0.2} size={18} />
              기업성장 브릿지 Map
            </h1>
          </div>
          <button 
            onClick={onShowAbout}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <Building2 className="text-brand-primary" size={16} />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-brand-primary uppercase tracking-tighter">Information</p>
                <p className="text-xs font-bold text-gray-900">서비스 소개</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>
          
          {(filters.searchTerm || filters.selectedRegions.length > 0 || filters.selectedCerts.length > 0 || filters.onlyHiring) && (
            <div className="flex justify-end -mb-1">
              <button 
                onClick={filters.resetFilters}
                className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-brand-primary transition-colors group"
              >
                <RotateCcw size={10} className="group-active:rotate-[-180deg] transition-transform duration-500" />
                필터 초기화
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="기업명, 산업군 검색..."
              value={filters.searchTerm}
              onChange={(e) => filters.setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none"
            />
          </div>

          <button
            onClick={() => filters.setOnlyHiring(!filters.onlyHiring)}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-2xl border transition-all",
              filters.onlyHiring 
                ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-8 h-4 rounded-full relative transition-colors",
                filters.onlyHiring ? "bg-blue-500" : "bg-gray-200"
              )}>
                <div className={cn(
                  "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                  filters.onlyHiring ? "translate-x-4" : "translate-x-0"
                )} />
              </div>
              <span className="text-xs font-bold">지금 채용 중인 기업만 보기</span>
            </div>
            {filters.onlyHiring && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">지역별 필터</p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(region => (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                  filters.selectedRegions.includes(region)
                    ? cn(REGION_SELECT_COLORS[region], "text-white shadow-md")
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">기업 유형</p>
          <div className="flex flex-wrap gap-2">
            {CERTS.map(cert => (
              <button
                key={cert}
                onClick={() => toggleCert(cert)}
                title={CERT_FULL_NAMES[cert]}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                  filters.selectedCerts.includes(cert)
                    ? "bg-brand-secondary border-brand-secondary text-white shadow-md shadow-brand-secondary/20"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                {cert}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-3">
          <div className="px-2 flex justify-between items-center">
            <p className="text-xs font-bold text-gray-400">총 {companies.length}개 기업</p>
          </div>
          
          {companies.map(company => (
            <button
              key={company.id}
              onClick={() => onSelectCompany(company)}
              onMouseEnter={() => handleMouseEnter(company.id)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "w-full p-4 rounded-2xl text-left transition-all border group",
                selectedCompanyId === company.id
                  ? "bg-brand-primary/5 border-brand-primary/20 ring-1 ring-brand-primary/10"
                  : hoveredCompanyId === company.id
                    ? "bg-gray-50 border-gray-200 shadow-sm"
                    : "bg-white border-transparent hover:bg-gray-50"
              )}
            >
              <div className="flex gap-4">
                <CompanyLogo 
                  src={company.logo} 
                  name={company.name} 
                  className="w-12 h-12 rounded-xl border border-gray-100"
                  iconSize={20}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        company.region === '강서구' ? "bg-gangseo" :
                        company.region === '양천구' ? "bg-yangcheon" : "bg-yeongdeungpo"
                      )} />
                      <p className="text-[10px] font-bold text-gray-400">{company.industry}</p>
                    </div>
                    {(company.jobs?.saramin || company.jobs?.jobkorea || company.jobs?.work24) && (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase tracking-tighter flex items-center gap-0.5">
                        <span className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                        채용중
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 truncate group-hover:text-brand-primary transition-colors">
                    {company.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {company.certifications.slice(0, 3).map(cert => (
                      <span 
                        key={cert} 
                        title={CERT_FULL_NAMES[cert]}
                        className="text-[9px] font-black text-brand-primary px-1.5 py-0.5 bg-brand-primary/5 rounded cursor-help"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 self-center group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
          
          {companies.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-300">
                <Building2 size={32} />
              </div>
              <p className="text-sm text-gray-400 font-medium">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="p-4 border-t border-gray-50 bg-gray-50/50">
          <p className="text-[10px] text-center font-bold text-gray-300 uppercase tracking-widest">
            Last Updated: {new Date(lastUpdated).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}
    </div>
  );
}
