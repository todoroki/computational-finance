"use client";

import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
// ▼▼▼ 追加: 生成された型定義をImport ▼▼▼
import { GetStocksDocument, GetStocksQuery } from "@/lib/gql/graphql";

// --- Constants ---
const SECTORS = [
  "IT・通信・サービス",
  "自動車・輸送機",
  "電気・精密機器",
  "銀行・金融",
  "商社・卸売",
  "小売・外食",
  "医薬品・ヘルスケア",
  "素材・化学",
  "機械・建設",
  "エネルギー・インフラ",
  "不動産",
  "その他",
];

// --- Types ---
// 生成された型からエイリアスを作成 (利便性のため)
type StockItem = NonNullable<GetStocksQuery["stocks"]>[number];

// --- Components ---

const StockCard = ({ stock }: { stock: StockItem }) => {
  const analysis = stock.analysisResults?.[0];
  const gap = analysis?.expectationGap ?? 0;

  return (
    <Link href={`/stocks/${stock.code}`} className="block group">
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
        {/* Status Stripe */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 ${
            analysis?.status === "Strong Buy"
              ? "bg-red-500"
              : analysis?.status === "Avoid"
                ? "bg-gray-800"
                : "bg-gray-200"
          }`}
        ></div>

        <div className="pl-3 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                {stock.japaneseName || stock.name}
              </h3>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                {stock.code} | {stock.market}
              </div>
              {/* 業種バッジ */}
              {stock.sector17CodeName && (
                <div className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded font-bold">
                  {stock.sector17CodeName}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-gray-800">
                ¥{analysis?.stockPrice?.toLocaleString() ?? "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="pl-3 grid grid-cols-2 gap-3 mb-4 flex-1">
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">
              財務健全性
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (analysis?.zScore ?? 0) > 3
                    ? "bg-blue-500"
                    : (analysis?.zScore ?? 0) < 1.8
                      ? "bg-red-500"
                      : "bg-yellow-400"
                }`}
                style={{
                  width: `${Math.min(((analysis?.zScore ?? 0) / 5) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <div className="text-[10px] text-right mt-0.5 font-mono text-gray-500">
              {(analysis?.zScore ?? 0).toFixed(1)}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">
              期待との乖離
            </div>
            <div
              className={`text-sm font-bold font-mono ${gap > 0 ? "text-red-500" : "text-green-600"}`}
            >
              {gap > 0 ? "過熱" : "割安"} {Math.abs(gap).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="pl-3 flex gap-2 pt-3 border-t border-gray-50">
          {analysis?.tagZombie && (
            <span title="ゾンビ企業" className="text-lg cursor-help">
              💀
            </span>
          )}
          {analysis?.tagSafetyShield && (
            <span title="盤石の盾" className="text-lg cursor-help">
              🛡️
            </span>
          )}
          {analysis?.tagQualityGrowth && (
            <span title="王道成長" className="text-lg cursor-help">
              👑
            </span>
          )}
          {analysis?.tagHighVolatility && (
            <span title="高ボラティリティ" className="text-lg cursor-help">
              🎢
            </span>
          )}
          {analysis?.tagInstitutional && (
            <span title="機関投資家好み" className="text-lg cursor-help">
              🧠
            </span>
          )}
          {analysis?.tagCashCow && (
            <span title="金なる木" className="text-lg cursor-help">
              🧱
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default function MarketPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // URL Params
  const currentSearch = searchParams.get("search") || "";
  const currentMode = searchParams.get("mode");
  const currentSector = searchParams.get("sector") || "";

  const createQueryString = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "All") {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams],
  );

  const handleSearch = (term: string) => {
    router.replace(`${pathname}?${createQueryString("search", term || null)}`);
  };

  const handleModeChange = (mode: string | null) => {
    const nextMode = currentMode === mode ? null : mode;
    router.push(`${pathname}?${createQueryString("mode", nextMode)}`);
  };

  const handleSectorChange = (sector: string) => {
    router.push(`${pathname}?${createQueryString("sector", sector)}`);
  };

  // GraphQL Query (Generated Documentを使用)
  const { data, loading, error } = useQuery<GetStocksQuery>(GetStocksDocument, {
    variables: {
      search: currentSearch,
      rankingMode: currentMode,
      sector: currentSector,
      limit: 50, // 必要に応じて増減
    },
  });

  const CATEGORIES = [
    {
      id: "safety_shield",
      label: "🛡️ 盤石の盾",
      desc: "倒産リスク皆無・高自己資本・FCF黒字",
      group: "Safety",
    },
    {
      id: "quality_growth",
      label: "👑 王道成長",
      desc: "高収益・2桁成長・高財務スコア",
      group: "Safety",
    },
    {
      id: "institutional",
      label: "🧠 プロ好み",
      desc: "機関投資家が好む安定性と質",
      group: "Safety",
    },

    {
      id: "gap_opportunities",
      label: "💎 割安放置",
      desc: "実力値より安く買える (Gap Opportunity)",
      group: "Character",
    },
    {
      id: "cash_cow",
      label: "🧱 金なる木",
      desc: "低成長だが現金を稼ぎまくる",
      group: "Character",
    },
    {
      id: "single_engine",
      label: "🚀 夢株(投機)",
      desc: "赤字だが超高成長・片肺飛行",
      group: "Character",
    },
    {
      id: "silent_improver",
      label: "🌱 静かなる改善",
      desc: "市場は気づいていないが体質改善中",
      group: "Character",
    },
    {
      id: "turnaround",
      label: "🔁 復活の兆し",
      desc: "赤字脱却・底打ち反転",
      group: "Character",
    },

    {
      id: "zombie",
      label: "💀 ゾンビ企業",
      desc: "利払い能力なし・倒産予備軍",
      group: "Risk",
    },
    {
      id: "accounting_risk",
      label: "🧪 会計リスク",
      desc: "黒字だが現金が増えていない・粉飾疑義",
      group: "Risk",
    },
    {
      id: "high_volatility",
      label: "🎢 ボラ覚悟",
      desc: "期待過熱かつ財務脆弱・乱高下必至",
      group: "Risk",
    },
    {
      id: "fragile",
      label: "🚨 前提崩壊",
      desc: "超高期待・低財務・FCF赤字",
      group: "Risk",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-black tracking-tighter text-gray-900"
          >
            ASSET<span className="text-blue-600">OS</span>{" "}
            <span className="text-gray-400 font-normal text-sm ml-2">
              Market Scanner
            </span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/portfolio"
              className="text-sm font-bold text-gray-500 hover:text-blue-600"
            >
              My Portfolio
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* Search & Filter Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Market Explorer
          </h1>

          {/* Search Bar & Sector Selector */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="銘柄コードまたは企業名..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                value={currentSearch}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
            </div>

            <div className="relative min-w-[200px]">
              <select
                value={currentSector}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-white appearance-none font-bold text-gray-700 cursor-pointer"
              >
                <option value="All">🏢 全業種</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                ▼
              </span>
            </div>
          </div>

          {/* Filter Toggle & Badge */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <span
                className={`transform transition-transform ${isFilterExpanded ? "rotate-180" : ""}`}
              >
                ▼
              </span>
              {isFilterExpanded ? "フィルタを隠す" : "詳細フィルタを表示"}
            </button>

            {!isFilterExpanded && currentMode && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1">
                Filter: {CATEGORIES.find((c) => c.id === currentMode)?.label}
                <button
                  onClick={() => handleModeChange(currentMode)}
                  className="hover:text-red-500 ml-1"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {/* Accordion Filter Area */}
          {isFilterExpanded && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="space-y-6">
                {/* 1. All Button */}
                <div>
                  <button
                    onClick={() => handleModeChange(null)}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                      currentMode === null
                        ? "bg-gray-900 text-white shadow-lg"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    📋 すべて表示
                  </button>
                </div>

                {/* 2. Groups */}
                {["Safety", "Character", "Risk"].map((groupName) => (
                  <div
                    key={groupName}
                    className="flex flex-wrap gap-2 items-center"
                  >
                    <span className="text-[10px] font-bold text-gray-400 w-16 uppercase tracking-wider">
                      {groupName}
                    </span>
                    {CATEGORIES.filter((c) => c.group === groupName).map(
                      (cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleModeChange(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 ${
                            currentMode === cat.id
                              ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                              : groupName === "Risk"
                                ? "bg-white text-red-700 border-red-100 hover:bg-red-50"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-blue-200"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ),
                    )}
                  </div>
                ))}
              </div>

              {/* 3. Description Box */}
              {currentMode && (
                <div className="mt-6 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                      Current Filter
                    </div>
                    <p className="text-sm font-bold text-gray-800">
                      {CATEGORIES.find((c) => c.id === currentMode)?.desc}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stock Grid */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            Scanning Market Data...
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-500">
            Error: {error.message}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data?.stocks?.map((stock) => (
              <StockCard key={stock.code} stock={stock} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
