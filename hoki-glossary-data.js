// hoki-glossary-data.js — 電験3種 法規Wiki 用語クイズデータ
// schema_version 1: id/term/yomi/meaning/field/articles/exam_note/distractors/addedDate
// localStorage 規約: hoki_quiz_<cardType>_<field>  (e.g. hoki_quiz_glossary_progress)

window.GLOSSARY_TERMS_V1 = {
  schema_version: 1,
  cardType: 'glossary',
  config: { stage_intervals_days: [0, 7, 30, 90, 180] },
  terms: [
    {
      id: 'shiyo-denatsu',
      term: '使用電圧',
      yomi: 'しようでんあつ',
      meaning: '電路に印加される線間電圧',
      field: 'hoki',
      articles: ['58'],
      exam_note: '「対地電圧」との混同に注意。条文冒頭は使用電圧で区分',
      distractors: ['対地電圧', '公称電圧', '定格電圧'],
      addedDate: '2026-05-06'
    },
    {
      id: 'taichi-denatsu',
      term: '対地電圧',
      yomi: 'たいちでんあつ',
      meaning: '電線と大地間の電圧。接地式では電線-大地間、非接地式では電線間の値となる',
      field: 'hoki',
      articles: ['58'],
      exam_note: '第58条の区分判定の核心。150V境界を正確に把握する',
      distractors: ['使用電圧', '公称電圧', '線間電圧'],
      addedDate: '2026-05-06'
    },
    {
      id: 'zetsuen-teikou',
      term: '絶縁抵抗',
      yomi: 'ぜつえんていこう',
      meaning: '電路の導体と大地（または他の導体）間の抵抗値',
      field: 'hoki',
      articles: ['58'],
      exam_note: 'メガーで測定し、単位はMΩ',
      distractors: ['接地抵抗', '導体抵抗', '漏電抵抗'],
      addedDate: '2026-05-06'
    },
    {
      id: 'kaiheiki',
      term: '開閉器',
      yomi: 'かいへいき',
      meaning: '電路を手動で開閉する機器の総称（カバー付ナイフスイッチ・電磁開閉器等）。過電流を自動遮断する機能はない。条文では「開閉器又は過電流遮断器」のセットで使われ、両者を電路の区分単位として規定する',
      field: 'hoki',
      articles: ['58'],
      exam_note: '「自動遮断」の語が入ったら過電流遮断器のひっかけ。開閉器は手動のみ',
      distractors: ['過電流遮断器', '断路器', '接触器'],
      addedDate: '2026-05-06'
    },
    {
      id: 'kadenryu-shadanki',
      term: '過電流遮断器',
      yomi: 'かでんりゅうしゃだんき',
      meaning: '過電流（短絡・過負荷）を検出して自動遮断する機器の総称。代表例は配線用遮断器（MCCB／ブレーカー）・ヒューズ。高圧側では気中遮断器・真空遮断器が該当する。手動の開閉器や、地絡保護目的の漏電遮断器とは目的が異なる（混同に注意）',
      field: 'hoki',
      articles: ['58'],
      exam_note: '「開閉器又は過電流遮断器で区切ることのできる電路ごと」で頻出。漏電遮断器をひっかけ選択肢として混ぜる出題に注意',
      distractors: ['漏電遮断器', '開閉器', '電磁開閉器'],
      addedDate: '2026-05-06'
    },
    {
      id: 'haisenyou-shadanki',
      term: '配線用遮断器',
      yomi: 'はいせんようしゃだんき',
      meaning: '過電流遮断器の代表的な種類。MCCB、ブレーカーとも呼ぶ',
      field: 'hoki',
      articles: ['58'],
      exam_note: '過電流遮断器とほぼ同義で使われるが、条文の文言は「過電流遮断器」',
      distractors: ['過電流遮断器', '漏電遮断器', '電磁開閉器'],
      addedDate: '2026-05-06'
    },
    {
      id: 'rouden-shadanki',
      term: '漏電遮断器',
      yomi: 'ろうでんしゃだんき',
      meaning: '漏えい電流（地絡）を検出して自動遮断する機器。ELB／ELCB。過電流保護機能付きのタイプ（過電流遮断器の役割も持つ）もあるが、主目的は地絡保護で過電流遮断器とは区別される',
      field: 'hoki',
      articles: ['58'],
      exam_note: '第58条の条文には登場しない（条文は過電流遮断器のみ）。「漏電遮断器で電路を区切る」と書かれていたら誤りのひっかけ',
      distractors: ['過電流遮断器', '配線用遮断器', '地絡継電器'],
      addedDate: '2026-05-06'
    },
    {
      id: 'megger',
      term: 'メガー',
      yomi: 'めがー',
      meaning: '絶縁抵抗計（メガオーム計）。直流高電圧を印加して抵抗を測定する',
      field: 'hoki',
      articles: ['58'],
      exam_note: '低圧電路では直流500V印加が標準（JIS C 1302）',
      distractors: ['テスター', 'クランプメーター', 'アーステスター'],
      addedDate: '2026-05-06'
    },
    {
      id: 'rouei-denryu',
      term: '漏えい電流',
      yomi: 'ろうえいでんりゅう',
      meaning: '絶縁劣化により電路から大地へ流れる電流',
      field: 'hoki',
      articles: ['58'],
      exam_note: '解釈第14条で1mA以下が絶縁抵抗測定の同等基準',
      distractors: ['地絡電流', '短絡電流', '充電電流'],
      addedDate: '2026-05-06'
    },
    {
      id: 'densen-sougokan',
      term: '電線相互間',
      yomi: 'でんせんそうごかん',
      meaning: '電線と電線の間（相間）',
      field: 'hoki',
      articles: ['58'],
      exam_note: '「対地間」とペアで出題。条文の「及び」に注意',
      distractors: ['対地間', '電線地絡間', '中性点間'],
      addedDate: '2026-05-06'
    },
    {
      id: 'saidai-juyodenryoku',
      term: '最大需要電力',
      yomi: 'さいだいじゅようでんりょく',
      meaning: '30分間の平均使用電力の最大値[kW]（デマンド）',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '日常の「ピーク電力（瞬時値）」とは異なり30分平均値。需要料金（基本料金）の計算基準',
      distractors: ['瞬時最大電力', 'ピーク電力', '契約電力'],
      addedDate: '2026-05-07'
    },
    {
      id: 'demand-shuki',
      term: 'デマンド周期',
      yomi: 'でまんどしゅうき',
      meaning: '最大需要電力の計測区間（通常30分）',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '正時（00分・30分）を起点とする30分区間。計算問題では時間の単位を分に統一して使う',
      distractors: ['15分', '1時間', '60分'],
      addedDate: '2026-05-07'
    },
    {
      id: 'demand-mokuhyochi',
      term: 'デマンド目標値',
      yomi: 'でまんどもくひょうち',
      meaning: '30分平均電力を超えてはいけない上限値[kW]',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '超過すると翌月以降の基本料金が上昇。「未満」か「以下」かで境界値の扱いが変わる',
      distractors: ['需要率目標', '負荷率上限', '設備容量'],
      addedDate: '2026-05-07'
    },
    {
      id: 'juyoritsu',
      term: '需要率',
      yomi: 'じゅようりつ',
      meaning: '需要率 = 最大需要電力 ÷ 設備容量 × 100%',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '最大需要電力を下げると需要率も下がる。負荷率・不等率とセットで出題',
      distractors: ['負荷率', '不等率', '力率'],
      addedDate: '2026-05-07'
    },
    {
      id: 'fukaritsu',
      term: '負荷率',
      yomi: 'ふかりつ',
      meaning: '負荷率 = 平均需要電力 ÷ 最大需要電力 × 100%。単独需要家のピークに対する平均利用度',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '通常 1 以下。1 を超えたら平均と最大を取り違えていないか疑う。「総合負荷率」とは分子・分母が別物',
      distractors: ['需要率', '不等率', '総合負荷率'],
      addedDate: '2026-05-09'
    },
    {
      id: 'futoritsu',
      term: '不等率',
      yomi: 'ふとうりつ',
      meaning: '不等率 = 各需要家の最大需要電力の合計 ÷ 合成最大需要電力。複数需要家のピークがどれだけバラけているかを表す',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '通常 1 以上（％にせず 1.3 等の比率で答えることが多い）。1 未満になったら合成最大の読み違いを疑う',
      distractors: ['需要率', '負荷率', '力率'],
      addedDate: '2026-05-09'
    },
    {
      id: 'sougou-fukaritsu',
      term: '総合負荷率',
      yomi: 'そうごうふかりつ',
      meaning: '総合負荷率 = 合成平均需要電力 ÷ 合成最大需要電力 × 100%。複数需要家を合算した後の平均利用度',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '単独の負荷率を平均しても出ない。分母は合成最大（同時最大）であって各最大の合計ではない',
      distractors: ['負荷率', '需要率', '不等率'],
      addedDate: '2026-05-09'
    },
    {
      id: 'gousei-saidai-juyodenryoku',
      term: '合成最大需要電力',
      yomi: 'ごうせいさいだいじゅようでんりょく',
      meaning: '複数需要家を合算したときに同時刻に発生する最大需要電力（同時最大値）。各最大の合計とは別の量',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '出し方は3通り（問題文で与えられる／負荷曲線から読み取る／不等率と各最大の合計から計算する）。変電所容量の根拠値',
      distractors: ['各最大の合計', '設備容量', '契約電力'],
      addedDate: '2026-05-09'
    },
    {
      id: 'awaseta-juyoritsu',
      term: '合わせた需要率',
      yomi: 'あわせたじゅようりつ',
      meaning: '合わせた需要率 = 合成最大需要電力 ÷ 総設備容量。複数需要家を合算したときの需要率',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '不等率と分子が違う（合わせた需要率の分子は合成最大、不等率の分子は各最大の合計）。混同するとB問題で連鎖失点',
      distractors: ['需要率', '不等率', '総合負荷率'],
      addedDate: '2026-05-09'
    },
    {
      id: 'demand-controller',
      term: 'デマンドコントローラ',
      yomi: 'でまんどこんとろーら',
      meaning: '30分積算電力を常時監視し目標値超過時に警報を発する装置',
      field: 'hoki',
      articles: ['demand'],
      exam_note: '工場の受電盤に設置される省エネ設備。自動負荷遮断（EMS連携）も可能',
      distractors: ['電力量計', '無効電力補償装置', 'デマンドレスポンダー'],
      addedDate: '2026-05-07'
    },
    {
      id: 'bshu-setsuchi',
      term: 'B種接地',
      yomi: 'びーしゅせっち',
      meaning: '高圧電路と低圧電路の混触防止のため、変圧器の低圧側中性点（または1端）に施す接地工事。抵抗値 R_B ≤ 150/Ig（原則）、300/Ig（1秒超〜2秒以内自動遮断）、600/Ig（1秒以内自動遮断）',
      field: 'hoki',
      articles: ['17'],
      exam_note: 'R_B 計算は B問題頻出。遮断時間で係数（150/300/600）が変わる。係数は「速いほど大きい（緩和）」が落とし穴',
      distractors: ['A種接地', 'C種接地', 'D種接地'],
      addedDate: '2026-05-07'
    },
    {
      id: 'konshoku',
      term: '混触',
      yomi: 'こんしょく',
      meaning: '変圧器の絶縁劣化等により高圧電路と低圧電路が電気的に接触する事故。低圧側に高電圧が侵入し感電・火災の原因となるため B種接地で保護する',
      field: 'hoki',
      articles: ['17'],
      exam_note: 'B種接地の存在理由そのもの。「短絡」「地絡」「漏電」と紛らわしいが、混触は「高低圧の接触」という特定事象',
      distractors: ['短絡', '地絡', '漏電'],
      addedDate: '2026-05-07'
    },
    {
      id: 'bunryu-soku',
      term: '分流則',
      yomi: 'ぶんりゅうそく',
      meaning: '並列接続された素子に流れる電流が、各素子のアドミタンス（コンデンサなら容量）に比例して分配される法則。並列コンデンサ C₁・C₂ では I_C₂ = I_total × C₂/(C₁+C₂)',
      field: 'hoki',
      articles: [],
      exam_note: 'R05下問11(b) の根拠。Ig = 2√3πfV(C₁+C₂) を分流則に代入すると (C₁+C₂) が約分で消え、ZCT検出電流 = 2√3πfV·C₂ となる',
      distractors: ['分圧則', 'キルヒホッフの電圧則', 'オームの法則'],
      addedDate: '2026-05-07'
    },
    {
      id: 'senkan-denatsu',
      term: '線間電圧',
      yomi: 'せんかんでんあつ',
      meaning: '三相交流電路における電線と電線の間の電圧。相電圧の√3倍。三相3線式の「使用電圧」は線間電圧で表す',
      field: 'hoki',
      articles: ['58'],
      exam_note: 'a相地絡時、健全相のC を駆動するのは相電圧ではなく線間電圧 V_ba・V_ca。これが Ig 計算で V（線間電圧）が使われる理由',
      distractors: ['相電圧', '対地電圧', '公称電圧'],
      addedDate: '2026-05-07'
    },
    {
      id: 'isouisa',
      term: '位相差',
      yomi: 'いそうさ',
      meaning: '同一周波数の交流量どうしの時間的ずれを角度で表したもの。中性点非接地系の1線地絡時、健全2相の充電電流 I_b と I_c の間には60°の位相差が生じる',
      field: 'hoki',
      articles: [],
      exam_note: '60°位相差は「正三角形フェーザの内角」が根拠（基準が中性点→a相端にシフトした結果）。120°差ではないことに注意',
      distractors: ['周波数差', '振幅差', '力率角'],
      addedDate: '2026-05-07'
    },
    {
      id: 'vector-wa',
      term: 'ベクトル和',
      yomi: 'べくとるわ',
      meaning: '大きさと向きを持つベクトル量を平行四辺形の法則で合成した結果。同じ大きさ|I|のベクトルが角度θで合成された大きさは 2|I|·cos(θ/2)',
      field: 'hoki',
      articles: [],
      exam_note: '60°差なら 2|I|·cos30° = √3|I|。中性点非接地系の Ig = √3·ωCV の出処',
      distractors: ['スカラー和', '代数和', '二乗和'],
      addedDate: '2026-05-07'
    },
    {
      id: 'kouatsu',
      term: '高圧',
      yomi: 'こうあつ',
      meaning: '交流600V超〜7,000V以下、又は直流750V超〜7,000V以下の電圧区分（電技省令第2条）',
      field: 'hoki',
      articles: ['21'],
      exam_note: '第21条の対象範囲。低圧（〜600V/750V）・特別高圧（7,000V超）と区分。特高は第22条で別建て',
      distractors: ['低圧', '特別高圧', '公称電圧'],
      addedDate: '2026-05-13'
    },
    {
      id: 'kikai-kigu',
      term: '機械器具',
      yomi: 'きかいきぐ',
      meaning: '変圧器・開閉器・コンデンサ・断路器 等の電気機器全般。第21条主文括弧書きで「これに附属する高圧電線（ケーブル以外）」も含む定義拡張あり',
      field: 'hoki',
      articles: ['21'],
      exam_note: '機器の種類は問わない（高圧用なら対象）。附属電線をどこまで含めるかは括弧書きが鍵',
      distractors: ['電気機器', '変電設備', '電力工作物'],
      addedDate: '2026-05-13'
    },
    {
      id: 'saku-hei-tou',
      term: 'さく・へい等',
      yomi: 'さく・へいとう',
      meaning: '周囲を物理的に囲む障壁（第21条二号 イ）。素材は問わないが「適当な」＝用途に耐える性能を要する',
      field: 'hoki',
      articles: ['21'],
      exam_note: '条文の用語は「さく、へい等」。「フェンス」「防護柵」等の俗称は誤答候補',
      distractors: ['フェンス', '防護柵', '立入禁止柵'],
      addedDate: '2026-05-13'
    },
    {
      id: 'kiken-de-aru-mune',
      term: '危険である旨の表示',
      yomi: 'きけんであるむねのひょうじ',
      meaning: '第21条二号 ハで規定される警告掲示。条文の正確な表現は「危険である旨」',
      field: 'hoki',
      articles: ['21'],
      exam_note: '「立入禁止」「高圧危険」「感電注意」等の類似表現は誤答候補として頻出。条文の正確な日本語を暗記',
      distractors: ['立入禁止の表示', '高圧危険の表示', '感電注意の表示'],
      addedDate: '2026-05-13'
    },
    {
      id: 'juuden-bubun',
      term: '充電部分',
      yomi: 'じゅうでんぶぶん',
      meaning: '通電している電線・端子等の露出部分。さくからの距離測定基準であり、四号・五号では「露出しない」が条件',
      field: 'hoki',
      articles: ['21'],
      exam_note: '二号ロの「さくから機械器具の充電部分までの距離」が代表的な使われ方',
      distractors: ['通電部', '活線部', '導電部'],
      addedDate: '2026-05-13'
    },
    {
      id: 'shigaichi',
      term: '市街地',
      yomi: 'しがいち',
      meaning: '人家が連続している地域。第21条三号で高さ判定（4.5m or 4m）に影響',
      field: 'hoki',
      articles: ['21'],
      exam_note: '市街地=4.5m / 市街地外=4m。逆転ひっかけが頻出。「市街地が厳しい（人口密度高）」の論理',
      distractors: ['住宅地', '都市部', '市内'],
      addedDate: '2026-05-13'
    },
    {
      id: 'fuzoku-suru-kouatsu-densen',
      term: '附属する高圧電線',
      yomi: 'ふぞくするこうあつでんせん',
      meaning: '機械器具に接続される高圧側の電線。第21条主文括弧書きで「ケーブル以外のもの」が「機械器具」の定義に含まれる（条全体での規制対象）',
      field: 'hoki',
      articles: ['21'],
      exam_note: '三号では使用可能種別を「ケーブル又は引下げ用高圧絶縁電線」に限定。主文の定義範囲と三号の限定はそれぞれ別ロジック',
      distractors: ['主回路電線', '引込線', '給電線'],
      addedDate: '2026-05-13'
    },
    {
      id: 'hikisage-you-kouatsu-zetsuen-densen',
      term: '引下げ用高圧絶縁電線',
      yomi: 'ひきさげようこうあつぜつえんでんせん',
      meaning: '柱上変圧器等への引下げ専用の高圧絶縁電線（DV線等）。一般の高圧絶縁電線とは別規格',
      field: 'hoki',
      articles: ['21'],
      exam_note: '第21条三号でケーブルと並ぶ唯一の選択肢。「高圧絶縁電線」と書かれていたら誤り（限定なし版になってしまう）',
      distractors: ['高圧絶縁電線', 'ケーブル', '架空電線'],
      addedDate: '2026-05-13'
    },
    {
      id: 'd-shu-secchi-kouji',
      term: 'D種接地工事',
      yomi: 'でぃーしゅせっちこうじ',
      meaning: '接地抵抗100Ω以下（漏電遮断器0.5秒以内動作なら500Ω以下まで緩和）。300V以下の低圧機器の外箱に施す接地工事（電技解釈第17条・第19条）',
      field: 'hoki',
      articles: ['21', '19'],
      exam_note: '第21条 四号は「機器を収める箱」の接地。機器自体の金属製外箱は第29条のA種接地工事（10Ω以下）。「箱」と「外箱」の混同が最頻出ひっかけ',
      distractors: ['A種接地工事', 'B種接地工事', 'C種接地工事'],
      addedDate: '2026-05-13'
    },
    {
      id: 'kani-sesshoku-bougo-sochi',
      term: '簡易接触防護措置',
      yomi: 'かんいせっしょくぼうごそち',
      meaning: '軽度の接触防止措置（電技解釈第1条で定義）。完全接触防護措置より弱い段階の防護',
      field: 'hoki',
      articles: ['21'],
      exam_note: '第21条 五号 イで登場。「接触防護措置」とは別物（接頭の「簡易」の有無で要求水準が異なる）',
      distractors: ['接触防護措置', '完全接触防護措置', '感電防止措置'],
      addedDate: '2026-05-13'
    },
    {
      id: 'tadashi-gaki',
      term: 'ただし書',
      yomi: 'ただしがき',
      meaning: '条文の例外規定。「ただし、〜の場合はこの限りでない」の構文で示される',
      field: 'hoki',
      articles: ['21'],
      exam_note: '第21条のただし書＝発電所、変電所、開閉所等は適用外（敷地全体が立入制限のため）。「本文」「項」「号」とは別の概念',
      distractors: ['本文', '号', '項'],
      addedDate: '2026-05-13'
    }
  ],
  // ===== 混同クラスタ（Layer A: 対比マップ用） =====
  // 学習単位を「語」でなく「混同クラスタ」に。distractors/exam_note から構成。
  clusters: [
    {
      id: 'shadanki-kaiheiki',
      title: '開閉器・遮断器の弁別',
      article: '58',
      type: 'discriminate',
      axis: '自動遮断するか／第58条の条文に登場するか',
      intro: '第58条は「開閉器又は過電流遮断器で区切ることのできる電路ごと」に絶縁抵抗を測る。ここに紛れ込む"遮断器"の取り違えが最頻出。',
      members: ['kaiheiki', 'kadenryu-shadanki', 'haisenyou-shadanki', 'rouden-shadanki'],
      columns: ['自動遮断', '検出対象', '代表例', '第58条に登場'],
      rows: [
        { id: 'kaiheiki', term: '開閉器', cells: ['✕ 手動', '—（区切り用）', 'ナイフSW・電磁開閉器', '〇 区切り単位'] },
        { id: 'kadenryu-shadanki', term: '過電流遮断器', cells: ['〇 自動', '過電流（短絡・過負荷）', 'MCCB・ヒューズ', '〇 区切り単位'], key: true },
        { id: 'haisenyou-shadanki', term: '配線用遮断器', cells: ['〇 自動', '過電流', 'MCCB（過電流遮断器の一種）', '△ 文言は「過電流遮断器」'] },
        { id: 'rouden-shadanki', term: '漏電遮断器', cells: ['〇 自動', '地絡（漏えい電流）', 'ELB／ELCB', '✕ 登場しない'], trap: true }
      ],
      triggers: [
        { word: '地絡・漏電', verdict: '第58条では誤り（条文は過電流遮断器のみ）' },
        { word: '自動遮断', verdict: '開閉器ではない（開閉器は手動）' }
      ],
      hook: '過＝流れすぎ⚡／漏＝漏れる💧（地絡）／開＝手で開く✋。第58条が"区切り"に使うのは「流れすぎ」を見る過電流遮断器だけ。'
    },
    {
      id: 'denatsu-shurui',
      title: '電圧の種類（使用／対地／線間）の弁別',
      article: '58',
      type: 'discriminate',
      axis: '「何と何の間」の電圧か／第58条で大区分(使用電圧)か絶縁抵抗の小区分(対地電圧)か',
      intro: '第58条は ①使用電圧で低圧/高圧を大区分 → ②低圧は対地電圧の150V・300V境界で絶縁抵抗を3段階。「どの電圧でどの区分か」の取り違えが失点源。',
      members: ['shiyo-denatsu', 'taichi-denatsu', 'senkan-denatsu'],
      columns: ['測る区間', '三相での値', '第58条での役割'],
      rows: [
        { id: 'shiyo-denatsu', term: '使用電圧', cells: ['電路に印加（基本は線間）', '線間電圧そのもの', '低圧/高圧の大区分（600V境界）'], key: true },
        { id: 'taichi-denatsu', term: '対地電圧', cells: ['電線 ↔ 大地', '接地式=相電圧／非接地=線間', '低圧の絶縁抵抗 小区分（150V/300V）'], key: true },
        { id: 'senkan-denatsu', term: '線間電圧', cells: ['電線 ↔ 電線（相間）', '相電圧の√3倍', '三相の「使用電圧」の表記'] },
        { term: '公称電圧', cells: ['系統の呼び名（6.6kV 等）', '—', '区分判定には使わない'], trap: true }
      ],
      triggers: [
        { word: '150V・300V（絶縁抵抗の段階）', verdict: '対地電圧で判定（使用電圧ではない）' },
        { word: '600V以下＝低圧', verdict: '使用電圧で判定' }
      ],
      hook: '大別（低圧/高圧）は「使用電圧」、低圧の絶縁抵抗を細別（0.1/0.2/0.4）は「対地電圧」=“使って大別・地に細別”。三相の使用電圧＝線間電圧。'
    }
  ]
};
