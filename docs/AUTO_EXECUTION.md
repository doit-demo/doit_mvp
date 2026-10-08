# 자동 전달 흐름 (2026-10-07)

사용자 변경: Client 의뢰는 자동으로 Agent에게, Agent 보고는 관리자 승인 대기 없이 Client에게 전달합니다.

- 등록 batch에서 REQUESTED 생성 이력 후 ASSIGNED 전환 및 자동 배정 이력을 기록합니다.
- auto_assign_enabled=1인 Agent 중 미완료 업무 수가 적은 계정 우선. 동률은 생성 시각/ID 순서. 소유권 검사용 otheragent@doit.test는 자동 배정 대상에서 제외합니다.
- 기존 미배정 의뢰도 migration 0003으로 배정합니다. 가용 계정이 전혀 없으면 REQUESTED로 남습니다. 신규 Agent 추가 후 대기 업무 재배정 자동 실행은 아직 없습니다.
- 관리자 수동 배정 API/UI 제거. 관리자 검토 승인·재수행 요청 유지. 최종 완료 권한은 Client에게 이전.
- Agent SUBMITTED 이후 해당 Client가 즉시 보고서를 열고 완료 가능. 관리자 VERIFIED는 선택적 검토 단계로 유지.
- migration 0004는 SUBMITTED→COMPLETED 전이를 추가합니다. 모든 상태 변경은 CORE 및 Audit을 통합니다.
- 타입 검사/빌드/배포만 수행했습니다. 사용자 요청에 따라 회귀·실환경 흐름 테스트는 실행하지 않았으며 기존 수동 배정 기반 테스트는 새 흐름에 맞춘 후속 갱신이 필요합니다.
