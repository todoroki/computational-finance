import { GetStockDetailQuery } from "@/lib/gql/graphql";

// 型定義
type Analysis = NonNullable<NonNullable<GetStockDetailQuery["stock"]>["analysisResults"]>[number];

export type NarrativeResult = {
    id: string;
    type: "critical" | "warning" | "opportunity" | "info" | "success";
    severity: 1 | 2 | 3 | 4 | 5; // 5:即死級, 4:重度, 3:中度, 2:軽度, 1:情報
    icon: string;
    title: string;
    body: string;
    advice: string;
};

// ヘルパー: 安全な数値取得 (数値専用)
const safe = (val: number | null | undefined) => val ?? 0;

// 1. 基礎診断 (Basic Diagnosis)
const BASIC_PATTERNS: {
    id: string;
    type: NarrativeResult["type"];
    severity: NarrativeResult["severity"];
    condition: (a: Analysis) => boolean;
    generate: (a: Analysis, name: string) => Omit<NarrativeResult, "id" | "type" | "severity" | "condition">;
}[] = [
        // --- 💀 CRITICAL (Severity 5) ---
        {
            id: "zombie_company",
            type: "critical",
            severity: 5,
            condition: (a) => !!a.tagZombie,
            generate: (a) => ({
                icon: "🧟",
                title: "生ける屍（ゾンビ企業）",
                body: `稼いだ利益（EBIT）で、借金の利息すら払えていない状態です。
      低金利環境だから生き延びているだけで、金利上昇は即座に「死」を意味します。`,
                advice: "「株価が安い」は罠です。倒産リスクが極めて高いため、ポートフォリオに入れるべきではありません。",
            }),
        },
        {
            id: "sandcastle",
            type: "critical",
            severity: 5,
            condition: (a) => safe(a.per) > 20 && safe(a.equityRatio) < 20 && safe(a.zScore) < 1.8,
            generate: (a) => ({
                icon: "🏚️",
                title: "砂上の楼閣（バリュートラップ）",
                body: `借金まみれ（自己資本${safe(a.equityRatio).toFixed(1)}%）でいつ倒れるかわからないのに、株価だけは一丁前に高い（PER ${safe(a.per).toFixed(1)}倍）状態です。
      実体価値と株価が最も乖離している危険なパターンです。`,
                advice: "成長ストーリーに惑わされないでください。足元の財務が崩壊寸前です。",
            }),
        },
        {
            id: "dividend_trap",
            type: "critical",
            severity: 5,
            condition: (a) => safe(a.dividendYield) > 5 && safe(a.freeCashFlow) < 0 && safe(a.equityRatio) < 40,
            generate: (a) => ({
                icon: "💣",
                title: "甘い毒（高配当トラップ）",
                body: `配当利回り${safe(a.dividendYield).toFixed(2)}%は魅力的ですが、その原資は「利益」ではなく「借金」や「資産の切り売り」から出ています（FCF赤字）。
      これはタコが自分の足を食べているのと同じで、いずれ減配か無配に転落する未来が見えます。`,
                advice: "目先のインカムに釣られないでください。持続不可能な配当です。",
            }),
        },

        // --- ⚠️ WARNING (Severity 4) ---
        {
            id: "bleeding_edge",
            type: "warning",
            severity: 4,
            // 修正: salesPerShareを削除。OpCF > 0 なら事業は回っていると判断。
            condition: (a) => safe(a.operatingCf) > 0 && safe(a.freeCashFlow) < 0,
            generate: (a) => ({
                icon: "🩸",
                title: "血を流しながら走る企業",
                body: `本業で現金は稼げていますが、過剰な設備投資（Capex）により現金が流出し続けています。
      「忙しい貧乏」状態で、株主に還元される現金が残っていません。`,
                advice: "投資フェーズが終わり、FCFがプラス化するまで株価の上昇は重いでしょう。",
            }),
        },
        {
            id: "bubble_dream",
            type: "warning",
            severity: 4,
            condition: (a) => safe(a.per) > 60 && safe(a.actualRevenueGrowth) < 15,
            generate: (a) => ({
                icon: "🎈",
                title: "夢だけが先行するバブル",
                body: `PER ${safe(a.per).toFixed(1)}倍という超高評価に対し、実際の成長率（${safe(a.actualRevenueGrowth).toFixed(1)}%）が全く追いついていません。
      ストーリーだけで買われており、数字の裏付けがない状態です。`,
                advice: "何か一つでも悪材料が出れば、株価は半値以下に暴落するリスクがあります（マルチプル・コントラクション）。",
            }),
        },
        {
            id: "fragile_growth",
            type: "warning",
            severity: 4,
            condition: (a) => !!a.tagSingleEngine,
            generate: (a) => ({
                icon: "🧨",
                title: "片肺飛行のロケット",
                body: `売上だけは爆発的に伸びていますが、利益とキャッシュフローは度外視されています。
      資金調達環境が悪化すれば、墜落（倒産）するリスクと隣り合わせの「投機」銘柄です。`,
                advice: "メインの資産には向きません。宝くじ枠として、資産の数%以内で遊ぶ銘柄です。",
            }),
        },

        // --- 👑 SUCCESS / OPPORTUNITY (Severity 3-4) ---
        {
            id: "quality_compounder",
            type: "success",
            severity: 4,
            condition: (a) => !!a.tagQualityGrowth && safe(a.roe) > 15,
            generate: (a) => ({
                icon: "👑",
                title: "王道のクオリティ・コンパウンダー",
                body: `高い資本効率（ROE ${safe(a.roe).toFixed(1)}%）と成長性を兼ね備えた、投資の教科書のような優良企業です。
      複利効果で資産を雪だるま式に増やしてくれる「持ち続けるだけで勝てる」銘柄です。`,
                advice: "多少割高でも買う価値があります。一度買ったら、よほどのことがない限り売らないのが正解です。",
            }),
        },
        {
            id: "turnaround_start",
            type: "opportunity",
            severity: 3,
            condition: (a) => !!a.tagTurnaround && safe(a.zScore) > 1.2,
            generate: (a) => ({
                icon: "🔥",
                title: "再起動中（ターンアラウンド初動）",
                body: `長い低迷を抜け、赤字から黒字へと転換しました。
      まだ市場の評価（株価）は低いままですが、財務スコアは改善傾向にあります。ここが一番「オイシイ」タイミングかもしれません。`,
                advice: "業績回復が本物か、四半期ごとの決算を厳しくチェックしながら乗るのが定石です。",
            }),
        },
        {
            id: "deep_value",
            type: "opportunity",
            severity: 3,
            condition: (a) => safe(a.pbr) < 0.6 && safe(a.equityRatio) > 50 && safe(a.operatingCf) > 0,
            generate: (a) => ({
                icon: "💎",
                title: "捨てられた宝石（ネットネット株）",
                body: `解散価値の半分以下（PBR ${safe(a.pbr).toFixed(2)}倍）で放置されていますが、財務は健全で現金も稼げています。
      市場から完全に無視されていますが、これ以上下がる余地がほとんどない「負けにくい」投資対象です。`,
                advice: "市場が見直すまで時間がかかるため、忍耐力が必要です。カタリスト（自社株買いなど）を待ちましょう。",
            }),
        },
        {
            id: "frozen_excellence",
            type: "opportunity",
            severity: 3,
            // 修正: safe(status) を削除し、直接文字列比較
            condition: (a) => safe(a.fScore) >= 7 && Math.abs(safe(a.expectationGap)) < 10 && a.status === "Neutral",
            generate: (a) => ({
                icon: "🧊",
                title: "冷凍保存された優等生",
                body: `数字は完璧に近いのに、株価は動かず、市場の話題にもなっていません。
      嵐の前の静けさか、あるいは永遠の不人気か。しかし、中身が良いことは確かです。`,
                advice: "下値は堅いです。配当をもらいながら、市場が気づくのを待つ「置き配」投資に向いています。",
            }),
        },

        // --- ℹ️ INFO (Severity 1-2) ---
        {
            id: "mature_giant",
            type: "info",
            severity: 2,
            condition: (a) => safe(a.per) > 10 && safe(a.per) < 20 && safe(a.actualRevenueGrowth) < 5 && safe(a.equityRatio) > 50,
            generate: (a) => ({
                icon: "🐘",
                title: "成熟した巨人（ディフェンシブ）",
                body: `これ以上の急成長は見込めませんが、盤石な財務と安定したシェアを持っています。
      不況になっても大きくは崩れない、ポートフォリオの守備の要となる存在です。`,
                advice: "資産を守りたいフェーズや、暴落時の避難先として機能します。",
            }),
        },
    ];

