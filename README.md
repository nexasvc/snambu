# 🏢 기업성장 브릿지 Map

> **"기업의 혁신과 지역의 성장을 잇는 데이터 비주얼라이제이션 플랫폼"**
>
> 서울 서남권(강서·양천·영등포) 유망 기업 데이터를 정밀하게 시각화하는 인터랙티브 지도 포털입니다. Google Sheets를 단일 데이터 소스로, GitHub Actions로 자동 동기화·배포하는 No-Backend 아키텍처로 운영됩니다.

---

## 🌟 핵심 기능

| 기능 | 설명 |
| :--- | :--- |
| **인터랙티브 지도** | Google Maps 위에 지역별 색상 마커, 채용중 기업 실시간 표시 |
| **고급 필터링** | 지역 · 산업군 · 기업유형(인증) · 채용중 복합 필터 + Fuse.js 퍼지 검색 |
| **반응형 UI** | 데스크톱 사이드바 / 모바일 바텀 드로어 레이아웃 완전 분리 |
| **SNS 공유** | 기업별 동적 OG 메타태그, Web Share API 원클릭 공유 |
| **길찾기 연동** | 카카오맵·네이버지도·Google Maps 좌표 기반 목적지 지정 |
| **채용 모니터링** | 사람인·잡코리아·고용24 공고 여부 자동 감지 |
| **GA4 분석** | 검색어·필터·웹사이트 방문·길찾기 등 사용자 행동 이벤트 추적 |
| **채용 모니터링** | 사람인·잡코리아·고용24 공고 여부 자동 감지 및 운영자 수동 보정(Hybrid) |
---

## 🚀 핵심 기술 특장점

### 1. Dynamic Geocoding Engine
도로명 주소만 입력하면 Google Maps Geocoding API가 자동으로 위도·경도를 계산합니다. 이전에 변환된 좌표는 캐싱되어 불필요한 API 호출을 방지합니다.

### 2. Hybrid 데이터 파이프라인
- Google Sheets → CSV 파싱 → Zod 스키마 검증 → Geocoding → `companies.json` 저장
- **채용 동기화 정책**: `AUTO`(자동 스크래핑 + 수동 보정), `MANUAL`(100% 수동), `OFF`(강제 비활성화) 모드 지원
- `npm run sync` 또는 GitHub Actions 수동 트리거로 원클릭 반영

### 3. UX/UI 아키텍처
- **Toast 알림:** 복사·공유 완료 시 Framer Motion 기반 인라인 토스트 (네이티브 `alert()` 제거)
- **모바일 필터:** 바텀 드로어에 산업군·기업유형·채용중 필터 통합, 활성 필터 수 뱃지 표시
- **URL 상태 보존:** 검색어·필터·선택 기업 상태가 URL 파라미터에 자동 반영되어 공유·북마크 가능

### 4. SEO 최적화
- 기업별 동적 `<title>` 및 OG 메타태그 (React Helmet)
- `og:image`는 절대 URL로 변환하여 카카오톡·트위터 미리보기 정상 표시

---

## 📊 데이터 모델 (`companies.json`)

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | `string` | 기업 고유 식별자 (URL 파라미터 키) |
| `name` | `string` | 공식 기업 명칭 |
| `region` | `enum` | `강서구` · `양천구` · `영등포구` |
| `address` | `string` | 도로명 주소 (Geocoding 입력값) |
| `lat` / `lng` | `number` | 자동 생성 좌표 (sync 시 채워짐) |
| `logo` | `string` | `assets/logos/` 내 파일명 |
| `industry` | `string` | 산업군 (IT/SW·바이오·유통·건설·서비스·제조) |
| `certifications` | `string[]` | `지역우수` · `지역맞춤` · `청년도약` |
| `check_jobs` | `enum` | `AUTO`(스크래핑) · `MANUAL`(수동) · `OFF`(꺼짐) |
| `saramin` / `jobkorea` / `work24` | `boolean` | `TRUE` 또는 `FALSE` (수동 입력/보정용) |
| `map_display_status` | `enum` | `VISIBLE` · `HIDDEN` · `DRAFT` · `REVIEW` · `EXPIRED` |
| `jobs` | `object` | `saramin` · `jobkorea` · `work24` 채용 여부 + `lastChecked` |

---

## ⚙️ 개발 환경 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.example`을 복사해 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

```env
# 브라우저용 지도 표시 키 (HTTP Referrer 제한 가능)
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE

# 서버 사이드 Geocoding 전용 키 (제한 없음 또는 IP 제한 권장)
VITE_GOOGLE_GEOCODING_API_KEY=YOUR_GOOGLE_GEOCODING_API_KEY_HERE

# Google Maps Map ID (Advanced Markers용, 없으면 DEMO_MAP_ID 사용)
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID

# Google Analytics 4 측정 ID
VITE_GA_ID=G-XXXXXXXXXX

# Google Sheets 연동 (SHEET_ID는 필수)
SHEET_ID=YOUR_SHEET_ID_HERE
SHEET_NAME=company
```

