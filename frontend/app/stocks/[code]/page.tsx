// frontend/app/stocks/[code]/page.tsx
import { fetchGraphQL } from "@/lib/graphql";
import { GetStockDetailDocument } from "@/lib/gql/graphql";
import StockFinancialChart from "@/components/StockFinancialChart";
import Link from "next/link";

// URLパラメータから code (例: "7203") を受け取る
export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // 詳細データを取得
  const data = await fetchGraphQL(GetStockDetailDocument, { code });
  const stock = data.stock;

  if (!stock) {
    return (
      <div className="p-8 text-error">
        銘柄が見つかりませんでした (Code: {code})
      </div>
    );
  }

  const analysis = stock.analysisResults?.[0];

  return (
    <div className="min-h-screen bg-base-200 p-6 lg:p-10">
      {/* ナビゲーション */}
      <div className="text-sm breadcrumbs mb-4">
        <ul>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>{stock.code}</li>
        </ul>
      </div>

      {/* ヘッダーエリア */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
            {stock.name}
            <span className="badge badge-lg badge-neutral font-mono">
              {stock.code}
            </span>
          </h1>
          <p className="text-gray-500 mt-1">
            {stock.sector} | {stock.market}
          </p>
        </div>

        <div className="stats shadow bg-white">
          <div className="stat">
            <div className="stat-title">株価</div>
            <div className="stat-value font-mono">
              ¥{analysis?.stockPrice?.toLocaleString() ?? "---"}
            </div>
            {analysis?.isGoodBuy && (
              <div className="stat-desc text-success font-bold">Buy Signal</div>
            )}
          </div>
          <div className="stat">
            <div className="stat-title">時価総額</div>
            <div className="stat-desc">
              {analysis?.marketCap
                ? `${(analysis.marketCap / 100000000).toLocaleString()}億円`
                : "-"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム: グラフエリア (2/3幅) */}
        <div className="lg:col-span-2 space-y-6">
          {/* ここにさっき作ったグラフを配置！ */}
          <StockFinancialChart data={stock.financials ?? []} />

          <div className="card bg-base-100 shadow-sm p-6">
            <h3 className="font-bold text-lg mb-2">事業内容</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              {stock.description || "情報なし"}
            </p>
          </div>
        </div>

        {/* 右カラム: 分析スコア (1/3幅) */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl border-t-4 border-primary">
            <div className="card-body">
              <h2 className="card-title text-base opacity-70">
                AI Analysis Summary
              </h2>
              <div className="divider my-0"></div>
              <p className="text-sm leading-6">
                {analysis?.aiSummary || "分析データがまだありません。"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-base-200 rounded-lg text-center">
                  <div className="text-xs text-gray-500">F-Score</div>
                  <div className="text-2xl font-bold">
                    {analysis?.fScore ?? "-"}
                  </div>
                </div>
                <div className="p-3 bg-base-200 rounded-lg text-center">
                  <div className="text-xs text-gray-500">Accruals</div>
                  <div className="text-xl font-bold">
                    {analysis?.accrualsRatio?.toFixed(2) ?? "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
