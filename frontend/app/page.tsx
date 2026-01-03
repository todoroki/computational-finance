import { fetchGraphQL } from "@/lib/graphql";

// ▼ クエリ: 最新のスコアと、過去の財務推移を取得
const GET_STOCKS_QUERY = `
  query {
    stocks {
      code
      name
      sector
      # 分析結果（最新の1件だけ）
      analysisResults {
        fScore
        accrualsRatio
        aiSummary
        isGoodBuy
        stockPrice
      }
      # 過去の財務データ（時系列）
      financials {
        fiscalYear
        revenue
        netIncome
        operatingCf
      }
    }
  }
`;

type Financial = {
  fiscalYear: number;
  revenue: number;
  netIncome: number;
  operatingCf: number;
};

type Analysis = {
  fScore: number;
  accrualsRatio: number;
  aiSummary: string;
  isGoodBuy: boolean;
  stockPrice: number;
};

type Stock = {
  code: string;
  name: string;
  sector: string;
  financials: Financial[];
  analysisResults: Analysis[];
};

export default async function Home() {
  let stocks: Stock[] = [];
  try {
    const data = await fetchGraphQL(GET_STOCKS_QUERY);
    stocks = data.stocks;
  } catch (error) {
    console.error("データ取得エラー:", error);
  }

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
          const analysis = stock.analysisResults[0];
          // 年度順にソート
          const sortedFinancials = [...stock.financials].sort(
            (a, b) => a.fiscalYear - b.fiscalYear
          );
          // グラフの最大値計算
          const maxRevenue = Math.max(
            ...sortedFinancials.map((f) => f.revenue)
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
                              width: `${(f.revenue / maxRevenue) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="w-20 text-right font-mono">
                          {(f.revenue / 100000000).toLocaleString()}億円
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
