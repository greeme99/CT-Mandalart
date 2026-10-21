# HARNESS.md (Codex Harness System Architecture)

Codex 하네스 엔지니어링 시스템 개요 및 구성 지침이다.

---

## 1. 하네스 구성요소

1. **지침 파일 (.md)**
   - `AGENTS.md` / `CODEX.md`: Codex 에이전트 핵심 행동 수칙 및 기술 규격
   - `DESIGN.md`: 통합 듀얼 테마 표준 디자인 토큰 시스템 (1/2순위 탐색 수칙)
   - `HARNESS.md`: 하네스 아키텍처 및 도구 연결 가이드

2. **자동화 검증 스킬 (Check-up)**
   - `/doctor`: 시스템 및 하네스 환경 진단
   - Check-write Linter (`exit code 2`): 문법 및 디자인 토큰 린트 검사
   - QA Validation: 최종 인수 조건 자동 테스트 및 검증

3. **성장하는 에이전트 (Hermes Growing Agent)**
   - `memory\MEMORY.md`, `memory\USER.md`: 전역/프로젝트 메모리
   - `grow`, `curator`, `ponytail` 스킬 시스템

---

## 2. 파일 배치 및 전역 상속 구조

- **Workspace 상속 지침**: `$env:USERPROFILE\Workspace\Codex` (`AGENTS.md`, `CODEX.md`, `HARNESS.md`, `DESIGN.md`)
- **사용자 전역 설정**: `%USERPROFILE%\.codex` (`AGENTS.md`, `CODEX.md`, `DESIGN.md`, `agents/`, `hooks/`, `skills/`)
- **프로젝트 루트**: 각 프로젝트 폴더에 `AGENTS.md` / `CODEX.md` / `DESIGN.md` 독립 배치
