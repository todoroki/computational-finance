"use client";

import { AnalysisResultType } from "@/lib/gql/graphql";

type Props = {
  analysis: AnalysisResultType;
};

// 色判定ヘルパー
const getSignalColor = (
  value: number | null | undefined,
  type: "high_is_good" | "low_is_good" | "z_score",
  thresholds: [number, number],
) => {
  if (value === null || value === undefined) return "bg-gray-100 text-gray-400";

  if (type === "z_score") {
    // Altman Z-Score: <1.81(Danger), <2.99(Grey), >2.99(Safe)
    if (value < 1.81) return "bg-red-100 text-red-700 border-red-200";
    if (value < 2.99) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-green-100 text-green-700 border-green-200";
  }

  const [bad, good] = thresholds;
  if (type === "high_is_good") {
    if (value >= good) return "bg-green-100 text-green-700 border-green-200";
    if (value <= bad) return "bg-red-100 text-red-700 border-red-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  } else {
    // low is good (Accruals, Implied Growth etc)
    if (value <= good) return "bg-green-100 text-green-700 border-green-200";
    if (value >= bad) return "bg-red-100 text-red-700 border-red-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
};

export default function AnalysisDashboard({ analysis }: Props) {
  // 判定ステータスの色
  const statusColor =
    analysis.status === "Strong Buy"
      ? "bg-primary text-primary-content"
      : analysis.status === "Sell"
        ? "bg-error text-error-content"
        : "bg-neutral text-neutral-content";

  return (
    <div className="space-y-6">
      {/* 1. 総合判定カード (Verdict) */}
      <div className={`card shadow-lg ${statusColor}`}>
        <div className="card-body p-6 flex flex-row items-center justify-between">
          <div>
            <h2 className="card-title text-2xl mb-1">
              JUDGEMENT: {analysis.status}
            </h2>
            <p className="opacity-90 text-sm">{analysis.aiSummary}</p>
          </div>
          <div className="text-4xl font-black tracking-tighter opacity-20">
            {analysis.stockPrice?.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 2. 3つのレンズ (Three Lenses) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lens 1: 構造 (Structure) - 基礎体力 */}
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body p-5">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">
              🛡️ Structural Strength
            </h3>

            <div className="space-y-4">
              <MetricRow
                label="Gross Profitability"
                value={analysis.grossProfitability}
                format={(v: number) => `${(v * 100).toFixed(1)}%`}
                color={getSignalColor(
                  analysis.grossProfitability,
                  "high_is_good",
                  [0.2, 0.33],
                )}
                desc="稼ぐ力 (目安 > 33%)"
              />
              <MetricRow
                label="ROIIC"
                value={analysis.roiic}
                format={(v: number) => `${(v * 100).toFixed(1)}%`}
                color={getSignalColor(
                  analysis.roiic,
                  "high_is_good",
                  [0.05, 0.15],
                )}
                desc="投資効率 (高いほど良)"
              />
            </div>
          </div>
        </div>

        {/* Lens 2: 財務 (Health) - 安全性 */}
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body p-5">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">
              🏥 Financial Health
            </h3>

            <div className="space-y-4">
              <MetricRow
                label="Altman Z-Score"
                value={analysis.zScore}
                format={(v: number) => v.toFixed(2)}
                color={getSignalColor(analysis.zScore, "z_score", [0, 0])}
                desc="倒産リスク (< 1.8 危険)"
              />
              <MetricRow
                label="Piotroski F-Score"
                value={analysis.fScore}
                format={(v: number) => `${v} / 9`}
                color={getSignalColor(analysis.fScore, "high_is_good", [4, 7])}
                desc="健全性トレンド (7点以上で良)"
              />
              <MetricRow
                label="Accruals Ratio"
                value={analysis.accrualsRatio}
                format={(v: number) => `${(v * 100).toFixed(1)}%`}
                color={getSignalColor(
                  analysis.accrualsRatio,
                  "low_is_good",
                  [0.08, 0.0],
                )}
                desc="利益の質 (低いほど良)"
              />
            </div>
          </div>
        </div>

        {/* Lens 3: 期待 (Expectation) - 割安/割高 */}
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body p-5">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">
              🔮 Market Expectation
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">
                  Implied Growth Rate (逆算DCF)
                </span>
                <div
                  className={`text-2xl font-bold p-3 rounded-lg border text-center ${getSignalColor(analysis.impliedGrowthRate, "low_is_good", [15.0, 5.0])}`}
                >
                  {analysis.impliedGrowthRate
                    ? `${analysis.impliedGrowthRate.toFixed(1)}%`
                    : "---"}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  今の株価は、今後毎年 {analysis.impliedGrowthRate?.toFixed(1)}%
                  の成長を織り込んでいます。
                  {analysis.impliedGrowthRate && analysis.impliedGrowthRate > 10
                    ? " (高すぎる期待)"
                    : " (現実的/割安)"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// サブコンポーネント: 1行分の指標表示
interface MetricRowProps {
  label: string;
  value: number | null | undefined;
  format: (v: number) => string;
  color: string;
  desc: string;
}

function MetricRow({ label, value, format, color, desc }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-xs text-gray-400">{desc}</div>
      </div>
      <div className={`px-3 py-1 rounded text-sm font-bold border ${color}`}>
        {value !== null && value !== undefined ? format(value) : "-"}
      </div>
    </div>
  );
}
