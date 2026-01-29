"use client";

import Link from "next/link";
import { fetchGraphQL } from "@/lib/graphql";
import { GetStocksDocument } from "@/lib/gql/graphql";
import type { GetStocksQuery } from "@/lib/gql/graphql";
import { useEffect, useState } from "react";
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
  // --- State管理 ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // 検索負荷軽減用

  const [rankingMode, setRankingMode] = useState<string>("strong_buy"); // デフォルトはAI推奨
  const [offset, setOffset] = useState(0); // ページネーション用
  const LIMIT = 24; // 1ページあたりの表示数

  // 検索デバウンス処理 (入力して0.5秒待ってから検索)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setOffset(0); // 検索条件が変わったら1ページ目に戻す
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // モード切り替え時もページリセット
  const handleTabChange = (mode: string) => {
    setRankingMode(mode);
    setSearchTerm(""); // タブ変えたら検索クリア（お好みで）
    setOffset(0);
  };

  // GraphQL実行
  const { data, loading, error, fetchMore } = useQuery(GetStocksDocument, {
    variables: {
      search: debouncedSearch || null,
      rankingMode: rankingMode === "normal" ? null : rankingMode, // normalならモードなし
      limit: LIMIT,
      offset: offset,
    },
    // 毎回ネットワークに見に行く（キャッシュ表示バグ防止）
    fetchPolicy: "cache-and-network",
  });

  // ページネーションハンドラ
  const handleNextPage = () => {
    setOffset((prev) => prev + LIMIT);
    window.scrollTo({ top: 0, behavior: "smooth" }); // 上に戻る
  };
  const handlePrevPage = () => {
    setOffset((prev) => Math.max(0, prev - LIMIT));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header & Search */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <h1
            className="text-xl font-black tracking-tighter text-gray-800 flex items-center gap-1 cursor-pointer min-w-fit"
            onClick={() => window.location.reload()}
          >
            STOCK<span className="text-blue-600">MRI</span>
          </h1>

          {/* 🔍 検索バー (日本語対応・リアルタイム) */}
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="コード・企業名で検索 (例: トヨタ)"
              className="w-full bg-gray-100 border border-transparent focus:bg-white focus:border-blue-500 rounded-full px-5 py-2 text-sm transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* 検索中インジケータ */}
            {searchTerm !== debouncedSearch && (
              <div className="absolute right-4 top-2.5">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {/* ▼▼▼ タブ切り替え & ソートエリア ▼▼▼ */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4 border-b border-gray-200 pb-4">
          {/* 左側: ランキングタブ */}
          <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 w-full md:w-auto no-scrollbar">
            {/* 1. 🤖 AI Best (New!) */}
            <button
              onClick={() => handleTabChange("strong_buy")}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                rankingMode === "strong_buy"
                  ? "bg-gray-800 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              🤖 AI推奨 (Strong Buy)
            </button>

            {/* 2. 💎 割安放置 */}
            <button
              onClick={() => handleTabChange("gap_opportunities")}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                rankingMode === "gap_opportunities"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-green-50"
              }`}
            >
              💎 割安放置 (Value)
            </button>

            {/* 3. 🚀 夢株 */}
            <button
              onClick={() => handleTabChange("single_engine")}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                rankingMode === "single_engine"
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-purple-50"
              }`}
            >
              🚀 夢株 (Growth)
            </button>

            {/* 4. 全一覧 (検索用) */}
            <button
              onClick={() => handleTabChange("normal")}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                rankingMode === "normal"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-blue-50"
              }`}
            >
              📋 全銘柄
            </button>
          </div>

          {/* 右側: ページネーション情報 (簡易) */}
          <div className="text-xs text-gray-500 font-mono">
            Page {Math.floor(offset / LIMIT) + 1}
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="text-gray-400 text-sm">Analyzing market data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
            Error loading stocks: {error.message}
          </div>
        )}

        {/* Empty State */}
        {!loading && data?.stocks.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-4xl mb-2">🤔</div>
            <p className="text-gray-600 font-bold">No stocks found.</p>
            <p className="text-xs text-gray-400 mt-1">
              検索条件を変えるか、データ更新を待ってください。
            </p>
          </div>
        )}

        {/* Stock Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.stocks.map((stock: StockSummary) => (
            <StockCard key={stock.code} stock={stock} />
          ))}
        </div>

        {/* Pagination Buttons */}
        <div className="flex justify-center gap-4 mt-12 mb-20">
          <button
            onClick={handlePrevPage}
            disabled={offset === 0}
            className="px-6 py-2 rounded-full bg-white border border-gray-300 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-bold text-sm"
          >
            ← Prev
          </button>
          <button
            onClick={handleNextPage}
            // データがLIMIT未満なら次のページはないと判断
            disabled={(data?.stocks.length ?? 0) < LIMIT}
            className="px-6 py-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </main>
    </div>
  );
}
