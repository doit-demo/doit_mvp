# VWorld 연동 상태 — R0.2.3

## 최신 결과
사용자가 새 인증키의 DOIT 서비스 URL 등록 및 도메인 제한 설정 완료를 확인했습니다. 새 키를 로컬 .env와 Cloudflare Secret에 교체하고 VWORLD_BROWSER_ENABLED=true로 활성화했습니다.

배포: `2b57bb13-0fac-4726-a9bc-c745b886552b`. 실제 배포 URL에서 Client/Agent/Admin 모두 VWorld PNG 렌더링 PASS, Client 지도 클릭 좌표 선택 PASS, JS 오류 없음. 정적 JS 번들에 키 없음도 검사했습니다. 브라우저 직접 요청에는 승인된 설계대로 지도 키가 포함됩니다.

도메인 제한 설정은 사용자 확인에 근거합니다. 서버에서 Referer를 바꾼 요청은 여전히 둘 다 PNG를 반환하므로 제한의 차단 효과는 검증되지 않았습니다. 이전 서버 중계 520 문제는 해결됐다고 주장하지 않으며 현재 직접 연결로 동작합니다. 아래는 전환 이전 조사 기록입니다.

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
