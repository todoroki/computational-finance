"use client";

import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { GetStocksDocument, GetStocksQuery } from "@/lib/gql/graphql";

// --- Types ---
type StockItem = NonNullable<GetStocksQuery["stocks"]>[number];

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

// ヘルパー関数
const fmt = (val?: number | null, unit = "", fixed = 1) =>
  val !== undefined && val !== null ? `${val.toFixed(fixed)}${unit}` : "-";

const StockCard = ({ stock }: { stock: StockItem }) => {
  const analysis = stock.analysisResults?.[0];
  const gap = analysis?.expectationGap ?? 0;

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
          <div
            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide shadow-sm ${statusColor}`}
          >
            {analysis?.status || "-"}
          </div>
        </div>

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

export default function MarketPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // URL Params
  const currentSearch = searchParams.get("search") || "";
  const currentSector = searchParams.get("sector") || "";

  // ▼ 修正: カンマ区切り文字列を配列に変換して管理
  const modeParam = searchParams.get("mode");
  const currentModes = modeParam ? modeParam.split(",") : [];

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

  const handleSectorChange = (sector: string) => {
    router.push(`${pathname}?${createQueryString("sector", sector)}`);
  };

  // ▼ 追加: モードのトグルロジック (追加/削除)
  const toggleMode = (modeId: string | null) => {
    if (modeId === null) {
      // すべて表示 (クリア)
      router.push(`${pathname}?${createQueryString("mode", null)}`);
      return;
    }

    let newModes = [...currentModes];
    if (newModes.includes(modeId)) {
      // 既に選択済みなら削除
      newModes = newModes.filter((m) => m !== modeId);
    } else {
      // 未選択なら追加
      newModes.push(modeId);
    }

    // 空になったらパラメータ削除、あればカンマ区切りでセット
    const newValue = newModes.length > 0 ? newModes.join(",") : null;
    router.push(`${pathname}?${createQueryString("mode", newValue)}`);
  };

  const { data, loading, error } = useQuery<GetStocksQuery>(GetStocksDocument, {
    variables: {
      search: currentSearch,
      rankingModes: currentModes, // 配列を渡す
      sector: currentSector,
      limit: 50,
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
              href="/about"
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              ℹ️ 分析ロジック解説
            </Link>
            <Link
              href="/portfolio"
              className="text-sm font-bold text-gray-500 hover:text-blue-600 ml-4"
            >
              My Portfolio
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Market Explorer
          </h1>

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

            {/* 選択中タグのバッジ一覧 */}
            {!isFilterExpanded && currentModes.length > 0 && (
              <div className="flex gap-2">
                {currentModes.map((mode) => (
                  <span
                    key={mode}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1"
                  >
                    {CATEGORIES.find((c) => c.id === mode)?.label}
                    <button
                      onClick={() => toggleMode(mode)}
                      className="hover:text-red-500 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {isFilterExpanded && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="space-y-6">
                <div>
                  <button
                    onClick={() => toggleMode(null)}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                      currentModes.length === 0
                        ? "bg-gray-900 text-white shadow-lg"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    📋 すべて表示 (クリア)
                  </button>
                </div>

                {["Safety", "Character", "Risk"].map((groupName) => (
                  <div
                    key={groupName}
                    className="flex flex-wrap gap-2 items-center"
                  >
                    <span className="text-[10px] font-bold text-gray-400 w-16 uppercase tracking-wider">
                      {groupName}
                    </span>
                    {CATEGORIES.filter((c) => c.group === groupName).map(
                      (cat) => {
                        // 選択済みかどうかチェック
                        const isSelected = currentModes.includes(cat.id);

                        return (
                          <button
                            key={cat.id}
                            onClick={() => toggleMode(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105 ring-2 ring-blue-200 ring-offset-1"
                                : groupName === "Risk"
                                  ? "bg-white text-red-700 border-red-100 hover:bg-red-50"
                                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-blue-200"
                            }`}
                          >
                            {isSelected && <span>✓</span>}
                            {cat.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                ))}
              </div>

              {/* 複数選択時の説明表示 */}
              {currentModes.length > 0 && (
                <div className="mt-6 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                      Selected Filters (AND条件)
                    </div>
                    <ul className="text-sm font-bold text-gray-800 list-disc list-inside">
                      {currentModes.map((mode) => (
                        <li key={mode}>
                          {CATEGORIES.find((c) => c.id === mode)?.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
