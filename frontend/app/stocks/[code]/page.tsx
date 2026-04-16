"use client";

import React, { use, useState } from "react";
import { useQuery } from "@apollo/client/react"; // 修正済みのパス
import { GetStockDetailDocument, GetStockDetailQuery } from "@/lib/gql/graphql";
import Link from "next/link";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockFinancialChart from "@/components/StockFinancialChart";
import AddToPortfolioModal from "@/components/AddToPortfolioModal";
// ▼▼▼ 追加: ナラティブ生成エンジンをインポート ▼▼▼
import { generateNarratives } from "@/lib/narrativeGenerator";

// --- Type Definitions ---
type StockDetail = NonNullable<GetStockDetailQuery["stock"]>;
type AnalysisResult = NonNullable<StockDetail["analysisResults"]>[number];

// --- Helper Functions ---
const formatCurrency = (val?: number | null) => {
  if (val === undefined || val === null) return "---";
  if (val >= 1_000_000_000_000)
    return `¥${(val / 1_000_000_000_000).toFixed(1)}兆`;
  if (val >= 1_000_000_000) return `¥${(val / 1_000_000_000).toFixed(1)}0億`;
  return `¥${val.toLocaleString()}`;
};

// ▼ 1. リスク詳細の翻訳用辞書を追加
const RISK_TRANSLATIONS: Record<string, string> = {
  "Weak Fundamentals": "基礎的財務の脆弱性",
  "Bankruptcy Risk": "倒産リスク水域",
  "Earnings Manipulation": "利益調整の疑い",
  "Distress Zone": "経営危険水域",
  "High Accruals": "利益の質が低い(現金裏付けなし)",
  "No FCF": "フリーキャッシュフロー赤字",
};
// ▼▼▼ 追加: 指標表示用のフォーマッター ▼▼▼
const fmt = (val?: number | null, unit = "", fixed = 1) =>
  val !== undefined && val !== null ? `${val.toFixed(fixed)}${unit}` : "---";

// --- Tag Definitions ---
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

// const TRANSLATIONS: Record<string, string> = {
//   "Strong Buy": "買い推奨 (Strong Buy)",
//   Buy: "買い (Buy)",
//   Neutral: "中立 (Neutral)",
//   Sell: "売り (Sell)",
//   "Strong Sell": "売り推奨 (Strong Sell)",
//   Avoid: "見送り推奨 (Avoid)",

//   // ▼▼▼ 企業のライフサイクル (State) ▼▼▼
//   Stable: "安定期 (Stable)",
//   Growth: "成長期 (Growth)",
//   Mature: "成熟期 (Mature)",
//   Decline: "衰退期 (Decline)",

//   // ここを修正！
//   // "Distress": "財務危機",  // ← 違和感がある
//   "Financial Distress": "危険水域・再建期 (Distress)", // ← これなら「時期」と「状態」両方伝わる

//   Deteriorating: "悪化局面 (Deteriorating)", // 追加: 状態が悪くなっている途中
//   "Cash Generator": "安定収益期 (Cash Cow)", // 追加: 成熟して金を稼いでいる
//   "High Growth": "急成長期 (High Growth)", // 追加: イケイケな時期

//   // ▼▼▼ 市場の期待 (Expectation) ▼▼▼
//   Overheated: "過熱 (期待しすぎ)",
//   High: "高期待",
//   Moderate: "適正水準",
//   Low: "悲観的",
//   Undervalued: "割安放置",
//   "Single Engine": "片肺飛行 (売上偏重)", // 追加

//   // ▼▼▼ リスクレベル ▼▼▼
//   Critical: "危機的",
//   "High Risk": "高い",
//   Medium: "中程度",
//   "Low Risk": "低い",
//   Safe: "極めて安全",
// };

