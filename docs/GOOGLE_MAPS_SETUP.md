# Google 지도·주소 검색 전환

사용자가 2026-10-07 Google 지도와 주소 검색으로 전환을 선택했습니다. 코드는 준비했지만 Google 키가 아직 제공되지 않아 실제 API 검증과 배포는 대기 중입니다. 현재 공개 서비스는 기존 VWorld 배포를 유지합니다.

## 키 준비
Google Cloud 프로젝트에 결제를 연결하고 Maps JavaScript API 및 Geocoding API를 활성화합니다. 브라우저용 키의 애플리케이션 제한을 웹사이트로 설정하고 `https://doit-r02.namcot.workers.dev/*`를 허용합니다. API 제한은 두 API로 설정합니다. 사용량 한도도 프로젝트에서 관리합니다.

Cloudflare Secret 이름은 `GOOGLE_MAPS_BROWSER_KEY`입니다. 로컬 .env에도 같은 이름을 사용합니다. 키는 정적 번들에 포함하지 않고 인증된 `/api/geo/config`에서 전달합니다. 브라우저 지도 API 특성상 사용자의 네트워크 요청에는 키가 나타납니다. Google 키가 없으면 기존 VWorld/OSM이 유지됩니다.

공식 설정: https://developers.google.com/maps/documentation/javascript/get-api-key
검색 서비스: https://developers.google.com/maps/documentation/javascript/geocoding

## 구현과 검증 범위
- Google Maps JavaScript loader, 지도 표시, 목적지 및 Evidence 위치, 클릭 좌표 조정.
- 원문 주소 검색, 선택적 국가 제한, 최대 5개 후보, 부분 일치/대략적 위치 표시.
- 사용자 선택 후 지도와 좌표 갱신. 주소/국가 변경 시 이전 좌표 초기화.
- 늦게 도착한 응답 무시, 검색 결과 없음/시간 초과/설정 오류 안내.
- 원문 입력 주소를 보존하며 Google의 정규화 주소는 후보 화면에서만 표시합니다.
- 단위/통합 39개 PASS, 타입 검사/빌드 PASS. `node scripts/address-ui-test.mjs`는 외부 API를 모의한 UI 회귀이며 실제 일본/영문/한국 주소 정확도를 검증하지 않습니다.

키 제공 후 실제 HTTPS 환경에서 지도/Geocoder/콘텐츠 보안 정책을 검증하고 공개 약관·개인정보 안내를 추가해야 합니다. Google 결과의 저장 제한에 맞게 현재 Task의 영구 좌표 저장 방식도 조정해야 하므로, 검색 결과 좌표의 무기한 저장을 전제로 운영 자료를 넣지 않습니다. Place ID는 장기 보관이 가능한 식별자이므로 검색 출처와 함께 저장하고 필요 시 재조회하는 방식을 검토합니다.

정책 참고: https://developers.google.com/maps/documentation/javascript/policies
