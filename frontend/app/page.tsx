// frontend/app/page.tsx
import { fetchGraphQL } from "@/lib/graphql";
// ▼ 自動生成されたクエリ定義（ドキュメント）をインポート！
import { GetStocksDocument, isStockType } from "@/lib/gql/graphql";

// ❌ もう手動の型定義（type Stock = ...）は不要です！全部削除！

export default async function Home() {
  // ▼ GetStocksDocument を渡すと、戻り値の型は自動的に GetStocksQuery になります
  const data = await fetchGraphQL(GetStocksDocument);
  const stocks = data.stocks;

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="prose mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          📈 Computational Finance
        </h1>
        <p className="font-bold text-gray-500">
          機関投資家級の「時系列分析」を、個人投資家の手に。
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {stocks.map((stock) => {
          if (!isStockType(stock)) return null;
          // stock は自動生成された型なので、.analysisResults などが補完されるはずです
          const analysis = stock.analysisResults[0];

          // GraphQLの配列は「nullかも」という型になることがあるので、?? [] で安全にするのが作法
          const financials = stock.financials ?? [];

          // 古い順にソート
          const sortedFinancials = [...financials].sort(
            (a, b) => a.fiscalYear - b.fiscalYear
          );

          const maxRevenue = Math.max(
            ...sortedFinancials.map((f) => f.revenue ?? 0)
          );

          return (
            <div
              key={stock.code}
              className="card bg-base-100 shadow-xl border-l-4 border-primary"
            >
              <div className="card-body">
                {/* ヘッダー */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="card-title text-2xl">
                      {stock.name}
                      <span className="badge badge-ghost text-xs font-mono">
                        {stock.code}
                      </span>
                    </h2>
                    <p className="text-sm text-gray-500">{stock.sector}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold font-mono">
                      ¥{analysis?.stockPrice?.toLocaleString() ?? "---"}
                    </div>
                    {analysis?.isGoodBuy && (
                      <div className="badge badge-success gap-2 text-white font-bold">
                        BUY SIGNAL
                      </div>
                    )}
                  </div>
                </div>

                {/* 指標エリア */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* F-Score */}
                  <div className="stats shadow bg-base-200">
                    <div className="stat place-items-center p-2">
                      <div className="stat-title text-xs">
                        Piotroski F-Score
                      </div>
                      <div
                        className={`stat-value text-2xl ${
                          (analysis?.fScore ?? 0) >= 7
                            ? "text-success"
                            : (analysis?.fScore ?? 0) <= 3
                            ? "text-error"
                            : "text-warning"
                        }`}
                      >
                        {analysis?.fScore ?? "-"}
                        <span className="text-sm text-gray-400">/9</span>
                      </div>
                      <div className="stat-desc text-xs">財務健全性</div>
                    </div>
                  </div>

                  {/* Accruals */}
                  <div className="stats shadow bg-base-200">
                    <div className="stat place-items-center p-2">
                      <div className="stat-title text-xs">Accruals Ratio</div>
                      <div
                        className={`stat-value text-xl ${
                          (analysis?.accrualsRatio ?? 0) < 0
                            ? "text-success"
                            : "text-error"
                        }`}
                      >
                        {analysis?.accrualsRatio?.toFixed(2) ?? "-"}
                      </div>
                      <div className="stat-desc text-xs">利益の質 (低=良)</div>
                    </div>
                  </div>

                  {/* AIコメント */}
                  <div className="col-span-1 bg-base-200 rounded-xl p-3 text-xs flex items-center">
                    <p>{analysis?.aiSummary || "分析データ待ち"}</p>
                  </div>
                </div>

                {/* 売上推移バーチャート */}
                <div>
                  <h3 className="text-sm font-bold mb-2 opacity-70">
                    過去5年の売上推移 (Trend)
                  </h3>
                  <div className="space-y-2">
                    {sortedFinancials.map((f) => (
                      <div
                        key={f.fiscalYear}
                        className="flex items-center text-xs"
                      >
                        <span className="w-12 font-mono opacity-50">
                          {f.fiscalYear}
                        </span>
                        <div className="flex-1 h-4 bg-base-200 rounded overflow-hidden relative">
                          <div
                            className="h-full bg-primary opacity-80"
                            style={{
                              width: `${
                                ((f.revenue ?? 0) / maxRevenue) * 100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="w-20 text-right font-mono">
                          {((f.revenue ?? 0) / 100000000).toLocaleString()}億円
                        </span>
                      </div>
                    ))}
                    {sortedFinancials.length === 0 && (
                      <p className="text-xs text-gray-400">データなし</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