// A. 企業の状態 (State)
const STATE_TRANSLATIONS: Record<string, string> = {
  Stable: "安定期 (Stable)",
  Growth: "成長期 (Growth)",
  Mature: "成熟期 (Mature)",
  Decline: "衰退期 (Decline)",
  Distress: "危険水域・再建期 (Distress)",
  Deteriorating: "業績悪化局面 (Deteriorating)",
  "Cash Generator": "高収益安定期 (Cash Cow)",
  "High Growth": "急成長期 (High Growth)",
  Unclear: "判断不能",
};

// B. 市場の期待 (Expectation)
const EXPECTATION_TRANSLATIONS: Record<string, string> = {
  Overheated: "🔥 過熱 (Overheated)",
  High: "高期待 (High)", // ★ここでの High は「期待が高い」
  Moderate: "適正 (Moderate)",
  Low: "悲観 (Low)",
  Underestimated: "💎 過小評価 (Underestimated)",
  "Single Engine": "片肺飛行 (売上偏重)",
  Optimistic: "楽観的",
  Neutral: "中立",
};

// C. リスクレベル (Risk Level)
const RISK_LEVEL_TRANSLATIONS: Record<string, string> = {
  Critical: "💀 危機的 (Critical)",
  High: "⚠️ 高い (High)", // ★ここでの High は「リスクが高い」
  Medium: "⚠️ 中程度 (Medium)",
  Low: "✅ 低い (Low)",
};

// D. リスク詳細 (Risk Details) - さっき追加したもの
const RISK_DETAIL_TRANSLATIONS: Record<string, string> = {
  "Weak Fundamentals": "基礎的財務の脆弱性",
  "Bankruptcy Risk": "倒産リスク水域",
  "Earnings Manipulation": "利益調整の疑い",
  "Distress Zone": "経営危険水域",
  "High Accruals": "利益の質が低い",
  "No FCF": "FCF赤字",
  Volatile: "業績不安定",
};

// E. 総合判定 (Status)
const STATUS_TRANSLATIONS: Record<string, string> = {
  "Strong Buy": "買い推奨 (Strong Buy)",
  Buy: "買い (Buy)",
  "Buy (Spec)": "投機買い (Spec)",
  Neutral: "中立 (Neutral)",
  Sell: "売り (Sell)",
  "Strong Sell": "売り推奨 (Strong Sell)",
  Avoid: "見送り推奨 (Avoid)",
  Watch: "監視 (Watch)",
  Hold: "保持 (Hold)",
};

