"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { GetStocksDocument } from "@/lib/gql/graphql";
import StockCard from "@/components/StockCard"; // 既存コンポーネント

import type { GetStocksQuery } from "@/lib/gql/graphql";
type StockSummary = GetStocksQuery["stocks"][number];

export default function Home() {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rankingMode, setRankingMode] = useState<string>("strong_buy"); // デフォルト: AI推奨
  const [offset, setOffset] = useState(0);
  const LIMIT = 24;

  // --- 検索デバウンス (入力のチラつき防止) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setOffset(0); // 検索したら1ページ目へ
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- タブ切り替え ---
  const handleTabChange = (mode: string) => {
    setRankingMode(mode);
    setOffset(0);
  };

  // --- GraphQL Query ---
  const { data, loading, error } = useQuery(GetStocksDocument, {
    variables: {
      search: debouncedSearch || null,
      rankingMode: rankingMode === "normal" ? null : rankingMode,
      limit: LIMIT,
      offset: offset,
    },
    fetchPolicy: "cache-and-network", // 常に最新を取りに行く
  });

  // --- UI定義: タブリスト ---
  const tabs = [
    { id: "strong_buy", label: "🤖 AI推奨", color: "bg-gray-800 text-white" },
    {
      id: "safety_shield",
      label: "🛡️ 盤石の盾",
      color: "bg-blue-600 text-white",
    },
    {
      id: "quality_growth",
      label: "👑 王道成長",
      color: "bg-indigo-600 text-white",
    },
    {
      id: "gap_opportunities",
      label: "💎 割安放置",
      color: "bg-emerald-600 text-white",
    },
    {
      id: "single_engine",
      label: "🚀 夢株(投機)",
      color: "bg-purple-600 text-white",
    },
    {
      id: "turnaround",
      label: "🔁 復活/改善",
      color: "bg-orange-500 text-white",
    },
    { id: "avoid", label: "💀 危険", color: "bg-red-600 text-white" },
    { id: "normal", label: "📋 全銘柄", color: "bg-gray-500 text-white" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header & Search Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo (Reload) */}
          <h1
            className="text-xl font-black tracking-tighter text-gray-800 flex items-center gap-1 cursor-pointer min-w-fit hover:opacity-70 transition-opacity"
            onClick={() => window.location.reload()}
          >
            STOCK<span className="text-blue-600">MRI</span>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-1 font-normal">
              BETA
            </span>
          </h1>

          {/* 🔍 Search Input */}
          <div className="flex-1 max-w-lg relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="銘柄コード、企業名（トヨタ）で検索..."
              className="w-full bg-gray-100 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-full pl-10 pr-10 py-2 text-sm transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Loading Indicator */}
            {searchTerm !== debouncedSearch && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
            {/* Clear Button */}
            {searchTerm && searchTerm === debouncedSearch && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* ▼ Ranking Tabs (Horizontal Scroll) ▼ */}
        <div className="mb-6">
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar mask-gradient">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all transform active:scale-95 ${
                  rankingMode === tab.id
                    ? `${tab.color} shadow-md ring-2 ring-offset-2 ring-gray-200`
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center px-1 mt-2">
            <p className="text-xs text-gray-400 font-medium">
              {loading ? "Searching..." : `${data?.stocks.length ?? 0} results`}
            </p>
            <p className="text-xs text-gray-400 font-mono">
              Page {Math.floor(offset / LIMIT) + 1}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium animate-pulse">
              Scanning Market Data...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-xl text-center my-10">
            <h3 className="font-bold text-lg mb-2">Error Loading Data</h3>
            <p className="text-sm">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data?.stocks.length === 0 && (
          <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-300 mx-auto max-w-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-gray-800 font-bold text-lg">No stocks found</h3>
            <p className="text-gray-500 text-sm mt-2 px-8">
              検索条件に一致する銘柄がありませんでした。
              <br />
              別のキーワードやタブを試してみてください。
            </p>
          </div>
        )}

        {/* Stock Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {data?.stocks.map((stock: StockSummary) => (
            <StockCard key={stock.code} stock={stock} />
          ))}
        </div>

        {/* Pagination */}
        {!loading && data?.stocks && data.stocks.length > 0 && (
          <div className="flex justify-center gap-4 mt-16 mb-24">
            <button
              onClick={() => {
                setOffset((prev) => Math.max(0, prev - LIMIT));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={offset === 0}
              className="px-6 py-3 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-sm shadow-sm hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ← Prev Page
            </button>
            <button
              onClick={() => {
                setOffset((prev) => prev + LIMIT);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={data?.stocks.length < LIMIT}
              className="px-6 py-3 rounded-full bg-gray-900 text-white font-bold text-sm shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next Page →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
