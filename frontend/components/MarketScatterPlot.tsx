"use client";

import { GetStocksQuery } from "@/lib/gql/graphql";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";

type StockItem = NonNullable<GetStocksQuery["stocks"]>[number];

type Props = {
  stocks: StockItem[];
};

// ▼▼▼ 修正: コンポーネントの「外」に移動させました ▼▼▼
type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: {
      code: string;
      name: string;
      quality: number;
      valuation: number;
      score: number;
      status?: string;
    };
  }>;
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-gray-200 min-w-[200px]">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="font-bold text-gray-900 leading-tight">
              {data.name}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              {data.code}
            </div>
          </div>
          <div
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              data.score >= 80
                ? "bg-indigo-100 text-indigo-700"
                : data.score >= 50
                  ? "bg-gray-100 text-gray-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            Score: {data.score?.toFixed(0) || "---"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div className="bg-gray-50 p-1.5 rounded">
            <span className="block text-[9px] text-gray-400 uppercase">
              Quality
            </span>
            <span className="font-bold text-blue-600">
              上位 {(100 - data.quality).toFixed(1)}%
            </span>
          </div>
          <div className="bg-gray-50 p-1.5 rounded">
            <span className="block text-[9px] text-gray-400 uppercase">
              Valuation
            </span>
            <span className="font-bold text-emerald-600">
              上位 {data.valuation.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-center text-gray-400">
          Click to view details
        </div>
      </div>
    );
  }
  return null;
};
// ▲▲▲ 移動ここまで ▲▲▲

type ChartDataPoint = {
  code: string;
  name: string;
  quality: number;
  valuation: number;
  score: number;
  status?: string;
};

export default function MarketScatterPlot({ stocks }: Props) {
  const router = useRouter();

  // ▼ 2. mapとfilterの代わりに flatMap を使う（これで any が消滅します！）
  const chartData: ChartDataPoint[] = stocks.flatMap((stock) => {
    const analysis = stock.analysisResults?.[0];

    // データ不足の場合は「空の配列」を返す（flatMapによって結果から完全に消えます）
    if (
      !analysis ||
      analysis.roePercentile == null ||
      analysis.perSectorPercentile == null
    ) {
      return [];
    }

    // 条件を満たした場合は、要素を1つだけ持つ配列として返す
    return [
      {
        code: stock.code,
        name: stock.japaneseName || stock.name || "Unknown",
        quality: 100 - analysis.roePercentile,
        valuation: analysis.perSectorPercentile,
        score: analysis.healthScore ?? 0, // nullの場合は0点とする
        status: analysis.status,
      },
    ];
  });

  return (
    <div className="w-full h-[500px] bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative">
      {/* 象限のラベル */}
      <div className="absolute top-4 left-4 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
        👑 神株 (高品質・割安)
      </div>
      <div className="absolute bottom-4 left-4 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
        🏚️ バリュートラップ (低品質・割安)
      </div>
      <div className="absolute top-4 right-4 text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
        🎈 過熱気味 (高品質・割高)
      </div>
      <div className="absolute bottom-4 right-4 text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
        🗑️ 劣後株 (低品質・割高)
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          <XAxis
            type="number"
            dataKey="valuation"
            name="Valuation"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            label={{
              value: "← 割安 (Valuation) 割高 →",
              position: "bottom",
              fontSize: 12,
              fill: "#6b7280",
              fontWeight: "bold",
            }}
          />

          <YAxis
            type="number"
            dataKey="quality"
            name="Quality"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            label={{
              value: "高品質 (Quality) →",
              angle: -90,
              position: "left",
              fontSize: 12,
              fill: "#6b7280",
              fontWeight: "bold",
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: "3 3" }}
          />

          <Scatter
            name="Stocks"
            data={chartData}
            onClick={(data) => router.push(`/stocks/${data.code}`)} // クリックで詳細へ遷移！
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            {chartData.map((entry, index) => {
              // スコアに応じてドットの色を変える
              const color =
                entry.score >= 80
                  ? "#4f46e5" // Indigo
                  : entry.score >= 50
                    ? "#9ca3af" // Gray
                    : "#ef4444"; // Red
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
