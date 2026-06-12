import { useState, useEffect, useMemo, useRef } from 'react';
import { Company, Region, Certification } from '../types/company';
import Fuse from 'fuse.js';
import { trackEvent } from '../lib/ga4';

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [selectedCerts, setSelectedCerts] = useState<Certification[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [onlyHiring, setOnlyHiring] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Initialize filters from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const regions = params.get('regions')?.split(',').filter(Boolean) as Region[];
    const certs = params.get('certs')?.split(',').filter(Boolean) as Certification[];
    const industry = params.get('industry');
    const hiring = params.get('hiring') === 'true';
    const id = params.get('id');

    if (q) setSearchTerm(q);
    if (regions?.length) setSelectedRegions(regions);
    if (certs?.length) setSelectedCerts(certs);
    if (industry) setSelectedIndustry(industry);
    if (hiring) setOnlyHiring(true);
    if (id) setSelectedCompanyId(id);
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedRegions.length > 0) params.set('regions', selectedRegions.join(','));
    if (selectedCerts.length > 0) params.set('certs', selectedCerts.join(','));
    if (selectedIndustry) params.set('industry', selectedIndustry);
    if (onlyHiring) params.set('hiring', 'true');
    if (selectedCompanyId) params.set('id', selectedCompanyId);

    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
  }, [searchTerm, selectedRegions, selectedCerts, selectedIndustry, onlyHiring, selectedCompanyId]);

  // Tracking search term with debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        trackEvent('Search', 'Engagement', searchTerm);
      }, 1000);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm]);

  // Tracking filter changes
  useEffect(() => {
    if (selectedRegions.length > 0) {
      trackEvent('Filter_Region', 'Engagement', selectedRegions.join(','));
    }
  }, [selectedRegions]);

  useEffect(() => {
    if (selectedCerts.length > 0) {
      trackEvent('Filter_Cert', 'Engagement', selectedCerts.join(','));
    }
  }, [selectedCerts]);

  useEffect(() => {
    if (selectedIndustry) {
      trackEvent('Filter_Industry', 'Engagement', selectedIndustry);
    }
  }, [selectedIndustry]);

  useEffect(() => {
    if (onlyHiring) {
      trackEvent('Filter_Hiring', 'Engagement', 'true');
    }
  }, [onlyHiring]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const base = import.meta.env.BASE_URL.replace(/\/$/, '');
        const url = `${base}/data/companies.json?t=${Date.now()}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch companies: ${response.status} ${response.statusText}`);
        const data = await response.json();
        if (!data || !data.companies) throw new Error('Invalid data format: companies field missing');
        
        // 초기 로드 시 랜덤하게 셔플하여 노출 균등화
        const shuffled = [...data.companies].sort(() => Math.random() - 0.5);
        setCompanies(shuffled);
        setLastUpdated(data.lastUpdated || null);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // Initialize Fuse.js
  const fuse = useMemo(() => {
    return new Fuse(companies, {
      keys: [
        { name: 'name', weight: 1.0 },
        { name: 'industry', weight: 0.7 },
        { name: 'description', weight: 0.4 }
      ],
      threshold: 0.3, // Lower threshold means more strict matching
      ignoreLocation: true,
      useExtendedSearch: true
    });
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    // 1. Basic Filters (Region, Certs, Industry Selection, Visibility, Hiring)
    let filtered = companies.filter((company) => {
      if (company.map_display_status !== 'VISIBLE') return false;

      const matchesRegion = 
        selectedRegions.length === 0 || selectedRegions.includes(company.region);
      
      const matchesCert = 
        selectedCerts.length === 0 || 
        company.certifications.some(cert => selectedCerts.includes(cert));

      const matchesIndustrySelection = 
        !selectedIndustry || company.industry.includes(selectedIndustry);

      const isHiring = company.jobs?.saramin || company.jobs?.jobkorea || company.jobs?.work24;
      const matchesHiring = !onlyHiring || isHiring;

      return matchesRegion && matchesCert && matchesIndustrySelection && matchesHiring;
    });

    // 2. Fuzzy Search or Smart Sorting
    if (searchTerm.trim()) {
      const results = fuse.search(searchTerm);
      const matchedIds = new Set(results.map(r => r.item.id));
      filtered = filtered.filter(c => matchedIds.has(c.id));
      
      const scoreMap = new Map(results.map(r => [r.item.id, r.score ?? 1]));
      filtered.sort((a, b) => (scoreMap.get(a.id) ?? 1) - (scoreMap.get(b.id) ?? 1));
    } else {
      // 검색어가 없을 때: 채용 중인 기업을 최상단으로 (나머지는 셔플된 상태 유지)
      filtered.sort((a, b) => {
        const aHiring = a.jobs?.saramin || a.jobs?.jobkorea || a.jobs?.work24 ? 1 : 0;
        const bHiring = b.jobs?.saramin || b.jobs?.jobkorea || b.jobs?.work24 ? 1 : 0;
        return bHiring - aHiring;
      });
    }

    return filtered;
  }, [companies, searchTerm, selectedRegions, selectedCerts, selectedIndustry, onlyHiring, fuse]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedRegions([]);
    setSelectedCerts([]);
    setSelectedIndustry(null);
    setOnlyHiring(false);
  };

  return {
    companies: filteredCompanies,
    allCompanies: companies,
    lastUpdated,
    loading,
    error,
    filters: {
      searchTerm,
      setSearchTerm,
      selectedRegions,
      setSelectedRegions,
      selectedCerts,
      setSelectedCerts,
      selectedIndustry,
      setSelectedIndustry,
      onlyHiring,
      setOnlyHiring,
      resetFilters,
      selectedCompanyId,
      setSelectedCompanyId
    }
  };
}
