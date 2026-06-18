# 🏢 기업성장 브릿지 Map — 운영자 매뉴얼

이 문서는 서비스 데이터 관리, 이미지 등록, 동기화, 배포를 담당하는 운영자를 위한 실무 가이드입니다.

---

## 📑 1. 구글 시트 데이터 관리

서비스의 모든 기업 정보는 Google Sheets에서 관리합니다. 시트 편집 후 **동기화(Sync)**를 실행해야 서비스에 반영됩니다.

### 데이터 입력 규칙

| 컬럼 | 입력 규칙 | 예시 |
| :--- | :--- | :--- |
| `id` | 숫자 또는 영문+숫자. 한글·공백 사용 불가. 한번 정하면 변경 금지. | `1100008` |
| `name` | 공식 법인명 그대로 입력 | `㈜하코카빔 타르데마베이커리` |
| `region` | 반드시 세 값 중 하나: `강서구` / `양천구` / `영등포구` | `강서구` |
| `address` | 정확한 도로명 주소. 오타 시 지도 마커 위치 오류 발생. | `서울특별시 강서구 양천로26길 65` |
| `logo` | `assets/logos/` 폴더에 업로드한 파일명과 완전히 일치 | `타르데마로고.jpg` |
| `check_jobs` | 채용 정보 갱신 정책 (아래 상세 참고) | `AUTO` |
| `saramin` | 사람인 채용 여부 (수동/보정용) | `TRUE` 또는 `FALSE` |
| `jobkorea` | 잡코리아 채용 여부 (수동/보정용) | `TRUE` 또는 `FALSE` |
| `work24` | 고용24 채용 여부 (수동/보정용) | `TRUE` 또는 `FALSE` |
| `images` | `assets/companies/` 폴더 파일명, 여러 장이면 쉼표로 구분 | `전경.jpg,사무실.png` |
| `industry` | IT/SW · 바이오 · 유통 · 건설 · 서비스 · 제조 중 하나 | `제조` |
| `certifications` | 해당 항목만 쉼표로 구분: `지역우수` · `지역맞춤` · `청년도약` | `지역맞춤,청년도약` |
| `map_display_status` | 아래 상태값 참고 | `VISIBLE` |
| `website` | `https://`로 시작하는 완전한 URL | `https://www.example.com` |

### 채용 정보 갱신 정책 (`check_jobs`) 값 설명

| 값 | 동작 방식 | 설명 |
| :--- | :--- | :--- |
| **`AUTO`** | **자동 + 수동 보정** | 시스템이 채용 사이트를 스크래핑합니다. 만약 검색 실패 시에도 옆의 사이트 컬럼(`TRUE`)이 입력되어 있으면 채용 중으로 인정합니다. |
| **`MANUAL`** | **100% 수동 관리** | 스크래핑을 하지 않고 옆의 사이트 컬럼(`saramin`, `jobkorea`, `work24`)에 입력된 `TRUE`/`FALSE` 값을 그대로 반영합니다. |
| **`OFF`** | **강제 비활성화** | 시트의 다른 값과 상관없이 해당 기업의 모든 채용 마커를 숨깁니다. |

### 게시 상태 (`map_display_status`) 값 설명

| 값 | 지도 표시 | 설명 |
| :--- | :---: | :--- |
| `VISIBLE` | ✅ | 서비스에 정상 노출 |
| `HIDDEN` | ❌ | 데이터 보존, 지도에서 숨김 |
| `DRAFT` | ❌ | 작성 중, 미완성 데이터 |
| `REVIEW` | ❌ | 검토 중, 승인 대기 |
| `EXPIRED` | ❌ | 종료·만료된 기업 (보관용) |

---

## 🖼 2. 이미지 에셋 등록

이미지 파일은 GitHub 저장소의 지정된 폴더에 직접 업로드합니다.

### 기업 로고 (`public/assets/logos/`)
- **권장 규격:** 정사각형 비율, 400×400px 이상
- **권장 형식:** 배경이 투명한 PNG, 또는 흰색 배경의 JPG/PNG
- **주의:** 파일명 대소문자 엄격 구분. `Logo.png`와 `logo.png`는 다른 파일입니다.

### 기업 홍보 이미지 (`public/assets/companies/`)
- **권장 규격:** 16:9 비율 (1280×720px 권장)
- **권장 형식:** JPG 또는 PNG
- **용량:** 파일 1개당 5MB 이하 권장 (용량이 크면 페이지 로딩이 느려집니다)

---

## 🔄 3. 데이터 동기화 (Sync)

구글 시트의 내용을 서비스 데이터(`companies.json`)로 변환하는 작업입니다.

### 방법 A: GitHub Actions 활용 (권장)

1. GitHub 저장소의 **[Actions]** 탭으로 이동합니다.
2. 좌측 목록에서 **"Sync Google Sheets Data"**를 선택합니다.
3. **[Run workflow]** 버튼 클릭 후 옵션을 선택합니다.

| 옵션 | 선택 기준 |
| :--- | :--- |
| **채용 공고 확인 ON** | 채용중 기업 표시(파란 점)를 최신화하고 싶을 때 |
| **채용 공고 확인 OFF** | 기업 기본 정보·좌표만 빠르게 업데이트할 때 |

