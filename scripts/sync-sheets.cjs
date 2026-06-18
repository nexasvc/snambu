const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { z } = require('zod');
require('dotenv').config();

// 구글 시트 정보 (CSV 내보내기 링크)
const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) {
  console.error('❌ SHEET_ID 환경변수가 설정되지 않았습니다. .env 파일에 SHEET_ID를 추가해주세요.');
  process.exit(1);
}
const SHEET_NAME = process.env.SHEET_NAME || 'company';

// SHEET_NAME이 숫자이면 gid로 처리, 문자이면 sheet 이름으로 처리 (gviz API 사용)
const SHEET_URL = SHEET_NAME.match(/^\d+$/) 
  ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_NAME}`
  : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

const JSON_FILE_PATH = path.join(process.cwd(), 'public/data/companies.json');
const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_GEOCODING_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY; // 지오코딩 API 키 우선 사용, 없으면 맵 API 키 사용

/**
 * Zod 스키마 정의 (데이터 검증)
 */
const CompanySchema = z.object({
  id: z.string().min(1, "ID는 필수입니다."),
  name: z.string().min(1, "기업명은 필수입니다."),
  region: z.enum(['강서구', '양천구', '영등포구']),
  address: z.string().min(5, "올바른 주소를 입력해주세요."),
  logo: z.string().optional(),
  industry: z.string().min(1, "산업군은 필수입니다."),
  industryDetail: z.string().default(""),
  employees: z.number().int().nonnegative().default(0),
  certifications: z.array(z.enum(['지역우수', '지역맞춤', '청년도약'])).default([]),
  governmentCertifications: z.array(z.string()).default([]),
  awardAchievements: z.array(z.string()).default([]),
  benefits: z.string().default(""),
  workEnvironment: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  website: z.string().url("올바른 웹사이트 URL을 입력해주세요.").or(z.literal("")),
  description: z.string().default(""),
  map_display_status: z.enum(['DRAFT', 'REVIEW', 'VISIBLE', 'HIDDEN', 'EXPIRED']).default('VISIBLE'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  jobs: z.object({
    saramin: z.boolean().optional(),
    jobkorea: z.boolean().optional(),
    work24: z.boolean().optional(),
    lastChecked: z.string().optional(),
  }).optional(),
});

/**
 * 채용 사이트별 공고 여부 확인
 */
async function checkJobPortals(name) {
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const results = {
    saramin: false,
    jobkorea: false,
    work24: false,
    lastChecked: new Date().toISOString()
  };

  // 검색어 정제: 사명에 포함된 (주), 주식회사, (유) 등 제거하여 검색 정확도 향상
  const cleanName = name.replace(/\(주\)|주식회사|\(유\)|유한회사|\(사\)|사단법인/g, '').trim();
  const searchName = encodeURIComponent(cleanName || name);

  try {
    // 1. 사람인
    const saraminRes = await axios.get(`https://www.saramin.co.kr/zf_user/search/recruit?searchword=${searchName}`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    }).catch(() => null);
    
    if (saraminRes) {
      const data = saraminRes.data;
      // 강력한 긍정 신호: 공고 아이템 클래스 또는 리스트 바디 존재 여부
      const hasItems = data.includes('item_recruit') || data.includes('list_body') || data.includes('recruit_list');
      // 부정 신호: 결과 없음 패턴
      const hasNoResults = data.includes('검색결과가 없습니다') || data.includes('총 0건') || data.includes('조건에 맞는 결과가 없습니다');
      
      results.saramin = hasItems && !hasNoResults;
      
      // ANS개발과 같이 사명이 명확히 포함된 경우 추가 구제
      if (!results.saramin && data.includes(cleanName) && data.includes('item')) {
        results.saramin = true;
      }
    }

    // 2. 잡코리아
    const jobkoreaRes = await axios.get(`https://www.jobkorea.co.kr/Search/?stext=${searchName}&tabType=recruit`, {
      headers: { 
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.jobkorea.co.kr/',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    }).catch((err) => {
      if (name.includes('이사대학')) {
        console.log(`❌ JobKorea Request Failed for ${name}: ${err.message}`);
      }
      return null;
    });
    
    if (jobkoreaRes) {
      const data = jobkoreaRes.data;
      
      // 1. Next.js Hydration 데이터에서 정확한 숫자 추출
      const jobsLengthMatch = data.match(/jobsLength\\?":\s*(\d+)/);
      const resultCountMatch = data.match(/resultCount\\?":\s*(\d+)/);
      const jobsCount = jobsLengthMatch ? parseInt(jobsLengthMatch[1]) : (resultCountMatch ? parseInt(resultCountMatch[1]) : 0);

      // 2. 강력한 긍정 신호
      const hasItems = data.includes('list-post') || data.includes('post-list') || 
                       data.includes('recruit-info') || data.includes('list-default') ||
                       data.includes('JOB_POSTING') || data.includes('jobPlatformId') ||
                       data.includes('dev.jobkorea.co.kr') || data.includes('posting-item');
                       
      // 3. 부정 신호
      const isZeroJobs = jobsCount === 0 && (data.includes('검색결과가 없습니다') || data.includes('0건의 검색결과'));
      
      // 4. 추가 긍정 신호: HTML 내의 공고 수 텍스트 (총 X건의 검색결과)
      const textCountMatch = data.match(/총\s*([\d,]+)건의\s*검색결과/);
      const textCount = textCountMatch ? parseInt(textCountMatch[1].replace(/,/g, '')) : 0;

      if (jobsCount > 0 || textCount > 0) {
        results.jobkorea = true;
      } else {
        results.jobkorea = hasItems && !isZeroJobs;
      }
      
      // 5. 특별 케이스 구제
      if (!results.jobkorea && data.includes(cleanName) && 
          (data.includes('item') || data.includes('list') || data.includes('post') || data.includes('recruit'))) {
        if (!data.includes('검색결과가 없습니다') && !/jobsLength\\?":0/.test(data)) {
          results.jobkorea = true;
        }
      }

      // 디버깅: GitHub Actions 환경에서 원인 파악을 위한 로그
      if (!results.jobkorea && (name.includes('이사대학') || name.includes('피앤피시큐어'))) {
        console.log(`⚠️ [Debug] JobKorea false for ${name}: len=${data.length}, jobsCount=${jobsCount}, textCount=${textCount}, hasItems=${hasItems}, isZeroJobs=${isZeroJobs}`);
        if (data.includes('Login') || data.includes('Security') || data.includes('Captcha')) {
          console.log(`🚨 Possible bot detection or redirect detected in the response.`);
        }
      }
    } else if (name.includes('이사대학')) {
        console.log(`⚠️ [Debug] JobKorea Response is NULL for ${name}`);
    }

    // 3. 고용24 (워크24)
    // regionParam과 region 모두 사용하여 검색 안정성 확보 (11500:강서, 11470:양천, 11560:영등포)
    const work24Res = await axios.get(`https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do?srcKeyword=${searchName}&regionParam=11500,11470,11560&region=11500,11470,11560`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    }).catch(() => null);
    
    if (work24Res) {
      const data = work24Res.data;
      // 고용24 고유의 리스트 패턴 및 결과 없음 패턴 정밀화
      const hasListTable = data.includes('emplym_list') || data.includes('empSrchList') || data.includes('table_list') || data.includes('board_list');
      const noDataMessage = data.includes('검색 결과가 없습니다') || data.includes('데이터가 존재하지 않습니다') || data.includes('등록된 내역이 없습니다');
      
      // 검색된 공고 수가 0인지 확인하는 패턴 (예: <em class="total_cnt">0</em> 또는 '전체 0건')
      const zeroCountPattern = /total_cnt[^>]*>0<\/em/i.test(data) || /전체\s*<em>0<\/em>\s*건/i.test(data) || /검색결과\s*0\s*건/i.test(data);
      
      results.work24 = hasListTable && !noDataMessage && !zeroCountPattern;
      
      // "ANS개발"과 같이 사명이 데이터에 직접 나타나고 상세 공고 링크(retriveDtl)가 보인다면 긍정 결과로 구제
      if (!results.work24 && data.includes(cleanName) && (data.includes('retriveDtl') || data.includes('goDtlEmp'))) {
        results.work24 = true;
      }
    }

    console.log(`🔍 Job Check Result for [${name}] (Search: ${cleanName}): Saramin(${results.saramin}), JobKorea(${results.jobkorea}), Work24(${results.work24})`);
    
  } catch (error) {
    console.warn(`⚠️ Failed to check jobs for ${name}: ${error.message}`);
  }

  return results;
}

