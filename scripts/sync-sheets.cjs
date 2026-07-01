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

const JOB_PORTALS = ['saramin', 'jobkorea', 'work24'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function normalizeCompanyName(name) {
  return (name || '')
    .replace(/\(주\)|㈜|주식회사|\(유\)|유한회사|\(사\)|사단법인|의료법인/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
    .trim();
}

function cleanCompanySearchName(name) {
  return (name || '')
    .replace(/\(주\)|㈜|주식회사|\(유\)|유한회사|\(사\)|사단법인|의료법인/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSheetBoolean(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['TRUE', 'Y', 'YES', '1', 'O'].includes(normalized)) return true;
  if (['FALSE', 'N', 'NO', '0', 'X'].includes(normalized)) return false;
  return null;
}

function createJobCheck(status, confidence, evidence = [], meta = {}) {
  return { status, confidence, evidence, ...meta };
}

function isBotOrBlockedPage(data = '') {
  return /captcha|비정상|보안문자|접근이 제한|access denied|cloudflare|잠시 후 다시|자동화된 접근|robot/i.test(data);
}

async function fetchPortalHtml(url, headers = {}, timeout = 12000) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        ...headers
      },
      timeout
    });

    const data = String(response.data || '');
    if (isBotOrBlockedPage(data)) {
      return createJobCheck('unknown', 0, ['blocked_or_security_page'], { httpStatus: response.status });
    }

    return { data, httpStatus: response.status };
  } catch (error) {
    const status = error.response?.status;
    const evidence = status ? [`http_${status}`] : ['request_failed'];
    return createJobCheck('unknown', 0, evidence, { error: error.message, httpStatus: status });
  }
}

