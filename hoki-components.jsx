// hoki-components.jsx
// 法規Wikiコンポーネント定義ファイル（Babel CDN変換前提）
// import文なし — React/ReactDOMはグローバル変数として利用
//
// localStorage 規約（落合陽一の指摘）:
//   hoki_quiz_<cardType>_<suffix>
//     例: hoki_quiz_glossary_progress, hoki_quiz_glossary_lastBackup
//   将来: hoki_quiz_formula_progress, hoki_quiz_trap_progress, hoki_quiz_mistake_progress
//   既存個別キー（hoki_lastSeen_*, hoki_sidebar_mode 等）はそのまま維持

// ============================================================
// 1. テンプレートコンポーネント
// ============================================================

function GoalQuestion({ question, choices, year, note }) {
  return (
    <div className="goal-question">
      <div className="goal-label">🎯 ゴール問題 — このページを読み終えたらこの問題に戻ろう</div>
      {year && <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginBottom: '6px' }}>{year}</div>}
      <p className="goal-q">{question}</p>
      {choices && choices.length > 0 && (
        <details className="goal-choices">
          <summary>選択肢を表示</summary>
          <ol style={{ paddingLeft: '20px', marginTop: '8px', fontSize: '13px', lineHeight: '1.7' }}>
            {choices.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </details>
      )}
      {note && <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '8px' }}>{note}</div>}
    </div>
  );
}

function ConclusionBox({ children }) {
  return (
    <div className="conclusion-box">
      <div className="conclusion-label">まず覚える結論</div>
      <div style={{ fontSize: '14px', lineHeight: '1.8' }}>{children}</div>
    </div>
  );
}

