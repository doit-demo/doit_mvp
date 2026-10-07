# DOIT R0.2 설계 초안

상태: 사용자 검토 중. 신규 프로젝트 및 PC 로컬 검증 후 Cloudflare를 통한 기기 분리 실증 방향은 사용자 확인됨. 제품 구현은 아직 시작하지 않음.

## 1. 사전 점검과 목적

- 2026-10-07 작업 폴더에는 .git만 있으며 추적 파일, 커밋, 원격 저장소가 없다.
- 사용자가 신규 프로젝트임을 확인했다. 기존 실행 방식, CORE API, DB, 테스트, 정상 동작 기능은 모두 해당 없음이다.
- Node.js와 Python 실행 파일이 설치되어 있다. 의존성 호환성과 버전은 구현 준비 단계에서 검증한다.
- 변경 영향: 기존 제품 영향 없음. CORE, DB, 웹 APP, 파일 저장소, 개발 터미널, 테스트 및 실행 문서를 신규 작성한다.
- 목표: Client 의뢰 → Admin 배정 → Agent 수락/실행/증거 제출 → Admin 검증/완료 → Client 결과 확인을 동일한 CORE 데이터로 연결한다.
- 결제, 정산, Wallet, 포인트, 구독, 공개입찰, 자동매칭, AI 분석, 스트리밍은 제외한다.

## 2. 구현 방식 비교 및 제안

1. **제안: Python FastAPI CORE + SQLAlchemy/SQLite + React/TypeScript 웹 + Electron 개발 터미널.** DB 접근을 분리하고 Windows 터미널의 APP 세션과 서버 생명주기를 함께 관리한다. Python/Node 두 런타임의 설치와 실행 관리가 필요하다.
2. Node.js 기반 CORE + 동일 웹/터미널: 언어 통일에 유리하지만 DB/인증/파일 검증 계층을 별도로 구성해야 한다.
3. Python CORE + 서버 렌더링 웹 + Windows 전용 터미널: 프론트 빌드 구성이 작지만 모바일 화면과 독립 APP 세션을 위한 별도 작업이 늘어난다.

구체적인 패키지 버전은 설치 환경 호환성을 확인한 뒤 고정한다. DS Energy Platform의 실제 화면/코드는 제공되지 않았으므로 요청한 탭, 상태 표시, 생명주기 동작을 기준으로 구현한다.

## 3. 경계와 파일 구조

- `core/`: config, auth, users, tasks, assignments, execution, geo, evidence, verification, reports, audit, storage 모듈.
- `web/`: /client, /agent, /admin 화면 및 공통 API 클라이언트. 한국어 UI와 모바일 우선 Agent 화면.
- `terminal/`: Electron 메인 프로세스, CORE/관리자/에이전트/의뢰인 탭, 역할별 독립 세션.
- `migrations/`, `tests/`, `scripts/`, `docs/`: DB 버전 관리, 자동 검증, 실행 도구, 운영 안내.
- 런타임 DB·업로드·로그는 설정된 데이터 경로에 보관하고 Git에서 제외한다.
- 모든 도메인 데이터 변경은 /api를 거친다. Electron IPC는 실행/종료 등 로컬 프로세스 관리에 한정한다.
- production에서는 CORE와 웹을 독립 배포할 수 있고 Electron 설치를 요구하지 않는다.

### 사용자 확정 검증 순서: 로컬 우선, 이후 Cloudflare

1. **PC 내부 검증:** CORE·SQLite·파일 저장소·개발 터미널을 한 PC에서 실행한다. Client/Agent/Admin을 독립 세션으로 로그인하여 전체 흐름과 권한을 검증한다. 이 단계는 Cloudflare 계정이나 도메인 없이 실행 가능해야 한다.
2. **외부 접속 연결:** 로컬 검증 후 Cloudflare Tunnel로 같은 PC의 웹 서비스에 HTTPS 접속 경로를 만든다. 웹 빌드와 /api를 하나의 origin에서 제공하고 프론트의 API 요청은 상대 경로를 기본으로 한다. 터널 도입을 위해 DB를 복제하거나 CORE를 별도로 만들지 않는다.
3. **기기 분리 실증:** Admin은 PC, Agent는 현장 스마트폰, Client는 별도 PC 또는 스마트폰에서 각각 로그인한다. 서로 다른 네트워크에서도 의뢰·배정·GPS/사진/영상 제출·검증·완료·결과 조회를 같은 Task ID로 확인한다.

