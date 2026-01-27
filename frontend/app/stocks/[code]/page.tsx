import { fetchGraphQL } from "@/lib/graphql";
import { GetStockDetailDocument } from "@/lib/gql/graphql";
import Link from "next/link";
import StockFinancialChart from "@/components/StockFinancialChart"; // ★追加: グラフコンポーネント

// --- ヘルパー関数: 数字を見やすく整形 ---
const formatCurrency = (val?: number | null) => {
  if (!val) return "-";
  if (val > 1000000000000) return (val / 1000000000000).toFixed(1) + "兆円";
  if (val > 100000000) return (val / 100000000).toFixed(0) + "億円";

  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(val);
};

const formatNumber = (val?: number | null, digits = 2) => {
  if (val === null || val === undefined) return "-";
  return val.toFixed(digits);
};

// --- メインコンポーネント ---
export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // 1. データ取得
  const data = await fetchGraphQL(GetStockDetailDocument, { code });
  const stock = data.stock;

  if (!stock) {
    return (
      <div className="p-10 text-center text-red-500 font-bold">
        銘柄が見つかりませんでした (Code: {code})
      </div>
    );
  }

  // 最新の分析結果
  const analysis = stock.analysisResults?.[0];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-20">
      {/* 🔙 ナビゲーション */}
      <nav className="mb-6 flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors">
        <Link href="/">← 銘柄一覧に戻る</Link>
      </nav>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* 🏷️ ヒーローセクション (社名・株価・判定) */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
          {/* 背景装飾 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-0 opacity-50"></div>

          <div className="relative z-10">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-bold tracking-wider">
                {stock.code}
              </span>
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                {stock.market}
              </span>
              <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs border border-gray-100">
                {stock.sector}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">
              {stock.name}
            </h1>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-bold text-gray-900">
                {analysis?.stockPrice?.toLocaleString() ?? "-"}
              </span>
              <span className="text-sm text-gray-500 font-medium">JPY</span>
            </div>
          </div>

          {/* 右側: 判定バッジ */}
          <div className="relative z-10 flex flex-col items-start md:items-end justify-center min-w-[200px]">
            <div
              className={`px-6 py-3 rounded-xl text-xl font-bold text-white shadow-lg tracking-wide
                ${
                  analysis?.status === "Strong Buy"
                    ? "bg-gradient-to-r from-red-600 to-rose-500 ring-4 ring-red-50"
                    : analysis?.status === "Buy"
                      ? "bg-gradient-to-r from-orange-500 to-amber-500"
                      : analysis?.status === "Good"
                        ? "bg-emerald-500"
                        : "bg-gray-400"
                }`}
            >
              {analysis?.status || "Unknown"}
            </div>
            {analysis?.isGoodBuy && (
              <div className="mt-3 flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse border border-red-100">
                <span>🚀 AI買いシグナル点灯</span>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-400">
              時価総額: {formatCurrency(analysis?.marketCap)}
            </div>
          </div>
        </div>

        {/* 📊 分析スコアカード (3つのレンズ) */}
        {analysis ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Lens 1: Safety */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                <span className="text-xl">🛡️</span>
                <h3 className="font-bold text-gray-700">安全性 (Safety)</h3>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 font-medium uppercase">
                  Altman Z-Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold ${
                      (analysis.zScore ?? 0) > 2.99
                        ? "text-blue-600"
                        : (analysis.zScore ?? 0) < 1.8
                          ? "text-red-500"
                          : "text-yellow-600"
                    }`}
                  >
                    {formatNumber(analysis.zScore)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  倒産リスクを示す指標。3.0以上なら財務は非常に健全。1.8以下は危険水域。
                </p>
              </div>
            </div>

            {/* Lens 2: Structure */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                <span className="text-xl">💎</span>
                <h3 className="font-bold text-gray-700">収益構造 (Quality)</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500 font-medium">
                      Gross Profitability
                    </span>
                    <span className="text-lg font-bold text-gray-800">
                      {formatNumber(analysis.grossProfitability)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(
                          (analysis.grossProfitability ?? 0) * 100,
                          100,
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-500 font-medium">
                    Piotroski F-Score
                  </span>
                  <span className="text-lg font-bold text-gray-800">
                    {analysis.fScore}{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      / 9
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Lens 3: Value (Expectations MRI) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                <span className="text-xl">⚖️</span>
                <h3 className="font-bold text-gray-700">
                  期待値MRI (Valuation)
                </h3>
              </div>

              <div className="flex flex-col gap-4">
                {/* 1. FCFベース (現実) */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500 font-bold">
                      FCF逆算成長率
                    </span>
                    <span
                      className={`text-lg font-bold ${analysis.impliedGrowthRate === null ? "text-gray-400" : "text-gray-800"}`}
                    >
                      {analysis.impliedGrowthRate
                        ? `${analysis.impliedGrowthRate.toFixed(1)}%`
                        : "算出不能"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    ※ 現在のキャッシュフローを基準とした期待値
                  </p>
                </div>

                {/* 2. 売上ベース (夢・ストーリー) */}
                <div className="pt-3 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-blue-600 font-bold">
                      売上逆算成長率 (PSR)
                    </span>
                    <span className="text-xl font-bold text-blue-700">
                      {analysis.impliedRevenueGrowth
                        ? `${analysis.impliedRevenueGrowth.toFixed(1)}%`
                        : "-"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2">
                    ※ 業界平均の利益率を達成すると仮定した場合の期待値
                  </p>

                  {/* 解釈 (Interpretation) */}
                  {analysis.impliedRevenueGrowth && (
                    <div className="bg-blue-50 px-3 py-2 rounded text-xs text-blue-800 font-medium">
                      💡 市場は
                      {analysis.impliedRevenueGrowth < 5
                        ? "「安定・成熟」"
                        : analysis.impliedRevenueGrowth < 15
                          ? "「堅実な成長」"
                          : analysis.impliedRevenueGrowth < 30
                            ? "「高成長」"
                            : "「超・高成長(熱狂)」"}
                      を織り込んでいます。
                    </div>
                  )}
                </div>
                {/* Reality Gap Detector */}
                <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500">
                      Expectation Reality Gap
                    </span>
                    <span className="text-xs text-gray-400">期待乖離度</span>
                  </div>

                  {analysis.expectationGap != null ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          実績成長:{" "}
                          <span className="font-mono">
                            {analysis.actualRevenueGrowth?.toFixed(1)}%
                          </span>
                        </span>
                        <span>vs</span>
                        <span>
                          市場期待:{" "}
                          <span className="font-mono">
                            {analysis.impliedRevenueGrowth?.toFixed(1)}%
                          </span>
                        </span>
                      </div>

                      {/* バー表示 */}
                      <div className="w-full bg-gray-100 rounded-full h-2.5 relative overflow-hidden">
                        {/* 0地点マーカー */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 z-10"></div>

                        {/* 乖離バー */}
                        <div
                          className={`h-2.5 rounded-full ${
                            analysis.expectationGap > 0
                              ? "bg-red-400"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(Math.abs(analysis.expectationGap), 50)}%`, // 50%でカンスト
                            marginLeft:
                              analysis.expectationGap > 0
                                ? "50%"
                                : `calc(50% - ${Math.min(Math.abs(analysis.expectationGap), 50)}%)`,
                          }}
                        ></div>
                      </div>

                      <div className="text-xs text-center mt-1 font-bold">
                        {analysis.expectationGap > 20 ? (
                          <span className="text-red-600">
                            ⚠️ 過熱警戒 (Euphoria)
                          </span>
                        ) : analysis.expectationGap > 5 ? (
                          <span className="text-orange-500">やや期待先行</span>
                        ) : analysis.expectationGap < -20 ? (
                          <span className="text-green-600">
                            💎 激安放置 (Deep Value)
                          </span>
                        ) : analysis.expectationGap < -5 ? (
                          <span className="text-green-500">
                            💰 期待以下 (Opportunity)
                          </span>
                        ) : (
                          <span className="text-gray-500">適正水準 (Fair)</span>
                        )}
                        <span className="ml-2 text-gray-400 font-mono">
                          (Gap: {analysis.expectationGap > 0 ? "+" : ""}
                          {analysis.expectationGap.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 text-center">
                      データ不足により計算不可
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl">
            ⚠️ 分析データがまだありません。バックエンドで `fetch_data`
            を実行してください。
          </div>
        )}

        {/* 📝 企業概要 & AIサマリー */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              📄 企業概要
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {stock.description || "情報がありません。"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
            <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              🤖 AI分析サマリー
            </h3>
            {analysis?.aiSummary ? (
              <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                {analysis.aiSummary}
              </p>
            ) : (
              <div className="text-sm text-indigo-400 italic py-4 text-center">
                AIによる分析コメントはまだ生成されていません。
                <br />
                <span className="text-xs opacity-75">(今後実装予定)</span>
              </div>
            )}
          </div>
        </div>

        {/* 📊 財務データ (チャート + テーブル) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">業績推移</h3>
            <span className="text-xs text-gray-500">単位: 円</span>
          </div>

          <div className="p-6">
            {/* ▼▼▼ 追加: グラフ表示エリア ▼▼▼ */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">
                Chart: Revenue & Operating Income
              </h4>
              {stock.financials && stock.financials.length > 0 ? (
                <StockFinancialChart data={stock.financials} />
              ) : (
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                  チャートデータがありません
                </div>
              )}
            </div>

            {/* テーブル表示エリア */}
            <div className="overflow-x-auto">
              <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">
                Detailed Data
              </h4>
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">決算期</th>
                    <th className="px-6 py-3 text-right">売上高</th>
                    <th className="px-6 py-3 text-right">営業利益</th>
                    <th className="px-6 py-3 text-right">純利益</th>
                    <th className="px-6 py-3 text-right">営業CF</th>
                    <th className="px-6 py-3 text-right">純資産</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stock.financials?.map((f, i) => (
                    <tr
                      key={i}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-gray-600">
                        {f.fiscalYear}{" "}
                        <span className="text-xs text-gray-400">
                          Q{f.quarter}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {formatCurrency(f.revenue)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-700">
                        {formatCurrency(f.operatingIncome)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {formatCurrency(f.netIncome)}
                      </td>
                      <td className="px-6 py-4 text-right text-blue-600">
                        {formatCurrency(f.operatingCf)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        {formatCurrency(f.totalEquity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
