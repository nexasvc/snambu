import ReactGA from "react-ga4";
import { Company } from "../types/company";

const GA_ID = import.meta.env.VITE_GA_ID;

/**
 * GA4 초기화
 */
export const initGA = () => {
  if (GA_ID) {
    ReactGA.initialize(GA_ID);
    console.log("GA4 Initialized with ID:", GA_ID);
  } else {
    console.warn("GA4 Measurement ID (VITE_GA_ID) is missing.");
  }
};

/**
 * 페이지 뷰 추적
 * @param path 추적할 경로
 */
export const trackPageView = (path: string) => {
  ReactGA.send({ hitType: "pageview", page: path });
};

/**
 * 커스텀 이벤트 추적
 * @param action 이벤트 액션 (예: 'Click')
 * @param category 이벤트 카테고리 (예: 'Conversion')
 * @param label 이벤트 라벨 (예: 'Company Name')
 */
export const trackEvent = (action: string, category: string, label?: string) => {
  ReactGA.event({
    action,
    category,
    label,
  });
};

/**
 * Funnel Step 1: 목록 노출 추적
 */
export const trackViewItemList = (count: number) => {
  ReactGA.event("view_item_list", {
    item_list_name: "Company Map List",
    item_count: count,
  });
};

/**
 * Funnel Step 2: 검색 키워드 입력 추적
 */
export const trackSearch = (term: string) => {
  ReactGA.event("search", {
    search_term: term,
  });
};

/**
 * Funnel Step 2: 필터 적용 추적
 */
export const trackFilter = (type: "region" | "cert" | "industry" | "hiring", value: string) => {
  ReactGA.event("apply_filter", {
    filter_type: type,
    filter_value: value,
  });
};

/**
 * Funnel Step 3: 기업 상세 조회 추적
 */
export const trackViewItem = (company: Company) => {
  ReactGA.event("view_item", {
    item_id: company.id,
    item_name: company.name,
    item_category: company.industry,
    item_region: company.region,
    is_hiring: !!(company.jobs?.saramin || company.jobs?.jobkorea || company.jobs?.work24),
  });
};

/**
 * Funnel Step 4: 전환 클릭 추적 (홈페이지 방문, 채용 공고 이동, 길찾기 등)
 */
export const trackConversion = (
  type: "job_portal" | "website" | "directions",
  target: "saramin" | "jobkorea" | "work24" | "official_web" | "kakao_map" | "naver_map" | "google_map",
  company: Company
) => {
  ReactGA.event("conversion_click", {
    conversion_type: type,
    click_target: target,
    item_id: company.id,
    item_name: company.name,
  });
};

/**
 * 공유 및 복사 액션 추적
 */
export const trackShare = (
  method: "web_share" | "clipboard",
  company: Company
) => {
  ReactGA.event("share_company", {
    share_method: method,
    item_id: company.id,
    item_name: company.name,
  });
};

