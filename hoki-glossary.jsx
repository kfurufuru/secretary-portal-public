/* hoki-glossary.jsx - 8.5 用語クイズ・SRS Page (React)
 * 第58条等の用語を3モード（一覧 / 意味当て / 単語当て）で段階管理する。
 * Vanilla glossary.js のロジックを React 化したもの。
 * Data: window.GLOSSARY_TERMS_V1
 * Storage: hoki_quiz_glossary_progress / hoki_quiz_glossary_lastBackup
 */

// ===== Constants =====
const STORAGE_KEY = 'hoki_quiz_glossary_progress';
const BACKUP_KEY = 'hoki_quiz_glossary_lastBackup';
const STAGE_INTERVALS = [0, 7, 30, 90, 180];
const SESSION_SIZE = 20;
const MEMO_MAX = 500;

const STAGE_BADGE = {
  1: { label: '🥉短期', bg: '#f4ddc4', color: '#8a4a17', border: '#d9a37a' },
  2: { label: '🥈中期', bg: '#e0e0e0', color: '#4a4a4a', border: '#b0b0b0' },
  3: { label: '🥇長期', bg: '#fbe69c', color: '#7a5a00', border: '#d8b850' },
  4: { label: '👑マスター', bg: '#d9c8f5', color: '#4a2780', border: '#a787da' },
};
const UNSURE_BADGE = { label: '△ 曖昧', bg: '#fff4cc', color: '#8a6500', border: '#e8c660' };
const WRONG_BADGE = { label: '✕ 不明', bg: '#ffe0e0', color: '#a00018', border: '#e89090' };
const REVIEW_BADGE = { label: '要再チェック', bg: '#ffd5d5', color: '#b00020', border: '#e08080' };
const MUTED_BADGE = { label: '未着手', bg: '#eeeeee', color: '#777777', border: '#cccccc' };

