# DOIT R0.2.2

Cloudflare에서 실행되는 1:1 현장 업무 Execution MVP입니다. 결제 기능은 포함하지 않습니다.

- 의뢰인: https://doit-r02.namcot.workers.dev/client
- 에이전트: https://doit-r02.namcot.workers.dev/agent
- 관리자: https://doit-r02.namcot.workers.dev/admin
- 상태: https://doit-r02.namcot.workers.dev/api/health

테스트 계정은 로컬 `private/TEST_ACCOUNTS.md`에 있습니다. 비밀번호와 seed SQL은 Git에서 제외합니다.

CORE는 TypeScript Workers, 웹은 React, DB는 D1, 원본 파일은 비공개 R2를 사용합니다. 모든 변경은 CORE API가 권한과 상태를 검사한 뒤 처리합니다.

```powershell
npm ci
npm run check
npm test
npm run build
```

배포·장애 대응은 [RUNBOOK](docs/RUNBOOK.md), 구현 범위와 검증 결과는 [BUILD_REPORT](docs/BUILD_REPORT.md), 실기기 검증은 [FIELD_TEST](docs/FIELD_TEST.md)를 참조하세요.

사용자의 Cloudflare 우선 제작 지시에 따라 기존 로컬/Electron 계획을 변경했습니다. VBS 개발 터미널은 아직 제공하지 않습니다.