4. 완료 후 자동으로 GitHub Pages 배포가 시작됩니다. **약 2~3분** 후 서비스에 반영됩니다.

### 방법 B: 로컬 환경에서 실행 (개발자용)

> 로컬 실행 전 `.env` 파일에 `SHEET_ID`와 API 키가 설정되어 있어야 합니다.

```bash
# 기본 동기화 (좌표·기본 정보)
npm run sync

# 채용 공고 포함 동기화
node scripts/sync-sheets.cjs --check-jobs

# 변경사항 커밋 & 푸시 (배포 자동 시작)
git add public/data/companies.json
git commit -m "chore: sync company data"
git push origin main
```

---

## 🗺 4. 지오코딩 (주소 → 좌표 자동 변환)

동기화 시 새로 추가되거나 주소가 변경된 기업의 좌표를 자동으로 계산합니다.

### 작동 방식
- **주소 변경 없음 + 기존 좌표 있음** → 캐시된 좌표를 그대로 사용 (API 호출 없음)
- **신규 기업 또는 주소 변경** → Google Maps Geocoding API를 호출하여 좌표 계산

### 좌표가 채워지지 않는 경우

| 원인 | 해결 방법 |
| :--- | :--- |
| GitHub Secrets에 `VITE_GOOGLE_GEOCODING_API_KEY` 미등록 | GitHub → Settings → Secrets에 키 추가 후 sync 재실행 |
| `VITE_GOOGLE_MAPS_API_KEY`에 HTTP Referrer 제한이 걸려 있음 | 별도의 Geocoding 전용 키 발급 후 `VITE_GOOGLE_GEOCODING_API_KEY`로 등록 |
| 주소 오타 또는 Google이 인식 못하는 주소 | 지번 주소 대신 도로명 주소로 재입력, sync 재실행 |

좌표가 없는 기업은 지도에 마커가 표시되지 않습니다. 로컬에서 `npm run sync`를 실행하면 즉시 해결할 수 있습니다.

---

## 🔑 5. GitHub Secrets 관리

GitHub Actions가 정상 작동하려면 아래 Secrets가 모두 등록되어 있어야 합니다.

**경로:** GitHub 저장소 → Settings → Secrets and variables → Actions

| Secret 이름 | 필수 | 설명 |
| :--- | :---: | :--- |
| `VITE_GOOGLE_MAPS_API_KEY` | ✅ | 브라우저 지도 표시용 (HTTP Referrer 제한 가능) |
| `VITE_GOOGLE_GEOCODING_API_KEY` | ✅ | 서버 사이드 주소→좌표 변환용 (**제한 없음 또는 IP 제한 권장**) |
| `VITE_GOOGLE_MAPS_MAP_ID` | ✅ | Google Maps Advanced Markers Map ID |
| `VITE_GA_ID` | ✅ | Google Analytics 4 측정 ID |
| `SHEET_ID` | ✅ | Google Sheets 문서 ID |
| `SHEET_NAME` | — | 시트 탭 이름 (미설정 시 기본값 `company` 사용) |

> ⚠️ `VITE_GOOGLE_GEOCODING_API_KEY`와 `VITE_GOOGLE_MAPS_API_KEY`는 **서로 다른 키**를 사용하는 것을 권장합니다.  
> Geocoding 키는 Google Cloud Console에서 **"API 제한 없음"** 또는 **"IP 제한"**으로 설정하세요.

---

## 🚀 6. 배포 (Deployment)

`main` 브랜치에 커밋이 push되면 **deploy.yml** 워크플로우가 자동으로 실행됩니다.

```
코드/데이터 push → Sync (좌표 계산) → Build → GitHub Pages 배포
```

- 배포 소요 시간: 약 2~3분
- 배포 결과 확인: GitHub Actions 탭 → Deploy to GitHub Pages

---

## ⚠️ 운영 시 유의사항

1. **`id` 변경 금지:** 한번 등록된 기업 ID는 URL 파라미터 및 좌표 캐시 키로 사용됩니다. 변경 시 해당 기업의 좌표가 사라지고 공유된 링크가 깨집니다.

2. **주소 정확성:** 주소 오타 시 엉뚱한 위치에 마커가 표시됩니다. 정확한 도로명 주소를 사용하세요.

3. **파일명 대소문자 구분:** `Logo.png`와 `logo.png`는 서버에서 다른 파일입니다. 구글 시트에 입력한 파일명과 실제 업로드 파일명이 완전히 일치해야 합니다.

4. **시트 헤더 행 유지:** 첫 번째 행(컬럼명)을 임의로 수정하거나 순서를 변경하면 동기화가 실패합니다.

5. **대량 수정 전 백업:** 시트를 복사(탭 우클릭 → 복사)하여 백업 후 작업하세요.

6. **빈 행 주의:** 시트 중간에 완전히 빈 행이 있으면 그 이후 데이터는 무시될 수 있습니다.

---

**기술 문의:** 프로젝트 GitHub Issues 또는 담당 개발자에게 문의하세요.