function MetaStrip({ ch, category, importance, freq, examType, targets, tags, lastChecked }) {
  const importanceBg = importance === 'S' ? 'var(--rank-s-bg)' :
                       importance === 'A' ? 'var(--rank-a-bg)' :
                       importance === 'B' ? 'var(--rank-b-bg)' : 'var(--bg-2)';
  const rows = [
    ch && ['チャプター', ch],
    category && ['カテゴリ', category],
    importance && ['重要度', <span style={{ background: importanceBg, padding: '1px 8px', borderRadius: '4px', fontWeight: '700' }}>{importance}</span>],
    freq && ['出題頻度', freq],
    examType && ['問題形式', examType],
    targets && ['対象', Array.isArray(targets) ? targets.join(' / ') : targets],
    tags && ['タグ', Array.isArray(tags) ? tags.join(', ') : tags],
    lastChecked && ['最終確認', lastChecked],
  ].filter(Boolean);

  return (
    <table className="meta-strip-table">
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i}>
            <td>{label}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExamFocus({ items }) {
  return (
    <div className="exam-focus">
      <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', color: 'var(--ink-2)' }}>試験で問われること</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ padding: '6px 10px', width: '120px', color: 'var(--ink-3)', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                {item.label}
              </td>
              <td style={{ padding: '6px 10px', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                {item.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LawSource({ title, text, source, confirmedAt }) {
  const fullTitle = confirmedAt ? `${title}（確認日: ${confirmedAt}）` : title;
  return (
    <details style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', marginBottom: '24px' }}>
      <summary style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--ink-2)' }}>
        📄 {fullTitle}
      </summary>
      <div style={{ padding: '14px 18px', fontSize: '13px', lineHeight: '1.8', background: 'var(--bg-2)', borderTop: '1px solid var(--line)', whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
      {source && (
        <div style={{ padding: '6px 18px 10px', fontSize: '11px', color: 'var(--ink-3)' }}>出典: {source}</div>
      )}
    </details>
  );
}

/**
 * DirectCheckMode — ⚡ 直前確認モード（30秒UI）
 *
 * 使用例:
 *   <DirectCheckMode
 *     pageId="hichusei-jiraku"
 *     formula="I_g = 2√3·πfV·(C₁+C₂)"
 *     formulaVars={[
 *       { sym: "V", desc: "線間電圧[V]" },
 *       { sym: "C₁", desc: "高圧配電線路一相の対地静電容量[F]" },
 *       { sym: "C₂", desc: "需要設備一相の対地静電容量[F]" },
 *       { sym: "f", desc: "周波数[Hz]" },
 *     ]}
 *     warningRed="ZCT検出電流（I_zct）は常に I_g とは限らない（事故点・ZCT位置に依存）"
 *     trapsTop3={[
 *       "V を相電圧として使う（実際は線間電圧。対地電圧は V/√3）",
 *       "C₁ または C₂ どちらか片方だけで計算する（実際は和 C₁+C₂）",
 *       "1線地絡時、健全相の対地電圧が √3倍 になることを忘れる",
 *     ]}
 *     jumps={[
 *       { id: "exam-r05", label: "過去問へ →", primary: true },
 *       { id: "quick-review", label: "1分復習 →" },
 *       { id: "traps", label: "ひっかけ全項目 →" },
 *     ]}
 *   />
 */
function DirectCheckMode({ pageId, formula, formulaVars = [], warningRed, trapsTop3 = [], jumps = [] }) {
  return (
    <div style={{
      background: 'var(--bg-elev)',
      border: '2px solid var(--ink-2)',
      borderRadius: 'var(--radius)',
      padding: '18px 20px',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-1)', marginRight: 10 }}>⚡ 直前確認モード</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>30秒で確認 / 試験直前用</span>
        </div>
        <MasteredToggle pageId={pageId} label="このページ" />
      </div>

      {formula && (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>覚える公式</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#a06', fontFamily: 'serif', textAlign: 'center', padding: '10px 0', marginBottom: 10 }}>
            {formula}
          </div>
          {formulaVars.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.85 }}>
              {formulaVars.map((v, i) => (
                <li key={i}><strong>{v.sym}</strong>：{v.desc}</li>
              ))}
            </ul>
          )}
          {warningRed && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderLeft: '3px solid #c33', background: 'var(--bg-elev)', fontSize: 12, color: '#c33', fontWeight: 700 }}>
              ⚠ <span style={{ color: '#c33' }}>{warningRed}</span>
            </div>
          )}
        </div>
      )}

      {trapsTop3.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>⚠ 間違えやすい条件 TOP3</div>
          <ol style={{ margin: 0, paddingLeft: 22, fontSize: 13, lineHeight: 1.9 }}>
            {trapsTop3.map((t, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: t }} />
            ))}
          </ol>
        </div>
      )}

      {jumps.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {jumps.map((j, i) => (
            <button
              key={i}
              onClick={() => document.getElementById(j.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{
                padding: '8px 16px',
                background: j.primary ? '#a06' : 'var(--bg-elev)',
                color: j.primary ? '#fff' : 'var(--ink-2)',
                border: j.primary ? 'none' : '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                fontSize: 13,
                fontWeight: j.primary ? 700 : 600,
                cursor: 'pointer',
              }}
            >
              {j.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * MinShortcutCard — 📋 試験用 最短解法カード（5ステップ思考順序）
 *
 * 使用例:
 *   <MinShortcutCard
 *     steps={[
 *       <span><strong>条件確認</strong>：「中性点非接地方式・1線完全地絡」を読み取る</span>,
 *       <span><strong>電圧の置換</strong>：V は線間電圧。対地電圧は V/√3</span>,
 *       <span><strong>3相分の容量</strong>：3·(C₁+C₂)</span>,
 *       <span><strong>公式適用</strong>：I_g = 2√3·πfV·(C₁+C₂)</span>,
 *       <span><strong>非接地でもゼロでない</strong>：C経由で必ず流れる</span>,
 *     ]}
 *     hint="R5下期問11(a)はこの公式そのまま"
 *   />
 */
function MinShortcutCard({ steps = [], hint, title = "📋 試験用 最短解法カード（本番で式を選ぶ思考順序）" }) {
  return (
    <div style={{
      background: 'var(--bg-elev)',
      border: '1px solid var(--line)',
      borderLeft: '3px solid #a06',
      borderRadius: 'var(--radius)',
      padding: '14px 18px',
      marginBottom: 24,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: '0.05em' }}>{title}</div>
      <ol style={{ margin: 0, paddingLeft: 22, fontSize: 13, lineHeight: 1.9 }}>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {hint && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          💡 {hint}
        </div>
      )}
    </div>
  );
}

// SectionCheck: B層各h2セクション直後に置く4段階理解度トラッキング
// localStorage キー: denken_check::hoki_<pageId>::section::<sectionId>
// feedback_self_check_4button_standard 準拠（◎ ○ △ ×）
// 集計は SectionCheckSummary（C層末のAct用）で読み出す
function SectionCheck({ pageId, sectionId, compact = false }) {
  const key = `denken_check::hoki_${pageId}::section::${sectionId}`;
  const [status, setStatus] = React.useState(() => {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  });
  const update = (newStatus) => {
    const next = newStatus === status ? '' : newStatus;
    setStatus(next);
    try {
      if (next) localStorage.setItem(key, next);
      else localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('section-check-changed', { detail: { key, status: next } }));
    } catch {}
  };
  const buttons = [
    { mark: '◎', label: '完璧', color: '#16a34a' },
    { mark: '○', label: 'OK',   color: '#3b82f6' },
    { mark: '△', label: '微妙', color: '#f59e0b' },
    { mark: '×', label: '未',   color: '#dc2626' },
  ];
  return (
    <div style={{
      margin: compact ? '4px 0 12px' : '6px 0 18px',
      padding: '8px 12px',
      background: 'var(--bg-2)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>📊 このセクションの理解度:</span>
      {buttons.map(b => (
        <button
          key={b.mark}
          onClick={() => update(b.mark)}
          aria-label={`理解度 ${b.label}`}
          style={{
            padding: '4px 10px',
            minWidth: 36,
            background: status === b.mark ? b.color : 'transparent',
            color: status === b.mark ? '#fff' : 'var(--ink-2)',
            border: status === b.mark ? `1px solid ${b.color}` : '1px solid var(--line)',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 14,
            transition: 'all 0.1s',
          }}
        >{b.mark}</button>
      ))}
      {status && (
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>前回: <strong style={{ color: 'var(--ink-2)' }}>{status}</strong></span>
      )}
    </div>
  );
}

// SectionCheckSummary: C層末の Act パネルで使う。pageId と sectionIds を渡し、
// △・× セクションへの再読リンクを表示。
function SectionCheckSummary({ pageId, sections, onJump }) {
  const [scores, setScores] = React.useState({});
  const refresh = React.useCallback(() => {
    const result = {};
    sections.forEach(s => {
      const key = `denken_check::hoki_${pageId}::section::${s.id}`;
      try { result[s.id] = localStorage.getItem(key) || ''; } catch { result[s.id] = ''; }
    });
    setScores(result);
  }, [pageId, sections]);
  React.useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('section-check-changed', handler);
    return () => window.removeEventListener('section-check-changed', handler);
  }, [refresh]);

  const total = sections.length;
  const counts = { '◎': 0, '○': 0, '△': 0, '×': 0, '未': 0 };
  sections.forEach(s => {
    const v = scores[s.id];
    if (v && counts[v] !== undefined) counts[v]++; else counts['未']++;
  });
  const weak = sections.filter(s => ['△', '×'].includes(scores[s.id]) || !scores[s.id]);

  return (
    <div style={{
      background: 'var(--bg-elev)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '14px 18px',
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>
        📊 理解度サマリ（{total} セクション中）
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12, fontSize: 12 }}>
        <span><strong style={{ color: '#16a34a' }}>◎ {counts['◎']}</strong></span>
        <span><strong style={{ color: '#3b82f6' }}>○ {counts['○']}</strong></span>
        <span><strong style={{ color: '#f59e0b' }}>△ {counts['△']}</strong></span>
        <span><strong style={{ color: '#dc2626' }}>× {counts['×']}</strong></span>
        <span><strong style={{ color: 'var(--ink-3)' }}>未 {counts['未']}</strong></span>
      </div>
      {weak.length > 0 ? (
        <>
          <div style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 6, fontWeight: 600 }}>
            🔁 弱点セクション（△・×・未） — 再読推奨
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.8 }}>
            {weak.map(s => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => { e.preventDefault(); if (onJump) onJump(s.id); else { location.hash = s.id; } }}
                  style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                >{s.label} →</a>
                {scores[s.id] && <span style={{ marginLeft: 8, color: 'var(--ink-3)' }}>（{scores[s.id]}）</span>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
          ✨ すべてのセクションが ◎ または ○ です。お疲れさまでした！
        </div>
      )}
    </div>
  );
}

function MasteredToggle({ pageId, label = "" }) {
  const key = `hoki-mastered-${pageId}`;
  const [mastered, setMastered] = React.useState(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  const toggle = () => {
    const next = !mastered;
    setMastered(next);
    try { localStorage.setItem(key, next ? '1' : '0'); } catch {}
  };
  return (
    <button
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 'var(--radius)',
        border: mastered ? '1px solid var(--good)' : '1px solid var(--line)',
        background: mastered ? 'var(--bg-elev)' : 'var(--bg-elev)',
        color: mastered ? 'var(--good)' : 'var(--ink-2)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
      title={mastered ? 'クリックで「未習得」に戻す' : 'クリックで「覚えた」にマーク'}
    >
      {mastered ? '✓ 覚えた' : '⚪ 未習得'}
      {label && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>（{label}）</span>}
    </button>
  );
}

function PlainExplain({ children }) {
  return (
    <div style={{
      background: 'var(--bg-elev)',
      border: '1px solid var(--line)',
      borderLeft: '3px solid var(--ink-3)',
      borderRadius: 'var(--radius)',
      padding: '14px 18px',
      marginBottom: '24px',
      fontSize: '14px',
      lineHeight: '1.8',
    }}>
      <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--ink-3)', marginBottom: '6px', letterSpacing: '0.05em' }}>かみ砕き解説</div>
      {children}
    </div>
  );
}

function MemTable({ headers, rows, note }) {
  return (
    <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
      <table className="mini-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'auto' }}>
        {headers && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', background: 'var(--bg-2)', borderBottom: '2px solid var(--line)', textAlign: 'left', fontSize: '12px', color: 'var(--ink-2)', wordBreak: 'break-word' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {(Array.isArray(row) ? row : [row]).map((cell, ci) => (
                <td key={ci} style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '6px' }}>{note}</div>}
    </div>
  );
}

function SolveFlow({ type, steps }) {
  return (
    <div style={{
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      marginBottom: '24px',
    }}>
      <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--accent)', marginBottom: '12px', letterSpacing: '0.05em' }}>
        解き方・判断手順 {type && `（${type}）`}
      </div>
      <ol style={{ paddingLeft: '20px', margin: 0 }}>
        {steps.map((step, i) => (
          <li key={i} style={{ fontSize: '13px', lineHeight: '1.8', paddingBottom: '4px' }}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

// TrapTable: よくあるひっかけ表。各行に per-item 理解度（✓理解 / ⚠要復習）を付与し、
// ⚠要復習 を押すと間違いノート(MachigaiNotePage)へ JSON 記録として自動集約する。
// payload schema は QuickReview / denken-wiki self-check.js と同期必須
//   （denken_check::hoki_<slug>::<hash> に { status, articleUrl, itemTitle, ... } の JSON）。
// status マッピング: ✓理解 → 'understood' / ⚠要復習 → 'review'（間違いノートの「要復習」タブに入る）。
// キーは trap.wrong + trap.correct のハッシュで固定（行の並べ替えに強く・同文衝突も回避）。
//   文言改訂時のみ旧記録が orphan する（QuickReview と同じ既知トレードオフ）。
function TrapTable({ traps }) {
  const slug = (typeof window !== 'undefined'
    ? (window.location.hash.replace(/^#/, '').split(':')[0] || 'unknown')
    : 'unknown');
  const storageKey = (t) => `denken_check::hoki_${slug}::${qrDjb2('trap::' + t.wrong + '::' + t.correct)}`;

  const TRAP_BTNS = [
    { status: 'understood', label: '理解',   icon: '✓', color: '#22c55e' },
    { status: 'review',     label: '要復習', icon: '⚠', color: '#f97316' },
  ];

  const loadAll = () => {
    const r = {};
    traps.forEach((t, i) => {
      try { const v = localStorage.getItem(storageKey(t)); r[i] = v ? JSON.parse(v) : null; }
      catch (e) { r[i] = null; }
    });
    return r;
  };
  const [records, setRecords] = React.useState(loadAll);

  // WIKI_DATA からページ名を引く（間違いノートで記録元を明示するため）
  const pageTitle = () => {
    try {
      const data = window.WIKI_DATA;
      if (data && data.chapters) {
        for (const ch of data.chapters) {
          const p = (ch.pages || []).find(pp => pp.id === slug);
          if (p) return p.title;
        }
      }
    } catch (e) {}
    return (typeof document !== 'undefined' ? document.title : '');
  };

  const setRecord = (i, t, status) => {
    const cur = records[i];
    let next;
    if (cur && cur.status === status) {
      // 同じボタン再押下でトグル解除 → 記録削除（間違いノートからも消える）
      try { localStorage.removeItem(storageKey(t)); } catch (e) {}
      next = null;
    } else {
      const nowIso = new Date().toISOString();
      const payload = Object.assign({}, cur || {}, {
        status,
        updatedAt: nowIso,
        articleUrl: typeof location !== 'undefined' ? (location.origin + location.pathname + '#' + slug) : '',
        articleTitle: pageTitle() + ' — よくあるひっかけ',
        itemTitle: '【ひっかけ】' + t.wrong,
        itemType: 'trap',
        memo: '正: ' + t.correct,
        firstSeenAt: (cur && cur.firstSeenAt) || nowIso,
        reviewCount: ((cur && cur.reviewCount) || 0) + 1,
      });
      try { localStorage.setItem(storageKey(t), JSON.stringify(payload)); } catch (e) {}
      next = payload;
    }
    setRecords(prev => ({ ...prev, [i]: next }));
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--warn)', marginBottom: '8px' }}>⚠ よくあるひっかけ</div>
      <table className="trap-table">
        <thead>
          <tr>
            <th style={{ padding: '8px 12px', background: '#fff5f5', color: 'var(--warn)', fontSize: '12px', textAlign: 'left', border: '1px solid var(--line)' }}>
              × 誤り
            </th>
            <th style={{ padding: '8px 12px', background: '#f0fff4', color: 'var(--good)', fontSize: '12px', textAlign: 'left', border: '1px solid var(--line)' }}>
              ○ 正しい
            </th>
            <th style={{ padding: '8px 12px', background: 'var(--bg-2)', color: 'var(--ink-3)', fontSize: '12px', textAlign: 'center', border: '1px solid var(--line)', whiteSpace: 'nowrap' }}>
              理解度
            </th>
          </tr>
        </thead>
        <tbody>
          {traps.map((trap, i) => {
            const rec = records[i];
            const status = rec ? rec.status : null;
            return (
              <tr key={i}>
                <td className="trap-wrong" style={{ border: '1px solid var(--line)' }}>{trap.wrong}</td>
                <td className="trap-correct" style={{ border: '1px solid var(--line)' }}>{trap.correct}</td>
                <td style={{ border: '1px solid var(--line)', textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                  <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
                    {TRAP_BTNS.map(b => {
                      const active = status === b.status;
                      return (
                        <button
                          key={b.status}
                          type="button"
                          onClick={() => setRecord(i, trap, b.status)}
                          title={active ? 'もう一度押すと記録解除' : b.label + 'として記録（間違いノートへ）'}
                          aria-label={b.label}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                            padding: '3px 8px',
                            border: `1.5px solid ${b.color}`,
                            borderRadius: 6,
                            background: active ? b.color : 'transparent',
                            color: active ? '#fff' : b.color,
                            cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                            whiteSpace: 'nowrap', transition: 'all 0.12s',
                          }}
                        >{b.icon} {b.label}</button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
        理解度は<strong>このひっかけ1件ごと</strong>の手応え。<strong style={{ color: '#f97316' }}>⚠要復習</strong> を押すと <strong>間違いノート</strong> に集約されます（もう一度押すと解除）。
      </div>
    </div>
  );
}

function ExamQuestion({ year, qNum, question, choices, note }) {
  return (
    <div style={{
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      marginBottom: '16px',
      background: 'var(--bg-2)',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginBottom: '6px' }}>
        {year && <span style={{ marginRight: '8px' }}>{year}</span>}
        {qNum && <span>問{qNum}</span>}
      </div>
      <p style={{ fontSize: '14px', lineHeight: '1.7', margin: '0 0 10px' }}>{question}</p>
      {choices && choices.length > 0 && (
        <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', lineHeight: '1.7' }}>
          {choices.map((c, i) => (
            <li key={i} data-correct={c.correct ? 'true' : undefined}>
              {c.text || c}
            </li>
          ))}
        </ol>
      )}
      {note && <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '10px' }}>{note}</div>}
    </div>
  );
}

function ExamAnswer({ correct, explanations }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'inline-block',
        background: 'var(--good)',
        color: '#fff',
        fontWeight: '700',
        fontSize: '13px',
        padding: '4px 12px',
        borderRadius: 'var(--radius)',
        marginBottom: '12px',
      }}>
        正解: {correct}
      </div>
      {explanations && explanations.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {explanations.map((ex, i) => (
              <tr key={i} style={{ borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                <td style={{ padding: '8px 10px', width: '40px', fontWeight: '700', textAlign: 'center' }}>{ex.choice}</td>
                <td style={{
                  padding: '8px 10px',
                  width: '30px',
                  color: ex.mark === '○' ? 'var(--good)' : 'var(--warn)',
                  fontWeight: '700',
                  fontSize: '15px',
                }}>
                  {ex.mark}
                </td>
                <td style={{ padding: '8px 10px', lineHeight: '1.7' }}>{ex.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// QuickReview: denken-wiki self-check.js と互換の理解度4段階トラッキング
// 4状態: understood(✓緑) / vague(?黄) / review(!橙) / wrong(✗赤)
// localStorage キー形式: denken_check::hoki_<pageId>::<itemHash>
// 同じボタン再押下でトグル解除
const QR_STATUSES = [
  { key: 'understood', label: '理解した', color: '#22c55e', icon: '✓' },
  { key: 'vague',      label: 'うる覚え', color: '#f59e0b', icon: '?' },
  { key: 'review',     label: '要確認',   color: '#f97316', icon: '!' },
  { key: 'wrong',      label: '間違えた', color: '#dc2626', icon: '✗' },
];

function qrDjb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h & 0xffffffff;
  }
  return (h >>> 0).toString(36);
}

function qrFormatTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `記録: ${d.getFullYear()}-${m}-${dy} ${hh}:${mm}`;
}

function QuickReview({ items, pageId }) {
  const limited = items.slice(0, 5);
  const slug = pageId
    || (typeof window !== 'undefined' ? (window.location.hash.replace(/^#/, '').split(':')[0] || 'unknown') : 'unknown');

  const storageKey = (i) => `denken_check::hoki_${slug}::${qrDjb2('quickreview::Q' + (i + 1) + '::' + limited[i].q)}`;

  const loadAll = () => {
    const r = {};
    for (let i = 0; i < limited.length; i++) {
      try {
        const v = localStorage.getItem(storageKey(i));
        r[i] = v ? JSON.parse(v) : null;
      } catch (e) { r[i] = null; }
    }
    return r;
  };

  const [records, setRecords] = React.useState(loadAll);

  const setRecord = (i, status) => {
    const cur = records[i];
    let next;
    if (cur && cur.status === status) {
      // toggle OFF: 完全削除（denken-wiki self-check.js は memo を残すが
      //   hoki QuickReview には memo 機能が無いので削除で十分）。
      //   reviewCount/firstSeenAt も消える（同じ問題を別途やり直すと再カウント）。
      try { localStorage.removeItem(storageKey(i)); } catch (e) {}
      next = null;
    } else {
      const nowIso = new Date().toISOString();
      // ⚠ payload schema: denken-wiki/docs/javascripts/self-check.js と同期必須
      //   詳細: build-hoki-wiki.py のヘッダコメント参照
      const payload = Object.assign({}, cur || {}, {
        status,
        updatedAt: nowIso,
        articleUrl: typeof location !== 'undefined' ? (location.origin + location.pathname + '#' + slug) : '',
        articleTitle: typeof document !== 'undefined' ? document.title : '',
        itemTitle: 'Q' + (i + 1) + ': ' + limited[i].q,
        itemType: 'quickreview',
        memo: 'A: ' + (limited[i].a || ''),
        firstSeenAt: (cur && cur.firstSeenAt) || nowIso,
        reviewCount: ((cur && cur.reviewCount) || 0) + 1,
      });
      try { localStorage.setItem(storageKey(i), JSON.stringify(payload)); } catch (e) {}
      next = payload;
    }
    setRecords(prev => ({ ...prev, [i]: next }));
  };

  return (
    <div className="quick-review" style={{ marginBottom: '24px' }}>
      <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', color: 'var(--ink-2)' }}>1分復習</div>
      {limited.map((item, i) => {
        const rec = records[i];
        const status = rec ? rec.status : null;
        const def = status ? QR_STATUSES.find(s => s.key === status) : null;
        return (
          <details
            key={i}
            className={`quick-review${status ? ' sc-status-' + status : ''}`}
            style={status ? { borderLeft: `3px solid ${def.color}` } : undefined}
          >
            <summary>
              Q{i + 1}: {item.q}　（クリックで答えを確認）
              {def && (
                <span style={{
                  display: 'inline-block', marginLeft: 8,
                  padding: '1px 8px',
                  background: def.color, color: '#fff',
                  borderRadius: 999,
                  fontSize: 11, fontWeight: 700,
                  verticalAlign: 'middle', lineHeight: 1.6,
                  letterSpacing: '0.02em', whiteSpace: 'nowrap',
                }}>
                  {def.icon} {def.label}
                </span>
              )}
            </summary>
            <div className="quick-review-answer">A: {item.a}</div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6,
              alignItems: 'center',
              marginTop: 10, paddingTop: 8, paddingLeft: 12, paddingRight: 12,
              borderTop: '1px dashed var(--line)',
              fontSize: 12,
            }}>
              <span style={{ fontWeight: 700, color: 'var(--ink-2)', marginRight: 4 }}>理解度:</span>
              {QR_STATUSES.map(s => {
                const active = status === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setRecord(i, s.key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 12px',
                      borderRadius: 999,
                      border: `1.5px solid ${s.color}`,
                      background: active ? s.color : 'transparent',
                      color: active ? '#fff' : s.color,
                      cursor: 'pointer',
                      fontWeight: 700, fontSize: 12,
                      fontFamily: 'inherit',
                      lineHeight: 1.4,
                      transition: 'all 0.15s',
                      boxShadow: active ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 13, lineHeight: 1, width: '1em', textAlign: 'center' }}>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
              {rec && rec.updatedAt && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                  {qrFormatTs(rec.updatedAt)}
                </span>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function CrossRef({ patterns }) {
  return (
    <div className="cross-ref">
      <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--ink-2)', marginBottom: '10px', letterSpacing: '0.05em' }}>
        掛け算出題パターン
      </div>
      {patterns.map((p, i) => (
        <div key={i} className="cross-ref-item">
          <span style={{ color: 'var(--accent)' }}>{p.a}</span>
          <span style={{ margin: '0 6px', color: 'var(--ink-3)' }}>×</span>
          <span style={{ color: 'var(--accent)' }}>{p.b}</span>
          <span style={{ margin: '0 6px', color: 'var(--ink-3)' }}>→</span>
          <span>{p.result}</span>
        </div>
      ))}
    </div>
  );
}

function RelatedPages({ items, onNav }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', color: 'var(--ink-2)' }}>関連ページ</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => onNav && onNav(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
          >
            <span style={{ color: 'var(--accent)', fontWeight: '600' }}>→</span>
            <span style={{ flex: 1, fontWeight: '600' }}>{item.title}</span>
            {item.relation && <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{item.relation}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function NextAction({ nextPageId, nextPageTitle, onNav }) {
  const handleScrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleScrollRelated = () => {
    const el = document.getElementById('related-pages');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="next-action">
      {nextPageId && nextPageTitle && (
        <div
          className="next-action-card"
          onClick={() => onNav && onNav(nextPageId)}
        >
          <div className="next-action-key">A</div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>次のページへ進む</div>
          <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{nextPageTitle}</div>
        </div>
      )}
      <div className="next-action-card" onClick={handleScrollTop}>
        <div className="next-action-key">B</div>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>ゴール問題をもう一度解く</div>
        <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>ページ先頭に戻る</div>
      </div>
      <div className="next-action-card" onClick={handleScrollRelated}>
        <div className="next-action-key">C</div>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>関連ページで横断学習</div>
        <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>関連ページセクションへ</div>
      </div>
    </div>
  );
}

function UpdateLog({ entries }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: 'var(--radius)',
        padding: '10px 14px',
        fontSize: '12px',
        marginBottom: '10px',
        color: '#856404',
      }}>
        ⚠ 法令改正に注意。掲載内容は確認日時点のものです。
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px', background: 'var(--bg-2)', textAlign: 'left', fontSize: '12px', color: 'var(--ink-2)', borderBottom: '2px solid var(--line)', width: '120px' }}>日付</th>
            <th style={{ padding: '8px 12px', background: 'var(--bg-2)', textAlign: 'left', fontSize: '12px', color: 'var(--ink-2)', borderBottom: '2px solid var(--line)' }}>内容</th>
            <th style={{ padding: '8px 12px', background: 'var(--bg-2)', textAlign: 'left', fontSize: '12px', color: 'var(--ink-2)', borderBottom: '2px solid var(--line)', width: '160px' }}>理由</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{entry.date}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>{entry.content}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', color: 'var(--ink-3)', fontSize: '12px' }}>{entry.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageVariantSwitch({ variants, current, onNav }) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      margin: '0 0 14px',
      padding: 4,
      background: 'var(--bg-elev)',
      border: '1px solid var(--bd)',
      borderRadius: 10,
      width: 'fit-content',
    }}>
      {variants.map(v => {
        const active = v.id === current;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => !active && onNav && onNav(v.id)}
            disabled={active}
            style={{
              cursor: active ? 'default' : 'pointer',
              padding: '7px 16px',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : 'var(--ink-2)',
              border: 'none',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              lineHeight: 1.2,
              transition: 'background 0.15s',
            }}
          >
            {v.label}
            {v.sublabel && (
              <span style={{
                marginLeft: 6,
                fontSize: 11,
                opacity: active ? 0.85 : 0.7,
                fontWeight: 400,
              }}>{v.sublabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PageNav({ prevId, prevTitle, nextId, nextTitle, onNav }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 0',
      borderTop: '1px solid var(--line)',
      marginTop: '32px',
      fontSize: '13px',
    }}>
      <div style={{ flex: 1 }}>
        {prevId && prevTitle && (
          <span
            onClick={() => onNav && onNav(prevId)}
            style={{ cursor: 'pointer', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            ← {prevTitle}
          </span>
        )}
      </div>
      <div>
        <span
          onClick={() => onNav && onNav('top')}
          style={{ cursor: 'pointer', color: 'var(--ink-3)', fontSize: '12px' }}
        >
          ホーム
        </span>
      </div>
      <div style={{ flex: 1, textAlign: 'right' }}>
        {nextId && nextTitle && (
          <span
            onClick={() => onNav && onNav(nextId)}
            style={{ cursor: 'pointer', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            {nextTitle} →
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 1.5 PageTabs（3タブ統合パターン・公式/解説/学習）
// riron-wiki から移植。React.useState/useEffect プレフィックス付き。
// hash: #pageId:tabId 形式で深リンク可・localStorage で last tab 記憶
// ============================================================

const PageTabs = ({ pageId, tabs, defaultTab, children }) => {
  const tabIds = tabs.map(t => t.id);
  const [activeTab, setActiveTab] = React.useState(() => {
    const h = location.hash.replace(/^#/, '');
    const hashTab = h.includes(':') ? h.split(':')[1] : null;
    if (hashTab && tabIds.includes(hashTab)) return hashTab;
    try {
      const stored = localStorage.getItem(`hoki_tab::${pageId}`);
      if (stored && tabIds.includes(stored)) return stored;
    } catch (e) { /* localStorage unavailable */ }
    return defaultTab || tabIds[0];
  });

  const switchTab = (tabId) => {
    if (!tabIds.includes(tabId)) return;
    setActiveTab(tabId);
    try { localStorage.setItem(`hoki_tab::${pageId}`, tabId); } catch (e) { /* noop */ }
    history.replaceState(null, '', `#${pageId}:${tabId}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  React.useEffect(() => {
    const onHash = () => {
      const h = location.hash.replace(/^#/, '');
      const parts = h.split(':');
      if (parts[0] === pageId && parts[1] && tabIds.includes(parts[1])) {
        setActiveTab(parts[1]);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [pageId]);

  return (
    <div className="page-tabs-container" style={{ margin: "16px 0 0 0" }}>
      <div role="tablist" style={{
        display: "flex",
        gap: "4px",
        borderBottom: "2px solid var(--line)",
        margin: 0,
        padding: 0,
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        background: "var(--bg-1)",
        zIndex: 10,
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => switchTab(tab.id)}
              style={{
                appearance: "none",
                border: "none",
                background: isActive ? "var(--bg-elev)" : "transparent",
                color: isActive ? "var(--ink-1)" : "var(--ink-3)",
                fontWeight: isActive ? 700 : 500,
                padding: "10px 18px",
                fontSize: "14px",
                cursor: "pointer",
                borderRadius: "6px 6px 0 0",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-2px",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" style={{ paddingTop: "16px" }}>
        {typeof children === 'function' ? children(activeTab, switchTab) : children}
      </div>
    </div>
  );
};

// ============================================================
// 2. レイアウトコンポーネント
// ============================================================

// 出題頻度ランクの配色（commit 6519f1e より復活）
const RANK_COLORS = { S: '#ef4444', A: '#f97316', B: '#3b82f6', C: '#22c55e' };
const MKDOCS_BASE = 'https://kfurufuru.github.io/denken-wiki/';

function Sidebar({ data, page, onNav }) {
  const [sidebarMode, setSidebarMode] = React.useState(() => {
    try { return localStorage.getItem('hoki_sidebar_mode') || 'theme'; }
    catch (e) { return 'theme'; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('hoki_sidebar_mode', sidebarMode); } catch (e) {}
  }, [sidebarMode]);

  const [yearWindow, setYearWindow] = React.useState(() => {
    try {
      const v = localStorage.getItem('hoki_sidebar_window');
      return (v === '5y' || v === '10y' || v === '15y') ? v : '10y';
    } catch (e) { return '10y'; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('hoki_sidebar_window', yearWindow); } catch (e) {}
  }, [yearWindow]);

  const [openChapters, setOpenChapters] = React.useState(() => {
    if (!data || !data.chapters) return {};
    const initial = {};
    data.chapters.forEach((ch, idx) => {
      if (ch.pages && ch.pages.some(p => p.id === page)) {
        initial[idx] = true;
      }
    });
    return initial;
  });

  const toggleChapter = (idx) => {
    setOpenChapters(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getLastSeenBadge = (pageId) => {
    const val = localStorage.getItem(`hoki_lastSeen_${pageId}`);
    if (!val) return null;
    const diff = Date.now() - parseInt(val, 10);
    const days = diff / (1000 * 60 * 60 * 24);
    if (days >= 3) return <span className="nav-badge-review" title="3日以上未閲覧">🔄</span>;
    return null;
  };

  // 内部ページIDが実在するか（WIKI_DATA から導出）
  const validPageIds = React.useMemo(() => {
    const set = new Set();
    if (data && data.chapters) {
      data.chapters.forEach(ch => (ch.pages || []).forEach(p => set.add(p.id)));
    }
    return set;
  }, [data]);

  const ranking = (typeof window !== 'undefined' && window.HOKI_RANKING) || null;
  const themes = ranking && ranking.windows ? (ranking.windows[yearWindow] || []) : [];

  if (!data || !data.chapters) {
    return (
      <aside className="sidebar" style={{ padding: '16px', fontSize: '13px', color: 'var(--ink-3)' }}>
        データ未ロード
      </aside>
    );
  }

  const tabs = [{ id: 'theme', label: '分野で探す' }, { id: 'chapter', label: '教科書順' }];

  return (
    <aside className="sidebar" style={{ height: '100vh', overflowY: 'auto', borderRight: '1px solid var(--line)', padding: '12px 0' }}>
      {data.title && (
        <div style={{ padding: '10px 16px 12px', fontWeight: '700', fontSize: '14px' }}>
          {data.title}
        </div>
      )}
      {/* タブ切替 */}
      <div style={{ display: 'flex', padding: '0 12px', marginBottom: 8, gap: 4, borderBottom: '1px solid var(--line)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSidebarMode(tab.id)}
            style={{
              padding: '7px 10px',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: sidebarMode === tab.id ? 'var(--accent)' : 'var(--ink-3)',
              fontWeight: 700,
              borderBottom: sidebarMode === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sidebarMode === 'theme' ? (
        <div style={{ padding: '4px 0 8px' }}>
          <div style={{ padding: '4px 16px 6px', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
            出題頻度（{yearWindow === '5y' ? '過去5年' : yearWindow === '15y' ? '過去15年' : '過去10年'}・S/A/B/C順）
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '0 12px 8px' }}>
            {['5y', '10y', '15y'].map(y => (
              <button
                key={y}
                onClick={() => setYearWindow(y)}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  fontSize: 11,
                  cursor: 'pointer',
                  border: yearWindow === y ? '1px solid var(--accent)' : '1px solid var(--line)',
                  background: yearWindow === y ? 'var(--accent-soft)' : 'transparent',
                  color: yearWindow === y ? 'var(--accent)' : 'var(--ink-2)',
                  fontWeight: yearWindow === y ? 700 : 500,
                  borderRadius: 4,
                }}
              >
                {y === '5y' ? '5年' : y === '10y' ? '10年' : '15年'}
              </button>
            ))}
          </div>
          {/* TOP行 */}
          <div
            onClick={() => onNav && onNav('top')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', fontSize: 12, cursor: 'pointer',
              background: page === 'top' ? 'var(--accent-soft)' : 'transparent',
              borderLeft: page === 'top' ? '3px solid var(--accent)' : '3px solid transparent',
              color: page === 'top' ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            <span style={{ flex: 1 }}>🏠 すべてのテーマ（TOP）</span>
          </div>
          {themes.length === 0 && (
            <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--ink-3)' }}>ランキングデータ未ロード</div>
          )}
          {themes.map((t, i) => {
            const isInternal = t.pageId && validPageIds.has(t.pageId);
            const isActive = isInternal && t.pageId === page;
            const isClickable = isInternal || !!t.mkdocs;
            const handleClick = () => {
              if (isInternal) onNav && onNav(t.pageId);
              else if (t.mkdocs) window.open(MKDOCS_BASE + 'themes/' + t.mkdocs + '/', '_blank', 'noopener');
            };
            return (
              <div
                key={t.slug || i}
                onClick={isClickable ? handleClick : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', fontSize: 12,
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: isClickable ? 1 : 0.5,
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                }}
                onMouseEnter={e => { if (isClickable && !isActive) e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  background: RANK_COLORS[t.rank] || 'var(--ink-3)',
                  color: '#fff',
                  fontSize: t.rank === 'S' ? 9 : 8.5,
                  fontWeight: 700,
                  padding: t.rank === 'S' ? '1px 5px' : '0 4px',
                  borderRadius: 3,
                  minWidth: t.rank === 'S' ? 14 : 12,
                  textAlign: 'center',
                  opacity: t.rank === 'S' ? 1 : 0.85,
                }}>{t.rank}</span>
                {!isInternal && t.mkdocs && (
                  <span style={{ fontSize: 9, color: 'var(--ink-3)' }} title="外部Wiki（denken-wiki/themes）へ">↗</span>
                )}
                <span style={{ flex: 1, lineHeight: 1.4 }}>{t.label}</span>
                <span style={{ fontSize: 9.5, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>{t.count}</span>
              </div>
            );
          })}
        </div>
      ) : (
        data.chapters.map((ch, idx) => (
          <div key={idx}>
            <div
              onClick={() => toggleChapter(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--ink-2)',
                background: openChapters[idx] ? 'var(--bg-2)' : 'transparent',
                userSelect: 'none',
              }}
            >
              <span style={{ color: 'var(--ink-3)', fontSize: '10px' }}>{openChapters[idx] ? '▼' : '▶'}</span>
              {ch.ch && <span style={{ fontSize: '10px', color: 'var(--ink-3)' }}>{ch.ch}</span>}
              <span style={{ flex: 1 }}>{ch.title}</span>
            </div>
            {openChapters[idx] && ch.pages && ch.pages.map((p, pi) => {
              const isActive = p.id === page;
              return (
                <div
                  key={pi}
                  onClick={() => onNav && onNav(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px 7px 28px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-2)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ flex: 1, lineHeight: '1.4' }}>{p.title}</span>
                  {p.priority === 'required' && (
                    <span className="priority-label">★必須</span>
                  )}
                  {p.freq === 'max' && <span className="freq-max">毎回</span>}
                  {p.freq === 'high' && <span className="freq-high">頻出</span>}
                  {p.twin && (
                    <span
                      title={`対となるページ: ${p.twin}`}
                      onClick={e => { e.stopPropagation(); onNav && onNav(p.twin); }}
                      style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: '11px' }}
                    >
                      ↔
                    </span>
                  )}
                  {getLastSeenBadge(p.id)}
                </div>
              );
            })}
          </div>
        ))
      )}
      <div style={{ marginTop: '16px', padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <a href="https://kfurufuru.github.io/denken-wiki/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-3)', textDecoration: 'none', fontSize: '12px' }}>→ 法規Wiki（新・条文解説版）</a>
        <a href="https://kfurufuru.github.io/secretary-portal/" style={{ color: 'var(--ink-3)', textDecoration: 'none', fontSize: '12px' }}>← ポータルに戻る</a>
      </div>
    </aside>
  );
}

function TOC({ page }) {
  const [headings, setHeadings] = React.useState([]);

  React.useEffect(() => {
    // React が DOM を更新してからクエリするため次フレームに遅延
    const timer = setTimeout(() => {
      const h2s = document.querySelectorAll('.content h2[id]');
      setHeadings(Array.from(h2s).map(h => ({ id: h.id, text: h.textContent.trim() })));
    }, 50);
    return () => clearTimeout(timer);
  }, [page]);

  if (headings.length === 0) return null;

  return (
    <div className="toc">
      <div className="toc-title">目次</div>
      {headings.map((h, i) => (
        <a
          key={i}
          className="toc-link"
          href={`#${h.id}`}
          onClick={e => {
            e.preventDefault();
            document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          {h.text}
        </a>
      ))}
    </div>
  );
}

// クエリ文字列をテキスト中で <mark> 風（黄色背景）にハイライトする
// 戻り値: 文字列のまま（マッチ無し）または React 要素配列（マッチあり）
function highlightMatch(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return [
    text.slice(0, idx),
    React.createElement(
      'span',
      { key: 'hl', style: { background: '#fef08a', fontWeight: 700, borderRadius: '2px', padding: '0 1px' } },
      text.slice(idx, idx + query.length)
    ),
    text.slice(idx + query.length),
  ];
}

function TopBar({ page, onNav }) {
  const data = window.WIKI_DATA;
  let pageTitle = page;
  if (data && data.chapters) {
    data.chapters.forEach(ch => {
      (ch.pages || []).forEach(p => {
        if (p.id === page) pageTitle = p.title;
      });
    });
  }

  // 横断検索 state（hoki-wiki + denken-wiki）
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const [denkenIndex, setDenkenIndex] = React.useState(null);
  const [denkenLoading, setDenkenLoading] = React.useState(true);
  const [activeFilter, setActiveFilter] = React.useState('all'); // 'all' | 'hoki' | 'glossary' | 'denken'
  const containerRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // denken-wiki search_index.json を非同期 preload（HTML描画と並列）
  React.useEffect(() => {
    const CACHE_KEY = 'denken-wiki-search-index-v1';
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setDenkenIndex(JSON.parse(cached));
        setDenkenLoading(false);
        return;
      }
    } catch (e) { /* sessionStorage無効環境はそのまま fetch へ */ }
    fetch('https://kfurufuru.github.io/denken-wiki/search/search_index.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(j => {
        const docs = (j.docs || []).filter(d => d && d.location && d.title);
        setDenkenIndex(docs);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(docs)); } catch (e) { /* 容量超過は黙殺 */ }
        setDenkenLoading(false);
      })
      .catch(err => {
        console.warn('[hoki-wiki] denken-wiki検索インデックスのロード失敗、hoki側のみで動作:', err);
        setDenkenLoading(false);
      });
  }, []);

  // Click outside で閉じる
  React.useEffect(() => {
    const h = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 結果計算（インクリメンタル即時）— 3カテゴリ別に分けて保持
  const buckets = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { hokiPages: [], glossary: [], denken: [] };
    const hokiPages = [];
    const glossary = [];
    const denken = [];
    const hokiIndex = window.HOKI_SEARCH_INDEX || [];
    hokiIndex.forEach(e => {
      if (!e.title) return;
      const title = e.title.toLowerCase();
      const ch = (e.chapterTitle || '').toLowerCase();
      const isGlossary = e.kind === 'glossary';
      const yomi = (e.yomi || '').toLowerCase();
      const meaning = (e.meaning || '').toLowerCase();
      let score = 0;
      if (title.includes(q)) score += 10;
      if (isGlossary && yomi.includes(q)) score += 8;
      if (isGlossary && meaning.includes(q)) score += 3;
      if (ch.includes(q)) score += 3;
      if (score > 0) {
        const item = {
          kind: 'hoki',
          subKind: isGlossary ? 'glossary' : 'page',
          score,
          id: e.id,
          navTarget: e.navTarget || e.id,
          title: e.title,
          num: e.num,
          chapterTitle: e.chapterTitle,
          meaning: e.meaning || '',
        };
        if (isGlossary) glossary.push(item);
        else hokiPages.push(item);
      }
    });
    if (denkenIndex) {
      denkenIndex.forEach(d => {
        const title = (d.title || '').toLowerCase();
        const text = d.text || '';
        const textLow = text.toLowerCase();
        let score = 0;
        if (title.includes(q)) score += 10;
        if (textLow.slice(0, 200).includes(q)) score += 5;
        else if (textLow.includes(q)) score += 1;
        if (score > 0) {
          const plain = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          denken.push({ kind: 'denken', score, title: d.title, location: d.location, preview: plain.slice(0, 80) });
        }
      });
    }
    hokiPages.sort((a, b) => b.score - a.score);
    glossary.sort((a, b) => b.score - a.score);
    denken.sort((a, b) => b.score - a.score);
    return { hokiPages, glossary, denken };
  }, [query, denkenIndex]);

  // フィルタ適用
  const results = React.useMemo(() => {
    const { hokiPages, glossary, denken } = buckets;
    if (activeFilter === 'hoki') return hokiPages.slice(0, 20);
    if (activeFilter === 'glossary') return glossary.slice(0, 20);
    if (activeFilter === 'denken') return denken.slice(0, 20);
    // 'all': hoki 3 + glossary 2 + denken 5 = 10（埋もれ防止）
    const TOTAL = 10;
    const pageTake = Math.min(hokiPages.length, 3);
    const glossTake = Math.min(glossary.length, 2);
    const denkenTake = Math.max(0, TOTAL - pageTake - glossTake);
    return [...hokiPages.slice(0, pageTake), ...glossary.slice(0, glossTake), ...denken.slice(0, denkenTake)];
  }, [buckets, activeFilter]);

  React.useEffect(() => { setHighlight(0); }, [query, activeFilter]);

  const select = (r) => {
    if (!r) return;
    if (r.kind === 'hoki') {
      onNav && onNav(r.navTarget || r.id);
      setOpen(false);
      setQuery('');
    } else {
      window.open('https://kfurufuru.github.io/denken-wiki/' + r.location, '_blank', 'noopener');
    }
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current && inputRef.current.blur(); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(results[highlight]); }
  };

  return (
    <div className="topbar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 20px',
      borderBottom: '1px solid var(--line)',
      fontSize: '13px',
      background: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <span
        onClick={() => onNav && onNav('top')}
        style={{ cursor: 'pointer', color: 'var(--accent)' }}
      >
        ホーム
      </span>
      {page !== 'top' && (
        <>
          <span style={{ color: 'var(--ink-3)' }}>/</span>
          <span className="page-title" style={{ color: 'var(--ink-2)' }}>{pageTitle}</span>
        </>
      )}
      <div style={{ flex: 1 }} />
      <div ref={containerRef} style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="検索（hoki + 法規wiki横断）"
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--line)',
            fontSize: '12px',
            background: 'var(--bg)',
            color: 'var(--ink)',
            width: '240px',
          }}
        />
        {open && query.trim() && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            width: '480px',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            zIndex: 100,
            maxHeight: '70vh',
            overflowY: 'auto',
          }}>
            {/* セクションフィルタチップ（denken-wiki標準パターン移植） */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '8px 12px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg-2)',
              flexWrap: 'wrap',
            }}>
              {[
                { id: 'all', label: 'すべて', count: buckets.hokiPages.length + buckets.glossary.length + buckets.denken.length },
                { id: 'hoki', label: '🟢 暗記Hub', count: buckets.hokiPages.length },
                { id: 'glossary', label: '🟡 用語', count: buckets.glossary.length },
                { id: 'denken', label: '🔵 法規Wiki', count: buckets.denken.length },
              ].map(chip => {
                const isActive = activeFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={(e) => { e.stopPropagation(); setActiveFilter(chip.id); }}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--line)'),
                      background: isActive ? 'var(--accent)' : 'var(--bg)',
                      color: isActive ? '#fff' : 'var(--ink-2)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.label} <span style={{ opacity: 0.7, marginLeft: '2px' }}>{chip.count}</span>
                  </button>
                );
              })}
            </div>
            {results.length === 0 && (
              <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--ink-3)' }}>
                {denkenLoading ? '法規Wiki読込中... hoki側を先に検索しています' : 'ヒットなし'}
              </div>
            )}
            {results.map((r, i) => {
              const isGlossary = r.kind === 'hoki' && r.subKind === 'glossary';
              const badgeBg = r.kind === 'denken' ? '#dbeafe' : (isGlossary ? '#fef3c7' : '#dcfce7');
              const badgeFg = r.kind === 'denken' ? '#1e40af' : (isGlossary ? '#92400e' : '#166534');
              const badgeText = r.kind === 'denken' ? '🔵 法規Wiki' : (isGlossary ? '🟡 用語' : '🟢 暗記Hub');
              const meaningPreview = isGlossary && r.meaning ? r.meaning.slice(0, 80) : '';
              return (
                <div
                  key={r.kind + '-' + (r.id || r.location)}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => select(r)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    background: i === highlight ? 'var(--bg-2)' : 'transparent',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: badgeBg,
                      color: badgeFg,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {badgeText}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{highlightMatch(r.title, query.trim())}</span>
                  </div>
                  {r.kind === 'denken' && r.preview && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--ink-3)', lineHeight: 1.5 }}>
                      {highlightMatch(r.preview, query.trim())}…
                    </div>
                  )}
                  {isGlossary && meaningPreview && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--ink-3)', lineHeight: 1.5 }}>
                      {highlightMatch(meaningPreview, query.trim())}{r.meaning.length > 80 ? '…' : ''}
                    </div>
                  )}
                  {r.kind === 'hoki' && r.chapterTitle && (
                    <div style={{ marginTop: '2px', fontSize: '11px', color: 'var(--ink-3)' }}>
                      {r.num} · {r.chapterTitle}
                    </div>
                  )}
                </div>
              );
            })}
            {denkenLoading && results.length > 0 && (
              <div style={{ padding: '6px 14px', fontSize: '10px', color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>
                法規Wiki読込中... 完了後さらに結果が追加されます
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 2-bis. BottomNav（スマホ専用・下部固定ショートカット）
// ============================================================
// CSSは hoki-head-template.html の .bottom-nav で制御（900px以下のみ表示）。
// サイドバーの代替ではなく、スマホでサイドバーが消える時の遷移ショートカット。

function BottomNav({ page, onNav }) {
  const items = [
    { key: 'top',      label: 'TOP',  icon: '🏠', target: 'top' },
    { key: 'hot',      label: '頻出', icon: '🔥', target: 'top', anchor: 'hp-topics' },
    { key: 'search',   label: '検索', icon: '🔍', target: '__search__' },
    { key: 'review',   label: '復習', icon: '📓', target: 'chokuzen-machigai' },
    { key: 'glossary', label: '用語', icon: '💡', target: 'chokuzen-yougo' },
  ];

  const handle = (it) => {
    if (it.target === '__search__') {
      const input = document.querySelector('.search input')
        || document.querySelector('input[placeholder*="検索"]');
      if (input) {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
        setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, 200);
      }
      return;
    }
    if (it.anchor) {
      location.hash = it.target + ':' + it.anchor;
    } else {
      onNav && onNav(it.target);
    }
  };

  return (
    <nav className="bottom-nav" aria-label="モバイル下部ナビ">
      {items.map((it) => {
        // 「TOP」と「頻出」は両方 target='top' なので、anchor 有無で識別する
        const active = it.key === 'top' && it.target === page;
        return (
          <button
            key={it.key}
            className={'bottom-nav-item' + (active ? ' active' : '')}
            onClick={() => handle(it)}
            aria-label={it.label}
          >
            <span className="icon" aria-hidden="true">{it.icon}</span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================
// 3. Appコンポーネント（メインアプリ）
// ============================================================

function App() {
  // ハッシュ解析: #pageid または #pageid:anchor 形式に対応
  // 例: #hichusei-jiraku → ページのみ
  // 例: #hichusei-jiraku:explain2 → ページ＋ページ内アンカー（h2 id="explain2" へスクロール）
  const parseHash = () => {
    const raw = location.hash.slice(1) || 'top';
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) return { pageId: raw, anchor: null };
    return { pageId: raw.slice(0, colonIdx), anchor: raw.slice(colonIdx + 1) };
  };

  const [page, setPage] = React.useState(() => parseHash().pageId);

  // アンカースクロール（ページがレンダー完了するまで待機してから実行）
  const scrollToAnchor = (anchor) => {
    if (!anchor) return;
    // 連続attemptで最大3秒間追跡（重いSVGページ対応）
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (attempts < 30) {
        attempts++;
        setTimeout(tryScroll, 100);
      }
    };
    tryScroll();
  };

  React.useEffect(() => {
    const handler = () => {
      const { pageId, anchor } = parseHash();
      setPage(pageId);
      localStorage.setItem(`hoki_lastSeen_${pageId}`, Date.now().toString());
      if (anchor) scrollToAnchor(anchor);
    };
    window.addEventListener('hashchange', handler);
    // 初回lastSeen記録 + 初回アンカースクロール
    localStorage.setItem(`hoki_lastSeen_${page}`, Date.now().toString());
    const { anchor } = parseHash();
    if (anchor) scrollToAnchor(anchor);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (id) => {
    location.hash = id;
  };

  return (
    <div className="app" style={{ display: 'grid', minHeight: '100vh' }}>
      <Sidebar data={window.WIKI_DATA} page={page} onNav={navigate} />
      <main className="main" style={{ minWidth: 0 }}>
        <TopBar page={page} onNav={navigate} />
        <div className="content" style={{ padding: '24px 32px', maxWidth: '860px' }}>
          {window.renderPage ? window.renderPage(page, navigate) : (
            <div style={{ color: 'var(--ink-3)', fontSize: '14px' }}>
              renderPage が未定義です（hoki-pages.jsx を読み込んでください）
            </div>
          )}
        </div>
      </main>
      <TOC page={page} />
      <BottomNav page={page} onNav={navigate} />
    </div>
  );
}

// ============================================================
// 4. コンポーネント用CSSインジェクション
// ============================================================

(function() {
  const style = document.createElement('style');
  style.textContent = `
    .goal-question { border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: var(--radius-lg); padding: 16px 20px; margin-bottom: 24px; background: var(--bg-2); }
    .goal-label { font-size: 12px; font-weight: 700; color: var(--accent); letter-spacing: 0.05em; margin-bottom: 8px; }
    .goal-q { font-size: 14px; line-height: 1.7; margin: 0 0 10px; }
    .goal-choices summary { font-size: 12px; color: var(--ink-3); cursor: pointer; }
    .conclusion-box { border: 2px solid var(--good); border-radius: var(--radius-lg); padding: 16px 20px; margin-bottom: 24px; }
    .conclusion-label { font-weight: 700; color: var(--good); margin-bottom: 8px; font-size: 13px; }
    .meta-strip-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
    .meta-strip-table td { padding: 6px 10px; border: 1px solid var(--line); }
    .meta-strip-table td:first-child { color: var(--ink-3); width: 120px; }
    .exam-focus { background: var(--bg-2); border-radius: var(--radius); padding: 16px; margin-bottom: 24px; }
    .trap-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
    .trap-table th { padding: 8px 12px; }
    .trap-table td { padding: 8px 12px; border-top: 1px solid var(--line); vertical-align: top; }
    .trap-wrong { color: var(--warn); }
    .trap-correct { color: var(--good); }
    .quick-review details { border: 1px solid var(--line); border-radius: var(--radius); margin-bottom: 8px; }
    .quick-review summary { padding: 10px 14px; cursor: pointer; font-size: 13px; }
    .quick-review-answer { padding: 10px 14px; font-size: 13px; background: var(--bg-2); }
    .next-action { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .next-action-card { border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; cursor: pointer; transition: border-color 0.15s; }
    .next-action-card:hover { border-color: var(--accent); }
    .next-action-key { font-size: 11px; font-weight: 700; color: var(--accent); margin-bottom: 6px; }
    .cross-ref { background: var(--bg-2); border-radius: var(--radius); padding: 14px 18px; margin-bottom: 24px; }
    .cross-ref-item { font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--line); }
    .cross-ref-item:last-child { border-bottom: none; }
    .twin-banner { background: var(--accent-soft); border: 1px solid var(--accent); border-radius: var(--radius); padding: 10px 14px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .denken-wiki-cta:hover { background: var(--accent-soft); border-color: var(--accent); }
    .denken-wiki-cta:active { transform: translateY(1px); }
    .denken-wiki-cta:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .freq-max  { background: #fde8e8; color: #c0392b; border-radius: 4px; padding: 1px 5px; font-size: 10px; }
    .freq-high { background: #fef3cd; color: #7d6608; border-radius: 4px; padding: 1px 5px; font-size: 10px; }
    .nav-badge-review { color: #2980b9; font-size: 11px; }
    .priority-label { font-size: 9px; color: var(--accent); font-weight: 700; }
    .toc { position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 22px 14px; border-left: 1px solid var(--line); font-size: 12px; }
    .toc-title { font-weight: 700; font-size: 11px; color: var(--ink-3); letter-spacing: 0.08em; margin-bottom: 10px; }
    .toc-link { display: block; padding: 4px 0; color: var(--ink-3); cursor: pointer; line-height: 1.4; text-decoration: none; }
    .toc-link:hover { color: var(--accent); }
    .app { grid-template-columns: 256px 1fr 220px; }
    @media (max-width: 1100px) { .app { grid-template-columns: 256px 1fr; } .toc { display: none; } }
    @media (max-width: 900px)  { .app { grid-template-columns: 1fr; } .sidebar { display: none; } }
  `;
  document.head.appendChild(style);
})();

// ============================================================
// 5. マウント
// ============================================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
