# 실행 및 운영

## VWorld 인증키
로컬 키는 Git 제외된 `.env`의 `VWORLD_API_KEY`로 관리합니다. `.env.example`에는 변수 이름만 둡니다. 배포 환경에는 같은 이름의 Cloudflare Worker Secret으로 별도 저장했습니다. `.env` 파일 자체는 배포하지 않습니다.

R0.2.3: VWorld 서버 중계는 Cloudflare에서 upstream 520을 반환했습니다(로컬 동일 키 PNG 200). 사용자가 도메인 제한 후 브라우저 직접 요청 방식으로 전환하도록 승인했습니다. `/api/geo/config`는 로그인 사용자에게만 응답하며, `VWORLD_BROWSER_ENABLED=true`와 키가 함께 설정된 경우에만 VWorld 타일 URL을 반환합니다. 키는 정적 번들에 포함하지 않지만 직접 요청이 활성화되면 로그인한 사용자의 네트워크 요청에 표시됩니다.

현재 다른 도메인 Referer에도 이미지가 반환되어 제한을 확인하지 못했습니다. 사용자에게 VWorld 키 설정 확인을 요청했고 활성화 스위치는 꺼두었습니다. 그동안 OSM 대체 지도를 표시합니다. 제한 확인 전에는 스위치를 켜지 않습니다. 지도 장애 시에도 OSM과 좌표 입력을 유지합니다.

검증 명령 `node scripts/geo-live-test.mjs`는 기본적으로 비활성/OSM 상태를 검사합니다. 직접 연결 활성화 후에는 환경변수 `DOIT_EXPECT_VWORLD=true`로 실행하여 실제 VWorld 응답과 화면을 검증합니다. `/api/health`의 geo_status는 구성 상태이며 외부 지도 서버 실시간 가용성을 보장하지 않습니다.

## 웹 접속
서비스: https://doit-r02.namcot.workers.dev

의뢰인 `/client`, 에이전트 `/agent`, 관리자 `/admin`으로 접속합니다. 각 디바이스에서 해당 역할의 테스트 계정으로 로그인합니다. 역할별 세션 쿠키를 사용하므로 한 브라우저에서도 앱을 구분할 수 있습니다.

## 검증 및 배포
Node.js 24 환경에서 저장소 루트를 사용합니다. Cloudflare CLI 로그인 권한이 필요합니다.

```powershell
npm ci
npm run check
npm test
npm run build
npm exec -- wrangler d1 migrations apply doit-r02 --remote
npm exec -- wrangler deploy
node scripts/live-test.mjs
node scripts/ui-flow.mjs
```

각 명령 성공 후 다음 명령을 실행합니다. 실환경 테스트는 D1/R2에 명시적으로 테스트라고 표시된 업무와 자료를 생성합니다. `ui-flow`는 Microsoft Edge와 로컬 `private/test-accounts.json`, 테스트 fixture를 사용합니다. 결과는 Git 제외된 `test-results/`에 기록합니다.

`scripts/seed.mjs`는 초기 계정 생성용입니다. 이미 운영 중인 환경에서 반복 실행하지 마세요. 새 비밀번호 파일과 기존 DB의 비밀번호가 달라질 수 있습니다. 계정 파일이나 Cloudflare 인증 파일을 공개 저장소에 넣지 않습니다.

## 상태 및 장애
`/api/health`에서 core/api/db/storage/ready를 확인합니다. GEO의 fallback은 키 없이 OSM 지도를 사용하는 상태입니다. 로그는 `npm exec -- wrangler tail`로 확인합니다.

이 PC에서는 workerd가 접근 위반으로 종료되어 `npm run dev`의 로컬 실행을 검증하지 못했습니다. 도메인 테스트는 실제 SQLite를 사용하는 D1 어댑터로 실행하며, 런타임 동작은 Cloudflare 배포 환경에서 별도 검증합니다.

현재 Worker 버전: `fd180382-1e64-41c4-bdc7-6652d8bb9536`. 문제 발생 시 Cloudflare 배포 이력에서 이전 Worker 버전으로 복원할 수 있습니다. DB migration 0002는 nullable 컬럼 추가이므로 이전 코드와 호환됩니다. Worker 롤백은 DB·R2 데이터를 복구하지 않습니다. 운영 자료 투입 전 별도 DB 내보내기와 R2 보존 정책을 정하세요.
