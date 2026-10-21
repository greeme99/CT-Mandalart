# Mandalart Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버·회원가입·빌드 없이 최종 공유 파일 `mandalart.html`을 직접 열어 1개 핵심 목표, 8개 세부 목표, 64개 실행 과제를 작성·추적·백업·이미지화할 수 있는 만다라트 플래너를 만든다.

**Architecture:** 브라우저 표준 API만 사용하는 자체 완결형 `index.html`을 작업 원본으로 유지하고, 동일한 단일 파일 `mandalart.html`을 최종 공유 산출물로 배포한다. CSS, JavaScript, 3개 프리셋을 HTML 안에 포함하고, 단일 런타임 상태를 모든 그리드·집중 모달·진척도 렌더러가 공유한다. 기존 프리셋 원본은 변경하지 않고 인라인 프리셋의 문자열 액션을 런타임 객체로 정규화하며, LocalStorage와 JSON 내보내기는 버전이 있는 정규화 스키마를 사용한다.

**Tech Stack:** HTML5, Vanilla CSS, Vanilla JavaScript, Web Storage API, File API, Canvas/SVG 브라우저 API, Node.js 내장 `node:test`(개발 검증 전용)

**Spec:** `reference/doc/만다라트 작성 앱 개발 기획안.md`, `reference/doc/만다라트-작성법.md`, `reference/Img/`, `mandalart-presets.json`, 프로젝트 루트 `DESIGN.md`

## Global Constraints

- 최종 사용 산출물은 CSS·JavaScript·프리셋을 모두 내장한 단일 `mandalart.html`이며, 이 파일 하나만 복사해 `file://`로 직접 열어도 모든 기능이 동작해야 한다.
- 런타임 서버, 로그인, 백엔드, 데이터베이스, 네트워크 전송을 도입하지 않는다.
- 구조는 핵심 목표 1개, 세부 목표 8개, 실행 과제 64개로 고정한다.
- 중앙 3×3의 세부 목표와 같은 방향 외곽 블록의 중심은 하나의 데이터 값을 공유한다.
- 기본은 Light Theme이며 `[data-theme="dark"]` 전환을 지원한다.
- 색상·간격·타이포그래피·상태색은 프로젝트 `DESIGN.md` 토큰을 사용하고 UI CSS에 임의 헥사 색을 추가하지 않는다.
- 앱의 모든 사용자 노출 시각은 `Asia/Seoul` 기준으로 표시하고 저장 데이터의 시각은 ISO 8601로 기록한다.
- 외부 CDN과 런타임 외부 라이브러리를 사용하지 않는다. PNG 내보내기는 브라우저 표준 API로 구현하고 지원 브라우저에서 시각 검증한다.
- 반응형 동작은 기기명이나 User-Agent가 아니라 viewport/container 폭, 화면 방향, pointer/hover 특성으로 결정한다.
- 구현 전 기존 파일을 수정할 때는 같은 디렉터리에 `.bak` 백업을 만든다.

---

## 1. 분석 결론과 범위 결정

### 1.1 소스 우선순위

1. `만다라트 작성 앱 개발 기획안.md`: 제품 기능과 수용 기준의 기준 문서
2. `만다라트-작성법.md`: 4단계 작성법, 안내 문구, 오타니 사례의 콘텐츠 근거
3. `reference/Img/*`: 9×9 밀도, 굵은 3×3 경계, 방향별 중앙-외곽 대응의 시각 근거
4. `DESIGN.md`: 색상·타이포그래피·테마·컴포넌트의 최종 디자인 기준

### 이미지에서 반영할 규칙

- 정사각형 81셀과 9개의 3×3 블록을 유지한다.
- 일반 셀 경계는 얇게, 3×3 블록 경계는 굵게 표시한다.
- 셀 텍스트는 중앙 정렬하고 2~4줄 줄바꿈을 허용한다.
- 중앙 핵심 목표를 가장 강하게, 중앙 3×3과 외곽 블록 중심을 다음 단계로 강조한다.
- 이미지의 노랑·초록을 복제하지 않고 `DESIGN.md`의 primary/accent/status 토큰으로 재해석한다.
- 방향 화살표는 상시 그리드가 아니라 온보딩의 동기화 설명에 사용한다.
- 카드·모달에는 18px radius를 적용하되, 표 구조를 보존하기 위해 개별 셀에는 큰 radius를 적용하지 않는다.

