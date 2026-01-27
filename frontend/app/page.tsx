"use client";

import Link from "next/link";
import { fetchGraphQL } from "@/lib/graphql";
import { GetStocksDocument } from "@/lib/gql/graphql";
import type { GetStocksQuery } from "@/lib/gql/graphql";
import { useState } from "react";
// import { useGetStocksQuery } from "@/types/generated/graphql";
import { useQuery } from "@apollo/client/react";
type StockSummary = GetStocksQuery["stocks"][number];

// 🔍 検索バー & フィルタ & ソート
function SearchBar({
  q,
  status,
  sortBy,
}: {
  q?: string;
  status?: string;
  sortBy?: string;
}) {
  return (
    <form className="join w-full max-w-4xl shadow-sm">
      {/* 1. キーワード検索 */}
      <input
        name="q"
        className="input input-bordered join-item w-full"
        placeholder="銘柄コード または 企業名..."
        defaultValue={q}
      />

      {/* 2. ステータスフィルタ */}
      <select
        name="status"
        className="select select-bordered join-item min-w-[140px]"
        defaultValue={status || ""}
      >
        <option value="">Status: All</option>
        <option value="Strong Buy">🚀 Strong Buy</option>
        <option value="Buy">💰 Buy</option>
        <option value="Good">👍 Good</option>
        <option value="Watch">🧐 Watch</option>
        <option value="Hold">✋ Hold</option>
        <option value="Sell">⚠️ Sell</option>
      </select>

      {/* 3. ソート順 (ここを追加！) */}
      <select
        name="sortBy"
        className="select select-bordered join-item min-w-[160px]"
        defaultValue={sortBy || "code"}
      >
        <option value="code">順序: コード順</option>
        <option value="status">順序: 推奨度順</option>
        <option value="z_score">順序: 安全性 (Z)</option>
        <option value="gp">順序: 収益性 (GP)</option>
        <option value="f_score">順序: 健全性 (F)</option>
      </select>

      {/* ※ sortOrderはシンプルにするため、今回は自動的に 'desc' (降順) にします */}

      <button type="submit" className="btn btn-primary join-item px-8">
        Search
      </button>
    </form>
  );
}

