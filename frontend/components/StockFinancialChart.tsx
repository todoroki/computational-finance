"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// GraphQLから来るデータ型に合わせます
type FinancialData = {
  fiscalYear: number;
  quarter: number; // ★追加
  revenue?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null; // ★追加
  operatingCf?: number | null;
  totalEquity?: number | null;
};

type Props = {
  data: FinancialData[];
};

export default function StockFinancialChart({ data }: Props) {
  // 1. データを表示用に加工 (X軸のラベルを作る & 並び替え)
  // 直近20件くらいに絞ると見やすい
  const chartData = [...data]
    .sort((a, b) => {
      // 年度 -> 四半期の順でソート
      if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
      return a.quarter - b.quarter;
    })
    .slice(-24) // 直近6年分くらい (4 * 6)
    .map((d) => ({
      ...d,
      // X軸の表示名を作る (例: "2024 Q1")
      name: `${d.fiscalYear} Q${d.quarter}`,
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
        データがありません
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />

          {/* X軸: 年度+四半期 */}
          <XAxis
            dataKey="name"
            scale="band"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            interval="preserveStartEnd" // ラベルが重ならないように間引く
          />

          {/* Y軸(左): 売上高 */}
          <YAxis
            yAxisId="left"
            orientation="left"
            tickFormatter={(value) =>
              `${(value / 100000000).toLocaleString()}億`
            }
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            width={70}
            axisLine={false}
            tickLine={false}
          />

          {/* Y軸(右): 利益系 */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) =>
              `${(value / 100000000).toLocaleString()}億`
            }
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            width={70}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined
                ? `${(value / 100000000).toLocaleString()}億円`
                : ""
            }
            labelStyle={{ color: "#111827", fontWeight: "bold" }}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "10px" }} />

          {/* 左軸: 売上高 (棒グラフ) */}
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="売上高"
            barSize={20}
            fill="#93c5fd" // 薄い青
            radius={[4, 4, 0, 0]}
          />

          {/* 右軸: 営業利益 (実線・赤) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="operatingIncome"
            name="営業利益"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 3, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
          />

          {/* 右軸: 純利益 (点線・緑) ★追加 */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="netIncome"
            name="純利益"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="4 4" // 点線にする
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