### 반응형 UI/UX 모드

| 레이아웃 조건 | 대표 기기 | 기본 UX |
|---|---|---|
| `>=1280px` | Desktop PC | 81칸 전체 뷰, 넓은 툴바와 영역별 진척도 동시 표시 |
| `1024~1279px` | Laptop | 압축된 전체 뷰, 툴바 간격 축소, 핵심 액션 유지 |
| `768~1023px` | Tablet/Foldable 펼침 | 툴바 줄바꿈, 전체 뷰와 3×3 집중 편집 병행 |
| `600~767px` | 소형 Tablet/Foldable | 블록 탐색기를 강조하고 3×3 집중 편집을 우선 제공 |
| `<=599px` | Bar Phone/Foldable 외부 화면 | 3×3 집중 편집을 기본 흐름으로 제공하고 81칸은 overview로 유지 |

모든 구간에서 44px 이상 터치 대상, `safe-area-inset-*`, portrait/landscape 회전, `clamp()` 타이포그래피, 페이지 가로 넘침 방지를 적용한다.

## 2. 요구사항 추적표

| ID | 요구사항 | 수용 기준 | 출처 |
|---|---|---|---|
| FR-001 | 9×9/9블록 렌더링 | 81셀, 9개 3×3 블록, 정사각형 비율과 굵은 블록 경계 | 주요 PRD REQ-1.1, 이미지 |
| FR-002 | 핵심 목표 편집 | 전체 중앙 셀에서 1개 값을 편집하고 복원 | 작성법 1단계 |
| FR-003 | 8개 세부 목표 편집 | 중앙 주변 8방향에 각각 1개 값 | 작성법 2단계 |
| FR-004 | 양방향 동기화 | 중앙 세부 목표와 같은 방향 외곽 중심 수정이 즉시 서로 반영 | 주요 PRD REQ-1.2, 이미지 |
| FR-005 | 64개 실행 과제 | 외곽 8블록마다 8개를 편집 | 작성법 4단계 |
| FR-006 | 키보드 편집 | Enter 저장·다음 셀, Shift+Enter 줄바꿈, Escape 원복 | 주요 PRD REQ-1.3 |
| FR-007 | 집중 모드 | 선택한 3×3 블록을 모달에서 편집하고 전체 뷰에 즉시 반영 | 주요 PRD REQ-1.4 |
| FR-008 | 프리셋/초기화 | 3개 프리셋과 빈 양식, 기존 데이터가 있으면 덮어쓰기 확인 | 주요 PRD REQ-2.1~2.2 |
| FR-009 | 완료 토글 | 64개 액션만 완료/해제 가능하며 취소선과 상태 스타일 표시 | 주요 PRD REQ-3.1 |
| FR-010 | 진척도 | 전체 `완료/64`와 영역별 `완료/8`을 즉시 갱신 | 주요 PRD REQ-3.2 |
| FR-011 | 온보딩/가이드 | 첫 방문 4단계 안내, 오타니 사례, 원문 출처, 언제든 재열기 | 주요 PRD REQ-4.1 |
| FR-012 | 자동 저장 | 입력 후 300ms 이내 저장, 새로고침 복원, 저장 상태 표시 | 주요 PRD REQ-5.1 |
| FR-013 | JSON 백업 | 기존 프리셋 JSON을 무수정으로 가져오고 앱의 정규화 내보내기를 다시 가져올 수 있으며, 검증 오류는 현재 상태를 보존한 채 안내 | 주요 PRD REQ-5.2 |
| FR-018 | 상단 도구 안내 | 상단 메뉴에 의미가 분명한 아이콘을 표시하고 우측 상단 매뉴얼 아이콘에서 템플릿·테마·JSON·PNG·초기화의 독립 사용자 매뉴얼을 연다 | 사용자 추가 요구 |
| FR-014 | PNG | 81칸 전체를 2× 정사각형 PNG로 저장, 한글·줄바꿈·테마 유지 | 주요 PRD REQ-5.3 |
| FR-015 | 제목/초기 포커스 | 제목 편집, 초기화 후 핵심 목표로 포커스 이동 | 주요 PRD IA/REQ-2.2 |
| FR-016 | 듀얼 테마 | Light 기본, Dark 선택, 선택값 재접속 복원 | 주요 PRD UI, DESIGN.md |
| FR-017 | 행동 문장 안내 | 측정 가능하고 실행 가능한 문장 예시를 편집 도움말에 제공 | 작성법 권장 팁 |
| NFR-001 | 독립 실행/개인정보 | 서버·로그인·외부 전송 없이 로컬에서 동작 | 주요 PRD 제품 목표 |
| NFR-002 | 능동형 반응형 | Desktop/Laptop/Tablet/Foldable/Bar Phone을 폭·방향·입력 특성에 따라 전체 뷰와 집중 모드로 전환하고 44px 터치·safe-area·무가로넘침 보장 | 주요 PRD 반응형, 사용자 추가 요구 |
| NFR-003 | 접근성 | 키보드 조작, 가시적 포커스, 모달 포커스 트랩/복귀, AA 대비 | DESIGN.md, 웹 기본 품질 |
| NFR-004 | 안전한 입력 | JSON 타입·길이·필수값 검증, 손상 저장값 안전 폴백 | 데이터 보존 요구 |