// ===== Date helpers =====
function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}
function parseDate(s) {
  if (!s) return null;
  const parts = String(s).split('-');
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return isNaN(d.getTime()) ? null : d;
}
function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function addDaysStr(baseStr, days) {
  const d = parseDate(baseStr) || new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

// ===== useFlashcardDeck Hook =====
function useFlashcardDeck(cards, storageKey) {
  const [progress, setProgress] = React.useState({});
  const [lastBackup, setLastBackup] = React.useState('');

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setProgress(raw ? JSON.parse(raw) || {} : {});
    } catch (e) { setProgress({}); }
    try {
      setLastBackup(localStorage.getItem(BACKUP_KEY) || '');
    } catch (e) { setLastBackup(''); }
  }, [storageKey]);

  const persist = React.useCallback((next) => {
    setProgress(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) {}
  }, [storageKey]);

  const getEntry = React.useCallback((id) => progress[id] || null, [progress]);
  const getStage = React.useCallback((id) => {
    const e = progress[id];
    return e && typeof e.stage === 'number' ? e.stage : 0;
  }, [progress]);
  const getLastResult = React.useCallback((id) => {
    const e = progress[id];
    return e ? (e.lastResult || null) : null;
  }, [progress]);
  const isNeedsReview = React.useCallback((id) => {
    const e = progress[id];
    if (!e || !e.nextReview || !e.stage || e.stage <= 0) return false;
    const today = parseDate(todayStr());
    const nx = parseDate(e.nextReview);
    if (!today || !nx) return false;
    return today.getTime() >= nx.getTime();
  }, [progress]);
  const hasUnresolvedMemo = React.useCallback((id) => {
    const e = progress[id];
    if (!e || !Array.isArray(e.notes)) return false;
    return e.notes.some(n => !n.resolved);
  }, [progress]);

  const recordResult = React.useCallback((id, result, meta) => {
    const cur = progress[id] || { stage: 0, wrongCount: 0, correctCount: 0, notes: [] };
    const e = Object.assign({}, cur);
    if (!Array.isArray(e.notes)) e.notes = cur.notes ? cur.notes.slice() : [];
    if (typeof e.stage !== 'number') e.stage = 0;
    if (typeof e.wrongCount !== 'number') e.wrongCount = 0;
    if (typeof e.correctCount !== 'number') e.correctCount = 0;
    const t = todayStr();
    if (result === 'correct') {
      e.stage = Math.min(4, e.stage + 1);
      e.correctCount++;
      e.lastReviewed = t;
      e.nextReview = addDaysStr(t, STAGE_INTERVALS[e.stage] || 0);
    } else if (result === 'unsure') {
      e.lastReviewed = t;
      e.nextReview = addDaysStr(t, 1);
    } else if (result === 'wrong') {
      e.stage = 0;
      e.wrongCount++;
      e.lastReviewed = t;
      e.nextReview = addDaysStr(t, 1);
    }
    e.lastResult = result;
    // Layer B 用ログ計装: どの兄弟と取り違えたかを初日から記録（自信度も将来ここに）
    if (meta && meta.confusedWith) {
      e.confusions = Object.assign({}, cur.confusions);
      e.confusions[meta.confusedWith] = (e.confusions[meta.confusedWith] || 0) + 1;
    }
    const next = Object.assign({}, progress, { [id]: e });
    persist(next);
  }, [progress, persist]);

  const addMemo = React.useCallback((id, text) => {
    text = String(text || '').slice(0, MEMO_MAX).trim();
    if (!text) return;
    const cur = progress[id] || { stage: 0, wrongCount: 0, correctCount: 0, notes: [] };
    const e = Object.assign({}, cur);
    e.notes = (Array.isArray(cur.notes) ? cur.notes.slice() : []);
    e.notes.push({ date: todayStr(), text: text, resolved: false });
    const next = Object.assign({}, progress, { [id]: e });
    persist(next);
  }, [progress, persist]);

  const toggleMemoResolved = React.useCallback((id, idx) => {
    const cur = progress[id];
    if (!cur || !Array.isArray(cur.notes) || !cur.notes[idx]) return;
    const e = Object.assign({}, cur);
    e.notes = cur.notes.slice();
    e.notes[idx] = Object.assign({}, e.notes[idx], { resolved: !e.notes[idx].resolved });
    const next = Object.assign({}, progress, { [id]: e });
    persist(next);
  }, [progress, persist]);

  const priorityScore = React.useCallback((card) => {
    let p = 0;
    const last = getLastResult(card.id);
    if (last === 'wrong') p += 100;
    if (last === 'unsure') p += 50;
    if (isNeedsReview(card.id)) p += 30;
    if (getStage(card.id) === 0) p += 80;
    const added = parseDate(card.addedDate);
    if (added) {
      const days = Math.max(0, daysBetween(added, new Date()));
      p += Math.max(0, 30 - days);
    }
    return p;
  }, [getLastResult, isNeedsReview, getStage]);

  const exportProgress = React.useCallback(() => {
    const data = { schema_version: 1, exportedAt: todayStr(), progress: progress };
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'glossary-progress-' + todayStr() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      const t = todayStr();
      try { localStorage.setItem(BACKUP_KEY, t); } catch (e) {}
      setLastBackup(t);
    } catch (e) {}
  }, [progress]);

  const importProgress = React.useCallback((file) => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            const incoming = (parsed && parsed.progress) ? parsed.progress : parsed;
            if (!incoming || typeof incoming !== 'object') throw new Error('形式が不正');
            const keys = Object.keys(incoming);
            for (let i = 0; i < keys.length; i++) {
              const v = incoming[keys[i]];
              if (!v || typeof v !== 'object') throw new Error('エントリ ' + keys[i] + ' が不正');
            }
            persist(incoming);
            resolve(keys.length);
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('読み込み失敗'));
        reader.readAsText(file);
      } catch (e) { reject(e); }
    });
  }, [persist]);

  const resetProgress = React.useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch (e) {}
    setProgress({});
  }, [storageKey]);

  return {
    progress, recordResult, getStage, getLastResult, isNeedsReview,
    hasUnresolvedMemo, addMemo, toggleMemoResolved, priorityScore,
    exportProgress, importProgress, resetProgress, lastBackup,
  };
}

// ===== Stage Badge component =====
function StageBadge({ stage, lastResult }) {
  let conf;
  if (stage > 0) conf = STAGE_BADGE[stage];
  else if (lastResult === 'unsure') conf = UNSURE_BADGE;
  else if (lastResult === 'wrong') conf = WRONG_BADGE;
  else conf = MUTED_BADGE;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 600,
      background: conf.bg,
      color: conf.color,
      border: `1px solid ${conf.border}`,
      borderRadius: 10,
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}>{conf.label}</span>
  );
}

function MiniBadge({ conf }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 600,
      background: conf.bg,
      color: conf.color,
      border: `1px solid ${conf.border}`,
      borderRadius: 10,
      lineHeight: 1.5,
      marginLeft: 4,
      whiteSpace: 'nowrap',
    }}>{conf.label}</span>
  );
}