function extractCount(data, patterns) {
  for (const pattern of patterns) {
    const match = data.match(pattern);
    if (match) return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return null;
}

function hasCompanyNameSignal(data, companyName) {
  const normalizedData = normalizeCompanyName(data);
  const normalizedName = normalizeCompanyName(companyName);
  return normalizedName.length >= 2 && normalizedData.includes(normalizedName);
}

async function checkSaramin(name, searchName) {
  const fetched = await fetchPortalHtml(`https://www.saramin.co.kr/zf_user/search/recruit?searchword=${searchName}`);
  if (!fetched.data) return fetched;

  const data = fetched.data;
  const evidence = [];
  const hasItems = data.includes('item_recruit') || data.includes('list_body') || data.includes('recruit_list');
  const hasNoResults = data.includes('검색결과가 없습니다') || data.includes('총 0건') || data.includes('조건에 맞는 결과가 없습니다');
  const companyMatched = hasCompanyNameSignal(data, name);

  if (hasNoResults) evidence.push('no_result_message');
  if (hasItems) evidence.push('posting_list_marker');
  if (companyMatched) evidence.push('company_name_match');

  if (hasNoResults) return createJobCheck('closed', 0.9, evidence);
  if (hasItems && companyMatched) return createJobCheck('open', 0.86, evidence);
  if (hasItems) return createJobCheck('unknown', 0.45, evidence.concat('list_without_company_match'));

  return createJobCheck('closed', 0.65, evidence.concat('no_posting_marker'));
}

async function checkJobKorea(name, searchName) {
  const fetched = await fetchPortalHtml(
    `https://www.jobkorea.co.kr/Search/?stext=${searchName}&tabType=recruit`,
    {
      'Referer': 'https://www.jobkorea.co.kr/',
      'Cache-Control': 'no-cache'
    },
    15000
  );
  if (!fetched.data) return fetched;

  const data = fetched.data;
  const evidence = [];
  const jobsCount = extractCount(data, [
    /jobsLength\\?":\s*(\d+)/,
    /resultCount\\?":\s*(\d+)/,
    /총\s*([\d,]+)건의\s*검색결과/
  ]);
  const hasItems = data.includes('list-post') || data.includes('post-list') ||
    data.includes('recruit-info') || data.includes('list-default') ||
    data.includes('JOB_POSTING') || data.includes('jobPlatformId') ||
    data.includes('dev.jobkorea.co.kr') || data.includes('posting-item');
  const hasNoResults = data.includes('검색결과가 없습니다') || data.includes('0건의 검색결과') || /jobsLength\\?":0/.test(data);
  const companyMatched = hasCompanyNameSignal(data, name);

  if (jobsCount !== null) evidence.push(`count_${jobsCount}`);
  if (hasItems) evidence.push('posting_list_marker');
  if (hasNoResults) evidence.push('no_result_message');
  if (companyMatched) evidence.push('company_name_match');

  if (jobsCount === 0 || (hasNoResults && !hasItems)) return createJobCheck('closed', 0.9, evidence);
  if ((jobsCount && jobsCount > 0) && companyMatched) return createJobCheck('open', 0.88, evidence);
  if (hasItems && companyMatched) return createJobCheck('open', 0.82, evidence);
  if ((jobsCount && jobsCount > 0) || hasItems) return createJobCheck('unknown', 0.5, evidence.concat('list_without_company_match'));

  return createJobCheck('closed', 0.65, evidence.concat('no_posting_marker'));
}

async function checkWork24(name, searchName) {
  const fetched = await fetchPortalHtml(
    `https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do?srcKeyword=${searchName}&regionParam=11500,11470,11560&region=11500,11470,11560`
  );
  if (!fetched.data) return fetched;

  const data = fetched.data;
  const evidence = [];
  const hasListTable = data.includes('emplym_list') || data.includes('empSrchList') || data.includes('table_list') || data.includes('board_list');
  const noDataMessage = data.includes('검색 결과가 없습니다') || data.includes('데이터가 존재하지 않습니다') || data.includes('등록된 내역이 없습니다');
  const zeroCountPattern = /total_cnt[^>]*>0<\/em/i.test(data) || /전체\s*<em>0<\/em>\s*건/i.test(data) || /검색결과\s*0\s*건/i.test(data);
  const hasDetailLink = data.includes('retriveDtl') || data.includes('goDtlEmp');
  const companyMatched = hasCompanyNameSignal(data, name);

  if (hasListTable) evidence.push('posting_list_marker');
  if (hasDetailLink) evidence.push('detail_link_marker');
  if (noDataMessage || zeroCountPattern) evidence.push('no_result_message');
  if (companyMatched) evidence.push('company_name_match');

  if (noDataMessage || zeroCountPattern) return createJobCheck('closed', 0.9, evidence);
  if (hasDetailLink && companyMatched) return createJobCheck('open', 0.88, evidence);
  if (hasListTable && companyMatched) return createJobCheck('open', 0.8, evidence);
  if (hasListTable || hasDetailLink) return createJobCheck('unknown', 0.5, evidence.concat('list_without_company_match'));

  return createJobCheck('closed', 0.65, evidence.concat('no_posting_marker'));
}

/**
 * 채용 사이트별 공고 여부 확인
 */
async function checkJobPortals(name) {
  const cleanName = cleanCompanySearchName(name);
  const normalizedName = normalizeCompanyName(name);
  const searchName = encodeURIComponent(cleanName || name);
  const checkedAt = new Date().toISOString();

  const details = {
    saramin: await checkSaramin(name, searchName),
    jobkorea: await checkJobKorea(name, searchName),
    work24: await checkWork24(name, searchName)
  };

  const results = {
    saramin: details.saramin.status === 'open',
    jobkorea: details.jobkorea.status === 'open',
    work24: details.work24.status === 'open',
    lastChecked: checkedAt,
    details
  };

  console.log(
    `🔍 Job Check Result for [${name}] (Search: ${cleanName}, Match: ${normalizedName}): ` +
    JOB_PORTALS.map(portal => {
      const detail = details[portal];
      return `${portal}(${detail.status},${detail.confidence})`;
    }).join(', ')
  );

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
      const manualJobs = {
        saramin: parseSheetBoolean(rawCompany.saramin),
        jobkorea: parseSheetBoolean(rawCompany.jobkorea),
        work24: parseSheetBoolean(rawCompany.work24)
      };

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
            saramin: manualJobs.saramin === true,
            jobkorea: manualJobs.jobkorea === true,
            work24: manualJobs.work24 === true,
            lastChecked: new Date().toISOString() + " (MANUAL)"
          };
        } else {
          // 3. 자동 체크 모드 (AUTO 또는 기본값)
          // 시트의 사이트별 TRUE/FALSE는 수기 확인값으로 보고 자동 스크래핑보다 우선한다.
          console.log(`🔍 Auto checking jobs: ${company.name}`);
          const scraped = await checkJobPortals(company.name);

          company.jobs = {
            lastChecked: scraped.lastChecked
          };

          JOB_PORTALS.forEach((portal) => {
            const manualValue = manualJobs[portal];
            const detail = scraped.details[portal];

            if (manualValue !== null) {
              company.jobs[portal] = manualValue;
              return;
            }

            if (detail.status === 'unknown' && cached?.jobs && typeof cached.jobs[portal] === 'boolean') {
              company.jobs[portal] = cached.jobs[portal];
              return;
            }

            company.jobs[portal] = detail.status === 'open';
          });

          console.log(
            `🧾 Job Merge for [${company.name}]: ` +
            JOB_PORTALS.map(portal => {
              const source = manualJobs[portal] !== null
                ? 'manual'
                : scraped.details[portal].status === 'unknown' && cached?.jobs && typeof cached.jobs[portal] === 'boolean'
                  ? 'cached'
                  : 'auto';
              return `${portal}=${company.jobs[portal]}(${source})`;
            }).join(', ')
          );

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

async function auditJobDifferences() {
  try {
    console.log('🧪 Starting job status audit against Google Sheet values...');

    const response = await axios.get(SHEET_URL);
    const records = parseCsv(response.data);
    if (records.length < 2) throw new Error('No data found in sheet');

    const headers = records[0];
    const differences = [];
    const unknowns = [];
    const skipped = [];

    for (let i = 1; i < records.length; i++) {
      const values = records[i];
      const rawCompany = {};

      headers.forEach((header, index) => {
        rawCompany[header] = values[index] || '';
      });

      const name = rawCompany.name?.trim();
      if (!name) continue;

      const policy = rawCompany.check_jobs?.trim().toUpperCase() || 'AUTO';
      if (policy === 'OFF') {
        skipped.push({ name, reason: 'check_jobs=OFF' });
        continue;
      }

      const manualJobs = {
        saramin: parseSheetBoolean(rawCompany.saramin),
        jobkorea: parseSheetBoolean(rawCompany.jobkorea),
        work24: parseSheetBoolean(rawCompany.work24)
      };

      if (JOB_PORTALS.every(portal => manualJobs[portal] === null)) {
        skipped.push({ name, reason: 'no manual site values' });
        continue;
      }

      const scraped = await checkJobPortals(name);

      JOB_PORTALS.forEach((portal) => {
        const manual = manualJobs[portal];
        if (manual === null) return;

        const detail = scraped.details[portal];
        if (detail.status === 'unknown') {
          unknowns.push({
            name,
            portal,
            sheet: manual,
            autoStatus: detail.status,
            confidence: detail.confidence,
            evidence: detail.evidence
          });
          return;
        }

        const auto = detail.status === 'open';
        if (manual !== auto) {
          differences.push({
            name,
            portal,
            sheet: manual,
            auto,
            autoStatus: detail.status,
            confidence: detail.confidence,
            evidence: detail.evidence
          });
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n=== JOB_AUDIT_DIFFERENCES_JSON_START ===');
    console.log(JSON.stringify({
      checkedAt: new Date().toISOString(),
      differences,
      unknowns,
      skipped,
      summary: {
        differences: differences.length,
        unknowns: unknowns.length,
        skipped: skipped.length
      }
    }, null, 2));
    console.log('=== JOB_AUDIT_DIFFERENCES_JSON_END ===');
  } catch (error) {
    console.error('💥 Job audit failed:', error.message);
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

if (process.argv.includes('--audit-jobs')) {
  auditJobDifferences();
} else {
  sync();
}
