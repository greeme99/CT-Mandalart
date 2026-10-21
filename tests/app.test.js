const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.existsSync(path.join(root, 'index.html')) ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : '';
const section = id => html.match(new RegExp(`<(?:(?:script)|(?:style))[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/(?:script|style)>`))?.[1] || '';
function core() {
  const context = { window: {}, Intl, Date, console };
  vm.runInNewContext(section('app-runtime'), context);
  assert.ok(context.window.MandalartCore, 'MandalartCore must expose the implemented app functions');
  return context.window.MandalartCore;
}
const plain = value => JSON.parse(JSON.stringify(value));
const original = JSON.parse(fs.readFileSync(path.join(root, 'mandalart-presets.json'), 'utf8'));

test('mandalart.html is the byte-identical standalone share artifact', () => {
  const packaged = fs.readFileSync(path.join(root, 'mandalart.html'), 'utf8');
  assert.equal(packaged, html);
  assert.ok(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/.test(packaged));
});

test('eight directional center bindings share a single editable value', () => {
  const c = core(), data = c.createBlankData();
  [0, 1, 2, 3, 5, 6, 7, 8].forEach((slot, index) => {
    assert.deepEqual(plain(c.getCellBinding(4, slot)), { type: 'subGoal', index });
    assert.deepEqual(plain(c.getCellBinding(slot, 4)), { type: 'subGoal', index });
    c.updateBinding(data, c.getCellBinding(4, slot), `central-${index}`);
    assert.equal(c.readBinding(data, c.getCellBinding(slot, 4)), `central-${index}`);
    c.updateBinding(data, c.getCellBinding(slot, 4), `outer-${index}`);
    assert.equal(c.readBinding(data, c.getCellBinding(4, slot)), `outer-${index}`);
  });
});
test('3 templates, 24 subgoals, 192 actions verified with original preset parity', () => {
  assert.deepEqual(JSON.parse(section('preset-data') || 'null'), original);
  const c = core();
  assert.equal(original.templates.length, 3);
  original.templates.forEach(preset => {
    const data = c.normalizeDocument(preset);
    assert.equal(data.subGoals.length, 8);
    assert.equal(data.subGoals.flatMap(g => g.actions).length, 64);
    data.subGoals.forEach((g, i) => {
      assert.equal(g.sourceColor, preset.subGoals[i].color);
      assert.equal(g.actions[0].text, preset.subGoals[i].actions[0]);
      assert.equal(g.actions[0].completed, false);
    });
    assert.deepEqual(plain(c.normalizeDocument(JSON.parse(JSON.stringify(data)))), plain(data));
  });
});
test('invalid documents reject precise paths without mutating a valid document', () => {
  const c = core(), good = c.createBlankData(), before = JSON.stringify(good);
  const reject = (mutate, pattern) => { const input = plain(good); mutate(input); assert.throws(() => c.normalizeDocument(input), pattern); };
  reject(x => x.subGoals.pop(), /subGoals/);
  reject(x => x.subGoals[0].actions.push('extra'), /subGoals\[0\].actions/);
  reject(x => x.subGoals[0].index = 1, /index/);
  reject(x => x.subGoals[0].actions[0].completed = 'true', /completed/);
  reject(x => x.title = 12, /title/);
  reject(x => x.coreGoal = 'a'.repeat(501), /coreGoal/);
  reject(x => x.updatedAt = 'not a date', /updatedAt/);
  reject(x => x.schemaVersion = 100, /schemaVersion/);
  reject(x => x.theme = 'red', /theme/);
  reject(x => delete x.createdAt, /createdAt/);
  reject(x => delete x.updatedAt, /updatedAt/);
  reject(x => delete x.theme, /theme/);
  assert.equal(JSON.stringify(good), before);
  assert.equal(c.validateDocument(good).valid, true);
});
test('progress handles empty, partial, complete and reversed completion', () => {
  const c = core(), data = c.createBlankData();
  assert.equal(c.calculateProgress(data).percent, 0);
  data.subGoals[0].actions.forEach((a, i) => { a.text = `action ${i}`; a.completed = i < 4; });
  assert.equal(c.calculateProgress(data).percent, 6.25);
  assert.equal(c.calculateProgress(data).byArea[0], 4);
  data.subGoals.forEach(g => g.actions.forEach(a => { a.text = 'do'; a.completed = true; }));
  assert.equal(c.calculateProgress(data).percent, 100);
  c.toggleAction(data, 7, 7);
  assert.equal(c.calculateProgress(data).completed, 63);
  const blank = c.createBlankData(); c.toggleAction(blank, 0, 0);
  assert.equal(blank.subGoals[0].actions[0].completed, false);
});
test('import and restore reject blank completed actions at the precise action path', () => {
  const c = core();
  for (const value of ['', ' \n\t ']) {
    const input = c.createBlankData();
    input.subGoals[3].actions[2] = { id: '2', text: value, completed: true };
    const before = JSON.stringify(input);
    assert.throws(() => c.normalizeDocument(input), /subGoals\[3\]\.actions\[2\]\.completed/);
    const restored = c.restoreDocument(before);
    assert.match(restored.error, /subGoals\[3\]\.actions\[2\]\.completed/);
    assert.equal(restored.raw, before);
    assert.equal(c.calculateProgress(restored.data).completed, 0);
    assert.equal(JSON.stringify(input), before);
  }
});
test('document strings reject XML forbidden controls while preserving Korean and allowed whitespace', () => {
  const c = core();
  const cases = [
    ['id', x => x.id = 'id\u0000'],
    ['title', x => x.title = '제목\u000b'],
    ['coreGoal', x => x.coreGoal = '목표\u001f'],
    ['subGoals[1].title', x => x.subGoals[1].title = '영역\ufffe'],
    ['subGoals[2].actions[3].text', x => x.subGoals[2].actions[3].text = '행동\ud800'],
    ['subGoals[4].actions[5]', x => x.subGoals[4].actions[5] = '행동\u0001']
  ];
  for (const [field, mutate] of cases) {
    const input = c.createBlankData(); mutate(input);
    const before = JSON.stringify(input);
    assert.throws(() => c.normalizeDocument(JSON.parse(before)), error => error.message.startsWith(field + ':'));
    const restored = c.restoreDocument(before);
    assert.ok(restored.error.startsWith(field + ':'));
    assert.equal(restored.raw, before);
    assert.equal(JSON.stringify(input), before);
  }
  const valid = c.createBlankData(); valid.coreGoal = '한글 목표\n둘째 줄\t탭\r마지막 😀';
  assert.equal(c.normalizeDocument(valid).coreGoal, valid.coreGoal);
});
test('interactive text acceptance keeps the last valid value when input is unsafe', () => {
  const c = core();
  assert.deepEqual(plain(c.acceptTextInput('기존 목표', '새 목표', 'coreGoal', 500)), { value: '새 목표', error: null });
  const rejected = plain(c.acceptTextInput('기존 목표', '잘못된\u000b목표', 'coreGoal', 500));
  assert.equal(rejected.value, '기존 목표');
  assert.match(rejected.error, /^coreGoal:/);
});
test('cancelled action editing restores text, completion and original update time', () => {
  const c = core(), data = c.createBlankData(), binding = { type: 'action', index: 0, actionIndex: 0 };
  c.updateBinding(data, binding, '완료한 행동'); c.toggleAction(data, 0, 0);
  const before = JSON.stringify(data), snapshot = c.captureBinding(data, binding);
  c.updateBinding(data, binding, '');
  assert.equal(data.subGoals[0].actions[0].completed, false);
  c.restoreBinding(data, binding, snapshot);
  assert.equal(JSON.stringify(data), before);
});
test('grid markup renders nine blocks, 81 safe cells and only 64 action checkboxes', () => {
  const c = core(), data = c.createBlankData();
  data.coreGoal = '<img src=x onerror=alert(1)>';
  const markup = c.renderGridMarkup(data);
  assert.equal((markup.match(/class="mandalart-block"/g) || []).length, 9);
  assert.equal((markup.match(/class="mandalart-cell /g) || []).length, 81);
  assert.equal((markup.match(/type="checkbox"/g) || []).length, 64);
  assert.equal((markup.match(/data-binding="subGoal:0"/g) || []).length, 2);
  assert.ok(!markup.includes('<img'));
  assert.ok(markup.includes('&lt;img'));
});
test('storage restore preserves corrupt raw text and serializes normalized state', () => {
  const c = core(), data = c.normalizeDocument(original.templates[0]);
  const raw = c.serializeDocument(data);
  assert.deepEqual(plain(c.restoreDocument(raw).data), plain(data));
  const corrupted = c.restoreDocument('{broken');
  assert.ok(corrupted.error);
  assert.equal(corrupted.data.coreGoal, '');
  assert.equal(corrupted.raw, '{broken');
  assert.equal(c.formatKstTime(new Date('2026-10-16T00:30:00Z')), '2026-10-16 09:30 KST');
  assert.equal(c.formatKstFileStamp(new Date('2026-10-16T00:30:00Z')), '20261016-0930');
});
test('PNG serialization includes all 81 cells, escaped Korean lines and resolved theme values', () => {
  const c = core(), data = c.createBlankData(); data.coreGoal = '한글 목표\n둘째 줄 & < >';
  const style = { getPropertyValue: name => ({ '--color-bg-surface': 'paper', '--color-text-main': 'ink', '--color-primary': 'royal', '--color-primary-light': 'tint', '--color-border-strong': 'edge', '--color-success-bg': 'done' })[name] || 'accent' };
  const svg = c.serializeGridForExport(data, style);
  assert.equal((svg.match(/data-export-cell=/g) || []).length, 81);
  assert.ok(svg.includes('한글 목표')); assert.ok(svg.includes('둘째 줄 &amp; &lt; &gt;'));
  assert.ok(svg.includes('paper')); assert.ok(svg.includes('ink'));
  assert.ok(!/checkbox|<button|foreignObject/.test(svg));
  assert.ok(svg.includes('width="1080"'));
});
test('design tokens keep colors inside declarations, both themes and visible focus', () => {
  const css = section('app-styles');
  assert.ok(css, 'app-styles must exist');
  const declarations = css.match(/\/\* DESIGN TOKENS START \*\/([\s\S]*?)\/\* DESIGN TOKENS END \*\//)?.[1];
  assert.ok(declarations, 'explicit DESIGN token declaration region');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css.replace(declarations, '')));
  for (const token of ['--color-bg-base', '--color-bg-surface', '--color-text-main', '--color-text-muted', '--color-primary', '--color-border-strong']) {
    assert.ok((declarations.match(new RegExp(token + ':', 'g')) || []).length >= 2, `${token} both themes`);
  }
  assert.ok(css.includes('[data-theme="dark"]'));
  assert.ok(css.includes(':focus-visible'));
  assert.match(css, /\.area-row \.count\s*\{[^}]*color:\s*var\(--color-text-body\)/);
  assert.ok(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/.test(html));
});
test('dark primary surfaces use the existing AA-safe hover token', () => {
  const css = section('app-styles');
  assert.ok(/\[data-theme="dark"\] \.primary,\s*\[data-theme="dark"\] \.cell-core\s*\{[^}]*background:\s*var\(--color-primary-hover\)/.test(css));
  const dark = css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/)[1];
  const token = name => dark.match(new RegExp(name + ':\\s*(#[0-9a-f]+)'))[1];
  const luminance = hex => hex.slice(1).match(/../g).map(pair => parseInt(pair, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
  const foreground = luminance(token('--color-text-on-primary')), background = luminance(token('--color-primary-hover'));
  assert.ok((Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) >= 4.5);
  const c = core(), data = c.createBlankData(); data.theme = 'dark';
  const svg = c.serializeGridForExport(data, { getPropertyValue: name => name === '--color-primary-hover' ? 'deep-royal' : 'other' });
  assert.ok(svg.includes('fill="deep-royal"'), 'PNG core background matches the dark UI surface');
});
test('default checkbox targets provide 44px space with matching action text padding', () => {
  const css = section('app-styles');
  const target = css.match(/(?:^|\n)\.check-target\s*\{([^}]+)\}/)[1];
  assert.ok(/width:\s*44px;\s*height:\s*44px/.test(target));
  assert.ok(/(?:^|\n)\.cell-action \.cell-editor\s*\{[^}]*padding-bottom:\s*44px/.test(css));
});
test('small-screen main and footer retain horizontal safe-area insets', () => {
  const css = section('app-styles');
  const start = css.indexOf('@media (max-width: 767px)');
  const small = css.slice(start, css.indexOf('@media', start + 1));
  for (const selector of ['main', 'footer']) {
    const rule = small.match(new RegExp(selector + '\\s*\\{([^}]+)\\}'))?.[1] || '';
    assert.match(rule, /padding-left:\s*max\(var\(--space-md\),\s*env\(safe-area-inset-left\)\)/, selector + ' left');
    assert.match(rule, /padding-right:\s*max\(var\(--space-md\),\s*env\(safe-area-inset-right\)\)/, selector + ' right');
  }
});
test('coarse tablet overview hides checkboxes and routes editing to focus mode', () => {
  const css = section('app-styles'), runtime = section('app-runtime');
  const start = css.indexOf('@media (max-width: 1023px) and (pointer: coarse)');
  assert.ok(start >= 0);
  const tablet = css.slice(start, css.indexOf('@media', start + 1));
  assert.match(tablet, /\.mandalart-grid \.check-target\s*\{\s*display:\s*none/);
  assert.match(tablet, /\.mandalart-grid \.cell-action \.cell-editor\s*\{[^}]*padding-bottom:\s*var\(--space-sm\)/);
  assert.ok(runtime.includes("window.matchMedia('(max-width: 1023px) and (pointer: coarse)').matches"));
  assert.match(runtime, /if\s*\(\(window\.matchMedia\('\(max-width: 767px\)'\)\.matches\s*\|\|\s*window\.matchMedia\('\(max-width: 1023px\) and \(pointer: coarse\)'\)\.matches\)/);
  assert.match(css, /\.focus-grid \.check-target\s*\{[^}]*width:\s*44px;\s*height:\s*44px/);
});
test('responsive contract adapts all five device width groups and safe touch surfaces', () => {
  const css = section('app-styles');
  for (const breakpoint of ['min-width: 1280px', 'max-width: 1279px', 'max-width: 1023px', 'max-width: 767px', 'max-width: 599px']) assert.ok(css.includes(breakpoint), breakpoint);
  for (const capability of ['pointer: coarse', 'hover: none', 'orientation: landscape', 'safe-area-inset-top', 'safe-area-inset-bottom', 'safe-area-inset-left', 'safe-area-inset-right']) assert.ok(css.includes(capability), capability);
  assert.ok(css.includes('.check-target'));
  assert.ok(css.includes('min-width: 44px'));
  assert.ok(css.includes('overscroll-behavior: contain'));
  assert.ok(html.includes('id="overview-button"'));
  assert.ok(html.includes('id="mobile-core-focus-button"'));
  assert.ok(!/userAgent|navigator\.platform/.test(section('app-runtime')));
  const c = core(), markup = c.renderGridMarkup(c.createBlankData());
  assert.equal((markup.match(/class="block-open"/g) || []).length, 9);
  const overview = c.renderGridMarkup(c.createBlankData(), true);
  assert.equal((overview.match(/tabindex="-1"/g) || []).length, 81, 'mobile overview skips 81 cell stops and exposes nine block controls');
});
test('onboarding copy and toolbar icons include a separate user manual page', () => {
  assert.ok(html.includes('멘탈, 운동도 목표를 이루는 조건'));
  assert.ok(!html.includes('멘탈, 운도 목표를 이루는 조건'));
  for (const id of ['preset-button', 'guide-button', 'theme-button', 'import-button', 'json-button', 'png-button', 'reset-button', 'manual-button']) {
    const button = html.match(new RegExp(`<button id="${id}"[\\s\\S]*?<\\/button>`))?.[0] || '';
    assert.match(button, /class="tool-icon"/);
    assert.match(button, /aria-hidden="true"/);
  }
  assert.match(html, /<dialog id="manual-dialog"[^>]*aria-labelledby="manual-title"/);
  assert.match(html, /<button id="manual-button"[^>]*aria-label="사용자 매뉴얼 열기"[^>]*title="사용자 매뉴얼"/);
  assert.match(html, /<\/nav>\s*<div class="header-actions">\s*<button id="theme-button"[\s\S]*?<button id="manual-button"/);
  const themeButton = html.match(/<button id="theme-button"[\s\S]*?<\/button>/)?.[0] || '';
  assert.match(themeButton, /<span class="sr-only">다크<\/span>/);
  const guide = html.match(/<dialog id="guide-dialog"[\s\S]*?<\/dialog>/)?.[0] || '';
  const manual = html.match(/<dialog id="manual-dialog"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.ok(!guide.includes('tool-manual'));
  assert.ok(!manual.includes('data-close autofocus'));
  for (const label of ['템플릿', 'JSON 가져오기', 'JSON 백업', 'PNG 저장', '새로 만들기']) assert.ok(html.includes(`<dt>${label}</dt>`));
  const runtime = section('app-runtime');
  assert.ok(runtime.includes("$('#manual-button').addEventListener('click'"));
  assert.ok(runtime.includes("openModal($('#manual-dialog'), this)"));
  assert.ok(runtime.includes("$('#theme-button span').textContent"));
  assert.ok(runtime.includes("button.querySelector('span').textContent = '이미지 만드는 중…'"));
});
