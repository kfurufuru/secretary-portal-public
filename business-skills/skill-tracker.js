/**
 * SkillTracker - ビジネススキル学習進捗トラッカー
 *
 * LocalStorage（キー: bsk_tracker）でチェック状態・履歴を永続化
 * 各スキルページで window.SkillTracker として利用
 *
 * データ構造：
 * {
 *   "skill-id": {
 *     "title": "スキル名",
 *     "elements": 5,
 *     "checks": {"1": true, "2": false, ...},
 *     "lastElement": 0,
 *     "lastVisit": "YYYY-MM-DD",
 *     "history": [{"date": "2026-04-21", "score": 3}, ...]
 *   }
 * }
 */

function _ratingVal(v) {
  if (v === true) return 1;
  if (typeof v === 'number') return Math.max(0, Math.min(3, v));
  return 0;
}

window.SkillTracker = {
  KEY: 'bsk_tracker',

  /**
   * LocalStorage から全スキルデータを取得
   * @returns {Object} スキルデータ全体
   */
  getAll() {
    const data = localStorage.getItem(this.KEY);
    return data ? JSON.parse(data) : {};
  },

  /**
   * 特定スキルのデータを取得（なければ初期化して返す）
   * @param {string} skillId - スキルID（例：'stress-kanjo'）
   * @returns {Object} スキルデータ
   */
  getSkill(skillId) {
    const all = this.getAll();
    if (!all[skillId]) {
      all[skillId] = {
        title: '',
        elements: 0,
        checks: {},
        lastElement: 0,
        lastVisit: new Date().toISOString().split('T')[0],
        history: []
      };
    }
    return all[skillId];
  },

  /**
   * チェック状態を保存
   * @param {string} skillId - スキルID
   * @param {string} skillTitle - スキル名（初回保存時に記録）
   * @param {number} totalElements - 総要素数（セルフチェック項目数）
   * @param {number} checkIndex - チェック番号（1-5）
   * @param {boolean} value - チェック状態
   */
  saveCheck(skillId, skillTitle, totalElements, checkIndex, value) {
    const all = this.getAll();
    if (!all[skillId]) {
      all[skillId] = {
        title: skillTitle,
        elements: totalElements,
        checks: {},
        lastElement: 0,
        lastVisit: new Date().toISOString().split('T')[0],
        history: []
      };
    }
    // title と elements は常に最新値で更新（初回 getSkill で空初期化される問題の対策）
    if (skillTitle) all[skillId].title = skillTitle;
    if (totalElements > 0) all[skillId].elements = totalElements;
    all[skillId].checks[checkIndex.toString()] = value;
    all[skillId].lastVisit = new Date().toISOString().split('T')[0];
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },

  /**
   * 最後に見ていたELEMENTインデックスを保存
   * @param {string} skillId - スキルID
   * @param {number} elementIndex - タブインデックス（0-4）
   */
  saveLastElement(skillId, elementIndex) {
    const all = this.getAll();
    const skill = all[skillId] || this.getSkill(skillId);
    skill.lastElement = elementIndex;
    skill.lastVisit = new Date().toISOString().split('T')[0];
    all[skillId] = skill;
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },

  /**
   * スキルの全チェック状態を取得
   * @param {string} skillId - スキルID
   * @returns {Object} チェック状態（{1: true, 2: false, ...}）
   */
  getChecks(skillId) {
    const skill = this.getSkill(skillId);
    return skill.checks || {};
  },

  /**
   * スコア（チェック数）を計算
   * @param {string} skillId - スキルID
   * @returns {number} チェックされた項目数
   */
  getScore(skillId) {
    const checks = this.getChecks(skillId);
    return Object.values(checks).filter(v => v).length;
  },

  /**
   * 履歴に今日のスコアを追記（同日は上書き）
   * @param {string} skillId - スキルID
   */
  recordHistory(skillId) {
    const all = this.getAll();
    const skill = all[skillId] || this.getSkill(skillId);
    const today = new Date().toISOString().split('T')[0];
    const score = this.getScore(skillId);
    const weighted = Object.values(skill.checks || {}).reduce(function(s, v) { return s + _ratingVal(v); }, 0);

    if (!skill.history) skill.history = [];

    // 同日のスコアを上書き
    const existingIndex = skill.history.findIndex(h => h.date === today);
    if (existingIndex >= 0) {
      skill.history[existingIndex].score = score;
      skill.history[existingIndex].weighted = weighted;
    } else {
      skill.history.push({ date: today, score, weighted });
    }

    all[skillId] = skill;
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },

  /**
   * 全スキルのサマリーを取得（ダッシュボード用）
   * @returns {Array} スキルサマリー配列
   *  [{skillId, title, score, elements, pct, lastVisit, level}, ...]
   */
  getSummary() {
    const all = this.getAll();
    return Object.entries(all).map(([skillId, skill]) => {
      const score = Object.values(skill.checks || {}).filter(v => v).length;
      const elements = skill.elements || 5;
      const pct = elements > 0 ? Math.round((score / elements) * 100) : 0;

      // レベル判定
      let level = '未着手';
      if (pct === 0) {
        level = '未着手';
      } else if (pct <= 40) {
        level = '認知';
      } else if (pct <= 80) {
        level = '実践';
      } else {
        level = '習熟';
      }

      return {
        skillId,
        title: skill.title || skillId,
        score,
        elements,
        pct,
        lastVisit: skill.lastVisit || '',
        level
      };
    });
  },

  /**
   * 最近アクティブなスキルを取得（lastVisit降順）
   * @param {number} n - 取得件数
   * @returns {Array} スキルサマリー配列（上位n件）
   */
  getRecentSkills(n = 5) {
    const summary = this.getSummary();
    return summary
      .sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''))
      .slice(0, n);
  },

  /**
   * スキルのメモを保存
   * @param {string} skillId - スキルID
   * @param {string} text - メモ本文
   */
  saveMemo(skillId, text) {
    const all = this.getAll();
    if (!all[skillId]) all[skillId] = { title: '', elements: 0, checks: {}, lastElement: 0, lastVisit: new Date().toISOString().split('T')[0], history: [] };
    all[skillId].memo = text;
    all[skillId].memoUpdated = new Date().toISOString().split('T')[0];
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },

  /**
   * スキルのメモを取得
   * @param {string} skillId - スキルID
   * @returns {string} メモ本文（なければ空文字）
   */
  getMemo(skillId) {
    const skill = this.getAll()[skillId];
    return skill ? (skill.memo || '') : '';
  }
};
