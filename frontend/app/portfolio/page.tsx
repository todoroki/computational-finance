"use client";

import { useQuery } from "@apollo/client/react"; // 修正: react配下からimport
import Link from "next/link";
import { GetMyPortfolioDocument, GetMyPortfolioQuery } from "@/lib/gql/graphql";

// --- Type Definitions ---

// バックエンド(portfolio_analytics.py)の出力構造に合わせた型定義
interface Narrative {
  key: string;
  label: string;
  dependency_score: number;
  description: string;
  risk_scenario: string;
}

// GraphQLの自動生成型からポートフォリオ明細の型を抽出
// (ネストが深いため、Utility Typeを使って取り出します)
type PortfolioData = NonNullable<GetMyPortfolioQuery["myPortfolio"]>;
type PortfolioItem = NonNullable<PortfolioData["items"]>[number];

// --- Components ---

// 1. Narrative Dependency Visualizer
const NarrativeCard = ({ narrative }: { narrative: Narrative }) => {
  const score = narrative.dependency_score;
  let colorClass = "bg-gray-100 text-gray-600";
  let barColor = "bg-gray-400";
  let alertLevel = "Safe";

  if (score >= 50) {
    colorClass = "bg-red-50 text-red-700 border-red-200";
    barColor = "bg-red-500";
    alertLevel = "Critical";
  } else if (score >= 30) {
    colorClass = "bg-orange-50 text-orange-700 border-orange-200";
    barColor = "bg-orange-500";
    alertLevel = "Warning";
  } else if (score >= 10) {
    colorClass = "bg-blue-50 text-blue-700 border-blue-200";
    barColor = "bg-blue-500";
    alertLevel = "Moderate";
  }

  return (
    <div className={`p-4 rounded-xl border ${colorClass} mb-3`}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-sm flex items-center gap-2">
          {narrative.label}
          {alertLevel === "Critical" && (
            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
              DANGER
            </span>
          )}
        </h4>
        <span className="font-mono font-bold text-lg">{score.toFixed(0)}%</span>
      </div>

      <p className="text-xs opacity-80 mb-3">{narrative.description}</p>

      <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>

      {score >= 30 && (
        <div className="mt-3 text-xs font-bold flex items-start gap-1">
          <span>⚠️ 崩壊シナリオ:</span>
          <span>{narrative.risk_scenario}</span>
        </div>
      )}
    </div>
  );
};

// 2. Portfolio Item Row
const PortfolioItemRow = ({ item }: { item: PortfolioItem }) => {
  const stock = item.stock;
  const pl = item.profitLoss ?? 0;
  const plColor = pl >= 0 ? "text-green-600" : "text-red-500";
  const plSign = pl >= 0 ? "+" : "";

  // Optional chainingで安全にアクセス
  const analysis = stock.analysisResults?.[0];
  const status = analysis?.status;

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {/* ステータスバー */}
        <div
          className={`w-2 h-10 rounded-full ${
            status === "Strong Buy"
              ? "bg-red-500"
              : status === "Avoid"
                ? "bg-gray-800"
                : "bg-gray-200"
          }`}
        ></div>

        <div>
          <Link
            href={`/stocks/${stock.code}`}
            className="font-bold text-gray-900 hover:text-blue-600 block"
          >
            {stock.japaneseName || stock.name}
          </Link>
          <div className="text-xs text-gray-400 font-mono">
            {stock.code} • {Number(item.quantity).toLocaleString()}株 @ ¥
            {Number(item.averagePrice).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono font-bold text-gray-800">
          ¥{item.currentValue?.toLocaleString() ?? "-"}
        </div>
        <div className={`text-xs font-mono font-bold ${plColor}`}>
          {plSign}¥{pl.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function PortfolioPage() {
  const OWNER_ID = "guest";

  // ジェネリクス <GetMyPortfolioQuery> を指定しなくても、Documentから型推論されますが、
  // 戻り値の型安全性を担保するためにDocumentを使用します。
  const { data, loading, error } = useQuery(GetMyPortfolioDocument, {
    variables: { ownerId: OWNER_ID },
    fetchPolicy: "cache-and-network",
  });

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-400">
        Loading OS...
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex justify-center items-center text-red-500">
        Error: {error.message}
      </div>
    );

  const pf = data?.myPortfolio;
  const analysis = pf?.analysis;

  // JSON型(Scalar)はTypeScript上ではunknownやanyになりがちなので、
  // ここで明示的に型アサーションを行って「正体」を教えます。
  const narratives =
    (analysis?.narrativeAnalysis as unknown as Narrative[]) || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tighter text-gray-800">
            ASSET<span className="text-blue-600">OS</span>
          </h1>
          <Link
            href="/"
            className="text-sm font-bold text-gray-500 hover:text-gray-900"
          >
            銘柄検索へ →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* 1. Health Score Hero */}
        <div className="bg-gray-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div
            className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30 -mr-20 -mt-20 ${
              (analysis?.healthScore || 0) < 50
                ? "bg-red-600"
                : (analysis?.healthScore || 0) < 70
                  ? "bg-yellow-500"
                  : "bg-blue-500"
            }`}
          ></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left flex-1">
              <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">
                Portfolio Health
              </div>
              <div className="text-6xl font-black tracking-tighter flex items-baseline gap-2 justify-center md:justify-start">
                {analysis?.healthScore ?? "-"}
                <span className="text-xl text-gray-500 font-normal">/100</span>
              </div>
              <p className="mt-4 text-gray-300 font-medium leading-relaxed max-w-lg">
                {analysis?.diagnosisSummary ||
                  "診断データがありません。銘柄を追加してください。"}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[200px] text-center border border-white/10">
              <div className="text-xs text-gray-400 uppercase mb-1">
                Total Assets
              </div>
              <div className="text-2xl font-mono font-bold">
                ¥{analysis?.totalValue?.toLocaleString() ?? "0"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 2. Narrative Dependency */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              🌍 Worldview Risk
              <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                NDI Analysis
              </span>
            </h3>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
              <p className="text-xs text-gray-400 mb-4">
                あなたの資産が「どの未来」に賭けているかを可視化します。特定のシナリオへの依存度が50%を超えると危険です。
              </p>

              {narratives.length > 0 ? (
                narratives.map((n) => (
                  <NarrativeCard key={n.key} narrative={n} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  データ不足
                </div>
              )}
            </div>
          </div>

          {/* 3. Holdings List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Holdings
              </h3>
              <button className="text-xs font-bold text-blue-600 hover:underline">
                + 銘柄を追加・編集
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {pf?.items && pf.items.length > 0 ? (
                pf.items.map((item) => (
                  <PortfolioItemRow key={item.stock.code} item={item} />
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="font-bold text-gray-700">
                    ポートフォリオは空です
                  </h3>
                  <p className="text-sm text-gray-500 mt-2 mb-6">
                    まだ銘柄が登録されていません。
                    <br />
                    APIを使って銘柄を追加するか、デモデータを投入してください。
                  </p>

                  <div className="text-xs bg-gray-100 p-4 rounded text-left font-mono text-gray-600 overflow-x-auto">
                    <p className="mb-2 font-bold">
                      💡 GraphQL Playgroundで以下を実行してデータを追加:
                    </p>
                    <pre className="whitespace-pre-wrap">
                      {`mutation {
  addToPortfolio(ownerId: "guest", stockCode: "7203", quantity: 100, averagePrice: 2000) { id }
}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