/**
 * CSV 데이터를 파싱하여 2차원 배열로 변환 (따옴표 및 멀티라인 필드 대응)
 */
function parseCsv(csv) {
  const records = [];
  let currentRecord = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // 다음 따옴표 건너뜀
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRecord.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      if (currentField !== '' || currentRecord.length > 0) {
        currentRecord.push(currentField.trim());
        records.push(currentRecord);
        currentRecord = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }
  
  if (currentField !== '' || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    records.push(currentRecord);
  }
  
  return records;
}

/**
 * 구글 지오코딩 API 호출
 */
async function getCoordinates(address) {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.includes('YOUR_')) {
    console.warn('⚠️ Google Maps API Key is missing or invalid. Skipping geocoding.');
    return null;
  }

  // 정확도를 높이기 위해 주소 앞에 '서울특별시' 추가 (이미 포함되어 있지 않은 경우)
  const fullAddress = address.includes('서울') ? address : `서울특별시 ${address}`;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const { lat, lng } = response.data.results[0].geometry.location;
      return { lat, lng };
    } else {
      console.error(`Geocoding failed for [${fullAddress}]: ${response.data.status} : ${response.data.error_message || 'No results found'}}`);
      return null;
    }
  } catch (error) {
    console.error(`Geocoding API error: ${error.message}`);
    return null;
  }
}

