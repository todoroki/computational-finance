"use client";

import { useState } from "react"; // useEffectは削除済み

import { useMutation } from "@apollo/client/react";
import { AddToPortfolioDocument } from "@/lib/gql/graphql";

interface AddToPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockCode: string;
  stockName: string;
  currentPrice: number; // 現在値（参考用）

  // ▼▼▼ 追加: 編集モード用の初期値 (Optional) ▼▼▼
  initialQuantity?: number;
  initialAveragePrice?: number;

  // ▼▼▼ 追加: 編集時の初期値 ▼▼▼
  initialThesis?: string | null;
  initialExitStrategy?: string | null;
}

export default function AddToPortfolioModal({
  isOpen,
  onClose,
  stockCode,
  stockName,
  currentPrice,
  initialQuantity,
  initialAveragePrice,
  initialThesis, // 追加
  initialExitStrategy, // 追加
}: AddToPortfolioModalProps) {
  const isEditMode = initialQuantity !== undefined;

  const [quantity, setQuantity] = useState<string>(
    initialQuantity ? initialQuantity.toString() : "100",
  );
  const [price, setPrice] = useState<string>(
    initialAveragePrice
      ? initialAveragePrice.toString()
      : currentPrice
        ? currentPrice.toString()
        : "",
  );

  // ▼▼▼ 追加: 魂のState ▼▼▼
  const [thesis, setThesis] = useState<string>(initialThesis || "");
  const [exitStrategy, setExitStrategy] = useState<string>(
    initialExitStrategy || "",
  );

  const [addToPortfolio, { loading, error }] = useMutation(
    AddToPortfolioDocument,
    {
      onCompleted: () => {
        alert(
          isEditMode
            ? "ポジションと戦略を更新しました！"
            : "ポートフォリオに追加しました！",
        );
        onClose();
      },
      refetchQueries: ["GetMyPortfolio"],
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToPortfolio({
      variables: {
        ownerId: "guest",
        stockCode: stockCode,
        quantity: parseFloat(quantity),
        averagePrice: parseFloat(price),
        // ▼▼▼ 追加: ここで魂を送信 ▼▼▼
        investmentThesis: thesis,
        exitStrategy: exitStrategy,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">
            {isEditMode
              ? "戦略とポジションを編集"
              : "Investment Journal (記録)"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 銘柄情報 */}
          <div>
            <div className="flex justify-between items-baseline">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                Target Asset
              </label>
              {isEditMode && (
                <span className="text-xs text-blue-600 font-bold">
                  Update Mode
                </span>
              )}
            </div>
            <div className="font-bold text-xl text-gray-900">
              {stockName}{" "}
              <span className="text-gray-400 text-sm font-mono">
                ({stockCode})
              </span>
            </div>
          </div>

          {/* 数量・価格入力 (既存) */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                数量 (株)
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                取得単価 (円)
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold bg-white"
              />
            </div>
          </div>

          {/* ▼▼▼ 追加: 魂の入力欄 (ジャーナル) ▼▼▼ */}
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1 flex items-center gap-2">
                🎯 Investment Thesis (投資仮説)
              </label>
              <textarea
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="例: SaaS事業の成長率が30%を超えており、来期黒字化が見込めるため。競合他社と比較しても割安。"
                className="w-full px-4 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm leading-relaxed bg-blue-50/30 min-h-[80px]"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-red-500 uppercase mb-1 flex items-center gap-2">
                🚪 Exit Strategy (撤退条件)
              </label>
              <textarea
                value={exitStrategy}
                onChange={(e) => setExitStrategy(e.target.value)}
                placeholder="例: 売上成長率が20%を下回った場合。または、主要顧客の解約が発生した場合。"
                className="w-full px-4 py-3 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm leading-relaxed bg-red-50/30 min-h-[80px]"
              />
              <p className="text-[10px] text-gray-400 mt-1 text-right">
                ※
                ここに書いた条件は、将来AIが「変節していないか」を監査する際に使用されます。
              </p>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded">
              Error: {error.message}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-gray-800 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "記録中..." : "ジャーナルに保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
