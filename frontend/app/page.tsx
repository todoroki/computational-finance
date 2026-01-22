import Link from "next/link";
import { fetchGraphQL } from "@/lib/graphql";
import { GetStocksDocument } from "@/lib/gql/graphql";
// ▼ 生成された型をインポート
import type { GetStocksQuery } from "@/lib/gql/graphql";

// ▼ "stocks" 配列の中の「1つの要素」の型を自動抽出
// (手動で interface を書くとメンテが大変になるので、こうするのがベストプラクティスです)
type StockSummary = GetStocksQuery["stocks"][number];

// 検索バーコンポーネント
function SearchBar({ initialQuery }: { initialQuery?: string }) {
  return (
    <form className="join w-full max-w-2xl shadow-sm">
      <input
        name="q"
        className="input input-bordered join-item w-full"
        placeholder="銘柄コード または 企業名で検索 (例: 7203, トヨタ)..."
        defaultValue={initialQuery}
      />
      <select name="status" className="select select-bordered join-item">
        <option value="">全てのステータス</option>
        <option value="Strong Buy">🚀 Strong Buy</option>
        <option value="Watch">🧐 Watch</option>
        <option value="Hold">✋ Hold</option>
        <option value="Sell">⚠️ Sell</option>
      </select>
      <button type="submit" className="btn btn-primary join-item">
        Search
      </button>
    </form>
  );
}

// 銘柄カードコンポーネント
// ▼ ここで any ではなく抽出した型を使う
function StockCard({ stock }: { stock: StockSummary }) {
  const analysis = stock.analysisResults?.[0];
  const price = analysis?.stockPrice?.toLocaleString() ?? "---";

  // ステータスの色分け
  const badgeColor =
    analysis?.status === "Strong Buy"
      ? "badge-primary"
      : analysis?.status === "Sell"
        ? "badge-error"
        : "badge-neutral";

  return (
    <Link
      href={`/stocks/${stock.code}`}
      className="card bg-white shadow-sm hover:shadow-md transition-shadow border border-base-200 group"
    >
      <div className="card-body p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="font-mono text-xs text-gray-400 font-bold">
              {stock.code}
            </span>
            <h3 className="card-title text-lg group-hover:text-primary transition-colors">
              {stock.name}
            </h3>
          </div>
          <div className={`badge ${badgeColor} font-bold whitespace-nowrap`}>
            {analysis?.status ?? "未分析"}
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          {stock.sector} | {stock.market}
        </div>

        {/* ミニスコアボード */}
        {analysis ? (
          <div className="grid grid-cols-3 gap-2 text-center bg-base-100 p-2 rounded-lg">
            <div>
              <div className="text-[10px] text-gray-400 uppercase">Z-Score</div>
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
            <div>
              <div className="text-[10px] text-gray-400 uppercase">
                Gross Prof
              </div>
              <div
                className={`font-bold text-sm ${
                  (analysis.grossProfitability ?? 0) > 0.33
                    ? "text-green-600"
                    : "text-gray-700"
                }`}
              >
                {analysis.grossProfitability
                  ? `${(analysis.grossProfitability * 100).toFixed(0)}%`
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase">
                Exp. Growth
              </div>
              <div
                className={`font-bold text-sm ${
                  (analysis.impliedGrowthRate ?? 0) > 10
                    ? "text-red-500"
                    : "text-green-600"
                }`}
              >
                {analysis.impliedGrowthRate
                  ? `${analysis.impliedGrowthRate.toFixed(1)}%`
                  : "-"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-center py-3 text-gray-400 bg-base-100 rounded-lg">
            データなし
          </div>
        )}

        <div className="mt-4 flex justify-between items-end">
          <div className="text-xs text-gray-400">Current Price</div>
          <div className="text-xl font-mono font-bold">¥{price}</div>
        </div>
      </div>
    </Link>
  );
}

// メインページ
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  // 検索実行
  const data = await fetchGraphQL(GetStocksDocument, {
    search: q || null,
    status: status || null,
  });

  const stocks = data.stocks ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* ヘッダー & 検索エリア */}
        <div className="text-center space-y-6 py-10">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
            Stock <span className="text-primary">X-Ray</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            機関投資家級の分析（Gross Profitability, Z-Score, 逆算DCF）で、
            負けない投資判断を。
          </p>

          <div className="flex justify-center">
            <SearchBar initialQuery={q} />
          </div>
        </div>

        {/* 検索結果エリア */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-700">
              {q || status ? "Search Results" : "All Stocks"}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({stocks.length} matches)
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
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">
                条件に一致する銘柄が見つかりませんでした。
              </p>
              <p className="text-sm mt-2">
                別のキーワードを試すか、データを取得してください。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