## 3. 데이터·위치 계약

```js
const SCHEMA_VERSION = 1;
const SLOT_ORDER = [0, 1, 2, 3, 5, 6, 7, 8]; // NW,N,NE,W,E,SW,S,SE

// 런타임과 저장/내보내기의 단일 형식
// { schemaVersion, id, title, coreGoal, subGoals[8], createdAt, updatedAt, theme }
// subGoal: { index: 0..7, title, sourceColor?, colorToken, actions[8] }
// action: { id: "0".."7", text, completed }
```

`subGoals[index]`는 중앙 블록의 `SLOT_ORDER[index]`와 전체 3×3 블록 배열의 `SLOT_ORDER[index]`에 동시에 매핑한다. 프리셋의 액션 문자열은 `loadPreset()`에서 `{id, text, completed:false}`로 바꾼다. 프리셋의 `color`는 `sourceColor` 메타데이터로만 보존하고 UI에는 주입하지 않으며, 실제 표시는 `index`를 8개 DESIGN accent token에 매핑한다. 호환성 계약은 **기존 프리셋 무수정 import**와 **앱 export의 재-import**이며, export는 `schemaVersion:1` 정규화 형식이므로 원본 프리셋 파일 형식과 동일하다고 주장하지 않는다.

## 4. 파일 구조

| 파일 | 책임 |
|---|---|
| `index.html` | 개발·검증 작업 원본. 시맨틱 셸, 인라인 CSS·프리셋·런타임을 모두 포함 |
| `mandalart.html` | `index.html`과 바이트 단위로 동일한 최종 단독 실행·공유 파일 |
| `tests/app.test.js` | `index.html`을 읽어 런타임 코어, 프리셋 동등성, 인라인 CSS 디자인 계약을 함께 검증 |
| `package.json` | 외부 의존성 없이 `test`, `design:lint`, `check` 명령만 제공 |

---

### Task 1: 테스트 가능한 데이터 코어와 프리셋 경계

**Files:**
- Create: `index.html`, `tests/app.test.js`, `package.json`
- Read: `mandalart-presets.json`

**Interfaces:**
- Produces: `createBlankData()`, `normalizeDocument(input)`, `validateDocument(input)`, `getCellBinding(blockSlot, cellSlot)`, `calculateProgress(data)`, `MandalartCore`

- [ ] **Step 1: 위치·정규화·진척도 실패 테스트 작성**