// --- Components ---
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

  const { data, loading, error } = useQuery<GetStockDetailQuery>(
    GetStockDetailDocument,
    { variables: { code } },
  );

  // ▼ 2. リスク詳細を日本語に変換するヘルパー
  const translateRiskDetails = (details: string | null) => {
    if (!details) return null;
    return details
      .split(", ")
      .map((d) => RISK_TRANSLATIONS[d] || d)
      .join("・");
  };

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-400 font-mono">
        Scanning StockMRI...
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
  // ▼▼▼ 追加: StockMRI 診断レポートを生成 ▼▼▼
  // ここで配列が返ってきます (例: [ゾンビ企業, 金利耐性低, ...])
  const narratives = generateNarratives(
    stock.japaneseName || stock.name,
    analysis,
  );

  const activeTags = (Object.keys(TAG_DEFINITIONS) as TagKey[]).filter(
    (key) => {
      return analysis && analysis[key];
    },
  );

  const chartData =
    stock.financials?.map((f) => ({
      ...f,
      date: f.periodEnd || `${f.fiscalYear}-Q${f.quarter}`,
    })) || [];

  return (
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
        {/* ▼▼▼ 1. Top Hero & AI Profile セクション ▼▼▼ */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -z-0 opacity-50"></div>

          <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start gap-8">
            {/* --- 左側コンテンツ: 株価・タグ・AI分析 --- */}
            <div className="flex-1 w-full space-y-6">
              {/* タグ & 株価情報 */}
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
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

                <div className="flex items-baseline gap-4 mt-4">
                  <div className="text-4xl font-mono font-bold text-gray-900">
                    ¥{analysis?.stockPrice?.toLocaleString() ?? "---"}
                  </div>
                  <div className="text-sm text-gray-500 font-bold">
                    時価総額: {formatCurrency(analysis?.marketCap)}
                  </div>
                </div>
              </div>

              {/* AI Analyst Summary & Business Profile (上に統合してスッキリ配置) */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                    🤖 AI Analyst Profile
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px]">
                      Gemini Grounding
                    </span>
                  </h3>
                  {stock.aiProfileUpdatedAt && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      更新:{" "}
                      {new Date(stock.aiProfileUpdatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* 1行サマリー (定量) */}
                <p className="text-sm text-slate-800 font-bold leading-relaxed mb-4 pb-4 border-b border-slate-200">
                  {analysis?.aiSummary || "データ不足により分析できません。"}
                </p>

                {/* 事業概要 (定性) */}
                <div className="space-y-4">
                  <p className="text-xs text-gray-700 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-100">
                    {stock.aiBusinessSummary || "情報を取得中です..."}
                  </p>

                  {/* 強み・弱みの2カラム */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 mb-2 border-b border-emerald-100 pb-1">
                        ✅ 競争優位性・強み
                      </div>
                      <ul className="space-y-1.5">
                        {stock.aiStrengths?.map((s: string, i: number) => (
                          <li
                            key={i}
                            className="text-xs text-gray-600 flex items-start gap-1.5"
                          >
                            <span className="text-emerald-500 mt-0.5">✦</span>{" "}
                            <span className="leading-tight">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-2 border-b border-red-100 pb-1">
                        ⚠️ 課題・リスク
                      </div>
                      <ul className="space-y-1.5">
                        {stock.aiWeaknesses?.map((w: string, i: number) => (
                          <li
                            key={i}
                            className="text-xs text-gray-600 flex items-start gap-1.5"
                          >
                            <span className="text-red-400 mt-0.5">✦</span>{" "}
                            <span className="leading-tight">{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- 右側コンテンツ: スコア・判定バッジ群 --- */}
            <div className="flex flex-row xl:flex-col gap-4 items-center justify-center w-full xl:w-auto xl:min-w-[160px]">
              {/* Health Score */}
              <div
                className={`w-full flex-1 xl:flex-none flex flex-col items-center justify-center rounded-2xl p-5 shadow-lg border-2 ${
                  (analysis?.healthScore ?? 0) >= 80
                    ? "bg-indigo-900 text-white border-indigo-500 shadow-indigo-200"
                    : (analysis?.healthScore ?? 0) >= 50
                      ? "bg-white text-gray-800 border-gray-200"
                      : "bg-red-50 text-red-900 border-red-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
                  Health Score
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter">
                    {analysis?.healthScore?.toFixed(0) ?? "---"}
                  </span>
                  <span className="text-lg font-medium opacity-50">/100</span>
                </div>
              </div>

              {/* AI Verdict */}
              <div
                className={`
                  w-32 h-32 flex-shrink-0 rounded-full flex flex-col items-center justify-center border-4 shadow-lg
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
                  {STATUS_TRANSLATIONS[analysis?.status ?? ""] ||
                    analysis?.status ||
                    "-"}
                </span>
              </div>

              {/* Z-Score & 期待乖離 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-2 w-full text-center">
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

        {/* ▼▼▼ 2. StockMRI Diagnosis セクション ▼▼▼ */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            🩺 StockMRI Diagnosis{" "}
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">
              AI Report
            </span>
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {narratives.map((narrative) => (
              <div
                key={narrative.id}
                className={`rounded-2xl p-5 border shadow-sm flex items-start gap-4 transition-all hover:shadow-md ${
                  narrative.type === "critical"
                    ? "bg-red-50 border-red-200"
                    : narrative.type === "warning"
                      ? "bg-amber-50 border-amber-200"
                      : narrative.type === "success"
                        ? "bg-indigo-50 border-indigo-200"
                        : narrative.type === "opportunity"
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-white border-gray-200"
                }`}
              >
                {/* Icon */}
                <div className="text-3xl bg-white/80 w-12 h-12 flex items-center justify-center rounded-full shadow-sm flex-shrink-0">
                  {narrative.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {/* バッジ表示 */}
                    {narrative.type === "critical" && (
                      <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-wide">
                        Critical
                      </span>
                    )}
                    {narrative.type === "warning" && (
                      <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase tracking-wide">
                        Warning
                      </span>
                    )}
                    {narrative.type === "success" && (
                      <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-wide">
                        Excellent
                      </span>
                    )}
                    {narrative.type === "opportunity" && (
                      <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded uppercase tracking-wide">
                        Opportunity
                      </span>
                    )}

                    <h3
                      className={`text-base font-bold ${
                        narrative.type === "critical"
                          ? "text-red-900"
                          : narrative.type === "warning"
                            ? "text-amber-900"
                            : narrative.type === "success"
                              ? "text-indigo-900"
                              : narrative.type === "opportunity"
                                ? "text-emerald-900"
                                : "text-gray-900"
                      }`}
                    >
                      {narrative.title}
                    </h3>
                  </div>

                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mb-3 font-medium">
                    {narrative.body}
                  </p>

                  <div
                    className={`px-3 py-2 rounded-lg border inline-flex items-start gap-2 w-full md:w-auto ${
                      narrative.type === "critical"
                        ? "bg-red-100/50 border-red-200 text-red-800"
                        : narrative.type === "warning"
                          ? "bg-amber-100/50 border-amber-200 text-amber-800"
                          : narrative.type === "success"
                            ? "bg-indigo-100/50 border-indigo-200 text-indigo-800"
                            : narrative.type === "opportunity"
                              ? "bg-emerald-100/50 border-emerald-200 text-emerald-800"
                              : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    <span className="text-xs mt-0.5">💡</span>
                    <span className="text-xs font-bold">
                      {narrative.advice}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ▼▼▼ 3. Fundamentals Card (基礎指標) ▼▼▼ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-6 flex items-center gap-2">
            📊 Fundamentals{" "}
            <span className="text-xs font-normal text-gray-400">
              基礎スペック
            </span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
            {/* 1. 割安性 */}
            <div>
              <div className="text-xs text-gray-400 font-bold mb-1">
                PER (株価収益率)
              </div>
              <div className="text-xl font-mono font-bold text-gray-800">
                {fmt(analysis?.per, "倍")}
                {analysis?.perSectorPercentile && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded ml-2 align-middle border border-emerald-100 shadow-sm">
                    業種内 上位 {analysis.perSectorPercentile.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400">
                {analysis?.perSectorAvg
                  ? `業種平均: ${analysis.perSectorAvg.toFixed(1)}倍`
                  : "目安: 15倍以下で割安"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-bold mb-1">
                PBR (株価純資産倍率)
              </div>
              <div className="text-xl font-mono font-bold text-gray-800">
                {fmt(analysis?.pbr, "倍", 2)}
              </div>
              <div className="text-[10px] text-gray-400">
                目安: 1.0倍割れは解散価値以下
              </div>
            </div>

            {/* 2. 効率性 */}
            <div>
              <div className="text-xs text-gray-400 font-bold mb-1">
                ROE (自己資本利益率)
              </div>
              <div
                className={`text-xl font-mono font-bold ${(analysis?.roe ?? 0) > 10 ? "text-blue-600" : "text-gray-800"}`}
              >
                {fmt(analysis?.roe, "%")}
                {analysis?.roePercentile && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded ml-2 align-middle border border-blue-100 shadow-sm">
                    上位 {analysis.roePercentile.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400">
                目安: 8%以上で優良
              </div>
            </div>

            {/* 3. 配当・還元 */}
            <div>
              <div className="text-xs text-gray-400 font-bold mb-1">
                配当利回り
              </div>
              <div
                className={`text-xl font-mono font-bold ${(analysis?.dividendYield ?? 0) > 3.5 ? "text-green-600" : "text-gray-800"}`}
              >
                {fmt(analysis?.dividendYield, "%", 2)}
              </div>
              <div className="text-[10px] text-gray-400">3.5%以上は高配当</div>
            </div>

            {/* 4. 安全性 */}
            <div className="border-t border-gray-50 pt-4 md:border-none md:pt-0">
              <div className="text-xs text-gray-400 font-bold mb-1">
                自己資本比率
              </div>
              <div className="text-lg font-mono font-bold text-gray-800">
                {fmt(analysis?.equityRatio, "%")}
              </div>
            </div>
            <div className="border-t border-gray-50 pt-4 md:border-none md:pt-0">
              <div className="text-xs text-gray-400 font-bold mb-1">
                EPS (1株益)
              </div>
              <div className="text-lg font-mono font-bold text-gray-800">
                ¥{analysis?.eps?.toFixed(0) ?? "---"}
              </div>
            </div>
            <div className="border-t border-gray-50 pt-4 md:border-none md:pt-0">
              <div className="text-xs text-gray-400 font-bold mb-1">
                BPS (1株純資産)
              </div>
              <div className="text-lg font-mono font-bold text-gray-800">
                ¥{analysis?.bps?.toFixed(0) ?? "---"}
              </div>
            </div>
            <div className="border-t border-gray-50 pt-4 md:border-none md:pt-0">
              <div className="text-xs text-gray-400 font-bold mb-1">
                直近FCF
              </div>
              <div
                className={`text-lg font-mono font-bold ${(analysis?.freeCashFlow ?? 0) > 0 ? "text-gray-800" : "text-red-500"}`}
              >
                {analysis?.freeCashFlow
                  ? (analysis.freeCashFlow / 100000000).toFixed(0) + "億円"
                  : "---"}
              </div>
            </div>
          </div>
        </div>
        {/* 2. Reality Gap & Diagnosis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                期待乖離分析{" "}
                <span className="text-xs font-normal text-gray-400 ml-1">
                  Reality Gap
                </span>
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

          {/* Corporate Diagnosis Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-6">
              Corporate Diagnosis
            </h3>
            <div className="space-y-4">
              {/* 1. State */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <InfoLabel
                  label="企業のライフサイクル"
                  desc="企業の成長段階。Growth（成長期）、Mature（成熟期）、Decline（衰退期）など。"
                />
                <span className="font-bold text-gray-800">
                  {/* ▼ 修正: 専用辞書を使用 */}
                  {STATE_TRANSLATIONS[analysis?.state ?? ""] || analysis?.state}
                </span>
              </div>

              {/* 2. Expectation */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <InfoLabel
                  label="市場の期待水準"
                  desc="現在の株価に織り込まれている期待の高さ。Overheated（過熱）の場合は、好決算でも株価が下がるリスクがあります。"
                />
                <span className="font-bold text-gray-800">
                  {/* ▼ 修正: 専用辞書を使用 */}
                  {EXPECTATION_TRANSLATIONS[
                    analysis?.expectationStructure ?? ""
                  ] || analysis?.expectationStructure}
                </span>
              </div>

              {/* 3. Risk Level */}
              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  analysis?.riskLevel === "Critical"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : analysis?.riskLevel === "High"
                      ? "bg-orange-50 border-orange-200 text-orange-700" // Highならオレンジ
                      : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                <InfoLabel
                  label="総合リスク判定"
                  desc="財務健全性、収益性、期待値の偏りなどを総合的に判断したリスクレベル。"
                />
                <div className="text-right">
                  <span className="font-black block text-lg">
                    {/* ▼ 修正: 専用辞書を使用 (これで「高い」と出るはず) */}
                    {RISK_LEVEL_TRANSLATIONS[analysis?.riskLevel ?? ""] ||
                      analysis?.riskLevel}
                  </span>
                  {analysis?.riskDetails && (
                    <span className="text-[11px] opacity-90 block font-bold mt-1">
                      {translateRiskDetails(analysis.riskDetails)}
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

      {/* Modal */}
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
