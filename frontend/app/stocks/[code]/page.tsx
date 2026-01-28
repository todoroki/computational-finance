"use client";

import React, { use } from "react"; // ★ use をインポート
import { useQuery } from "@apollo/client/react";
import { GetStockDetailDocument } from "@/lib/gql/graphql";
import type { GetStockDetailQuery } from "@/lib/gql/graphql";
import Link from "next/link";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockFinancialChart from "@/components/StockFinancialChart";

// --- 型定義の抽出 ---
type StockData = NonNullable<GetStockDetailQuery["stock"]>;
type FinancialData = NonNullable<StockData["financials"]>[number];

// --- ヘルパー関数 ---
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

// --- メインコンポーネント ---
export default function StockDetailPage({
  params,
}: {
  // ★重要: Next.js 15では params は Promise です
  params: Promise<{ code: string }>;
}) {
  // ★重要: use() を使って Promise をほどきます
  const { code } = use(params);

  // 1. データ取得
  const { data, loading, error } = useQuery(GetStockDetailDocument, {
    variables: { code },
    skip: !code, // codeが無いときはクエリを飛ばす安全策
  });

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-400">
        Loading MRI data...
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
  
  // チャート用にデータを整形
  const chartData = stock.financials?.map(f => ({
    ...f,
    date: f.periodEnd || `${f.fiscalYear}-Q${f.quarter}`
  })) || [];

  // ステータス色設定
  const statusColor =
    analysis?.status === "Strong Buy"
      ? "bg-red-500 text-white"
      : analysis?.status === "Buy"
      ? "bg-orange-500 text-white"
      : analysis?.status === "Buy (Spec)"
      ? "bg-yellow-400 text-black border-dashed border-black"
      : analysis?.status === "Avoid"
      ? "bg-gray-800 text-white"
      : analysis?.status === "Sell"
      ? "bg-blue-600 text-white"
      : "bg-gray-200 text-gray-600";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-gray-500 hover:text-blue-600 text-sm font-bold flex items-center gap-1"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-black tracking-tighter text-gray-800">
            {stock.code} <span className="font-normal text-gray-400">|</span>{" "}
            {stock.name}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* 1. ヒーローセクション */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex gap-2 mb-2">
              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded font-bold">
                {stock.market}
              </span>
              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded font-bold">
                {stock.sector}
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
              {stock.name}
            </h2>
            <div className="text-2xl font-mono font-bold mt-1">
              ¥{analysis?.stockPrice?.toLocaleString() ?? "---"}
            </div>
          </div>

          <div
            className={`px-6 py-3 rounded-xl flex flex-col items-center justify-center min-w-[140px] ${statusColor}`}
          >
            <span className="text-xs uppercase font-bold opacity-80 mb-1">
              AI Verdict
            </span>
            <span className="text-xl font-black whitespace-nowrap">
              {analysis?.status ?? "N/A"}
            </span>
          </div>
        </div>

        {/* 2. TradingView Chart */}
        <TradingViewWidget code={stock.code} />

        {/* 3. AI 4層診断 & Reality Gap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: 4層診断 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              AI Diagnostic Report
            </h3>

            {/* Layer 1: State */}
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <span className="text-sm text-gray-500">1. Corporate State</span>
              <span className="font-bold text-gray-800">
                {analysis?.state ?? "Unknown"}
              </span>
            </div>

            {/* Layer 2: Expectation */}
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <span className="text-sm text-gray-500">
                2. Market Expectation
              </span>
              <span
                className={`font-bold ${
                  analysis?.expectationStructure === "Underestimated"
                    ? "text-green-600"
                    : analysis?.expectationStructure === "Overheated"
                    ? "text-red-500"
                    : "text-gray-800"
                }`}
              >
                {analysis?.expectationStructure ?? "Neutral"}
              </span>
            </div>

            {/* Layer 3: Risk */}
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <span className="text-sm text-gray-500">3. Risk Level</span>
              <div className="text-right">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                    analysis?.riskLevel === "Critical"
                      ? "bg-red-100 text-red-600"
                      : analysis?.riskLevel === "High"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {analysis?.riskLevel ?? "Low"}
                </span>
                {analysis?.riskDetails && (
                  <div className="text-[10px] text-red-500 mt-1">
                    {analysis.riskDetails}
                  </div>
                )}
              </div>
            </div>

            {/* Layer 4: AI Summary */}
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 leading-relaxed mt-2">
              <span className="font-bold mr-1">🤖 AI Summary:</span>
              {analysis?.aiSummary ?? "分析データが不足しています。"}
            </div>
          </div>

          {/* Right: Reality Gap Meter & Metrics */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
            {/* Reality Gap Meter */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Reality Gap
                </h3>
                <span className="text-xs text-gray-400">期待 vs 現実</span>
              </div>

              {analysis?.expectationGap != null ? (
                <div className="py-2">
                  <div className="flex justify-between text-xs font-mono text-gray-500 mb-2">
                    <span>
                      Actual:{" "}
                      <strong>
                        {analysis.actualRevenueGrowth?.toFixed(1)}%
                      </strong>
                    </span>
                    <span>
                      Implied:{" "}
                      <strong>
                        {analysis.impliedRevenueGrowth?.toFixed(1)}%
                      </strong>
                    </span>
                  </div>

                  <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden w-full">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 z-10"></div>
                    <div
                      className={`absolute top-0 bottom-0 transition-all duration-500 ${
                        analysis.expectationGap > 0
                          ? "bg-red-400 left-1/2"
                          : "bg-green-500 right-1/2"
                      }`}
                      style={{
                        width: `${Math.min(
                          Math.abs(analysis.expectationGap),
                          50
                        )}%`,
                        ...(analysis.expectationGap < 0
                          ? { right: "50%", left: "auto" }
                          : {}),
                      }}
                    ></div>
                  </div>
                  <div className="text-center font-bold mt-1 text-sm">
                    Gap:{" "}
                    <span
                      className={
                        analysis.expectationGap > 0
                          ? "text-red-500"
                          : "text-green-600"
                      }
                    >
                      {analysis.expectationGap > 0 ? "+" : ""}
                      {analysis.expectationGap.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded text-center">
                  Data Not Available
                </div>
              )}
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">
                  Z-Score
                </div>
                <div
                  className={`text-xl font-bold ${
                    (analysis?.zScore ?? 0) < 1.8
                      ? "text-red-500"
                      : "text-gray-800"
                  }`}
                >
                  {analysis?.zScore?.toFixed(2) ?? "-"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">
                  F-Score
                </div>
                <div className="text-xl font-bold text-gray-800">
                  {analysis?.fScore ?? "-"}{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    / 9
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">
                  Gross Profitability
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {analysis?.grossProfitability
                    ? `${(analysis.grossProfitability * 100).toFixed(0)}%`
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">
                  Implied Growth
                </div>
                <div className="text-xl font-bold text-gray-800">
                  {analysis?.impliedGrowthRate
                    ? `${analysis.impliedGrowthRate.toFixed(1)}%`
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 財務データ (チャート + テーブル) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">業績推移</h3>
            <span className="text-xs text-gray-500">単位: 円</span>
          </div>

          <div className="p-6">
            {/* グラフ */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">
                Chart: Revenue & Operating Income
              </h4>
              {chartData.length > 0 ? (
                <StockFinancialChart data={chartData} />
              ) : (
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                  チャートデータがありません
                </div>
              )}
            </div>

            {/* テーブル */}
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
                  {stock.financials?.map((f: FinancialData, i: number) => (
                    <tr
                      key={i}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-gray-600">
                        {f.periodEnd}
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
      </main>
    </div>
  );
}