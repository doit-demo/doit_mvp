# VWorld 연동 상태 — R0.2.3

2026-10-07. 사용자 승인: 도메인 제한 후 브라우저 직접 연동.

- 인증키: Cloudflare Worker Secret 및 Git 제외 .env에 저장. 정적 소스/번들에 포함하지 않음.
- CORE 타일 중계 구현 및 권한/입력/오류 테스트: PASS. 실제 Cloudflare→VWorld 요청은 upstream 520으로 FAIL.
- 로컬 동일 키 지도 PNG: 200, 27,496 bytes. DOIT 및 다른 도메인 Referer에서 동일 응답으로 도메인 제한 확인 불가.
- Workers의 redirect:error 미지원 오류는 manual로 수정. 수정 후에도 upstream 520 지속. 요청 헤더 정규화 후에도 동일.
- 직접 연결 코드와 활성화 스위치 구현: PASS. 실제 VWorld 브라우저 표시는 도메인 제한 확인 대기이므로 미실행.
- 단위/통합 테스트 38개 PASS, 타입 검사 및 빌드 PASS.
- 배포 버전: d4d54f73-2943-4de0-b2ec-88718317b1fb. 기존 OSM 대체 지도 사용 중.
- 주소 검색은 이번 지도 타일 연동 범위에 포함하지 않음.

추가 DB migration 없음. VWorld 설정 확인 후 VWORLD_BROWSER_ENABLED를 활성화하고 세 역할 화면에서 지도 PNG 렌더링과 목적지 선택을 검증해야 합니다. 브라우저 직접 연결 시 지도 키는 사용자에게 보이며 서버 전용 비밀키처럼 숨길 수 없습니다.