Cloudflare는 우선 PC 서비스로 연결하는 접속 경로이며 CORE/DB/파일을 Cloudflare에 이전하는 작업은 이번 단계에 포함하지 않는다. PC와 CORE, 터널이 실행되는 동안 외부 접속이 가능하다. 외부 디바이스에는 Electron 설치가 필요 없다.

도메인이 정해지기 전 일시적 접속 확인에는 Quick Tunnel을 사용할 수 있다. 반복 실증에서는 고정 호스트명의 관리형 Tunnel을 제안한다. 계정·도메인·터널 자격 증명은 외부 검증 단계에 설정하며 저장소에 넣지 않는다. 터널은 초기 PC 실행 시 자동으로 열지 않고 외부 검증 모드에서 명시적으로 실행한다.

외부 검증에서는 공개 origin/허용 host/CSRF origin, Secure 쿠키, 신뢰할 proxy 범위를 설정한다. localhost용 세션과 HTTPS용 세션은 별개로 취급하며 전환 시 다시 로그인한다. 개발 서버 대신 빌드된 웹을 제공하고 인증 응답·Evidence에 private/no-store 정책을 적용한다. CORE 종료 제어와 개발 진단 기능은 공개 HTTP 라우트로 노출하지 않는다.

영상 업로드 크기·시간 제한은 사용 중인 Cloudflare 설정과 실제 네트워크에서 확인하고 앱 제한에 반영한다. 초과 시 파일을 조용히 유실하지 않고 오류를 표시한다. 이 단계의 터널 프로세스는 터미널이 소유·관리하며 종료 시 먼저 신규 외부 접속을 중단한 뒤 CORE 종료 순서를 따른다. 외부 기기의 브라우저 창 자체를 종료할 수는 없으므로 연결 종료 상태를 안내한다.

## 4. DB와 상태 전이

Users, Sessions, Tasks, Assignments, Evidence, Verifications, AuditEvents를 둔다. 파일 바이너리는 DB에 넣지 않는다. DB 저장소 계층과 마이그레이션을 분리한다.

Task는 Client FK 하나, Agent 배정은 Task당 하나만 허용한다. 표시 ID와 내부 ID를 구분하며 동시 생성에서도 유일성을 보장한다. Task에는 업무 내용, 요청사항, 요구 사진/영상 설명, 목적지 명칭·주소·위경도, 상태, 생성/갱신/실행/제출/완료 시각을 기록한다.

| 출발 | 도착 | 실행 주체 |
|---|---|---|
| 생성 | REQUESTED | CLIENT |
| REQUESTED | ASSIGNED | ADMIN |
| ASSIGNED | ACCEPTED | 배정 AGENT |
| ACCEPTED | IN_PROGRESS | 배정 AGENT |
| IN_PROGRESS | SUBMITTED | 배정 AGENT |
| SUBMITTED | VERIFIED | ADMIN |
| SUBMITTED | IN_PROGRESS | ADMIN, 재수행 사유 필수 |
| VERIFIED | COMPLETED | ADMIN |

범용 상태 수정 API를 제공하지 않는다. 각 행동 API에서 권한, 소유권, 현재 상태를 확인하고 조건부 갱신과 Audit를 하나의 DB 트랜잭션으로 처리한다. 중복·경합·잘못된 전이는 409로 거부한다. 재수행은 새 수행 회차로 구분하고 과거 Evidence와 검증 결과를 보존한다.

## 5. 인증과 API 권한

서버 세션과 HttpOnly 쿠키, 비밀번호 해시, 로그인 요청 제한, CSRF 방어를 사용한다. 운영 설정에서는 HTTPS와 Secure 쿠키를 요구한다. 역할은 서버에서 읽으며 요청 본문의 actor/role을 신뢰하지 않는다.

