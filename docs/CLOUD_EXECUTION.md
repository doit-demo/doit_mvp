# DOIT R0.2 Cloud 우선 실행 기록

2026-10-07 사용자가 PC 우선 제작을 변경: MVP 즉시 Cloudflare 배포, 구동 확인 후 반복 보완.

이 문서는 이전 Python/Electron/Cloudflare Tunnel 계획의 배포 방식과 순서를 대체한다. 기능과 권한, 상태, Evidence, Audit 요구는 유지한다.

- CORE: TypeScript Workers. 웹: React. DB: D1. 파일: 비공개 R2.
- 1차: 로그인/RBAC/Task/배정/상태/Audit/기본 보고 화면을 구현·테스트하고 즉시 배포.
- 2차: R2 Evidence, 지도/GPS, 재수행/검증/보고를 연결하고 같은 URL에 갱신 배포.
- 3차: 실제 배포 URL E2E, 오류 수정, 모바일 실기기 검증 안내.
- 데스크톱 터미널은 초기 배포의 선행 조건에서 제외하고 후속 작업으로 남긴다.
- Ruling: 새 제작·배포 지시를 현재 세션 직접 실행의 승인으로 적용. 새 설계 승인 대기를 반복하지 않는다.
- Ruling: 신규 빈 저장소에서 별도 codex/doit-r02-cloud 브랜치로 구현. 별도 worktree는 생성하지 않는다.
- Cloudflare 계정 연결 확인. R2는 계정에서 비활성 상태여서 사용자에게 활성화를 요청했다. DB 바이너리 대체 저장은 하지 않는다.

## 진행
- [x] 기존 폴더 Audit: 문서만 존재, 제품 코드 없음.
- [x] Cloudflare 계정 연결 확인.
- [ ] CORE 및 웹 테스트/구현.
- [ ] 첫 배포와 HTTPS 확인.
- [ ] Evidence/지도/보고 및 회귀 검증.
- [ ] 배포 후 전체 흐름 재검증 및 보고.