```js
test('eight directional center bindings are symmetric', () => {
  SLOT_ORDER.forEach((slot, index) => {
    assert.deepEqual(getCellBinding(4, slot), {type:'subGoal', index});
    assert.deepEqual(getCellBinding(slot, 4), {type:'subGoal', index});
  });
});
test('preset strings normalize to incomplete actions', () => {
  const data = normalizeDocument(PRESETS.templates[0]);
  assert.equal(data.subGoals.length, 8);
  assert.equal(data.subGoals[0].actions[0].completed, false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/app.test.js`
Expected: FAIL because the core functions are not defined.

- [ ] **Step 3: 최소 코어 구현**

`index.html#app-runtime`은 DOM 부팅과 순수 함수를 분리하고 브라우저에서는 `window.MandalartCore`로 API를 노출한다. 테스트는 해당 스크립트 내용을 Node `vm`의 격리 컨텍스트에서 평가한다. `normalizeDocument()`는 정확히 8×8로 검증하고 부족하거나 넘치는 배열을 조용히 보정하지 않고 오류를 반환한다.

```js
function normalizeAction(action, id) {
  if (typeof action === 'string') return { id: String(id), text: action, completed: false };
  if (!action || typeof action.text !== 'string') throw new TypeError(`actions[${id}].text`);
  return { id: String(id), text: action.text, completed: Boolean(action.completed) };
}
```

- [ ] **Step 4: 프리셋 동등성 검사 구현**

`tests/app.test.js`에서 원본 JSON과 `index.html#preset-data`를 읽어 `id/title/category/description/coreGoal/subGoals[].index/title/actions[]`를 deep-compare하고, 색은 원본 보존 여부만 확인한다.

- [ ] **Step 5: 코어 검증**

Run: `npm test`
Expected: all tests PASS; `3 templates, 24 subgoals, 192 actions verified`.

### Task 2: 앱 셸과 DESIGN 토큰 기반 81칸 화면

**Files:**
- Modify: `index.html`, `tests/app.test.js`, `package.json`

**Interfaces:**
- Consumes: `createBlankData()`, `getCellBinding()`
- Produces: `renderApp(state)`, `renderGridMarkup(state)`, `renderGrid(state)`, `setTheme(theme)`

- [ ] **Step 1: 구조 렌더링 테스트 추가**

DOM이 없는 Node에서도 검증할 수 있도록 `renderGridMarkup(state)`가 HTML 문자열을 반환하게 한다. 테스트는 문자열에서 9개 `.mandalart-block`, 81개 `.mandalart-cell`, 각 `data-binding`을 검사한다. 실제 `innerHTML` 반영은 Task 8의 브라우저 회귀로 검증한다.

```js
function renderGrid(state) {
  document.querySelector('#mandalart-grid').innerHTML = renderGridMarkup(state);
}
```

- [ ] **Step 2: 시맨틱 셸 구현**

`header`에는 제목·프리셋·가이드·테마·내보내기·초기화, `main`에는 전체/영역 진척도와 `aria-label="81칸 만다라트"` 그리드, `footer`에는 로컬 저장 상태를 둔다.

- [ ] **Step 3: 디자인 구현**

`DESIGN.md`의 Light/Dark 변수, 4/8/16/24/32/48 간격, 6/10/18/pill radius, Pretendard 우선 폰트 스택을 선언한다. 셀은 `aspect-ratio:1`, 얇은 내부선, 블록 사이 굵은 gap/border, 중앙 정렬과 `overflow-wrap:anywhere`를 사용한다. 디자인 계약 검사는 별도 도구를 만들지 않고 `tests/app.test.js`에서 HTML의 인라인 CSS를 읽어 검증한다.

반응형 CSS 계약 테스트는 `1280/1024/768/600px` 경계, `orientation`, `pointer:coarse`, `safe-area-inset-*`, 최소 44px 터치 대상, `overflow-x` 방지를 확인한다.

- [ ] **Step 4: 디자인 린터 구현·실행**

Run: `npm run design:lint`
Expected: PASS; 토큰 선언부 외 임의 헥사 없음, `:focus-visible` 존재, Light/Dark 필수 변수가 모두 존재.

### Task 3: 인라인 편집과 양방향 동기화

**Files:**
- Modify: `index.html`, `tests/app.test.js`

