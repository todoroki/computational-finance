// frontend/components/StockCard.tsx

import Link from "next/link";
import { GetStocksQuery } from "@/lib/gql/graphql";

// 型定義: クエリ結果から1つのStockの型を抽出
type StockItem = NonNullable<GetStocksQuery["stocks"]>[number];

// ヘルパー関数 (このファイル内だけで使うのでここで定義)
const fmt = (val?: number | null, unit = "", fixed = 1) =>
  val !== undefined && val !== null ? `${val.toFixed(fixed)}${unit}` : "-";

export const StockCard = ({ stock }: { stock: StockItem }) => {
  const analysis = stock.analysisResults?.[0];
  const gap = analysis?.expectationGap ?? 0;

  // ステータスの色定義
  const statusColor =
    analysis?.status === "Strong Buy"
      ? "bg-red-500 text-white shadow-red-200"
      : analysis?.status === "Buy"
        ? "bg-orange-500 text-white shadow-orange-200"
        : analysis?.status === "Avoid"
          ? "bg-gray-800 text-white"
          : analysis?.status === "Sell"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 border border-gray-200";

  return (
    <Link href={`/stocks/${stock.code}`} className="block group h-full">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden relative">
        {/* 1. Header Area */}
        <div className="p-4 pb-2 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-gray-400 font-bold">
                {stock.code}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
                {stock.sector17CodeName || stock.market}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-lg leading-tight">
              {stock.japaneseName || stock.name}
            </h3>
          </div>
          {/* Status Badge */}
          <div
            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide shadow-sm ${statusColor}`}
          >
            {analysis?.status || "-"}
          </div>
        </div>

        {/* 2. Price & Gap Area */}
        <div className="px-4 py-2 flex justify-between items-end border-b border-dashed border-gray-100 pb-3">
          <div>
            <div className="text-2xl font-mono font-bold text-gray-900 tracking-tight">
              ¥{analysis?.stockPrice?.toLocaleString() ?? "-"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-400 font-bold mb-0.5">
              期待乖離(Gap)
            </div>
            <div
              className={`text-sm font-bold font-mono ${gap > 0 ? "text-red-500" : "text-green-600"}`}
            >
              {gap > 0 ? "+" : ""}
              {gap.toFixed(0)}%
              <span className="text-[10px] ml-1 font-sans font-normal text-gray-400">
                {gap > 0 ? "(過熱)" : "(割安)"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Fundamentals Grid */}
        <div className="px-4 py-3 grid grid-cols-3 gap-2 bg-slate-50">
          <div className="text-center">
            <div className="text-[9px] text-gray-400 uppercase font-bold">
              PER
            </div>
            <div className="text-sm font-mono font-bold text-gray-700">
              {fmt(analysis?.per, "x")}
            </div>
          </div>
          <div className="text-center border-l border-gray-200">
            <div className="text-[9px] text-gray-400 uppercase font-bold">
              PBR
            </div>
            <div className="text-sm font-mono font-bold text-gray-700">
              {fmt(analysis?.pbr, "x", 2)}
            </div>
          </div>
          <div className="text-center border-l border-gray-200">
            <div className="text-[9px] text-gray-400 uppercase font-bold">
              配当
            </div>
            <div className="text-sm font-mono font-bold text-gray-700">
              {fmt(analysis?.dividendYield, "%", 2)}
            </div>
          </div>
        </div>

        {/* 4. Tags Footer */}
        <div className="p-3 flex flex-wrap gap-1.5 mt-auto pt-2">
          {analysis?.tagZombie && (
            <span className="px-1.5 py-0.5 bg-gray-800 text-white text-[10px] rounded font-bold">
              💀 ゾンビ
            </span>
          )}
          {analysis?.tagSafetyShield && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-bold">
              🛡️ 盤石
            </span>
          )}
          {analysis?.tagQualityGrowth && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded font-bold">
              👑 王道
            </span>
          )}
          {analysis?.tagInstitutional && (
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded font-bold">
              🧠 プロ
            </span>
          )}
          {analysis?.tagCashCow && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-bold">
              🧱 金なる木
            </span>
          )}
          {analysis?.tagSingleEngine && (
            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[10px] rounded font-bold">
              🚀 夢株
            </span>
          )}
          {analysis?.tagHighVolatility && (
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded font-bold">
              🎢 ボラ
            </span>
          )}
          {analysis?.tagSilentImprover && (
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded font-bold">
              🌱 改善
            </span>
          )}
          {analysis?.tagTurnaround && (
            <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 text-[10px] rounded font-bold">
              🔁 復活
            </span>
          )}
          {analysis?.tagAccountingRisk && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded font-bold">
              🧪 会計注
            </span>
          )}
          {analysis?.tagFragile && (
            <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 text-[10px] rounded font-bold">
              🚨 脆弱
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
