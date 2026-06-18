import { useEffect } from 'react';
import { trackPageView, trackViewItemList } from '../lib/ga4';

/**
 * SPA 환경에서 페이지 전환 및 기업 상세 보기 시 페이지 뷰를 추적하는 훅
 * @param companiesCount 로드된 전체 기업 수
 * @param selectedCompanyId 선택된 기업 ID (상태 기반 가상 경로 추적용)
 */
export function usePageTracking(companiesCount: number, selectedCompanyId?: string) {
  useEffect(() => {
    // 1. 기본 경로 추적
    let path = window.location.pathname + window.location.search;

    // 2. 기업 상세 보기가 열린 경우 가상 경로 생성
    if (selectedCompanyId) {
      path = `/company/${selectedCompanyId}`;
    } else if (companiesCount > 0) {
      // 메인 홈 진입 시 Funnel Step 1: view_item_list 전송
      trackViewItemList(companiesCount);
    }

    trackPageView(path);
  }, [companiesCount, selectedCompanyId]);
}

