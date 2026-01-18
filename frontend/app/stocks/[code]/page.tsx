// frontend/app/stocks/[code]/page.tsx
import { fetchGraphQL } from "@/lib/graphql";
import { GetStockDetailDocument } from "@/lib/gql/graphql";
import StockFinancialChart from "@/components/StockFinancialChart";
import AnalysisDashboard from "@/components/AnalysisDashboard"; // 追加
import Link from "next/link";

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

  // 最新の分析結果を取得
  const analysis = stock.analysisResults?.[0];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      {/* ナビゲーション */}
      <div className="text-sm breadcrumbs mb-4 text-gray-500">
        <ul>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>{stock.code}</li>
        </ul>
      </div>

      {/* ヘッダーエリア (タイトルのみ) */}
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
          {stock.name}
          <span className="text-xl font-normal text-gray-500 tracking-widest font-mono">
            {stock.code}
          </span>
        </h1>
        <p className="text-gray-500 mt-1">
          {stock.sector} | {stock.market}
        </p>
      </div>

      {/* ▼▼▼ メインダッシュボード (ここが新機能！) ▼▼▼ */}
      {/* 以前の statコンポーネント や 右カラムのスコア表示を、このDashboardに集約します */}
      {analysis ? (
        <div className="mb-10">
          <AnalysisDashboard analysis={analysis} />
        </div>
      ) : (
        <div className="alert alert-warning mb-10 shadow-sm">
          <span>
            分析データがまだありません。 (fetch_dataを実行してください)
          </span>
        </div>
      )}

      {/* 下段: チャート & 企業概要 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左: 財務チャート */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-700">
              財務推移 (Financials)
            </h3>
            {/* Backendで net_assets -> totalEquity に名前が変わりましたが、
                GraphQLのクエリで totalEquity を取得しているので、
                そのまま渡せば中身が入っています。
                (ただし、StockFinancialChart側で netAssets を参照している場合は修正が必要)
             */}
            <StockFinancialChart data={stock.financials ?? []} />
          </div>
        </div>

        {/* 右: 企業概要 */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-700">企業概要</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {stock.description || "情報がありません。"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
