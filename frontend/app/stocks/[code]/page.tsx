"use client";

import React, { use, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { GetStockDetailDocument } from "@/lib/gql/graphql";
import Link from "next/link";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockFinancialChart from "@/components/StockFinancialChart";
import AddToPortfolioModal from "@/components/AddToPortfolioModal"; // 追加
// ヘルパー: 通貨フォーマット
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

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, loading, error } = useQuery(GetStockDetailDocument, {
    variables: { code },
  });

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-400">
        <div className="animate-pulse">Loading Analysis...</div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex justify-center items-center text-red-500">
        Error: {error.message}
      </div>
    );
  if (!data?.stock)
    return (
      <div className="min-h-screen flex justify-center items-center">
        Stock not found
      </div>
    );

  const stock = data.stock;
  const analysis = stock.analysisResults?.[0];

  // --- タグの定義 ---
  // APIから返ってきたBooleanを見て、表示するバッジを決める
  const tags = [
    {
      key: "tagSafetyShield",
      label: "🛡️ 盤石の盾",
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
    {
      key: "tagQualityGrowth",
      label: "👑 王道成長",
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    },
    {
      key: "tagCashCow",
      label: "🧱 キャッシュ製造機",
      color: "bg-slate-100 text-slate-800 border-slate-200",
    },
    {
      key: "tagInstitutional",
      label: "🧠 プロ好み",
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
      key: "tagSingleEngine",
      label: "🚀 片肺飛行",
      color: "bg-pink-100 text-pink-800 border-pink-200",
    },
    {
      key: "tagHighVolatility",
      label: "🎢 ボラ覚悟",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    {
      key: "tagSilentImprover",
      label: "🌱 静かなる改善",
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      key: "tagTurnaround",
      label: "🔁 復活の兆し",
      color: "bg-teal-100 text-teal-800 border-teal-200",
    },
    {
      key: "tagZombie",
      label: "💀 ゾンビ企業",
      color: "bg-gray-800 text-white border-black",
    },
    {
      key: "tagAccountingRisk",
      label: "🧪 会計リスク",
      color: "bg-red-100 text-red-800 border-red-200",
    },
    {
      key: "tagFragile",
      label: "🚨 前提崩壊リスク",
      color: "bg-red-50 text-red-600 border-red-200 dashed border-2",
    },
  ];

  // 有効なタグだけ抽出
  const activeTags = tags.filter(
    (t) => analysis && analysis[t.key as keyof typeof analysis],
  );

  // チャート用データ整形
  const chartData =
    stock.financials?.map((f) => ({
      ...f,
      date: f.periodEnd || `${f.fiscalYear}-Q${f.quarter}`,
    })) || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-800 text-sm font-bold flex items-center gap-1"
          >
            ← Back
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-tight text-gray-800 leading-none">
              {stock.japaneseName || stock.name}
            </h1>
            <div className="text-[10px] text-gray-400 font-mono font-bold">
              {stock.code} | {stock.japaneseMarket || stock.market}
            </div>
          </div>
          {/* 追加ボタンの実装 */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-700 hover:scale-105 transition-all shadow-lg shadow-gray-200 flex items-center gap-1"
          >
            <span>+</span> Portfolio
          </button>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* 1. ヒーローセクション & AI Verdict */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          {/* 背景装飾 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -z-0 opacity-50"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              {/* タグ表示エリア */}
              <div className="flex flex-wrap gap-2 mb-4">
                {activeTags.length > 0 ? (
                  activeTags.map((tag) => (
                    <span
                      key={tag.key}
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${tag.color}`}
                    >
                      {tag.label}
                    </span>
                  ))
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                    Character: Neutral
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-4 mb-2">
                <div className="text-4xl font-mono font-bold text-gray-900">
                  ¥{analysis?.stockPrice?.toLocaleString() ?? "---"}
                </div>
                <div className="text-sm text-gray-500 font-bold">
                  時価総額: {formatCurrency(analysis?.marketCap)}
                </div>
              </div>

              {/* AI Summary Box */}
              <div className="bg-slate-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-4">
                <div className="text-xs font-bold text-blue-500 uppercase mb-1">
                  AI Analyst Summary
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  {analysis?.aiSummary || "データ不足により分析できません。"}
                </p>
              </div>
            </div>

            {/* Verdict Badge */}
            <div className="flex flex-col items-center">
              <div
                className={`
                    w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 shadow-lg
                    ${
                      analysis?.status === "Strong Buy"
                        ? "bg-red-500 border-red-600 text-white"
                        : analysis?.status === "Buy"
                          ? "bg-orange-500 border-orange-600 text-white"
                          : analysis?.status === "Avoid"
                            ? "bg-gray-800 border-gray-900 text-white"
                            : "bg-white border-gray-200 text-gray-700"
                    }
                `}
              >
                <span className="text-xs font-bold opacity-80 uppercase">
                  Verdict
                </span>
                <span className="text-xl font-black">
                  {analysis?.status ?? "-"}
                </span>
              </div>
              {/* Score Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 w-full text-center">
                <div className="bg-gray-50 p-1 rounded border border-gray-200">
                  <div className="text-[9px] text-gray-400 font-bold">
                    Z-Score
                  </div>
                  <div
                    className={`font-mono font-bold ${(analysis?.zScore ?? 0) < 1.8 ? "text-red-500" : "text-gray-700"}`}
                  >
                    {analysis?.zScore?.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-50 p-1 rounded border border-gray-200">
                  <div className="text-[9px] text-gray-400 font-bold">Gap</div>
                  <div
                    className={`font-mono font-bold ${(analysis?.expectationGap ?? 0) > 20 ? "text-red-500" : "text-green-600"}`}
                  >
                    {analysis?.expectationGap?.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 4層診断 & Reality Gap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reality Gap Meter */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">
              Reality Gap Analysis
            </h3>

            <div className="relative pt-6 pb-2">
              {/* Meter Bar */}
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex relative">
                <div className="absolute left-1/2 bottom-0 top-0 w-0.5 bg-gray-400 z-10"></div>{" "}
                {/* Center Line */}
                {/* Indicator */}
                <div
                  className={`absolute top-0 bottom-0 transition-all duration-1000 ${
                    (analysis?.expectationGap ?? 0) > 0
                      ? "bg-red-400 left-1/2 rounded-r-full"
                      : "bg-green-500 right-1/2 rounded-l-full"
                  }`}
                  style={{
                    width: `${Math.min(Math.abs(analysis?.expectationGap ?? 0), 50)}%`,
                  }}
                ></div>
              </div>

              <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 px-1">
                <span>Undervalued (割安)</span>
                <span>Overheated (過熱)</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500">
                  市場の期待 (Implied Growth)
                </span>
                <span className="font-mono font-bold">
                  {analysis?.impliedRevenueGrowth?.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500">
                  現実の実績 (Actual Growth)
                </span>
                <span className="font-mono font-bold">
                  {analysis?.actualRevenueGrowth?.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="font-bold text-gray-700">Gap (乖離)</span>
                <span
                  className={`font-mono font-bold ${(analysis?.expectationGap ?? 0) > 0 ? "text-red-500" : "text-green-600"}`}
                >
                  {(analysis?.expectationGap ?? 0) > 0 ? "+" : ""}
                  {analysis?.expectationGap?.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Matrix */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              Corporate Diagnosis
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  State
                </span>
                <span className="font-bold text-gray-800">
                  {analysis?.state}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Expectation
                </span>
                <span className="font-bold text-gray-800">
                  {analysis?.expectationStructure}
                </span>
              </div>
              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  analysis?.riskLevel === "Critical"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : analysis?.riskLevel === "High"
                      ? "bg-orange-50 border-orange-200 text-orange-700"
                      : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                <span className="text-xs font-bold uppercase opacity-70">
                  Risk Level
                </span>
                <div className="text-right">
                  <span className="font-black block">
                    {analysis?.riskLevel}
                  </span>
                  {analysis?.riskDetails && (
                    <span className="text-[10px] opacity-80 block">
                      {analysis.riskDetails}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StockFinancialChart data={chartData} />
          </div>
          <div>
            <TradingViewWidget code={stock.code} />
          </div>
        </div>
      </main>
      {/* ▼▼▼ これを追加！ ▼▼▼ */}
      <AddToPortfolioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stockCode={stock.code}
        currentPrice={analysis?.stockPrice || 0}
        stockName={stock.japaneseName || stock.name}
      />
    </div>
  );
}
