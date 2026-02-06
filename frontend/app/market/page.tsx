"use client";

import { useQuery } from "@apollo/client/react"; // 修正
import { gql } from "@apollo/client";
import Link from "next/link";
import { useState } from "react";

// --- Types (Local Definition for now) ---
// anyを回避するために、GraphQLの戻り値の型を定義
interface MarketStockAnalysis {
  stockPrice?: number;
  status?: string;
  zScore?: number;
  grossProfitability?: number;
  expectationGap?: number;
  tagZombie?: boolean;
  tagSafetyShield?: boolean;
  tagQualityGrowth?: boolean;
  tagHighVolatility?: boolean;
}

interface MarketStock {
  code: string;
  name: string;
  japaneseName?: string;
  market?: string;
  analysisResults?: MarketStockAnalysis[];
}

interface MarketData {
  stocks: MarketStock[];
}

// --- GraphQL Query ---
const GET_STOCKS = gql`
  query GetStocks($search: String, $rankingMode: String) {
    stocks(search: $search, rankingMode: $rankingMode, limit: 50) {
      code
      name
      japaneseName
      market
      analysisResults {
        stockPrice
        status
        zScore
        grossProfitability
        expectationGap
        tagZombie
        tagSafetyShield
        tagQualityGrowth
        tagHighVolatility
      }
    }
  }
`;

// --- Components ---

// propsの型を定義
const StockCard = ({ stock }: { stock: MarketStock }) => {
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
              <div className="text-xs text-gray-400 font-mono">
                {stock.code} | {stock.market}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-gray-800">
                ¥{analysis?.stockPrice?.toLocaleString() ?? "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="pl-3 grid grid-cols-2 gap-3 mb-4 flex-1">
          {/* 健全性 (Z-Score) */}
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

          {/* 割安度 (Gap) */}
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
        </div>
      </div>
    </Link>
  );
};

export default function MarketPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rankingMode, setRankingMode] = useState<string | null>(null);

  // useQueryに型引数 <MarketData> を指定
  const { data, loading, error } = useQuery<MarketData>(GET_STOCKS, {
    variables: {
      search: searchTerm,
      rankingMode: rankingMode,
    },
  });

  const CATEGORIES = [
    { id: "strong_buy", label: "💎 Strong Buy", desc: "AIが強く推奨する銘柄" },
    {
      id: "safety_shield",
      label: "🛡️ 鉄壁の財務",
      desc: "倒産リスクが極めて低い",
    },
    { id: "quality_growth", label: "👑 王道グロース", desc: "質と成長を両立" },
    {
      id: "gap_opportunities",
      label: "💰 割安放置",
      desc: "実力より安く買える",
    },
    { id: "avoid", label: "💀 危険銘柄", desc: "ゾンビ・粉飾リスク" },
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
        {/* Search & Filter Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Market Explorer
          </h1>

          <div className="relative max-w-2xl mb-8">
            <input
              type="text"
              placeholder="銘柄コードまたは企業名で検索..."
              className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              🔍
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setRankingMode(null)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                rankingMode === null
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setRankingMode(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex flex-col items-start gap-0.5 ${
                  rankingMode === cat.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          {rankingMode && (
            <p className="mt-2 text-sm text-gray-500 ml-2">
              {CATEGORIES.find((c) => c.id === rankingMode)?.desc}
            </p>
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
            {/* 型定義をしたので map 内の引数も推論されます */}
            {data?.stocks?.map((stock) => (
              <StockCard key={stock.code} stock={stock} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
