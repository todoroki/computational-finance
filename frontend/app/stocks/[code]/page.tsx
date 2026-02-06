"use client";

import React, { use, useState } from "react";
// ▼ 修正: 指摘通りのパスに変更
import { useQuery } from "@apollo/client/react";
// ▼ 追加: 生成された型定義をimport
import { GetStockDetailDocument, GetStockDetailQuery } from "@/lib/gql/graphql";
import Link from "next/link";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockFinancialChart from "@/components/StockFinancialChart";
import AddToPortfolioModal from "@/components/AddToPortfolioModal";

// --- Type Definitions ---

// GraphQLの型からAnalysisResultの型を抽出 (Utility Type)
type StockDetail = NonNullable<GetStockDetailQuery["stock"]>;
type AnalysisResult = NonNullable<StockDetail["analysisResults"]>[number];

// --- Helper Functions & Definitions ---

const formatCurrency = (val?: number | null) => {
  if (val === undefined || val === null) return "---";
  if (val >= 1_000_000_000_000)
    return `¥${(val / 1_000_000_000_000).toFixed(1)}兆`;
  if (val >= 1_000_000_000) return `¥${(val / 1_000_000_000).toFixed(1)}0億`;
  return `¥${val.toLocaleString()}`;
};

// タグ定義のキーを AnalysisResult のキーに制限することで型安全にする
type TagKey = keyof AnalysisResult & string;

const TAG_DEFINITIONS: Partial<
  Record<TagKey, { label: string; color: string; desc: string }>
> = {
  tagSafetyShield: {
    label: "🛡️ 盤石の盾",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    desc: "財務健全性が極めて高い企業です。倒産リスクが低く、不況時でも安定した経営が期待できます（Z-Score > 3.0）。",
  },
  tagQualityGrowth: {
    label: "👑 王道成長",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    desc: "高い収益性と成長性を両立している優良企業です。粗利益率が高く、競争優位性を持っています。",
  },
  tagCashCow: {
    label: "🧱 キャッシュ製造機",
    color: "bg-slate-100 text-slate-800 border-slate-200",
    desc: "安定して現金を稼ぎ出している企業です。派手な成長はないものの、配当や自社株買いなどの還元余力があります。",
  },
  tagInstitutional: {
    label: "🧠 プロ好み",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    desc: "機関投資家が好む指標（低いアクルーアルなど）を満たしており、大口資金が入りやすい状態です。",
  },
  tagSingleEngine: {
    label: "🚀 片肺飛行",
    color: "bg-pink-100 text-pink-800 border-pink-200",
    desc: "利益は出ていないものの、売上が急成長している状態です。赤字のSaaS企業などに見られ、ハイリスク・ハイリターンです。",
  },
  tagHighVolatility: {
    label: "🎢 ボラ覚悟",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    desc: "株価変動が非常に激しい銘柄です。短期間で資産が倍になることもあれば、半分になることもあります。",
  },
  tagSilentImprover: {
    label: "🌱 静かなる改善",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    desc: "株価やニュースには表れていませんが、財務数値（F-Score）が着実に改善しています。市場が見逃しているチャンスの可能性があります。",
  },
  tagTurnaround: {
    label: "🔁 復活の兆し",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    desc: "市場の期待は低いものの、業績が底打ちし、回復の兆しが見え始めている企業です（Gap < 0）。",
  },
  tagZombie: {
    label: "💀 ゾンビ企業",
    color: "bg-gray-800 text-white border-black",
    desc: "【危険】稼いだ利益で借金の利息すら払えていない状態が続いています。金利上昇局面では倒産リスクが跳ね上がります。",
  },
  tagAccountingRisk: {
    label: "🧪 会計リスク",
    color: "bg-red-100 text-red-800 border-red-200",
    desc: "【注意】会計上の利益と、実際の現金の動き（キャッシュフロー）に乖離があります。粉飾や無理な会計処理の可能性があります。",
  },
  tagFragile: {
    label: "🚨 前提崩壊リスク",
    color: "bg-red-50 text-red-600 border-red-200 dashed border-2",
    desc: "【警告】成長期待だけで株価が支えられています。少しでも成長が鈍化すれば、株価が暴落する『期待剥落』のリスクが高い状態です。",
  },
};