**Interfaces:**
- Consumes: `getCellBinding()`
- Produces: `startEdit(cell)`, `commitEdit(cell)`, `cancelEdit(cell)`, `updateBinding(binding, text)`

- [ ] **Step 1: 동일 바인딩 회귀 테스트 작성**

중앙 NW와 외곽 NW가 같은 `{type:'subGoal', index:0}` 바인딩을 반환하는지, 각 방향에서 어느 쪽을 수정해도 `state.subGoals[index].title` 하나만 바뀌는지 8방향 반복한다. 두 DOM의 `textContent` 반영은 Task 8 브라우저 회귀로 검증한다.

```js
for (const [index, slot] of SLOT_ORDER.entries()) {
  updateBinding(state, getCellBinding(4, slot), `goal-${index}`);
  assert.equal(state.subGoals[index].title, `goal-${index}`);
  assert.deepEqual(getCellBinding(slot, 4), { type: 'subGoal', index });
}
```

- [ ] **Step 2: 편집 상태 구현**

클릭/Enter로 편집 시작, Enter로 저장 후 다음 편집 가능 셀, Shift+Enter로 줄바꿈, Escape로 시작 시점 값을 복원한다. 체크 컨트롤은 편집 이벤트 전파를 막는다.

- [ ] **Step 3: 단일 상태 갱신 구현**

두 DOM 셀을 직접 복사하지 않고 `updateBinding()`이 `state`의 한 필드만 바꾼 뒤 전체/관련 뷰를 다시 렌더링한다.

- [ ] **Step 4: 검증**

Run: `npm test`
Expected: 8방향 중앙→외곽과 외곽→중앙 테스트가 모두 PASS.

### Task 4: 완료 추적, 진척도, 자동 저장

**Files:**
- Modify: `index.html`, `tests/app.test.js`

**Interfaces:**
- Produces: `toggleAction(subGoalIndex, actionIndex)`, `calculateProgress(data)`, `scheduleSave()`, `restoreState()`

- [ ] **Step 1: 진척도 테스트 작성**

0개는 전체 0%, 한 영역 4개는 전체 6.25%·영역 4/8, 64개는 100%, 재해제 시 역산되는지 검증한다.

```js
function calculateProgress(data) {
  const byArea = data.subGoals.map(goal => goal.actions.filter(action => action.completed).length);
  const completed = byArea.reduce((sum, count) => sum + count, 0);
  return { completed, total: 64, percent: completed / 64 * 100, byArea };
}
```

- [ ] **Step 2: 완료 UI 구현**

액션 셀에 별도 checkbox를 두고 완료 시 취소선과 `--color-success` 계열 배경을 적용한다. 빈 액션도 64개 분모에는 포함하되 체크는 비활성화한다.

- [ ] **Step 3: 300ms 자동 저장 구현**

`mandalart:v1` 키에 정규화 상태를 저장하고 상태바를 `저장 중`→`저장됨 · YYYY-MM-DD HH:mm KST`로 바꾼다. 손상 JSON은 덮어쓰지 않고 경고 후 빈 상태로 시작한다.

```js
function scheduleSave() {
  clearTimeout(saveTimer);
  setSaveStatus('saving');
  saveTimer = setTimeout(() => saveNow(state), 300);
}
```

- [ ] **Step 4: 검증**

Run: `npm test`
Expected: 계산·직렬화·손상 데이터 폴백 테스트 PASS.

### Task 5: 프리셋, 초기화, JSON 가져오기/내보내기

**Files:**
- Modify: `index.html`, `tests/app.test.js`

**Interfaces:**
- Produces: `loadPreset(id)`, `resetData()`, `importJson(file)`, `exportJson()`

- [ ] **Step 1: 호환성 테스트 작성**

3개 프리셋 각각 8개 세부 목표·64개 액션인지, 레거시 문자열과 객체 액션을 모두 읽는지, 잘못된 배열 길이·타입을 거부하는지 검증한다.

```js
assert.throws(() => normalizeDocument({ subGoals: [] }), /subGoals/);
assert.equal(normalizeDocument(PRESETS.templates[0]).subGoals.flatMap(g => g.actions).length, 64);
```