// 2. 矛盾検出 (Conflict Diagnosis)
const CONFLICT_PATTERNS: {
    id: string;
    type: NarrativeResult["type"];
    severity: NarrativeResult["severity"];
    condition: (a: Analysis) => boolean;
    generate: (a: Analysis, name: string) => Omit<NarrativeResult, "id" | "type" | "severity" | "condition">;
}[] = [
        {
            id: "good_biz_bad_price",
            type: "warning",
            severity: 4,
            condition: (a) => !!a.tagSafetyShield && (safe(a.expectationGap) > 20 || safe(a.per) > 30),
            generate: (a) => ({
                icon: "🤔",
                title: "名医の診断：手術不要だが、今は買うな",
                body: `企業としては超一流（Safety Shield）ですが、株価はすでにその成功を織り込みすぎています（過熱感あり）。
            どれほど良い会社でも、「高すぎる価格」で買えば悪い投資になります。`,
                advice: "Watchリストに入れてください。暴落時こそが、この銘柄の輝く時です。",
            })
        }
    ];

// 3. 未来耐性テスト (Stress Test)
const STRESS_PATTERNS: {
    id: string;
    type: NarrativeResult["type"];
    severity: NarrativeResult["severity"];
    condition: (a: Analysis) => boolean;
    generate: (a: Analysis, name: string) => Omit<NarrativeResult, "id" | "type" | "severity" | "condition">;
}[] = [
        {
            id: "rate_sensitivity",
            type: "warning",
            severity: 3,
            condition: (a) => safe(a.equityRatio) < 20 && safe(a.operatingCf) > 0,
            generate: (a) => ({
                icon: "🧯",
                title: "金利上昇耐性：極めて低い",
                body: `平時は問題ありませんが、金利が1%上がるだけで利益が吹き飛ぶ財務構造です。
            「晴れの日専用」の銘柄と言えます。`,
                advice: "金融引き締め局面では、真っ先にポートフォリオから外すべき対象です。",
            })
        }
    ];