> ⚠️ `SHEET_ID`는 필수 환경변수입니다. 미설정 시 sync 스크립트가 즉시 오류를 반환합니다.

### 3. 데이터 동기화 및 개발 서버 실행
```bash
npm run sync   # Google Sheets → companies.json
npm run dev    # 개발 서버 실행
```

### 4. 빌드
```bash
npm run build
```

---

## 🔄 GitHub Actions 워크플로우

### `deploy.yml` — 자동 배포
`main` 브랜치 push 시 자동 실행됩니다.
1. `npm run sync` (Geocoding 포함)
2. `npm run build`
3. GitHub Pages 배포

### `sync-sheets.yml` — 수동 데이터 동기화
GitHub Actions > **Sync Google Sheets Data** > **Run workflow**

| 옵션 | 설명 |
| :--- | :--- |
| `check_jobs` ON | 사람인·잡코리아·고용24 채용 공고 여부 재확인 |
| `check_jobs` OFF | 좌표·기본 정보만 업데이트 |

### GitHub Secrets 필수 항목

| Secret | 용도 |
| :--- | :--- |
| `VITE_GOOGLE_MAPS_API_KEY` | 빌드 시 프론트엔드 지도 표시 |
| `VITE_GOOGLE_GEOCODING_API_KEY` | sync 시 서버 사이드 주소 → 좌표 변환 |
| `VITE_GOOGLE_MAPS_MAP_ID` | Advanced Markers Map ID |
| `VITE_GA_ID` | GA4 측정 ID |
| `SHEET_ID` | Google Sheets 문서 ID |
| `SHEET_NAME` | 시트 탭 이름 (기본값: `company`) |

---

## 🛠 Tech Stack

| 영역 | 기술 |
| :--- | :--- |
| **Frontend** | React 19 (TypeScript), Vite 6 |
| **Styling** | Tailwind CSS 4, Framer Motion 12 |
| **Map** | @vis.gl/react-google-maps, Google Maps Geocoding API |
| **Search** | Fuse.js (퍼지 검색), Zod (스키마 검증) |
| **Analytics** | Google Analytics 4 (react-ga4) |
| **SEO** | React Helmet Async (동적 OG 메타태그) |
| **CI/CD** | GitHub Actions, GitHub Pages |

---

> 본 프로젝트는 기업과 지역 사회의 동반 성장을 지원하기 위해 제작되었습니다.

---

## 🔮 서비스 고도화 및 로드맵 (Proposed Roadmap)

현재의 최소 운영 모델(No-Backend)에서 서비스 활성화 및 향후 고도화를 위한 전략적 제안입니다.

### 1. 기술적 최적화 (Technical Excellence)
- **마커 클러스터링 (Marker Clustering):** 기업 데이터가 대규모로 확장될 경우를 대비하여 지도의 시각적 복잡도를 해결하고 렌더링 성능을 최적화합니다.
- **PWA (Progressive Web App) 도입:** 설치 없이 앱처럼 사용할 수 있는 환경을 제공하고, 홈 화면 추가 기능을 통해 사용자 재방문율을 높입니다.
- **이미지 자동 최적화 파이프라인:** `sync` 스크립트 실행 시 원본 이미지를 WebP 형식을 변환하고 리사이징하여 초기 로딩 속도를 30% 이상 개선합니다.

### 2. 사용자 경험 및 기능 확장 (Product Growth)
- **개인화 관심 기업(찜) 기능:** 로그인 없이 `localStorage`를 활용하여 가고 싶은 기업을 저장하고, 해당 기업들만 지도에서 따로 모아보는 기능을 제공합니다.
- **데이터 시각화 대시보드:** 지역별/산업별 기업 분포 통계를 차트로 시각화하여, 단순 지도를 넘어선 '지역 산업 분석 리포트'로서의 가치를 부여합니다.
- **사용자 참여형 정보 수정 제보:** 정보 오류 수정 및 신규 기업 입점 제안을 위한 피드백 채널을 연동하여 데이터의 신뢰도와 생태계를 확장합니다.

### 3. 마케팅 및 SEO 강화 (Marketing Strategy)
- **SNS 커스텀 공유 카드 (Kakao API):** 기업 로고, 산업군, 채용 여부가 포함된 풍부한 미리보기 카드를 통해 공유 시 클릭률(CTR)을 극대화합니다.
- **검색 엔진 노출 최적화 (SEO):** 빌드 시 `companies.json` 기반의 `sitemap.xml` 및 `robots.txt`를 자동 생성하여 네이버/구글 검색 노출을 강화합니다.
- **채용 정보 알림 자동화:** 관심 기업의 채용 정보가 새로 떴을 때 브라우저 푸시 또는 이메일로 알림을 주는 기능을 도입합니다 (Supabase/Firebase 연동 필요).

### 4. 인프라 확장성 (Infrastructure)
- **Backend-as-a-Service (BaaS) 전환:** 트래픽 및 기능 요구사항 증가 시 Supabase 또는 Firebase로 전환하여 실시간 데이터 처리 및 사용자 인증 시스템을 구축합니다.