Client는 자기 Task만, Agent는 배정된 Task만, Admin은 전체를 조회한다. Evidence 원본·썸네일·영상 Range 요청과 Report에도 동일한 객체 권한을 적용한다. 저장소를 공개 정적 디렉터리로 노출하지 않는다.

인증, Task 생성/목록/상세, Agent 목록/배정, 수락/시작/제출, Evidence 등록/조회, 검증/재수행/완료, Report, GEO, Health API를 제공한다. 무단 접근과 입력 오류는 일관된 오류 응답으로 처리하고 화면에서 재시도 방법을 안내한다.

개발 샘플 계정과 REQUESTED 샘플 Task 하나를 명시적 seed 명령으로 제공한다. 운영 환경에서는 개발 seed를 금지하고 비밀번호를 코드에 고정하지 않는다.

## 6. Evidence와 Report

JPG/JPEG/PNG/WEBP, MP4/WEBM만 허용한다. 확장자·선언 MIME·실제 파일 형식을 검증하고 파일/요청 크기를 제한한다. 서버가 저장 경로와 UUID를 생성하며 사용자 파일명을 경로로 사용하지 않는다.

Evidence ID, Task/Agent/수행 회차, 원본 이름, MIME, 크기, 상대 저장 경로, 서버 등록 시각, 선택적 촬영 시각, GPS/정확도/수집 시각, SHA-256, 메모를 기록한다. 기기 촬영 시각과 GPS는 제출 정보이며 검증된 사실로 표시하지 않는다.

임시 파일 업로드 → 검증/해시 → 고유 원본 경로 저장 → 메타데이터/Audit 기록 순으로 처리하며 실패한 임시·고아 파일을 정리한다. 원본 덮어쓰기는 금지한다. 교체가 필요하면 새 Evidence를 만들고 기존 Evidence를 논리적으로 제외하여 이유와 연결 관계를 Audit에 남긴다. 변경은 배정 Agent의 IN_PROGRESS 상태에서만 허용한다.

제출 시 현재 수행 회차에 유효 Evidence가 하나 이상 있어야 한다. 사진과 영상을 모두 강제하는 것은 기본 업무 규칙으로 추가하지 않는다. 최종 Acceptance Test에서는 GPS·사진·영상·메모를 모두 제출한다.

Client 상세의 Web Report에 업무 내용, 양측 사용자, 위치, 수행 일시, 사진 확대/동영상 재생, 메모, 거리, 검증 결과, Timeline을 표시한다. Report 데이터 조립 계층을 분리하여 PDF를 추후 추가할 수 있게 한다.

## 7. GEO와 모바일

Provider 독립적인 좌표/주소 모델, geocoding/reverse geocoding 인터페이스, Haversine 거리와 geofence 계산을 제공한다. VWorld 어댑터 경계를 마련하고 키가 없으면 수동 주소/좌표 입력과 지도 위치 선택을 사용한다. Mock 결과는 명시적으로 표시하며 실제 지오코딩 성공으로 취급하지 않는다.

키 없이 사용할 지도 UI와 설정 가능한 타일 소스를 제공한다. 타일 네트워크 장애 시 좌표 입력은 유지하고 지도 오류를 표시한다. Target/Evidence 마커와 미터 단위 거리를 표시하며 좌표가 없으면 거리를 계산한 것처럼 표시하지 않는다.

모바일 Web/PWA에서 카메라 capture 입력과 GPS 수집, 권한 거부/파일 크기 오류/업로드 실패 안내를 제공한다. 오프라인 제출 동기화는 범위 밖이다. 민감 API 및 Evidence를 서비스워커 캐시에 저장하지 않는다.

스마트폰 GPS는 신뢰된 HTTPS 환경에서 검증한다. PC의 localhost 예외는 휴대폰의 LAN IP 접속에 적용되지 않으므로 HTTPS 설정과 실제 기기 테스트 절차를 문서화한다.

## 8. Development Terminal