- [ ] **Step 2: 파괴적 변경 확인 흐름 구현**

사용자 데이터가 하나라도 있으면 프리셋/초기화 전에 확인 모달을 표시한다. 취소 시 상태가 byte-for-byte 동일하고, 승인 시 새 상태를 저장한 뒤 핵심 목표에 포커스한다.

- [ ] **Step 3: JSON 백업 구현**

내보내기 파일명은 `mandalart-YYYYMMDD-HHmm.json`, MIME은 `application/json;charset=utf-8`로 한다. 가져오기 오류에는 실패한 필드 경로를 표시하고 현재 상태를 유지한다.

```js
async function importJson(file) {
  const candidate = normalizeDocument(JSON.parse(await file.text()));
  replaceState(candidate); // 검증이 끝난 뒤에만 현재 상태 교체
}
```

- [ ] **Step 4: 검증**

Run: `npm test`
Expected: 정상/레거시/오류 입력과 3개 프리셋 테스트 PASS.

### Task 6: 집중 모드, 온보딩, 테마와 접근성

**Files:**
- Modify: `index.html`

**Interfaces:**
- Produces: `openFocus(blockSlot)`, `openGuide()`, `openConfirm()`, `closeModal()`

- [ ] **Step 1: 공통 모달 계약 구현**

`role="dialog"`, `aria-modal="true"`, 제목 연결, Tab 순환, Escape 닫기, 닫은 뒤 호출 버튼으로 포커스 복귀를 공통 함수로 제공한다.

```js
function openModal(dialog, trigger) {
  lastFocused = trigger;
  dialog.hidden = false;
  dialog.querySelector('[autofocus],button,input,[tabindex="0"]')?.focus();
}
function closeModal(dialog) {
  dialog.hidden = true;
  lastFocused?.focus();
}
```

- [ ] **Step 2: 3×3 집중 편집 구현**

전체 그리드 셀과 같은 바인딩을 사용하므로 모달 편집 즉시 전체 그리드와 진척도에 반영한다. 767px 이하에서는 블록 탐색과 집중 모드를 우선하고, 599px 이하에서는 모달을 safe-area를 반영한 bottom sheet 형태로 전환한다.

- [ ] **Step 3: 온보딩·가이드 구현**

4단계, 방향 복제 설명, 측정 가능한 행동 예시, 오타니의 인간성·멘탈·운 사례와 원문 제목/저자/링크를 표시한다. 첫 방문 여부는 `mandalart:onboarding:v1`로 저장하고 가이드 버튼으로 재열 수 있게 한다.

- [ ] **Step 4: 테마 구현**

Light를 기본으로 하고 사용자 선택을 `mandalart:theme`에 저장한다. 두 테마 모두 focus ring, 본문, muted text, primary button 대비를 확인한다.

```js
function setTheme(theme) {
  const safeTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = safeTheme;
  localStorage.setItem('mandalart:theme', safeTheme);
}
```

- [ ] **Step 5: 수동 접근성 검증 기록**

Run: `npm run check`
Expected: 자동 검사 PASS. 이어 키보드 탭 순서, 모달 트랩, Escape, 포커스 복귀 결과를 완료 보고의 검증 표에 브라우저/확인일과 함께 기록한다.

### Task 7: 네이티브 2× PNG 내보내기

**Files:**
- Modify: `index.html`, `tests/app.test.js`

**Interfaces:**
- Produces: `exportPng()`, `serializeGridForExport()`

- [ ] **Step 1: 내보내기 직렬화 테스트 작성**

직렬화 결과에 81개 셀, 현재 테마 토큰의 계산값, 한글 텍스트, 줄바꿈이 포함되고 편집 버튼·체크박스·포커스 링은 제외되는지 확인한다.

- [ ] **Step 2: 브라우저 표준 API 구현**

그리드 전용 SVG를 생성해 각 셀의 배경·경계·텍스트를 명시적으로 그린 뒤 2배 크기 Canvas에 렌더링하고 `canvas.toBlob('image/png')`로 다운로드한다. 브라우저가 SVG→Canvas 렌더링을 거부하면 오류 메시지와 JSON 백업 대안을 안내한다.

