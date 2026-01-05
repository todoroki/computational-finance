# backend/stocks/management/commands/fetch_data.py
import pandas as pd
import yfinance as yf
from django.core.management.base import BaseCommand
from django.utils import timezone
from stocks.models import AnalysisResult, FinancialStatement, Stock


class Command(BaseCommand):
    help = "日本の株価データと過去の財務データを取得してDBに保存します"

    def add_arguments(self, parser):
        parser.add_argument("ticker", type=str, help="銘柄コード (例: 7203)")

    def handle(self, *args, **options):
        ticker_symbol = options["ticker"]
        yf_ticker = f"{ticker_symbol}.T"

        self.stdout.write(f"Fetching data for {yf_ticker}...")
        stock_data = yf.Ticker(yf_ticker)
        info = stock_data.info

        # --- 1. Stock (銘柄マスタ) の保存 ---
        stock, created = Stock.objects.update_or_create(
            code=ticker_symbol,
            defaults={
                "name": info.get("longName", "不明"),
                "sector": info.get("sector", "不明"),
                "market": "Prime",  # 仮
                "description": info.get("longBusinessSummary", "")[:500],
            },
        )
        self.stdout.write(f"Stock info updated: {stock.name}")

        # --- 2. FinancialStatement (決算データ倉庫) の保存 ---
        # yfinanceからデータフレームを取得 (列=日付, 行=科目)
        financials = stock_data.financials  # PL
        bs = stock_data.balance_sheet  # BS
        cf = stock_data.cashflow  # CF

        # 全ての日付（カラム）をマージして処理対象リストを作る
        all_dates = sorted(
            list(set(financials.columns) | set(bs.columns) | set(cf.columns))
        )

        saved_statements = []

        for date in all_dates:
            # Timestampを日付型に変換
            period_end = date.date()
            year = period_end.year

            # データ取得ヘルパー関数 (キーがない場合は0やNoneを返す)
            def get_val(df, key):
                if key in df.index and date in df.columns:
                    val = df.loc[key, date]
                    return val if not pd.isna(val) else 0
                return 0

            # データを抽出
            revenue = get_val(financials, "Total Revenue")
            op_income = get_val(financials, "Operating Income")
            net_income = get_val(financials, "Net Income")

            total_assets = get_val(bs, "Total Assets")
            net_assets = get_val(bs, "Stockholders Equity")  # 純資産に近い項目

            op_cf = get_val(cf, "Operating Cash Flow")
            inv_cf = get_val(cf, "Investing Cash Flow")
            fin_cf = get_val(cf, "Financing Cash Flow")

            # DBに保存
            # ※本来は決算月を見て年度を調整すべきですが、簡易的に日付の年を使います
            statement, _ = FinancialStatement.objects.update_or_create(
                stock=stock,
                fiscal_year=year,
                quarter=4,  # yfinanceのfinancialsは基本的に通期データ
                defaults={
                    "period_end": period_end,
                    "revenue": revenue,
                    "operating_income": op_income,
                    "net_income": net_income,
                    "total_assets": total_assets,
                    "net_assets": net_assets,
                    "operating_cf": op_cf,
                    "investing_cf": inv_cf,
                    "financing_cf": fin_cf,
                },
            )
            saved_statements.append(statement)

        self.stdout.write(f"Saved {len(saved_statements)} financial statements.")

        # --- 3. AnalysisResult (分析スコア) の計算 ---
        # 最新の決算データを使って計算
        if not saved_statements:
            self.stdout.write(
                self.style.WARNING("No financial statements found. Skipping analysis.")
            )
            return

        latest_stmt = saved_statements[-1]  #
