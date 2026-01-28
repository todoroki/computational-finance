"use client";
import React, { memo } from "react";

function TradingViewWidget({ code }: { code: string }) {
  // Stooqのチャート画像 (1年分, ローソク足)
  const chartUrl = `https://stooq.com/c/?s=${code}.jp&c=1y&t=c&a=ln&b=0`;

  // TradingViewの本家チャートURL (TSE:コード)
  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=TSE:${code}`;

  return (
    <div className="w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Stock Chart (1 Year)
        </h3>
        <span className="text-[10px] text-gray-400">
          Click chart to analyze on TradingView
        </span>
      </div>

      {/* 画像をクリックするとTradingViewへ飛ぶ */}
      <a
        href={tradingViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative group cursor-pointer bg-gray-50 rounded-lg p-2 hover:ring-2 hover:ring-blue-100 transition-all"
      >
        {/* ホバー時に出る「TradingViewで見る」オーバーレイ */}
        <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/5 transition-colors duration-200 rounded-lg flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 bg-white/90 text-blue-700 px-4 py-2 rounded-full text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 flex items-center gap-1">
            TradingViewで詳細を見る ↗
          </div>
        </div>

        <img
          src={chartUrl}
          alt={`${code} Chart`}
          className="w-full h-auto object-contain mix-blend-multiply"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement!.innerHTML =
              '<div class="text-sm text-gray-400 py-10 text-center">Chart not available</div>';
          }}
        />
      </a>
    </div>
  );
}

export default memo(TradingViewWidget);