// ===== Memo Modal =====
function MemoModal({ term, deck, onClose }) {
  const [text, setText] = React.useState('');
  const taRef = React.useRef(null);
  const entry = deck.progress[term.id];
  const notes = (entry && Array.isArray(entry.notes)) ? entry.notes : [];

  React.useEffect(() => {
    if (taRef.current) taRef.current.focus();
  }, []);

  const handleSave = () => {
    if (text.trim()) deck.addMemo(term.id, text);
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 20,
        maxWidth: 500,
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>📝 メモ追加: {term.term}</h3>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MEMO_MAX))}
          maxLength={MEMO_MAX}
          rows={5}
          placeholder={`混同しやすい点・覚え方など (${MEMO_MAX}文字以内)`}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: 8,
            fontSize: 13,
            border: '1px solid var(--border)',
            borderRadius: 6,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right', marginTop: 4 }}>
          {text.length} / {MEMO_MAX}
        </div>

        {notes.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>既存のメモ</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notes.map((n, i) => (
                <li key={i} style={{
                  fontSize: 12,
                  padding: 8,
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  opacity: n.resolved ? 0.55 : 1,
                  textDecoration: n.resolved ? 'line-through' : 'none',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!n.resolved}
                      onChange={() => deck.toggleMemoResolved(term.id, i)}
                    />
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{n.date}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)' }}>✓ 解決済</span>
                  </label>
                  <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{n.text}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn secondary" onClick={onClose}>キャンセル</button>
          <button className="btn primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ===== Mode 1: List =====
function ListMode({ terms, deck, onOpenMemo }) {
  const [filters, setFilters] = React.useState({
    unlearned: false, unsure: false, needsReview: false, hasMemo: false, article: '',
  });
  const [expanded, setExpanded] = React.useState({});
  const [flashId, setFlashId] = React.useState(null);
  const [flashType, setFlashType] = React.useState(null);

  const articles = React.useMemo(() => {
    const set = {};
    terms.forEach(t => (t.articles || []).forEach(a => { set[a] = true; }));
    return Object.keys(set).sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [terms]);

  const stats = React.useMemo(() => {
    let total = terms.length, untouched = 0, unsure = 0, review = 0, memo = 0;
    terms.forEach(t => {
      const stage = deck.getStage(t.id);
      const last = deck.getLastResult(t.id);
      if (stage === 0 && !last) untouched++;
      if (stage === 0 && last === 'unsure') unsure++;
      if (deck.isNeedsReview(t.id)) review++;
      if (deck.hasUnresolvedMemo(t.id)) memo++;
    });
    return { total, untouched, unsure, review, memo };
  }, [terms, deck]);

  const visible = React.useMemo(() => {
    let arr = terms.filter(t => {
      if (filters.unlearned && (deck.getStage(t.id) !== 0 || deck.getLastResult(t.id))) return false;
      if (filters.unsure && !(deck.getStage(t.id) === 0 && deck.getLastResult(t.id) === 'unsure')) return false;
      if (filters.needsReview && !deck.isNeedsReview(t.id)) return false;
      if (filters.hasMemo && !deck.hasUnresolvedMemo(t.id)) return false;
      if (filters.article) {
        const arts = t.articles || [];
        if (arts.indexOf(filters.article) === -1) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      const pa = deck.priorityScore(a), pb = deck.priorityScore(b);
      if (pa !== pb) return pb - pa;
      return String(a.term).localeCompare(String(b.term), 'ja');
    });
    return arr;
  }, [terms, filters, deck]);

  const handleResult = (id, result) => {
    deck.recordResult(id, result);
    setFlashId(id);
    setFlashType(result);
    setTimeout(() => { setFlashId(null); setFlashType(null); }, 600);
  };

  const statBoxStyle = {
    flex: '1 1 auto',
    minWidth: 90,
    padding: '8px 12px',
    background: 'var(--bg-elev)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    color: 'var(--ink-2)',
    textAlign: 'center',
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={statBoxStyle}>登録 <strong style={{ fontSize: 16, marginLeft: 4 }}>{stats.total}</strong></div>
        <div style={statBoxStyle}>未着手 <strong style={{ fontSize: 16, marginLeft: 4 }}>{stats.untouched}</strong></div>
        <div style={Object.assign({}, statBoxStyle, { borderColor: UNSURE_BADGE.border, background: UNSURE_BADGE.bg, color: UNSURE_BADGE.color })}>△ 曖昧 <strong style={{ fontSize: 16, marginLeft: 4 }}>{stats.unsure}</strong></div>
        <div style={Object.assign({}, statBoxStyle, { borderColor: REVIEW_BADGE.border, background: REVIEW_BADGE.bg, color: REVIEW_BADGE.color })}>要再チェック <strong style={{ fontSize: 16, marginLeft: 4 }}>{stats.review}</strong></div>
        <div style={statBoxStyle}>メモあり <strong style={{ fontSize: 16, marginLeft: 4 }}>{stats.memo}</strong></div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        padding: '10px 12px', marginBottom: 12,
        background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        fontSize: 12,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.unlearned} onChange={(e) => setFilters({ ...filters, unlearned: e.target.checked })} />
          未着手のみ
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.unsure} onChange={(e) => setFilters({ ...filters, unsure: e.target.checked })} />
          △ 曖昧のみ
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.needsReview} onChange={(e) => setFilters({ ...filters, needsReview: e.target.checked })} />
          要再チェックのみ
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.hasMemo} onChange={(e) => setFilters({ ...filters, hasMemo: e.target.checked })} />
          メモあり のみ
        </label>
        <select
          value={filters.article}
          onChange={(e) => setFilters({ ...filters, article: e.target.value })}
          style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
        >
          <option value="">条文すべて</option>
          {articles.map(a => <option key={a} value={a}>第{a}条</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 148 }} />
            <col style={{ width: 72 }} />
            <col style={{ width: 'auto' }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 152 }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--bg-elev)' }}>
              <th style={thStyle}>用語</th>
              <th style={thStyle}>読み</th>
              <th style={thStyle}>意味</th>
              <th style={thStyle}>段階</th>
              <th style={Object.assign({}, thStyle, { textAlign: 'center' })}>操作</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
                  該当する用語がありません。
                </td>
              </tr>
            )}
            {visible.map(t => {
              const stage = deck.getStage(t.id);
              const lastRes = deck.getLastResult(t.id);
              const nr = deck.isNeedsReview(t.id);
              const memo = deck.hasUnresolvedMemo(t.id);
              const isFlash = flashId === t.id;
              const isOpen = !!expanded[t.id];
              const entry = deck.progress[t.id];
              const notes = (entry && Array.isArray(entry.notes)) ? entry.notes : [];
              return (
                <React.Fragment key={t.id}>
                  <tr
                    onClick={() => setExpanded({ ...expanded, [t.id]: !isOpen })}
                    style={{
                      borderTop: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isFlash ? (flashType === 'correct' ? '#d8f4d8' : flashType === 'unsure' ? '#fff4cc' : '#ffe0e0') : 'transparent',
                      transition: 'background 0.6s ease',
                    }}
                  >
                    <td style={Object.assign({}, tdStyle, { wordBreak: 'keep-all', overflowWrap: 'break-word' })}>
                      <strong>{t.term}</strong>
                      {memo && <span title="未解決メモあり" style={{ color: '#d95454', marginLeft: 6 }}>●</span>}
                    </td>
                    <td style={Object.assign({}, tdStyle, { color: 'var(--ink-3)', fontSize: 12, wordBreak: 'keep-all', overflowWrap: 'break-word' })}>{t.yomi || ''}</td>
                    <td style={tdStyle}>{t.meaning || ''}</td>
                    <td style={tdStyle}>
                      <StageBadge stage={stage} lastResult={lastRes} />
                      {nr && <MiniBadge conf={REVIEW_BADGE} />}
                    </td>
                    <td style={Object.assign({}, tdStyle, { padding: '6px 8px' })} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        <button onClick={(e) => { e.stopPropagation(); handleResult(t.id, 'correct'); }} style={Object.assign({}, actionBtnStyle, { background: '#d8f4d8', color: '#1a6e1a', borderColor: '#90c890' })}>〇 理解</button>
                        <button onClick={(e) => { e.stopPropagation(); handleResult(t.id, 'unsure'); }} style={Object.assign({}, actionBtnStyle, { background: UNSURE_BADGE.bg, color: UNSURE_BADGE.color, borderColor: UNSURE_BADGE.border })}>△ 曖昧</button>
                        <button onClick={(e) => { e.stopPropagation(); handleResult(t.id, 'wrong'); }} style={Object.assign({}, actionBtnStyle, { background: WRONG_BADGE.bg, color: WRONG_BADGE.color, borderColor: WRONG_BADGE.border })}>✕ 不明</button>
                        <button onClick={(e) => { e.stopPropagation(); onOpenMemo(t.id); }} style={actionBtnStyle}>📝 メモ</button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr style={{ background: 'var(--bg-elev)' }}>
                      <td colSpan={5} style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                        {t.exam_note && (
                          <div style={{ marginBottom: 8, padding: '6px 10px', background: '#fff4cc', border: '1px solid #e8c660', borderRadius: 4, fontSize: 12, color: '#8a6500' }}>
                            ⚠ 試験での注意点: {t.exam_note}
                          </div>
                        )}
                        {notes.length === 0 ? (
                          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>メモはまだありません。クリックして追加できます。</span>
                        ) : (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {notes.map((n, i) => (
                              <li key={i} style={{
                                fontSize: 12,
                                padding: 6,
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                                background: 'var(--bg)',
                                opacity: n.resolved ? 0.5 : 1,
                                textDecoration: n.resolved ? 'line-through' : 'none',
                              }}>
                                <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer', marginRight: 8 }}>
                                  <input
                                    type="checkbox"
                                    checked={!!n.resolved}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => deck.toggleMemoResolved(t.id, i)}
                                  />
                                  解決済
                                </label>
                                <span style={{ color: 'var(--ink-3)' }}>{n.date}</span>
                                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{n.text}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ink-2)',
  borderBottom: '1px solid var(--border)',
};
const tdStyle = {
  padding: '8px 10px',
  verticalAlign: 'top',
};
const iconBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '3px 5px',
  margin: '0 1px',
  fontSize: 13,
  cursor: 'pointer',
  lineHeight: 1,
};
const actionBtnStyle = {
  background: 'var(--bg-elev)',
  border: '1px solid var(--border)',
  borderRadius: 5,
  padding: '5px 4px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  textAlign: 'center',
};

// ===== Mode 2: Quiz Meaning =====
function QuizMeaningMode({ session, setSession, deck, onOpenMemo, onRestart, onEndToList }) {
  const handleAction = React.useCallback((result) => {
    const t = session.items[session.index];
    deck.recordResult(t.id, result);
    setSession({
      ...session,
      results: [...session.results, { id: t.id, result }],
      index: session.index + 1,
      revealed: false,
    });
  }, [session, setSession, deck]);

  const handleReveal = React.useCallback(() => {
    setSession({ ...session, revealed: true });
  }, [session, setSession]);

  React.useEffect(() => {
    const handler = (ev) => {
      const tag = ev.target && ev.target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (!session || session.index >= session.items.length) return;
      if (ev.key === ' ' || ev.code === 'Space') {
        ev.preventDefault();
        if (!session.revealed) handleReveal();
        return;
      }
      if (!session.revealed) return;
      if (ev.key === '1') { ev.preventDefault(); handleAction('correct'); }
      else if (ev.key === '2') { ev.preventDefault(); handleAction('unsure'); }
      else if (ev.key === '3') { ev.preventDefault(); handleAction('wrong'); }
      else if (ev.key === 'n' || ev.key === 'N') {
        ev.preventDefault();
        onOpenMemo(session.items[session.index].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [session, handleAction, handleReveal, onOpenMemo]);

  if (!session.items.length) {
    return <div style={emptyStyle}>用語が登録されていません。</div>;
  }
  if (session.index >= session.items.length) {
    return <SessionEnd results={session.results} onRestart={onRestart} onEnd={onEndToList} />;
  }
  const t = session.items[session.index];
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12, fontWeight: 600 }}>
        {session.index + 1} / {session.items.length}
      </div>
      <div style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 24,
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>{t.yomi || ''}</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{t.term}</div>
        {!session.revealed ? (
          <button className="btn primary" onClick={handleReveal} style={{ fontSize: 15, padding: '10px 28px' }}>
            意味を表示 (Space)
          </button>
        ) : (
          <>
            <div style={{
              fontSize: 15, lineHeight: 1.7, padding: '12px 16px',
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
              textAlign: 'left', marginBottom: 10,
            }}>
              {t.meaning || ''}
            </div>
            {t.exam_note && (
              <div style={examNoteStyle}>⚠ {t.exam_note}</div>
            )}
          </>
        )}
      </div>
      {session.revealed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => handleAction('correct')} style={resBtnStyle('correct')}>〇 理解 (1)</button>
          <button onClick={() => handleAction('unsure')} style={resBtnStyle('unsure')}>△ 曖昧 (2)</button>
          <button onClick={() => handleAction('wrong')} style={resBtnStyle('wrong')}>✕ 不明 (3)</button>
          <button onClick={() => onOpenMemo(t.id)} style={resBtnStyle('memo')}>📝 メモ (N)</button>
        </div>
      )}
    </div>
  );
}

function resBtnStyle(kind) {
  const base = {
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    border: '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
    background: 'var(--bg-elev)',
    color: 'var(--ink-2)',
  };
  if (kind === 'wrong') return Object.assign({}, base, { background: WRONG_BADGE.bg, color: WRONG_BADGE.color, borderColor: WRONG_BADGE.border });
  if (kind === 'unsure') return Object.assign({}, base, { background: UNSURE_BADGE.bg, color: UNSURE_BADGE.color, borderColor: UNSURE_BADGE.border });
  if (kind === 'correct') return Object.assign({}, base, { background: '#d8f4d8', color: '#1a6e1a', borderColor: '#90c890' });
  return base;
}

const examNoteStyle = {
  fontSize: 12,
  color: '#8a6500',
  background: '#fff4cc',
  border: '1px solid #e8c660',
  borderRadius: 4,
  padding: '6px 10px',
  marginTop: 8,
  textAlign: 'left',
};

const emptyStyle = {
  padding: 32,
  textAlign: 'center',
  color: 'var(--ink-3)',
  background: 'var(--bg-elev)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
};

// ===== Mode 3: Quiz Term (4-choice) =====
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}
function buildChoices(t, allTerms) {
  let distractors = (Array.isArray(t.distractors) ? t.distractors.slice() : [])
    .filter(x => x && x !== t.term);
  if (distractors.length < 3) {
    let pool = allTerms.filter(x => x.id !== t.id && x.field === t.field).map(x => x.term);
    if (pool.length < 3) {
      pool = allTerms.filter(x => x.id !== t.id).map(x => x.term);
    }
    shuffle(pool);
    for (let i = 0; i < pool.length && distractors.length < 3; i++) {
      if (distractors.indexOf(pool[i]) === -1 && pool[i] !== t.term) distractors.push(pool[i]);
    }
  }
  distractors = distractors.slice(0, 3);
  const choices = distractors.concat([t.term]);
  shuffle(choices);
  return choices;
}

function QuizTermMode({ session, setSession, terms, deck, onRestart, onEndToList }) {
  const t = session.items[session.index];

  // Lazily build choices on first access
  React.useEffect(() => {
    if (!t) return;
    if (!session.choices) {
      setSession({ ...session, choices: buildChoices(t, terms) });
    }
  }, [t, session.choices]);

  const handlePick = React.useCallback((picked) => {
    if (session.locked) return;
    const cur = session.items[session.index];
    const correct = picked === cur.term;
    deck.recordResult(cur.id, correct ? 'correct' : 'wrong', correct ? null : { confusedWith: picked });
    setSession({
      ...session,
      locked: true,
      picked: picked,
      results: [...session.results, { id: cur.id, result: correct ? 'correct' : 'wrong' }],
    });
  }, [session, setSession, deck]);

  React.useEffect(() => {
    if (!session.locked) return;
    const tm = setTimeout(() => {
      setSession({
        ...session,
        index: session.index + 1,
        locked: false,
        picked: null,
        choices: null,
      });
    }, 1500);
    return () => clearTimeout(tm);
  }, [session.locked]);

  React.useEffect(() => {
    const handler = (ev) => {
      const tag = ev.target && ev.target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (!session || session.locked || session.index >= session.items.length) return;
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= 4 && session.choices && session.choices[n - 1]) {
        ev.preventDefault();
        handlePick(session.choices[n - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [session, handlePick]);

  if (!session.items.length) {
    return <div style={emptyStyle}>用語が登録されていません。</div>;
  }
  if (session.index >= session.items.length) {
    return <SessionEnd results={session.results} onRestart={onRestart} onEnd={onEndToList} />;
  }
  if (!t) return null;
  const choices = session.choices || [];

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12, fontWeight: 600 }}>
        {session.index + 1} / {session.items.length}
      </div>
      <div style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 20,
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>
          次の意味に該当する用語は？
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>{t.meaning || ''}</div>
        {t.exam_note && (
          <div style={examNoteStyle}>⚠ {t.exam_note}</div>
        )}
      </div>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {choices.map((c, i) => {
          let extra = {};
          if (session.locked) {
            if (c === t.term) extra = { background: '#d8f4d8', color: '#1a6e1a', borderColor: '#90c890' };
            else if (session.picked === c) extra = { background: WRONG_BADGE.bg, color: WRONG_BADGE.color, borderColor: WRONG_BADGE.border };
          }
          return (
            <button
              key={i}
              disabled={!!session.locked}
              onClick={() => handlePick(c)}
              style={Object.assign({
                padding: '12px 14px',
                fontSize: 14,
                fontWeight: 600,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg-elev)',
                color: 'var(--ink-2)',
                cursor: session.locked ? 'default' : 'pointer',
                textAlign: 'left',
              }, extra)}
            >
              <span style={{ display: 'inline-block', width: 22, color: 'var(--ink-3)', fontWeight: 700 }}>{i + 1}.</span> {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Session End =====
function SessionEnd({ results, onRestart, onEnd }) {
  const correct = results.filter(r => r.result === 'correct').length;
  const wrong = results.filter(r => r.result === 'wrong').length;
  const unsure = results.filter(r => r.result === 'unsure').length;
  return (
    <div style={{
      background: 'var(--bg-elev)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 24,
      textAlign: 'center',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>セッション完了！</h3>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <div><span style={{ fontSize: 22, fontWeight: 700, color: '#1a6e1a' }}>〇 {correct}</span><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>理解</div></div>
        <div><span style={{ fontSize: 22, fontWeight: 700, color: UNSURE_BADGE.color }}>△ {unsure}</span><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>曖昧</div></div>
        <div><span style={{ fontSize: 22, fontWeight: 700, color: WRONG_BADGE.color }}>✕ {wrong}</span><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>不明</div></div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={onRestart}>もう一周</button>
        <button className="btn secondary" onClick={onEnd}>終了</button>
      </div>
    </div>
  );
}

// ===== Backup Banner =====
function BackupBanner({ lastBackup, onExport }) {
  if (!lastBackup) {
    return (
      <div style={bannerStyle(true)}>
        <span>⚠ 進捗のバックアップが未実施です。エクスポートして保存してください。</span>
        <button onClick={onExport} style={bannerBtnStyle}>📋 今すぐエクスポート</button>
      </div>
    );
  }
  const d = parseDate(lastBackup);
  if (!d) return null;
  const diff = daysBetween(d, new Date());
  if (diff < 7) return null;
  const severe = diff >= 14;
  return (
    <div style={bannerStyle(true)}>
      <span>⚠ 最終バックアップから {diff}日経過。エクスポートしてください。</span>
      <button onClick={onExport} style={Object.assign({}, bannerBtnStyle, severe ? { background: '#fff', color: '#a00018', fontWeight: 700 } : {})}>
        📋 今すぐエクスポート
      </button>
    </div>
  );
}

function bannerStyle() {
  return {
    background: '#ffe0e0',
    color: '#a00018',
    border: '1px solid #e89090',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    marginBottom: 16,
    fontSize: 13,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  };
}
const bannerBtnStyle = {
  background: '#a00018',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

// ===== Mode 0: 対比マップ（Layer A: 弁別 from acquisition）=====
const mThStyle = {
  textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 700,
  color: 'var(--ink-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};
const mTdStyle = { padding: '8px 10px', verticalAlign: 'top', fontSize: 13 };

function TriggerRule({ word, verdict }) {
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap',
      padding: '6px 10px', background: '#fff4cc', border: '1px solid #e8c660',
      borderRadius: 6, fontSize: 12.5, color: '#7a5a00',
    }}>
      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>「{word}」</span>
      <span style={{ color: '#8a6500' }}>が出たら →</span>
      <span style={{ fontWeight: 600, color: '#a05a00' }}>{verdict}</span>
    </div>
  );
}

function ClusterCard({ cluster, onGoQuiz }) {
  const cols = cluster.columns || [];
  const rows = cluster.rows || [];
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      background: 'var(--bg-elev)', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{cluster.title}</h3>
          {cluster.article && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 8px' }}>第{cluster.article}条</span>
          )}
        </div>
        {cluster.intro && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>{cluster.intro}</p>}
        {cluster.axis && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-2)' }}>
            <span style={{ fontWeight: 700 }}>弁別軸：</span>{cluster.axis}
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              <th style={mThStyle}>用語</th>
              {cols.map((c, i) => <th key={i} style={mThStyle}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} style={{
                borderTop: '1px solid var(--border)',
                background: r.trap ? '#ffe9e9' : (r.key ? '#eafaea' : 'transparent'),
              }}>
                <td style={Object.assign({}, mTdStyle, { fontWeight: 700, whiteSpace: 'nowrap' })}>
                  {r.term}
                  {r.trap && <span title="ひっかけ" style={{ color: '#c0392b', marginLeft: 4 }}>⚠</span>}
                  {r.key && <span title="条文の本命" style={{ color: '#1a6e1a', marginLeft: 4 }}>★</span>}
                </td>
                {(r.cells || []).map((cell, ci) => <td key={ci} style={mTdStyle}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Array.isArray(cluster.triggers) && cluster.triggers.length > 0 && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>⚡ 1語トリガー（試験はこの1語で決まる）</div>
          {cluster.triggers.map((t, i) => <TriggerRule key={i} word={t.word} verdict={t.verdict} />)}
        </div>
      )}

      {cluster.hook && (
        <div style={{ margin: '0 14px 14px', padding: '10px 12px', background: '#eef3ff', border: '1px solid #b9ccf2', borderRadius: 6, fontSize: 13, color: '#26408b', lineHeight: 1.7 }}>
          <strong>💡 記憶フック：</strong>{cluster.hook}
        </div>
      )}

      {onGoQuiz && (
        <div style={{ padding: '0 14px 14px' }}>
          <button className="btn primary" onClick={() => onGoQuiz(cluster)} style={{ fontSize: 13 }}>
            この差を4択で確認 →
          </button>
        </div>
      )}
    </div>
  );
}

function MatrixMode({ clusters, onGoQuiz }) {
  if (!clusters || clusters.length === 0) {
    return <div style={emptyStyle}>対比マップのデータがまだありません。</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: '10px 12px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
        まず<strong>違い（地図）</strong>を見てから覚える。定義の丸暗記でなく、<strong>兄弟との差</strong>と<strong>1語トリガー</strong>で「区別ごと」頭に入れるのが最短。見たら下の「4択で確認」で軽くテスト → 数日後に間隔反復で戻ってくる。
      </div>
      {clusters.map(c => <ClusterCard key={c.id} cluster={c} onGoQuiz={onGoQuiz} />)}
    </div>
  );
}

// ===== Main Page =====
function ChokuzenYougoPage({ onNav }) {
  const data = (typeof window !== 'undefined' && window.GLOSSARY_TERMS_V1) || null;
  const terms = (data && Array.isArray(data.terms)) ? data.terms : [];

  const deck = useFlashcardDeck(terms, STORAGE_KEY);
  const clusters = (data && Array.isArray(data.clusters)) ? data.clusters : [];
  const [mode, setMode] = React.useState(clusters.length ? 'matrix' : 'list'); // 'matrix' | 'list' | 'quiz-meaning' | 'quiz-term'
  const [session, setSession] = React.useState(null);
  const [memoTermId, setMemoTermId] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const startSession = React.useCallback((m, scopeIds) => {
    // scopeIds（クラスタの members）があればその用語だけに出題を限定する
    const scoped = (Array.isArray(scopeIds) && scopeIds.length)
      ? terms.filter(t => scopeIds.indexOf(t.id) !== -1)
      : [];
    const useScope = scoped.length > 0;
    const base = useScope ? scoped : terms;
    const pool = base.slice().sort((a, b) => deck.priorityScore(b) - deck.priorityScore(a));
    const size = useScope ? pool.length : Math.min(SESSION_SIZE, pool.length);
    setSession({
      mode: m,
      items: pool.slice(0, size),
      index: 0,
      results: [],
      revealed: false,
      locked: false,
      picked: null,
      choices: null,
      scopeIds: useScope ? scopeIds : null,
    });
  }, [terms, deck]);

  const switchMode = (m) => {
    if (m === mode) {
      // スコープ付き（クラスタ起点）クイズ中に同じクイズタブを再クリック → 全語版に切替
      if ((m === 'quiz-meaning' || m === 'quiz-term') && session && session.scopeIds) startSession(m);
      return;
    }
    setMode(m);
    if (m === 'quiz-meaning' || m === 'quiz-term') startSession(m);
    else setSession(null);
  };

  // 対比マップの「この差を4択で確認」→ そのクラスタの用語だけで単語当てクイズ
  const startClusterQuiz = (cluster) => {
    const ids = (cluster && Array.isArray(cluster.members)) ? cluster.members : [];
    setMode('quiz-term');
    startSession('quiz-term', ids);
  };

  const handleRestart = () => startSession(mode, session && session.scopeIds);
  const handleEndToList = () => { setMode('list'); setSession(null); };

  const handleExport = () => deck.exportProgress();

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  const handleImportFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      deck.importProgress(f).then(n => {
        try { window.alert('進捗をインポートしました（' + n + '件）'); } catch (er) {}
      }).catch(err => {
        try { window.alert('インポート失敗: ' + (err && err.message || err)); } catch (er) {}
      });
    }
    e.target.value = '';
  };

  const handleReset = () => {
    try {
      if (!window.confirm('全ての進捗を削除します。続行しますか？')) return;
      if (!window.confirm('本当によろしいですか？この操作は取り消せません。')) return;
    } catch (e) { return; }
    deck.resetProgress();
  };

  const memoTerm = memoTermId ? terms.find(t => t.id === memoTermId) : null;

  // No data state
  if (!data || terms.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>EXAM MODE</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>用語クイズ・SRS</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>法規の紛らわしい用語を"違い"から理解する — 対比マップ＋段階管理（SRS）＋演習。</p>
        </div>
        <div style={emptyStyle}>用語データが読み込まれていません。</div>
        <div style={{ marginTop: 24 }}>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0 }}
            onClick={() => onNav && onNav('top')}
          >
            ← トップに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>EXAM MODE</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>用語クイズ・SRS</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>法規の紛らわしい用語を"違い"から理解する — 対比マップ＋段階管理（SRS）＋演習。</p>
      </div>

      <BackupBanner lastBackup={deck.lastBackup} onExport={handleExport} />

      {/* Tabs */}
      <div role="tablist" style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        {[
          ...(clusters.length ? [{ id: 'matrix', label: '対比マップ' }] : []),
          { id: 'list', label: '一覧' },
          { id: 'quiz-meaning', label: '意味当てクイズ' },
          { id: 'quiz-term', label: '単語当てクイズ' },
        ].map(tab => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => switchMode(tab.id)}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? 'var(--bg-elev)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--ink-2)',
                border: '1px solid var(--border)',
                borderBottom: active ? '1px solid var(--bg-elev)' : '1px solid var(--border)',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >{tab.label}</button>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ marginBottom: 24 }}>
        {mode === 'matrix' && (
          <MatrixMode clusters={clusters} onGoQuiz={startClusterQuiz} />
        )}
        {mode === 'list' && (
          <ListMode terms={terms} deck={deck} onOpenMemo={setMemoTermId} />
        )}
        {mode === 'quiz-meaning' && session && (
          <QuizMeaningMode
            session={session}
            setSession={setSession}
            deck={deck}
            onOpenMemo={setMemoTermId}
            onRestart={handleRestart}
            onEndToList={handleEndToList}
          />
        )}
        {mode === 'quiz-term' && session && (
          <QuizTermMode
            session={session}
            setSession={setSession}
            terms={terms}
            deck={deck}
            onRestart={handleRestart}
            onEndToList={handleEndToList}
          />
        )}
      </div>

      {/* Footer toolbar */}
      <div style={{
        marginTop: 24,
        padding: '12px 14px',
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        fontSize: 13,
      }}>
        <button onClick={handleExport} style={footerBtnStyle}>📥 進捗エクスポート(JSON)</button>
        <button onClick={handleImportClick} style={footerBtnStyle}>📤 進捗インポート(JSON)</button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: 'none' }} />
        <button onClick={handleReset} style={Object.assign({}, footerBtnStyle, { color: '#a00018', borderColor: '#e89090' })}>
          ⚠️ 進捗リセット
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: deck.lastBackup ? 'var(--ink-3)' : '#a00018' }}>
          最終バックアップ: {deck.lastBackup || '未実施'}
        </span>
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0 }}
          onClick={() => onNav && onNav('top')}
        >
          ← トップに戻る
        </button>
      </div>

      {memoTerm && (
        <MemoModal term={memoTerm} deck={deck} onClose={() => setMemoTermId(null)} />
      )}
    </div>
  );
}

const footerBtnStyle = {
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  background: 'var(--bg)',
  color: 'var(--ink-2)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  cursor: 'pointer',
};

// ===== Global registration =====
window.ChokuzenYougoPage = ChokuzenYougoPage;