export const generateNarratives = (stockName: string, analysis: Analysis | undefined | null): NarrativeResult[] => {
    if (!analysis) {
        return [{
            id: "no_data",
            type: "info",
            severity: 1,
            icon: "🤔",
            title: "データ不足",
            body: "分析に必要な財務データが不足しています。",
            advice: "データが更新されるまでお待ちください。",
        }];
    }

    // 修正: constに変更
    const results: NarrativeResult[] = [];

    // 1. Basic Patterns
    results.push(...BASIC_PATTERNS.filter(p => p.condition(analysis)).map(p => ({
        id: p.id,
        type: p.type,
        severity: p.severity,
        ...p.generate(analysis, stockName)
    })));

    // 2. Conflict Patterns
    results.push(...CONFLICT_PATTERNS.filter(p => p.condition(analysis)).map(p => ({
        id: p.id,
        type: p.type,
        severity: p.severity,
        ...p.generate(analysis, stockName)
    })));

    // 3. Stress Patterns
    results.push(...STRESS_PATTERNS.filter(p => p.condition(analysis)).map(p => ({
        id: p.id,
        type: p.type,
        severity: p.severity,
        ...p.generate(analysis, stockName)
    })));

    // Default
    if (results.length === 0) {
        results.push({
            id: "average",
            type: "info",
            severity: 1,
            icon: "⚖️",
            title: "平均的な企業評価",
            body: `特筆すべき割安感も、致命的なリスクも見当たりません。
      市場平均に近い評価を受けており、良くも悪くも「普通」の状態です。`,
            advice: "あえてこの銘柄を選ぶ強い理由（カタリスト）があるか、再確認してください。",
        });
    }

    // ソート順: Severity高い順
    results.sort((a, b) => b.severity - a.severity);

    return results;
};