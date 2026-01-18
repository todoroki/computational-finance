// frontend/components/StockFinancialChart.tsx
"use client"; // 必須：これはブラウザで動くコンポーネント

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

type FinancialData = {
  fiscalYear: number;
  revenue?: number | null;
  operatingIncome?: number | null;
  operatingCf?: number | null;
  // netAssets?: number | null;  <-- これは削除または変更
  totalEquity?: number | null; // <-- これを追加！
};
type Props = {
  data: FinancialData[];
};

export default function StockFinancialChart({ data }: Props) {
  // データを年度の古い順に並べ替え（念のため）
  const sortedData = [...data].sort((a, b) => a.fiscalYear - b.fiscalYear);

  return (
    <div className="w-full h-[400px] bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
      <h3 className="text-lg font-bold mb-4 text-gray-700">業績推移 (PL)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />

          {/* X軸: 年度 */}
          <XAxis dataKey="fiscalYear" scale="band" tick={{ fontSize: 12 }} />

          {/* Y軸(左): 売上高 */}
          <YAxis
            yAxisId="left"
            orientation="left"
            tickFormatter={(value) =>
              `${(value / 100000000).toLocaleString()}億`
            }
            tick={{ fontSize: 11 }}
            width={80}
          />

          {/* Y軸(右): 営業利益 */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) =>
              `${(value / 100000000).toLocaleString()}億`
            }
            tick={{ fontSize: 11 }}
          />

          <Tooltip
            formatter={(value: number | string | undefined) => {
              if (typeof value !== "number") return "---";
              return `${(value / 100000000).toLocaleString()}億円`;
            }}
            labelStyle={{ color: "#333" }}
          />
          <Legend />

          {/* グラフ本体 */}
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="売上高"
            barSize={40}
            fill="#3b82f6" // 青
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="operatingIncome"
            name="営業利益"
            stroke="#ef4444" // 赤
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