// ... (TRANSLATIONS は変更なしなので省略) ...
// 診断ステータスの日本語訳
const TRANSLATIONS: Record<string, string> = {
  "Strong Buy": "買い推奨 (Strong Buy)",
  Buy: "買い (Buy)",
  Neutral: "中立 (Neutral)",
  Sell: "売り (Sell)",
  "Strong Sell": "売り推奨 (Strong Sell)",
  Avoid: "見送り推奨 (Avoid)",
  Stable: "安定期",
  Growth: "成長期",
  Mature: "成熟期",
  Decline: "衰退・低迷期",
  Distress: "経営危機",
  Overheated: "過熱 (期待しすぎ)",
  High: "高期待",
  Moderate: "適正水準",
  Low: "悲観的",
  Undervalued: "割安放置",
  Critical: "危機的",
  "High Risk": "高い",
  Medium: "中程度",
  "Low Risk": "低い",
  Safe: "極めて安全",
};

// ... (InfoLabel, TagDescriptionBox も変更なしなので省略) ...
const InfoLabel = ({ label, desc }: { label: string; desc: string }) => (
  <div className="group relative flex items-center gap-1 cursor-help w-fit">
    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-dotted border-gray-400">
      {label}
    </span>
    <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
      {desc}
      <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

const TagDescriptionBox = ({ tagKey }: { tagKey: string | null }) => {
  if (!tagKey) return null;
  // TAG_DEFINITIONSの型安全性を確保しているため安全にアクセス可能
  const tag = TAG_DEFINITIONS[tagKey as TagKey];
  if (!tag) return null;

  return (
    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold border ${tag.color}`}
        >
          {tag.label}
        </span>
        <span className="text-xs font-bold text-gray-500">とは？</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{tag.desc}</p>
    </div>
  );
};

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // useQueryの型引数に生成された型を指定
  const { data, loading, error } = useQuery<GetStockDetailQuery>(
    GetStockDetailDocument,
    {
      variables: { code },
    },
  );

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-400 font-mono">
        Scanning AssetOS...
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

  // ▼ 修正: anyを使わずに型安全にフィルタリング
  const activeTags = (Object.keys(TAG_DEFINITIONS) as TagKey[]).filter(
    (key) => {
      // analysisが存在し、かつそのキーの値が truthy であることを確認
      // key は TagKey (AnalysisResultのキー) なので型安全
      return analysis && analysis[key];
    },
  );

  const chartData =
    stock.financials?.map((f) => ({
      ...f,
      date: f.periodEnd || `${f.fiscalYear}-Q${f.quarter}`,
    })) || [];

  return (
    // ... (JSX部分は以前と同じなので省略せず記述しますが、長いので変更点のみ確認してください)
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/market"
            className="text-gray-500 hover:text-gray-800 text-sm font-bold flex items-center gap-1"
          >
            ← Market
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-tight text-gray-800 leading-none">
              {stock.japaneseName || stock.name}
            </h1>
            <div className="text-[10px] text-gray-400 font-mono font-bold">
              {stock.code} | {stock.japaneseMarket || stock.market}
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-700 hover:scale-105 transition-all shadow-lg shadow-gray-200 flex items-center gap-1"
          >
            <span>+</span> Portfolio
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* 1. Hero Section & Character Tags */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -z-0 opacity-50"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1 w-full">
              {/* Tags List */}
              <div className="flex flex-wrap gap-2 mb-4">
                {activeTags.length > 0 ? (
                  activeTags.map((key) => (
                    <button
                      key={key}
                      onClick={() =>
                        setSelectedTag(selectedTag === key ? null : key)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 ${TAG_DEFINITIONS[key]?.color} ${selectedTag === key ? "ring-2 ring-offset-1 ring-blue-300" : ""}`}
                    >
                      {TAG_DEFINITIONS[key]?.label}
                    </button>
                  ))
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                    特徴なし (Neutral)
                  </span>
                )}
              </div>

              <TagDescriptionBox tagKey={selectedTag} />

              <div className="flex items-baseline gap-4 mb-2 mt-4">
                <div className="text-4xl font-mono font-bold text-gray-900">
                  ¥{analysis?.stockPrice?.toLocaleString() ?? "---"}
                </div>
                <div className="text-sm text-gray-500 font-bold">
                  時価総額: {formatCurrency(analysis?.marketCap)}
                </div>
              </div>

              <div className="bg-slate-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-4">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-xs font-bold text-blue-500 uppercase">
                    AI Analyst Summary
                  </div>
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  {analysis?.aiSummary || "データ不足により分析できません。"}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center min-w-[140px]">
              <div
                className={`
                        w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 shadow-lg mb-4
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
                <span className="text-[10px] font-bold opacity-80 uppercase mb-1">
                  AI Verdict
                </span>
                <span className="text-lg font-black text-center leading-tight px-2">
                  {TRANSLATIONS[analysis?.status ?? ""] ||
                    analysis?.status ||
                    "-"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full text-center">
                <div className="bg-gray-50 p-2 rounded border border-gray-200 group relative">
                  <div className="text-[9px] text-gray-400 font-bold border-b border-dotted border-gray-300 inline-block mb-1 cursor-help">
                    財務健全性
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 text-left">
                    Z-Score。3.0以上なら倒産確率極小。1.8以下は危険水域。
                  </div>
                  <div
                    className={`font-mono font-bold ${(analysis?.zScore ?? 0) < 1.8 ? "text-red-500" : "text-gray-700"}`}
                  >
                    {analysis?.zScore?.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200 group relative">
                  <div className="text-[9px] text-gray-400 font-bold border-b border-dotted border-gray-300 inline-block mb-1 cursor-help">
                    期待乖離
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 text-left">
                    Expectation
                    Gap。プラスなら過熱（割高）、マイナスなら期待先行（割安）。
                  </div>
                  <div
                    className={`font-mono font-bold ${(analysis?.expectationGap ?? 0) > 20 ? "text-red-500" : "text-green-600"}`}
                  >
                    {(analysis?.expectationGap ?? 0) > 0 ? "+" : ""}
                    {analysis?.expectationGap?.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Reality Gap & Diagnosis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                Reality Gap Analysis
              </h3>
              <div className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">
                期待 vs 実績
              </div>
            </div>

            <div className="relative pt-6 pb-2">
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex relative">
                <div className="absolute left-1/2 bottom-0 top-0 w-0.5 bg-gray-400 z-10"></div>
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
                <InfoLabel
                  label="市場の期待成長率"
                  desc="現在の株価を正当化するために必要な、向こう数年間の売上成長率（逆算DCF法による推計）。"
                />
                <span className="font-mono font-bold text-gray-800">
                  {analysis?.impliedRevenueGrowth?.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                <InfoLabel
                  label="現実の実績成長率"
                  desc="直近の決算データに基づく、実際の売上成長率。"
                />
                <span className="font-mono font-bold text-gray-800">
                  {analysis?.actualRevenueGrowth?.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1 bg-slate-50 p-2 rounded">
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

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-6">
              Corporate Diagnosis
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <InfoLabel
                  label="企業のライフサイクル"
                  desc="企業の成長段階。Growth（成長期）、Mature（成熟期）、Decline（衰退期）など。"
                />
                <span className="font-bold text-gray-800">
                  {TRANSLATIONS[analysis?.state ?? ""] || analysis?.state}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <InfoLabel
                  label="市場の期待水準"
                  desc="現在の株価に織り込まれている期待の高さ。Overheated（過熱）の場合は、好決算でも株価が下がるリスクがあります。"
                />
                <span className="font-bold text-gray-800">
                  {TRANSLATIONS[analysis?.expectationStructure ?? ""] ||
                    analysis?.expectationStructure}
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
                <InfoLabel
                  label="総合リスク判定"
                  desc="財務健全性、収益性、期待値の偏りなどを総合的に判断したリスクレベル。"
                />
                <div className="text-right">
                  <span className="font-black block">
                    {TRANSLATIONS[analysis?.riskLevel ?? ""] ||
                      analysis?.riskLevel}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StockFinancialChart data={chartData} />
          </div>
          <div>
            <TradingViewWidget code={stock.code} />
          </div>
        </div>
      </main>
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
