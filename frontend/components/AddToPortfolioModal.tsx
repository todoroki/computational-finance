"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import { AddToPortfolioDocument } from "@/lib/gql/graphql";

interface AddToPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockCode: string;
  currentPrice: number;
  stockName: string;
}

export default function AddToPortfolioModal({
  isOpen,
  onClose,
  stockCode,
  currentPrice,
  stockName,
}: AddToPortfolioModalProps) {
  // フォームの状態
  // 修正前: 初期値 "" にして、useEffect で currentPrice をセットしていた
  // 修正後: 初期値に直接 currentPrice を入れる (開くたびにコンポーネントが作り直されるためこれでOK)
  const [quantity, setQuantity] = useState<string>("100");
  const [price, setPrice] = useState<string>(
    currentPrice ? currentPrice.toString() : "",
  );

  // Mutationフック
  const [addToPortfolio, { loading, error }] = useMutation(
    AddToPortfolioDocument,
    {
      onCompleted: () => {
        alert("ポートフォリオに追加しました！");
        onClose();
      },
      // キャッシュ更新（MyPortfolioクエリの再取得）
      refetchQueries: ["GetMyPortfolio"],
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToPortfolio({
      variables: {
        ownerId: "guest", // 仮のID
        stockCode: stockCode,
        quantity: parseFloat(quantity),
        averagePrice: parseFloat(price),
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">ポートフォリオに追加</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              銘柄
            </label>
            <div className="font-bold text-lg text-gray-900">
              {stockName} ({stockCode})
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono font-bold"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono font-bold"
              />
            </div>
          </div>

          {/* 計算結果プレビュー */}
          <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center text-blue-900">
            <span className="text-xs font-bold">概算投資額</span>
            <span className="font-mono font-bold text-lg">
              ¥
              {(
                (parseFloat(quantity) || 0) * (parseFloat(price) || 0)
              ).toLocaleString()}
            </span>
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
              className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "追加中..." : "ポートフォリオに追加"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
