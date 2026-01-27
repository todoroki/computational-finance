import Link from "next/link";
import { fetchGraphQL } from "@/lib/graphql";
import { GetStocksDocument } from "@/lib/gql/graphql";
import type { GetStocksQuery } from "@/lib/gql/graphql";

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

// 🏠 メインページ
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sortBy?: string }>;
}) {
  const { q, status, sortBy } = await searchParams;

  // ソート順の決定: コード順以外は基本的に「降順 (desc)」が見やすいのでそう設定
  const sortOrder = sortBy && sortBy !== "code" ? "desc" : "asc";

  const data = await fetchGraphQL(GetStocksDocument, {
    search: q || null,
    status: status || null,
    sortBy: sortBy || "code",
    sortOrder: sortOrder,
    limit: 100,
  });

  const stocks = data.stocks ?? [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ヘッダーエリア */}
        <div className="text-center space-y-6 py-12">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            Stock{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              X-Ray
            </span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            4,000銘柄の財務諸表を瞬時に透視。
            <br />
            <span className="font-semibold text-slate-700">
              「倒産リスク(Z)」
            </span>
            と
            <span className="font-semibold text-slate-700">「稼ぐ力(GP)」</span>
            で、 負けない投資を。
          </p>

          <div className="flex justify-center pt-4">
            <SearchBar q={q} status={status} sortBy={sortBy} />
          </div>
        </div>

        {/* 結果エリア */}
        <div>
          <div className="flex justify-between items-end mb-6 px-2">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {q || status || (sortBy && sortBy !== "code")
                ? "Search Results"
                : "Market Overview"}
              <span className="text-sm font-normal text-slate-500 bg-white px-3 py-1 rounded-full border shadow-sm">
                {stocks.length} matches
              </span>
            </h2>
          </div>

          {stocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stocks.map((stock) => (
                <StockCard key={stock.code} stock={stock} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-300">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl font-bold text-gray-700">
                No stocks found.
              </p>
              <p className="text-gray-500 mt-2">
                検索条件を変更するか、データを更新してください。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
