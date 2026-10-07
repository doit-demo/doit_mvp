# 신규 프로젝트 Audit

2026-10-07: 시작 시 .git만 존재. 소스/기존 실행/API/DB/테스트/정상 기능 없음. 이후 설계 문서만 추가된 상태에서 신규 제작 승인.

사용자 변경: 로컬 선행 개발 대신 작은 MVP를 Cloudflare에 즉시 배포하고 반복 검증/보완.

변경 영향: 기존 서비스 영향 없음. 신규 Worker doit-r02, D1 doit-r02, 비공개 R2 doit-r02-evidence 생성. 브랜치 codex/doit-r02-cloud.

설계 변경: Python/FastAPI/SQLite 로컬 파일 저장을 TypeScript Workers/D1/R2로 대체. React 유지. 데스크톱 터미널 및 로컬 프로세스 종료 검증은 후순위. 이전 docs/superpowers 문서는 초기 설계 이력이며 최신 결정은 CLOUD_EXECUTION.md와 BUILD_REPORT.md가 우선.

환경: Node 24.21.0, Python 3.13.15. Wrangler 4.148.0. Windows workerd의 접근 위반은 샌드박스 밖에서도 재현됨. 로컬 SQLite 바인딩 어댑터로 도메인 테스트 후 실제 Cloudflare API/브라우저에서 재검증.

기밀: private/에 생성된 임의 테스트 비밀번호와 seed SQL, .wrangler 및 런타임 데이터를 Git 제외. 비밀번호나 Cloudflare 토큰을 소스에 고정하지 않음.
