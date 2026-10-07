# DOIT R0.2.2 BUILD REPORT

2026-10-07 KST. Cloudflare에 배포한 검증용 MVP입니다. 원래 R0.2 전체 요구사항의 최종 완료를 의미하지 않습니다.

## 기존 코드 진단 및 변경 영향
시작 시 저장소에는 제품 코드가 없었습니다. 기존 API·DB·테스트·정상 동작 기능도 없었으며 신규 프로젝트로 진행했습니다. 상세 진단은 AUDIT.md에 기록했습니다. 사용자의 Cloudflare 우선 제작 지시에 따라 Workers/D1/R2와 React를 도입하고 로컬 Electron 터미널을 후속 범위로 변경했습니다.

## 파일 및 DB 변경
최초 MVP: core/{worker,auth,http,tasks,evidence,assets}.ts, web/{App,api,LocationMap}.tsx/ts 및 CSS, migrations/0001_initial.sql, build/seed/live-test/ui-flow 스크립트, SQLite 어댑터 테스트, Wrangler 설정.

이번 보완: core/evidence.ts의 파일 구조 검사·GPS 시각 저장·DB 오류 후 원본 보존, core/tasks.ts의 페이지 번호 검사, web/App.tsx의 15초 자동 갱신·GPS 처리, 테스트와 버전 설정을 변경했습니다. core/media.ts, web/gps.ts, tests/gps.test.mjs, 실제 이미지 fixture, 0002 migration과 실행 문서를 추가했습니다.

0001: users/sessions/login_limits/tasks/assignments/evidence/verifications/audit 및 상태·Audit 보호 trigger. 0002: evidence.location_recorded_at nullable TEXT 추가. 모두 원격 D1에 적용했습니다. 기존 행을 삭제하지 않았습니다.

## 구현 기능
- 역할별 로그인, 서버 세션, 소유권/RBAC, CSRF·Origin 검사, 로그인 시도 제한.
- Client 의뢰, Admin 단일 Agent 배정, Agent 수락·시작·증거 등록·제출.
- 서버 상태 순서 강제, Admin 재수행 사유/회차·승인·완료 처리, 변경 Audit.
- 사진·영상 원본 R2 비공개 저장, UUID, SHA256, 크기/확장자/MIME/구조 검사.
- 인증된 원본 조회 및 영상 Range 재생, 메모/GPS·정확도·기록 시각, 목적지 거리.
- 지도 좌표 선택, 역할별 목록·보고서·사진/영상·타임라인, 주기적 화면 갱신.
- Evidence 제외 API는 원본 보존 및 Audit 기록. 화면 버튼은 미구현.

## 검증 결과
배포 버전: R0.2.2 / `fd180382-1e64-41c4-bdc7-6652d8bb9536`.

| 검증 | 결과 | 근거/범위 |
|---|---|---|
| TypeScript 검사·번들 빌드 | PASS | npm run check / npm run build |
| 단위·SQLite 통합 | PASS | 35 tests, 0 failures |
| 권한·상태 건너뛰기·CSRF·재수행 | PASS | 통합 회귀 테스트 |
| 헤더만 있는 가짜 파일·초과 용량 | PASS | JPEG/MP4 거부 및 413 검사 |
| GPS 재수집 실패 시 이전 좌표 제거 | PASS | 위치 시각 포함 단위 테스트 |
| 실제 Cloudflare API 흐름 | PASS | 21단계, 2026-10-07 02:17 UTC |
| 실제 HTTPS 브라우저 흐름 | PASS | Edge 6단계, JS 오류 0, 02:18 UTC |
| 실제 PNG·WEBM 업로드/재생 | PASS | D1/R2 연계, 원본 hash/Range/권한 검사 |
| 의존성 audit | PASS | 설치 당시 취약점 0 |
| Windows workerd 로컬 실행 | FAIL | 접근 위반 종료, 해결되지 않음 |
| 실제 휴대폰 카메라/GPS·망 전환 | 미실행 | 브라우저 모바일 모사 및 모의 GPS만 검증 |
| 모든 JPEG/WEBP/MP4 코덱 호환성 | 미실행 | 지원 선언과 실제 기기별 재생 보장은 별개 |
| 대용량 동시 업로드 부하 | 미실행 | 현재 파일당 25MB, 메모리 내 multipart 처리 |
| VBS 터미널 종료·포트 정리 | 미구현 | Cloudflare 우선 변경으로 후속 범위 |

로컬 테스트의 injected database failure 로그는 의도한 오류 주입입니다. 결과 원본은 Git 제외된 test-results/live-results.json, ui-results.json과 화면 캡처에 있습니다. 실환경 테스트 자료에는 테스트 표시가 있으며 실제 현장 수행을 증명하지 않습니다.

## 임시 보안 구현 및 알려진 문제
테스트 계정만 제공하며 사용자 초대·비밀번호 변경/복구·MFA는 아직 없습니다. 비밀번호는 salted PBKDF2-SHA256 100,000회, 세션은 8시간입니다. 비밀정보는 private/와 CLI 인증 저장소에만 보관합니다.

파일 검사는 컨테이너 구조 검사이며 완전한 코덱 디코딩·악성코드 검사·현장 진위 검증이 아닙니다. GPS와 촬영 시각은 디바이스가 제공한 값으로 위변조 방지를 보장하지 않습니다. 파일/DB 동시 트랜잭션은 없으며, DB 결과가 불명확하면 원본을 보존하도록 처리했습니다. 장애 후 고아 파일 정리 도구는 필요합니다.

만료된 로그인 제한 행 정리, 사용자 관리, 증거 제외 UI, 모바일 표 개선, VWorld/주소 검색 provider, HEIC/MOV 지원, PWA, 백업 자동화·보존 정책은 남아 있습니다. OSM 지도는 외부 타일 서비스 가용성에 의존하며 주소·좌표 직접 입력은 가능합니다. 공개 테스트 URL에는 민감한 실제 자료를 투입하기 전 계정 관리와 운영 정책을 보완해야 합니다.

결제·에스크로·정산·수수료·Wallet·포인트·구독·입찰·자동매칭은 요청에 따라 제외했습니다.

## 실행 방법과 후속 작업
README.md 및 RUNBOOK.md에 배포·검증 명령을 기록했습니다. 테스트 계정은 private/TEST_ACCOUNTS.md에서 확인합니다. 먼저 FIELD_TEST.md에 따라 서로 다른 실제 디바이스로 테스트하고 촬영 형식/GPS/통신 오류를 보완합니다. R0.3에서는 계정 운영, 저장소 정합성/백업, 업로드 스트리밍·부하 검증, 지도 provider, 필요 시 로컬 터미널을 권장합니다.