START_DOIT_TERMINAL.vbs는 숨김 실행, DEBUG.bat는 콘솔 로그 실행을 제공한다. 터미널은 DOIT R0.2 버전, CORE/DB/API/GEO/STORAGE 실제 상태와 오류를 표시한다. GEO fallback은 실 provider 정상 상태와 구분한다.

시작: 중복 실행 잠금 → 소유 프로세스/포트 확인 → 이전 DOIT 프로세스 정리 → CORE 시작 → Health/DB/Storage 확인 → APP 사용 가능 상태.

프로세스 소유권은 PID만으로 판단하지 않고 경로·생성 시각·실행 식별자를 확인한다. 다른 프로그램이 사용하는 포트는 강제 종료하지 않고 충돌을 안내하며 시작을 중단한다.

종료: APP 창/세션 정리 → 신규 요청 차단 → 진행 요청 제한 시간 대기 → DB 연결 종료 → CORE 종료 확인 → 소유 자식 프로세스 정리 → 포트 해제 확인 → 터미널 종료. 제어 채널은 로컬 소유 프로세스에만 노출한다.

터미널 비정상 종료에도 CORE가 남지 않도록 부모 생존 감시와 Windows 프로세스 그룹 관리 방식을 구현·검증한다. 정상 종료, 시작 중 실패, 중복 실행, 비정상 종료 각각을 테스트한다.

## 9. 단계와 검증

사용자가 제시한 12단계를 유지한다: 현황 Audit → DB/상태 → Auth/RBAC → Client Task → Admin 배정 → Agent 실행 → Evidence → GEO → 검증 → Report → Terminal → E2E.

각 단계에서 관련 자동 테스트와 이전 핵심 회귀 테스트를 실행한다. 별도 test DB/storage를 사용하며 사용자 데이터를 수정하지 않는다. 의미 있는 단계마다 Git checkpoint를 만든다.

필수 테스트: Task 생성, 다른 Client 조회 차단, 배정, 미배정 Agent 차단, 수락, 시작, 사진/영상 업로드, SHA-256, Task 연결, 다른 Agent 업로드 차단, Agent 검증 금지, Admin 검증, Client Evidence 조회/타인 차단, 상태 건너뛰기 금지, Audit, 종료 후 CORE/포트 해제.

추가 검증: 재수행 회차, 동시 배정/전이, 파일 위장/경로 탈출, 크기 제한, 인증 없는 영상 접근, 지도 fallback, 업로드 실패 정리, 역할별 동시 로그인.

먼저 PC 내 동일 CORE에서 전체 사용자 시나리오를 브라우저 자동화로 확인한다. 로컬 검증 통과 후 Cloudflare HTTPS 경로로 Agent/Client 기기를 분리하여 실제 스마트폰 촬영/GPS, 영상 업로드·재생, 다른 네트워크 접속, 역할/소유권 차단과 Audit를 검증한다. 터미널 종료 시 CORE·소유 터널·포트 정리와 외부 접속 종료도 확인한다.

로컬 자동화 결과, Windows 창 종료 결과, Cloudflare 연결 결과, 실제 기기 실증 결과를 구분하여 기록한다. 실제 기기 검증을 하지 못하면 미검증으로 표시하며 Acceptance Test 전체 완료를 주장하지 않는다.

## 10. 결과 보고와 근거

DOIT R0.2 BUILD REPORT에 기존 코드 진단, 변경/신규 파일, Migration, 완료/미구현 기능, 테스트별 PASS/FAIL/미실행, 임시 보안 구현, 실행 방법, 알려진 문제, R0.3 권장 작업을 기록한다. 실패가 있으면 완료로 표시하지 않는다.

- Electron APP별 세션 분리: https://www.electronjs.org/docs/latest/api/session
- Electron 창 관리: https://www.electronjs.org/docs/latest/api/browser-window/
- 모바일 위치 API의 HTTPS/권한 조건: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- Cloudflare 로컬 서비스 연결: https://developers.cloudflare.com/tunnel/get-started/
- 임시 검증용 Quick Tunnel: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

다음 순서: 사용자 설계 검토 → 구현 계획 작성 및 실행 방식 확인 → 제품 코드 구현.
