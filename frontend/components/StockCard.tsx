import Link from "next/link";
import { GetStocksQuery } from "@/lib/gql/graphql";

// GraphQLの型定義から、stocks配列の中身の型を抽出
type StockSummary = GetStocksQuery["stocks"][number];

export default function StockCard({ stock }: { stock: StockSummary }) {
  const analysis = stock.analysisResults?.[0];
  const price = analysis?.stockPrice?.toLocaleString() ?? "---";

  // 日本語名があれば優先表示
  const displayName = stock.japaneseName || stock.name;
  const displaySector = stock.japaneseSector || stock.sector;
  const displayMarket = stock.japaneseMarket || stock.market;

  // バッジの色分けロジック
  const badgeColor =
    analysis?.status === "Strong Buy"
      ? "bg-red-500 text-white shadow-red-200 shadow-md"
      : analysis?.status === "Buy"
        ? "bg-orange-500 text-white shadow-orange-200 shadow-md"
        : analysis?.status === "Buy (Spec)"
          ? "bg-yellow-400 text-black border-2 border-dashed border-gray-800"
          : analysis?.status === "Avoid"
            ? "bg-gray-800 text-white"
            : analysis?.status === "Sell"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-500";

  return (
    <Link
      href={`/stocks/${stock.code}`}
      className="block bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
    >
      {/* 上段: コード・社名・ステータス */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-mono font-bold text-gray-400 mb-0.5 block">
            {stock.code}
          </span>
          <h3 className="font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">
            {displayName}
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${badgeColor}`}
        >
          {analysis?.status ?? "N/A"}
        </span>
      </div>

      {/* 中段: セクター・市場 */}
      <div className="flex gap-2 mb-4">
        <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100 truncate max-w-[100px]">
          {displaySector}
        </span>
        <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100">
          {displayMarket}
        </span>
      </div>

      {/* 下段: ミニスコアボード */}
      {analysis ? (
        <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
          {/* 1. Z-Score (安全性) */}
          <div className="text-center">
            <div className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">
              Safety
            </div>
            <div
              className={`text-xs font-bold ${
                (analysis.zScore ?? 0) < 1.8 ? "text-red-500" : "text-slate-700"
              }`}
            >
              Z: {analysis.zScore?.toFixed(1) ?? "-"}
            </div>
          </div>

          {/* 2. Profitability (収益性) */}
          <div className="text-center border-l border-slate-200">
            <div className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">
              Quality
            </div>
            <div
              className={`text-xs font-bold ${
                (analysis.grossProfitability ?? 0) > 0.4
                  ? "text-blue-600"
                  : "text-slate-700"
              }`}
            >
              GP:{" "}
              {analysis.grossProfitability
                ? `${(analysis.grossProfitability * 100).toFixed(0)}%`
                : "-"}
            </div>
          </div>

          {/* 3. Growth Gap (期待乖離) */}
          <div className="text-center border-l border-slate-200">
            <div className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">
              Gap
            </div>
            <div
              className={`text-xs font-bold ${
                (analysis.expectationGap ?? 0) < -10
                  ? "text-green-600" // 割安
                  : (analysis.expectationGap ?? 0) > 20
                    ? "text-red-500" // 過熱
                    : "text-slate-700"
              }`}
            >
              {(analysis.expectationGap ?? 0) > 0 ? "+" : ""}
              {analysis.expectationGap?.toFixed(0) ?? "-"}%
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-center py-4 text-gray-400 bg-gray-50 rounded-lg">
          No Data
        </div>
      )}

      {/* 株価 */}
      <div className="mt-3 pt-2 border-t border-gray-50 flex justify-end items-baseline gap-1">
        <span className="text-[10px] text-gray-400">Price:</span>
        <span className="font-mono font-bold text-gray-800">¥{price}</span>
      </div>
    </Link>
  );
}