/**
 * 메인 동기화 함수
 */
async function sync() {
  const checkJobs = process.argv.includes('--check-jobs');
  
  try {
    console.log('🚀 Starting data synchronization...');
    if (checkJobs) console.log('🔍 Job checking enabled');
    
    // 기존 데이터 로드 (좌표 및 채용 정보 보존용)
    let existingData = { companies: [] };
    if (fs.existsSync(JSON_FILE_PATH)) {
      existingData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8'));
    }
    const existingCache = new Map(existingData.companies.map(c => [c.id, c]));

    console.log('📡 Fetching data from Google Sheets...');
    const response = await axios.get(SHEET_URL);
    const csvData = response.data;

    // 개선된 CSV 파서 사용
    const records = parseCsv(csvData);
    if (records.length < 2) throw new Error('No data found in sheet');

    const headers = records[0];
    const companies = [];

    for (let i = 1; i < records.length; i++) {
      const values = records[i];
      const rawCompany = {};

      headers.forEach((header, index) => {
        const val = values[index] || '';
        
        if (['certifications', 'awardAchievements', 'workEnvironment', 'images', 'governmentCertifications'].includes(header)) {
          // 콤마(,) 뿐만 아니라 줄바꿈(\n)으로도 분리 가능하도록 개선
          rawCompany[header] = val 
            ? val.split(/[,\n\r]+/).map(item => item.trim()).filter(Boolean) 
            : [];
        } else if (header === 'benefits') {
          // 복지 및 혜택은 일반 텍스트로 통합 관리
          rawCompany[header] = val.trim();
        } else if (header === 'employees') {
          rawCompany[header] = parseInt(val) || 0;
        } else {
          rawCompany[header] = val;
        }
      });

      // Zod 검증
      const validation = CompanySchema.safeParse(rawCompany);
      if (!validation.success) {
        console.error(`❌ Validation failed for company [${rawCompany.name || 'Unknown'}]:`, validation.error.format());
        continue;
      }

      let company = validation.data;
      const cached = existingCache.get(company.id);

      // 지오코딩 처리 (주소가 바뀌었거나 좌표가 없는 경우만)
      if (cached && cached.address === company.address && cached.lat && cached.lng) {
        company.lat = cached.lat;
        company.lng = cached.lng;
      } else {
        console.log(`📍 Geocoding: ${company.name} (${company.address})`);
        const coords = await getCoordinates(company.address);
        if (coords) {
          company.lat = coords.lat;
          company.lng = coords.lng;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // --- 채용 정보 하이브리드 업데이트 로직 시작 ---
      const checkJobsPolicy = rawCompany.check_jobs?.toUpperCase(); // AUTO, MANUAL, OFF
      const manualSaramin = rawCompany.saramin?.toUpperCase() === 'TRUE';
      const manualJobkorea = rawCompany.jobkorea?.toUpperCase() === 'TRUE';
      const manualWork24 = rawCompany.work24?.toUpperCase() === 'TRUE';

      if (checkJobs) {
        if (checkJobsPolicy === 'OFF') {
          // 1. OFF 모드: 모든 채용 정보 비활성화
          console.log(`🚫 Job check OFF: ${company.name}`);
          company.jobs = {
            saramin: false,
            jobkorea: false,
            work24: false,
            lastChecked: new Date().toISOString()
          };
        } else if (checkJobsPolicy === 'MANUAL') {
          // 2. 수동 모드 (MANUAL) - 시트의 값을 그대로 사용
          console.log(`📝 Manual job info applied: ${company.name}`);
          company.jobs = {
            saramin: manualSaramin,
            jobkorea: manualJobkorea,
            work24: manualWork24,
            lastChecked: new Date().toISOString() + " (MANUAL)"
          };
        } else {
          // 3. 자동 체크 모드 (AUTO 또는 기본값)
          console.log(`🔍 Auto checking jobs: ${company.name}`);
          const scraped = await checkJobPortals(company.name);
          
          // 스크래핑 결과가 없더라도 시트에 TRUE로 되어있으면 보정(Fallback) 적용
          company.jobs = {
            saramin: scraped.saramin || manualSaramin,
            jobkorea: scraped.jobkorea || manualJobkorea,
            work24: scraped.work24 || manualWork24,
            lastChecked: scraped.lastChecked
          };
          // 사이트 차단 방지를 위한 지연
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else if (cached && cached.jobs) {
        // --check-jobs 플래그가 없는 경우 기존 데이터 유지
        company.jobs = cached.jobs;
      }
      // --- 채용 정보 업데이트 로직 종료 ---

      companies.push(company);
    }

    // 결과 저장
    const result = { 
      companies,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(result, null, 2));
    
    console.log(`✅ Successfully synced ${companies.length} companies to ${JSON_FILE_PATH}`);

    // 사이트맵 생성 (SEO 최적화)
    generateSitemap(companies);
  } catch (error) {
    console.error('💥 Sync failed:', error.message);
    process.exit(1);
  }
}

/**
 * sitemap.xml 자동 생성
 */
function generateSitemap(companies) {
  console.log('🌐 Generating sitemap.xml...');
  
  // 기본 도메인 설정 (환경변수나 기본값 사용)
  const baseUrl = process.env.VITE_SITE_URL || 'https://nexasvc.github.io/yyg-road';
  const lastmod = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 메인 페이지 -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // 기업별 상세 페이지 추가
  companies.forEach(company => {
    if (company.map_display_status === 'VISIBLE') {
      xml += `  <url>
    <loc>${baseUrl}/?id=${company.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }
  });

  xml += `</urlset>`;

  const sitemapPath = path.join(process.cwd(), 'public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml);
  console.log(`✅ Sitemap generated at ${sitemapPath}`);

  // robots.txt 생성/업데이트
  const robotsPath = path.join(process.cwd(), 'public/robots.txt');
  const robotsContent = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
  fs.writeFileSync(robotsPath, robotsContent);
  console.log(`✅ robots.txt generated at ${robotsPath}`);
}

sync();
