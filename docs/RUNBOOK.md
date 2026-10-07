# 실행 및 운영

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