```js
async function exportPng() {
  await document.fonts.ready;
  const svg = serializeGridForExport(state, getComputedStyle(document.documentElement));
  const blob = await renderSvgToPng(svg, { scale: 2 });
  downloadBlob(blob, `mandalart-${formatKstFileStamp(new Date())}.png`);
}
```

- [ ] **Step 3: 시각 검증**

Chrome과 Safari에서 빈 양식·오타니 프리셋·긴 한글 입력, Light/Dark 각각을 내보낸다. 완료 보고에 81칸 포함, 2× 픽셀 크기, 한글/줄바꿈/경계/색상 결과를 기록한다.

### Task 8: 통합 회귀와 릴리스 게이트

**Files:**
- Modify: no files; this task verifies the completed artifact

**Interfaces:**
- Consumes: 모든 선행 Task 산출물
- Produces: 직접 실행 가능한 검증 완료본

- [ ] **Step 1: 자동 품질 게이트 실행**

Run: `npm run check`
Expected: syntax, unit tests, preset parity, design lint all PASS.

- [ ] **Step 2: 직접 실행 회귀**

Finder에서 `mandalart.html`을 직접 열고 3개 프리셋, 8방향 양방향 동기화, 64개 완료 토글, 새로고침 복원, JSON round-trip, 초기화 취소/승인, 집중 모드, 듀얼 테마를 검증한다.

- [ ] **Step 3: 반응형 회귀**

브라우저 폭 1440px(Desktop), 1180px(Laptop), 820px(Tablet), 690px(Foldable 펼침), 430px(Foldable 외부), 390px(Bar Phone)의 portrait/landscape에서 가로 잘림, 셀 겹침, 모달 이탈, safe-area, 44px 터치 대상을 확인한다. 430px와 390px에서는 집중 모드로 모든 9개 블록을 편집할 수 있어야 한다.

- [ ] **Step 4: 최종 요구사항 대조**

FR-001~FR-017과 NFR-001~NFR-004 각각에 자동 테스트명 또는 완료 보고의 수동 검증 증거를 연결한다. 연결되지 않은 요구사항이 하나라도 있으면 완료 처리하지 않는다.

## 5. 완료 정의

- 자체 완결형 `mandalart.html` 하나만 별도 빈 폴더에 복사한 뒤 서버 없이 직접 열어 모든 핵심 흐름이 동작한다.
- 81셀·8방향 양방향 동기화·3개 프리셋·64개 완료 상태가 자동/수동 테스트를 통과한다.
- 새로고침 복원, JSON round-trip, 손상 입력 방어가 검증된다.
- Light/Dark와 390~1440px 뷰포트에서 작성 가능하다.
- 2× PNG가 81칸 전체와 한글을 손실 없이 포함한다.
- `npm run check`가 통과하고 완료 보고에 실행 환경과 수동 검증 결과가 기록된다.

## 6. 알려진 위험과 대응

| 위험 | 대응 |
|---|---|
| `file://`에서 JSON fetch 차단 | 원본 JSON과 동등성을 검사한 프리셋을 최종 `mandalart.html#preset-data`에 내장 |
| 프리셋 문자열 액션과 PRD 객체 스키마 불일치 | 로드 시 정규화, 가져오기 union 지원, 내보내기 형식 단일화 |
| 81칸 모바일 가독성 | 축소만 하지 않고 3×3 집중 편집을 주요 경로로 제공 |
| 네이티브 PNG의 브라우저 차이 | 명시적 SVG 셀 렌더링, Chrome/Safari 시각 검증, 실패 시 JSON 대안 안내 |
| 외부 웹폰트 미연결 시 글꼴 차이 | 시스템에 설치된 Pretendard/Inter 우선 폴백; 내보내기 전 `document.fonts.ready` 대기 |
| LocalStorage 용량/손상 | 작은 텍스트 상태만 저장, parse/shape 검증 실패 시 현재 원문 보존 후 안전 폴백 |

