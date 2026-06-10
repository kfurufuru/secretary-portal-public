/**
 * selfcheck-bridge.js
 * 各 business-skills ページのセルフチェック状態を
 * localStorage (bsk_tracker) に自動永続化するブリッジ。
 *
 * 段階評価: 0=まったくできていない / 1=やろうとしている
 *           2=たまにできている    / 3=いつもできている
 *
 * 依存: skill-tracker.js (window.SkillTracker)
 * 既存の onchange="updateScore()" は破壊しない（チェックボックスは非表示で保持）
 */
document.addEventListener('DOMContentLoaded', function () {
  if (!window.SkillTracker) return;

  var pathname = location.pathname;
  var basename = pathname.split('/').pop() || pathname.split('\\').pop();
  var skillId = basename.replace(/\.html$/i, '');
  if (!skillId) return;

  var rawTitle = document.title || '';
  var title = rawTitle.split(' | ')[0].trim() || rawTitle;

  var sections = document.querySelectorAll('.selfcheck-section');
  var checkboxes;
  if (sections.length > 0) {
    checkboxes = [];
    sections.forEach(function (section) {
      checkboxes = checkboxes.concat(Array.from(section.querySelectorAll('input[type="checkbox"]')));
    });
  } else {
    checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
      .filter(function (el) { return /^c\d+$/.test(el.id); });
  }
  if (checkboxes.length === 0) return;

  var total = checkboxes.length;
  var saved = window.SkillTracker.getChecks(skillId);

  // boolean旧データ: true→2（たまに）, false→0
  function toRating(v) {
    if (v === true) return 2;
    if (typeof v === 'number' && v >= 0 && v <= 3) return v;
    return 0;
  }

  // CSS 注入（1回のみ）
  if (!document.getElementById('bsk-rating-style')) {
    var style = document.createElement('style');
    style.id = 'bsk-rating-style';
    style.textContent = [
      '.bsk-rating{display:flex;gap:4px;margin:6px 0 4px;flex-wrap:wrap}',
      '.bsk-rating button{padding:3px 10px;border-radius:999px;border:1px solid rgba(0,0,0,0.15);',
      'background:rgba(0,0,0,0.03);color:#6b7280;font-size:11px;',
      'font-family:inherit;line-height:1.5;cursor:pointer;transition:all 0.15s}',
      '.bsk-rating button:hover{filter:brightness(0.96);transform:translateY(-1px)}',
      '.bsk-rating button.r3{background:#dcfce7;border-color:#22c55e;color:#15803d;font-weight:600}',
      '.bsk-rating button.r2{background:#e0f2fe;border-color:#0ea5e9;color:#0369a1;font-weight:600}',
      '.bsk-rating button.r1{background:#fef3c7;border-color:#f59e0b;color:#b45309;font-weight:600}',
      '.bsk-rating button.r0{background:#f1f5f9;border-color:#cbd5e1;color:#64748b}'
    ].join('');
    document.head.appendChild(style);
  }

  var LEVELS = [
    { val: 4, label: 'いつもできている',    cls: 'r3' },
    { val: 3, label: 'たまにできている',    cls: 'r2' },
    { val: 1, label: 'やろうとしている',    cls: 'r1' },
    { val: 0, label: 'まったくできていない', cls: 'r0' },
  ];

  var ratings = {};

  checkboxes.forEach(function (cb, i) {
    var idx = i + 1;
    var currentRating = toRating(saved[idx.toString()]);
    ratings[idx] = currentRating;

    // 既存チェックボックスを非表示（DOM保持で既存 updateScore() との競合回避）
    cb.style.display = 'none';

    var group = document.createElement('div');
    group.className = 'bsk-rating';

    LEVELS.forEach(function (lv) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = lv.label;
      if (currentRating === lv.val) btn.classList.add(lv.cls);

      btn.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (b) {
          b.className = '';
        });
        btn.classList.add(lv.cls);
        ratings[idx] = lv.val;
        cb.checked = lv.val > 0;

        if (window.SkillTracker) {
          window.SkillTracker.saveCheck(skillId, title, total, idx, lv.val);
        }
        updateScoreDisplay();
        if (window.SkillTracker && window.SkillTracker.recordHistory) {
          window.SkillTracker.recordHistory(skillId);
        }
      });

      group.appendChild(btn);
    });

    // ラベルの直後 or チェックボックスの後に挿入
    var label = document.querySelector('label[for="' + cb.id + '"]');
    if (label) {
      label.insertAdjacentElement('afterend', group);
    } else {
      var parentLabel = cb.closest('label');
      if (parentLabel) {
        parentLabel.insertAdjacentElement('afterend', group);
      } else if (cb.parentNode) {
        cb.parentNode.appendChild(group);
      }
    }
  });

  function updateScoreDisplay() {
    var activeCount = 0;
    Object.values(ratings).forEach(function (r) { if (r > 0) activeCount++; });
    var num = document.getElementById('score-num');
    if (num) num.textContent = activeCount;
  }

  updateScoreDisplay();

  // メモ欄 UI
  var memoWrap = document.createElement('div');
  memoWrap.style.cssText = 'margin-top:16px;padding:12px 0 4px';

  var memoLabel = document.createElement('div');
  memoLabel.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px';
  memoLabel.textContent = '気づき・停滞理由メモ';

  var memoArea = document.createElement('textarea');
  memoArea.placeholder = '「なぜこの項目が進まないか」「実際に使った場面」など自由記述';
  memoArea.value = window.SkillTracker.getMemo ? window.SkillTracker.getMemo(skillId) : '';
  memoArea.style.cssText = [
    'width:100%', 'min-height:72px', 'resize:vertical',
    'background:rgba(0,0,0,0.03)', 'border:1px solid rgba(0,0,0,0.15)',
    'border-radius:8px', 'color:#292a2e', 'font-size:13px',
    'font-family:inherit', 'padding:10px 12px', 'line-height:1.6',
    'outline:none', 'box-sizing:border-box', 'transition:border-color 0.15s'
  ].join(';');
  memoArea.addEventListener('focus', function () { memoArea.style.borderColor = 'rgba(56,189,248,0.4)'; });
  memoArea.addEventListener('blur', function () { memoArea.style.borderColor = 'rgba(0,0,0,0.15)'; });

  // デバウンス保存（500ms）
  var memoTimer;
  memoArea.addEventListener('input', function () {
    clearTimeout(memoTimer);
    memoTimer = setTimeout(function () {
      if (window.SkillTracker && window.SkillTracker.saveMemo) {
        window.SkillTracker.saveMemo(skillId, memoArea.value);
      }
    }, 500);
  });

  memoWrap.appendChild(memoLabel);
  memoWrap.appendChild(memoArea);

  // メモ欄をどこに挿入するか:
  // section がある場合は section の末尾に、なければ最後のチェックボックスの親の末尾に
  if (section) {
    section.appendChild(memoWrap);
  } else if (checkboxes.length > 0) {
    var lastCb = checkboxes[checkboxes.length - 1];
    var insertTarget = lastCb.closest('.selfcheck-section') || lastCb.closest('section') || lastCb.parentNode;
    insertTarget.appendChild(memoWrap);
  }

  // ダッシュボードへ戻るフローティングボタン
  var backBtn = document.createElement('a');
  backBtn.href = '../index.html';
  backBtn.title = '個人能力ダッシュボードへ戻る';
  backBtn.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    'display:flex', 'align-items:center', 'gap:6px',
    'padding:10px 16px', 'border-radius:999px',
    'background:linear-gradient(135deg,#0f172a,#1e293b)',
    'border:1px solid rgba(56,189,248,0.4)',
    'color:#38bdf8', 'font-size:13px', 'font-weight:600',
    'text-decoration:none', 'letter-spacing:0.03em',
    'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
    'transition:transform 0.15s,box-shadow 0.15s'
  ].join(';');
  backBtn.innerHTML = '&#8592; ダッシュボード';
  backBtn.addEventListener('mouseenter', function () {
    backBtn.style.transform = 'translateY(-2px)';
    backBtn.style.boxShadow = '0 6px 20px rgba(56,189,248,0.25)';
  });
  backBtn.addEventListener('mouseleave', function () {
    backBtn.style.transform = '';
    backBtn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
  });
  document.body.appendChild(backBtn);
});