// 🃏 銘柄カード (変更なし)
function StockCard({ stock }: { stock: StockSummary }) {
  const analysis = stock.analysisResults?.[0];
  const price = analysis?.stockPrice?.toLocaleString() ?? "---";

  const displayName = stock.japaneseName || stock.name;
  const displaySector = stock.japaneseSector || stock.sector;
  const displayMarket = stock.japaneseMarket || stock.market;

  const badgeColor =
    analysis?.status === "Strong Buy"
      ? "badge-error text-white font-bold"
      : analysis?.status === "Buy"
        ? "badge-warning font-bold"
        : analysis?.status === "Buy (Spec)"
          ? "badge-warning border-dashed border-black text-black" // 投機的買い
          : analysis?.status === "Avoid"
            ? "badge-neutral text-gray-400" // 回避
            : analysis?.status === "Sell"
              ? "badge-ghost bg-gray-200"
              : "badge-ghost";
  return (
    <Link
      href={`/stocks/${stock.code}`}
      className="card bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 border border-base-200 group"
    >
      <div className="card-body p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="font-mono text-xs text-gray-400 font-bold block mb-1">
              {stock.code}
            </span>
            <h3 className="card-title text-lg group-hover:text-blue-600 transition-colors leading-tight">
              {displayName}
            </h3>
          </div>
          <div className={`badge ${badgeColor} whitespace-nowrap`}>
            {analysis?.status ?? "N/A"}
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 flex gap-2">
          <span className="bg-gray-100 px-1.5 py-0.5 rounded">
            {displayMarket}
          </span>
          <span className="bg-gray-100 px-1.5 py-0.5 rounded">
            {displaySector}
          </span>
        </div>

        {/* ミニスコアボード */}
        {analysis ? (
          <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-2 rounded-lg border border-gray-100">
            {/* 1. Z-Score */}
            <div>
              <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                Z-Score
              </div>
              <div
                className={`font-bold text-sm ${
                  (analysis.zScore ?? 0) < 1.8
                    ? "text-red-500"
                    : "text-gray-700"
                }`}
              >
                {analysis.zScore?.toFixed(2) ?? "-"}
              </div>
            </div>

            {/* 2. Gross Profitability */}
            <div>
              <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                Gross P
              </div>
              <div
                className={`font-bold text-sm ${
                  (analysis.grossProfitability ?? 0) > 0.4
                    ? "text-blue-600"
                    : "text-gray-700"
                }`}
              >
                {analysis.grossProfitability
                  ? `${(analysis.grossProfitability * 100).toFixed(0)}%`
                  : "-"}
              </div>
            </div>

            {/* 3. Growth (FCF優先、なければRevenue) */}
            <div>
              {analysis.impliedGrowthRate != null ? (
                // FCFベースがある場合
                <>
                  <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                    FCF Grw
                  </div>
                  <div
                    className={`font-bold text-sm ${
                      analysis.impliedGrowthRate > 10
                        ? "text-red-500"
                        : "text-green-600"
                    }`}
                  >
                    {analysis.impliedGrowthRate.toFixed(1)}%
                  </div>
                </>
              ) : analysis.impliedRevenueGrowth != null ? (
                // FCFはないが、売上ベースがある場合 (ここが進化！)
                <>
                  <div className="text-[9px] text-blue-400 uppercase font-bold tracking-wider">
                    Rev Grw
                  </div>
                  <div
                    className={`font-bold text-sm ${
                      analysis.impliedRevenueGrowth > 30
                        ? "text-red-500"
                        : "text-blue-600"
                    }`}
                  >
                    {analysis.impliedRevenueGrowth.toFixed(1)}%
                  </div>
                </>
              ) : (
                // 両方ない場合
                <>
                  <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                    Growth
                  </div>
                  <div className="font-bold text-sm text-gray-400">-</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-center py-3 text-gray-400 bg-gray-50 rounded-lg">
            データなし
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-end">
          <div className="text-xs text-gray-400">株価</div>
          <div className="text-xl font-mono font-bold tracking-tight">
            ¥{price}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [rankingMode, setRankingMode] = useState<string>("gap_opportunities");
  const [searchTerm, setSearchTerm] = useState("");

  // ▼ 変更点3: useQuery を使用してデータを取得
  // Documentを渡すことで、戻り値(data)の型推論が効きます
  const { data, loading, error } = useQuery(GetStocksDocument, {
    variables: {
      search: searchTerm || null,
      rankingMode: rankingMode,
      limit: 20,
    },
    pollInterval: 0,
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1
            className="text-xl font-black tracking-tighter text-gray-800 flex items-center gap-1 cursor-pointer"
            onClick={() => window.location.reload()}
          >
            STOCK<span className="text-blue-600">X-RAY</span>
          </h1>

          {/* Simple Search Input */}
          <input
            type="text"
            placeholder="Search code or name..."
            className="bg-gray-100 border-none rounded-full px-4 py-1.5 text-sm w-48 focus:w-64 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // 検索文字が入ったらランキングモードを解除(検索優先)
              if (e.target.value) setRankingMode("");
              // 空になったらデフォルトランキングに戻すならここを調整
            }}
          />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        {/* Intro */}
        {!searchTerm && (
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
              市場の<span className="text-blue-600">歪み</span>を見つける
            </h2>
            <p className="text-slate-500 text-sm">
              AIが4,000銘柄の「期待」と「現実」のギャップを分析しました。
            </p>
          </div>
        )}

        {/* ▼▼▼ Market Radar Tabs (ここがランキング切り替え) ▼▼▼ */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex flex-nowrap md:flex-wrap gap-2 justify-center min-w-max md:min-w-0 px-2">
            {/* 1. 💎 Asymmetric Bets */}
            <button
              onClick={() => {
                setRankingMode("gap_opportunities");
                setSearchTerm("");
              }}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm border whitespace-nowrap ${
                rankingMode === "gap_opportunities"
                  ? "bg-green-600 text-white border-green-600 ring-2 ring-green-200 ring-offset-1"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              💎 割安放置 (Gap &lt; 0)
            </button>

            {/* 2. 🚀 Single Engine */}
            <button
              onClick={() => {
                setRankingMode("single_engine");
                setSearchTerm("");
              }}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm border whitespace-nowrap ${
                rankingMode === "single_engine"
                  ? "bg-purple-600 text-white border-purple-600 ring-2 ring-purple-200 ring-offset-1"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              🚀 片肺飛行 (夢株)
            </button>

            {/* 3. 🔥 Overheated */}
            <button
              onClick={() => {
                setRankingMode("gap_overheated");
                setSearchTerm("");
              }}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm border whitespace-nowrap ${
                rankingMode === "gap_overheated"
                  ? "bg-red-500 text-white border-red-500 ring-2 ring-red-200 ring-offset-1"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-700"
              }`}
            >
              🔥 過熱気味 (Gap &gt; 0)
            </button>
          </div>

          {/* モードの説明文 */}
          <div className="mt-4 text-xs text-slate-500 bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-w-2xl mx-auto text-center">
            {rankingMode === "gap_opportunities" && (
              <span>
                <strong className="text-green-600 block mb-1 text-sm">
                  【Asymmetric Bet Finder】
                </strong>
                市場の期待値(Implied)が、実績成長率(Actual)より著しく低い「お宝候補」です。
                <br />
                実力があるのに評価されていない銘柄が見つかります。
              </span>
            )}
            {rankingMode === "gap_overheated" && (
              <span>
                <strong className="text-red-500 block mb-1 text-sm">
                  【Overheated Zone】
                </strong>
                市場の期待値が、実績を大きく上回っている銘柄です。
                <br />
                決算ミス時の暴落リスクが高いため、保有には注意が必要です。
              </span>
            )}
            {rankingMode === "single_engine" && (
              <span>
                <strong className="text-purple-600 block mb-1 text-sm">
                  【Single Engine Flyers】
                </strong>
                現金(FCF)を生み出せていないが、高い売上成長期待だけで株価が支えられている銘柄です。
                <br />
                ハイリスク・ハイリターンな「夢株」たちです。
              </span>
            )}
            {!rankingMode && "検索結果を表示中"}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-10 text-red-500 bg-red-50 rounded-lg">
            Error: {error.message}
          </div>
        )}

        {/* Empty */}
        {!loading && data?.stocks.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">
              該当する銘柄が見つかりませんでした。
            </p>
            <p className="text-xs text-gray-400 mt-1">
              まだ分析データが揃っていない可能性があります。
            </p>
          </div>
        )}

        {/* Stock List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.stocks?.map((stock: StockSummary) => (
            <StockCard key={stock.code} stock={stock} />
          ))}
        </div>
      </main>
    </div>
  );
}
