# backend/stocks/management/commands/fetch_data.py
import yfinance as yf
from django.core.management.base import BaseCommand
from stocks.models import FinancialIndicator, Stock


class Command(BaseCommand):
    help = "日本の株価データを取得してDBに保存します"

    def add_arguments(self, parser):
        parser.add_argument("ticker", type=str, help="銘柄コード (例: 7203)")

    def handle(self, *args, **options):
        ticker_symbol = options["ticker"]
        # yfinanceは日本株の場合 ".T" が必要
        yf_ticker = f"{ticker_symbol}.T"

        self.stdout.write(f"Fetching data for {yf_ticker}...")

        stock_data = yf.Ticker(yf_ticker)
        info = stock_data.info

        # --- 1. Stockモデルの保存 ---
        # infoから取れるキーはたまに変わるので .get で安全に取る
        stock, created = Stock.objects.update_or_create(
            code=ticker_symbol,
            defaults={
                "name": info.get("longName", "不明"),
                "sector": info.get("sector", "不明"),
                "market": "Prime",  # yfinanceだと市場区分が取りにくいので一旦仮置き
                "description": info.get("longBusinessSummary", "")[
                    :500
                ],  # 長過ぎるとエラーになるかもなので
            },
        )

        # --- 2. 指標の計算 (簡易版) ---
        # 財務データを取得
        financials = stock_data.financials  # PL
        bs = stock_data.balance_sheet  # BS
        cf = stock_data.cashflow  # CF

        # データが取れない場合のエラーハンドリングは省略（プロトタイプのため）
        try:
            # 最新の価格
            current_price = info.get("currentPrice", 0)
            per = info.get("trailingPE", 0)
            pbr = info.get("priceToBook", 0)
            roe = info.get("returnOnEquity", 0)

            # --- マニアック指標の計算ロジック (簡易実装) ---
            # Piotroski F-Score の一部（純利益がプラスなら1点）
            net_income = (
                financials.loc["Net Income"].iloc[0]
                if "Net Income" in financials.index
                else 0
            )
            f_score_point1 = 1 if net_income > 0 else 0

            # Sloan Ratio (アクルーアル比率) = (純利益 - 営業CF) / 総資産
            op_cf = (
                cf.loc["Operating Cash Flow"].iloc[0]
                if "Operating Cash Flow" in cf.index
                else 0
            )
            total_assets = (
                bs.loc["Total Assets"].iloc[0] if "Total Assets" in bs.index else 1
            )
            sloan_ratio = (net_income - op_cf) / total_assets

            # 仮のスコア（ロジックは後で詰める）
            f_score = 7  # 仮

        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f"計算エラー: {e}。データが不足している可能性があります。"
                )
            )
            current_price = 0
            per = 0
            pbr = 0
            roe = 0
            f_score = 0
            sloan_ratio = 0

        # --- 3. Indicatorの保存 ---
        FinancialIndicator.objects.update_or_create(
            stock=stock,
            defaults={
                "price": current_price,
                "per": per,
                "pbr": pbr,
                "roe": roe,
                "f_score": f_score,
                "sloan_ratio": sloan_ratio,
                "ai_analysis": "AI分析コメント：財務は健全ですが、成長性に課題があります。（仮テキスト）",
                "ai_score": 85,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully updated {stock.name} ({ticker_symbol})")
        )
