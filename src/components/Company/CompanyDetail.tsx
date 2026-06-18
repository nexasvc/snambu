import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  X,
  MapPin,
  Building2,
  Users,
  Trophy,
  Heart,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Share2,
  Navigation,
  Copy,
  Briefcase,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Company } from '../../types/company';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';
import CompanyLogo from './CompanyLogo';
import { trackEvent, trackViewItem, trackConversion, trackShare } from '../../lib/ga4';

interface CompanyDetailProps {
  company: Company | null;
  onClose: () => void;
}

const CERT_FULL_NAMES: Record<string, string> = {
  '지역우수': '지역우수',
  '지역맞춤': '지역맞춤형 고용촉진장려금 참여기업',
  '청년도약': '청년일자자리도약장려금 참여기업'
};

export default function CompanyDetail({ company, onClose }: CompanyDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleWebsiteVisit = () => {
    if (company) {
      trackConversion("website", "official_web", company);
    }
  };

  const handleShare = async () => {
    if (!company) return;

    const shareData = {
      title: `${company.name} | 기업성장 브릿지 Map`,
      text: `${company.name} 기업 정보를 확인해보세요.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        trackShare("web_share", company);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('링크가 클립보드에 복사되었습니다.');
        trackShare("clipboard", company);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const openDirections = (type: 'google' | 'kakao' | 'naver') => {
    if (!company) return;
    
    const targetMap = type === 'google' ? 'google_map' : type === 'kakao' ? 'kakao_map' : 'naver_map';
    trackConversion("directions", targetMap, company);

    const encodedAddress = encodeURIComponent(company.address);
    const encodedName = encodeURIComponent(company.name);

    let url = '';
    switch (type) {
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        break;
      case 'kakao':
        url = `https://map.kakao.com/link/to/${encodedName},${company.lat},${company.lng}`;
        break;
      case 'naver':
        if (company.lat && company.lng) {
          url = `https://map.naver.com/v5/directions/-/${company.lng},${company.lat},${encodedName}/-?c=15,0,0,0,dh`;
        } else {
          url = `https://map.naver.com/v5/search/${encodedAddress}`;
        }
        break;
    }
    window.open(url, '_blank');
  };

  useEffect(() => {
    setCurrentImageIndex(0);
    setImageErrors({});
    if (company) {
      trackViewItem(company);
    }
  }, [company?.id]);

  const getImagePath = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;

    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    let cleanPath = path.trim();

    if (!cleanPath.includes('/') && !cleanPath.startsWith('http')) {
      cleanPath = `assets/companies/${cleanPath}`;
    }

    cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

    if (base && cleanPath.startsWith(base)) return cleanPath;

    return `${base}${cleanPath}`;
  };

  const getAbsoluteImageUrl = (path: string) => {
    const relative = getImagePath(path);
    if (!relative) return '';
    if (relative.startsWith('http')) return relative;
    return `${window.location.origin}${relative}`;
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!company?.images) return;
    setCurrentImageIndex((prev) => (prev + 1) % company.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!company?.images) return;
    setCurrentImageIndex((prev) => (prev - 1 + company.images.length) % company.images.length);
  };

  const hasImages = company?.images && company.images.length > 0;
  const isCurrentImageBroken = imageErrors[currentImageIndex];

  return (
    <AnimatePresence>
      {company && (
        <div className="fixed inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[400px] z-[150] flex items-end justify-center lg:items-stretch lg:p-0 pointer-events-none">
          <Helmet>
            <title>{`${company.name} | 기업성장 브릿지 Map`}</title>
            <meta name="description" content={`${company.name}은(는) ${company.region}에 위치한 ${company.industry} 분야의 유망 기업입니다. ${company.description}`} />
            <meta property="og:title" content={`${company.name} - 기업성장 브릿지 Map`} />
            <meta property="og:description" content={`${company.name}의 기업 정보, 복지, 채용 정보를 확인하세요.`} />
            <meta property="og:image" content={getAbsoluteImageUrl(company.logo)} />
            
            {/* JSON-LD 구조화된 데이터 추가 */}
            <script type="application/ld+json">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": company.name,
                "url": company.website || window.location.href,
                "logo": getAbsoluteImageUrl(company.logo),
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": company.address,
                  "addressLocality": company.region,
                  "addressRegion": "서울특별시",
                  "addressCountry": "KR"
                },
                "description": company.description,
                "numberOfEmployees": {
                  "@type": "QuantitativeValue",
                  "value": company.employees
                }
              })}
            </script>
          </Helmet>
          {/* Backdrop - Now non-blocking on mobile to allow map interaction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/10 lg:hidden pointer-events-none"
          />

          <motion.div
            key={company.id}
            drag={window.innerWidth < 1024 ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.05}
            onDragEnd={(_, info) => {
              if (window.innerWidth >= 1024) return;
              const windowHeight = window.innerHeight;
              const draggedDistance = info.offset.y;
              const velocity = info.velocity.y;

              // Improved close condition for high-res mobiles
              if (draggedDistance > windowHeight * 0.4 || velocity > 500) {
                onClose();
              }
            }}
            initial={window.innerWidth < 1024 ? { y: '100%' } : { x: '100%', opacity: 0 }}
            animate={window.innerWidth < 1024 ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={window.innerWidth < 1024 ? { y: '100%' } : { x: '100%', opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: 32, 
              stiffness: 300,
              mass: 0.8
            }}
            className="relative w-full lg:w-full bg-white rounded-t-[40px] lg:rounded-none overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.2)] lg:shadow-2xl max-h-[96vh] lg:max-h-none h-[88vh] lg:h-full flex flex-col pointer-events-auto border-l border-gray-100 will-change-transform"
          >
            <div className="lg:hidden w-full py-4 flex flex-col items-center cursor-grab active:cursor-grabbing flex-shrink-0 z-50">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-gray-100/80 hover:bg-gray-200 backdrop-blur-md rounded-full text-gray-500 z-40 transition-colors border border-white/20 shadow-sm"
            >
              <X size={20} />
            </button>

            {/* Toast */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-gray-900 text-white text-sm font-bold px-5 py-3 rounded-full shadow-2xl whitespace-nowrap pointer-events-none"
                >
                  <Check size={14} className="text-green-400" />
                  {toastMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative h-[144px] bg-gray-100 overflow-hidden group flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10 pointer-events-none" />
              <AnimatePresence mode="wait">
                {hasImages && !isCurrentImageBroken ? (
                  <motion.img 
                    key={currentImageIndex}
                    src={getImagePath(company.images[currentImageIndex])} 
                    alt={`${company.name} image ${currentImageIndex + 1}`} 
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                      const swipeThreshold = 50;
                      if (info.offset.x < -swipeThreshold) {
                        nextImage({ stopPropagation: () => {} } as React.MouseEvent);
                      } else if (info.offset.x > swipeThreshold) {
                        prevImage({ stopPropagation: () => {} } as React.MouseEvent);
                      }
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-grab active:cursor-grabbing"
                    onError={() => handleImageError(currentImageIndex)}
                  />
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50 text-gray-300 relative"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    <ImageIcon size={40} strokeWidth={1.5} />
                    <span className="text-xs font-medium">
                      {hasImages ? '이미지를 불러올 수 없습니다' : '등록된 이미지가 없습니다'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {company.images && company.images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/10 hover:bg-black/30 backdrop-blur-md rounded-full text-white z-20 transition-all opacity-0 group-hover:opacity-100 border border-white/10">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/10 hover:bg-black/30 backdrop-blur-md rounded-full text-white z-20 transition-all opacity-0 group-hover:opacity-100 border border-white/10">
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 p-1.5 bg-black/10 backdrop-blur-md rounded-full border border-white/5">
                    {company.images.map((_, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/40'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-7 space-y-8">
              <div className="flex items-start gap-4">
                <CompanyLogo 
                  src={company.logo} 
                  name={company.name} 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-gray-100 shadow-sm"
                  iconSize={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {company.certifications.map(cert => (
                      <span 
                        key={cert} 
                        title={CERT_FULL_NAMES[cert]}
                        className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[9px] font-black rounded-md uppercase tracking-widest cursor-help"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 leading-tight truncate">
                    {company.name}
                  </h2>
                  <div className="flex flex-col gap-1 text-sm text-gray-500 mt-1 font-medium">
                    <div className="flex flex-col gap-1.5 mt-1.5">
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <MapPin size={14} className="text-brand-primary flex-shrink-0" />
                        <span>{company.region}</span>
                        <span className="text-gray-200">|</span>
                        <span>{company.industry}</span>
                      </div>
                      {company.industryDetail && (
                        <div className="inline-flex items-center px-2.5 py-1.5 bg-gray-50 text-gray-500 text-[11px] font-bold rounded-lg border border-gray-100 w-fit max-w-full italic leading-tight">
                          {company.industryDetail}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 group/address">
                      <div className="text-xs text-gray-400 mt-0.5 break-all">
                        {company.address}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(company.address);
                          showToast('주소가 복사되었습니다.');
                          trackEvent("Copy_Address", "Engagement", company.name);
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
                        title="주소 복사"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-brand-primary rounded-full" />
                  <h3 className="text-base font-black text-gray-900">기업 소개</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50 whitespace-pre-wrap">
                  {company.description}
                </p>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-3 shadow-sm hover:border-brand-primary/20 transition-colors">
                  <div className="p-2.5 bg-blue-50 rounded-xl"><Users size={18} className="text-blue-600" /></div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">구성원</p>
                    <p className="text-sm font-black text-gray-900">{company.employees}명</p>
                  </div>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-3 shadow-sm hover:border-brand-primary/20 transition-colors">
                  <div className="p-2.5 bg-orange-50 rounded-xl"><Trophy size={18} className="text-orange-600" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">수상 및 인증</p>
                    <p className="text-sm font-black text-gray-900 truncate">
                      {(company.awardAchievements?.length || 0) + (company.governmentCertifications?.length || 0)}건 보유
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-50 text-gray-700 font-bold rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all active:scale-95"
                >
                  <Share2 size={18} />
                  <span>공유하기</span>
                </button>
                <div className="relative group flex-1">
                  <button 
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white font-bold rounded-2xl shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95"
                  >
                    <Navigation size={18} />
                    <span>길찾기</span>
                  </button>
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 hidden group-focus-within:block group-hover:block z-50">
                    <button onClick={() => openDirections('kakao')} className="w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-gray-50 flex items-center justify-between">
                      카카오맵 <ExternalLink size={12} className="text-gray-300" />
                    </button>
                    <button onClick={() => openDirections('naver')} className="w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-gray-50 flex items-center justify-between">
                      네이버 지도 <ExternalLink size={12} className="text-gray-300" />
                    </button>
                    <button onClick={() => openDirections('google')} className="w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-gray-50 flex items-center justify-between border-t border-gray-50">
                      Google Maps <ExternalLink size={12} className="text-gray-300" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Government Certifications Section */}
              <section className="space-y-4">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-500" />
                  정부 인증
                </h3>
                <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50">
                  {company.governmentCertifications && company.governmentCertifications.length > 0 ? (
                    <div className="space-y-1.5">
                      {company.governmentCertifications.map((cert, idx) => (
                        <p key={idx} className="text-[13px] text-gray-600 font-medium leading-relaxed">
                          {cert}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-2">등록된 인증 정보가 없습니다.</p>
                  )}
                </div>
              </section>

              {/* Award Achievements Section */}
              <section className="space-y-4">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Trophy size={18} className="text-orange-500" />
                  수상 내역
                </h3>
                <div className="space-y-2">
                  {company.awardAchievements && company.awardAchievements.length > 0 ? (
                    company.awardAchievements.map((award, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-orange-50/30 border border-orange-100/50 rounded-2xl transition-all hover:bg-orange-50/50">
                        <div className="mt-0.5 p-1 bg-white rounded-lg shadow-sm">
                          <Trophy size={14} className="text-orange-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-800 leading-tight">
                          {award}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50">
                      <p className="text-xs text-gray-400 italic text-center py-2">등록된 수상 정보가 없습니다.</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Heart size={18} className="text-pink-500 fill-pink-500" />
                  복지 및 혜택
                </h3>
                <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50 space-y-3">
                  {company.benefits && (
                    <p className="text-[13px] text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                      {company.benefits}
                    </p>
                  )}
                  
                  {company.workEnvironment && company.workEnvironment.length > 0 && (
                    <p className="text-[13px] text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                      {Array.isArray(company.workEnvironment) 
                        ? company.workEnvironment.join(', ') 
                        : company.workEnvironment}
                    </p>
                  )}

                  {!company.benefits && (!company.workEnvironment || company.workEnvironment.length === 0) && (
                    <p className="text-xs text-gray-400 italic text-center py-2">등록된 복지 정보가 없습니다.</p>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Briefcase size={18} className="text-blue-500" />
                  채용 정보
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <a 
                    href={`https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do?srcKeyword=${encodeURIComponent(company.name)}&regionParam=11470,11500,11560&region=11470,11500,11560`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => trackConversion("job_portal", "work24", company)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all font-bold text-[10px]",
                      company.jobs?.work24 
                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm ring-1 ring-blue-100" 
                        : "bg-gray-50 border-gray-100 text-gray-400 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                    )}
                  >
                    <span className="relative">
                      고용24
                      {company.jobs?.work24 && <span className="absolute -top-1 -right-2 w-1 h-1 bg-blue-500 rounded-full animate-pulse" />}
                    </span>
                  </a>
                  <a 
                    href={`https://www.saramin.co.kr/zf_user/search/recruit?searchword=${encodeURIComponent(company.name)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => trackConversion("job_portal", "saramin", company)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all font-bold text-[10px]",
                      company.jobs?.saramin 
                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm ring-1 ring-blue-100" 
                        : "bg-gray-50 border-gray-100 text-gray-400 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                    )}
                  >
                    <span className="relative">
                      사람인
                      {company.jobs?.saramin && <span className="absolute -top-1 -right-2 w-1 h-1 bg-blue-500 rounded-full animate-pulse" />}
                    </span>
                  </a>
                  <a 
                    href={`https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(company.name)}&tabType=recruit`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => trackConversion("job_portal", "jobkorea", company)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all font-bold text-[10px]",
                      company.jobs?.jobkorea 
                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm ring-1 ring-blue-100" 
                        : "bg-gray-50 border-gray-100 text-gray-400 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                    )}
                  >
                    <span className="relative">
                      잡코리아
                      {company.jobs?.jobkorea && <span className="absolute -top-1 -right-2 w-1 h-1 bg-blue-500 rounded-full animate-pulse" />}
                    </span>
                  </a>
                </div>
                {company.jobs?.lastChecked && (
                  <p className="text-[9px] text-gray-300 text-right font-medium">
                    데이터 기준: {new Date(company.jobs.lastChecked).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </section>
            </div>

            <div className="p-6 pt-2 border-t border-gray-100 bg-white">
              <a 
                href={company.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={handleWebsiteVisit}
                className="flex items-center justify-center gap-3 w-full py-4 bg-brand-primary text-white font-black rounded-2xl shadow-xl shadow-brand-primary/20 hover:bg-blue-600 transition-all active:scale-[0.98]"
              >
                <Globe size={18} />
                공식 웹사이트 방문
                <ExternalLink size={16} />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
