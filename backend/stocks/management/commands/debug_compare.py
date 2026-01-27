import pandas as pd
import yfinance as yf
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "2つの銘柄のRawデータを比較して、欠損項目を特定する"

    def add_arguments(self, parser):
        parser.add_argument(
            "--good", type=str, default="7203", help="正常な銘柄 (例: 7203)"
        )
        parser.add_argument(
            "--bad", type=str, default="2929", help="異常な銘柄 (例: 2929)"
        )

    def handle(self, *args, **options):
        good_ticker = f"{options['good']}.T"
        bad_ticker = f"{options['bad']}.T"

        self.stdout.write(f"Comparing {good_ticker} (Good) vs {bad_ticker} (Bad)...\n")

        # データ取得
        good_stock = yf.Ticker(good_ticker)
        bad_stock = yf.Ticker(bad_ticker)

        # 必須項目の定義 (あなたの計算ロジックで使っているキー)
        # ここにあるキーが Bad 側で欠けていると計算結果が None になります
        required_keys = {
            "PL (損益計算書)": [
                "Total Revenue",
                "Operating Income",
                "Net Income",
                "Gross Profit",
                "Cost Of Revenue",
                "EBIT",
                "Interest Expense",
            ],
            "BS (貸借対照表)": [
                "Total Assets",
                "Total Liabilities Net Minority Interest",  # Total Liabilitiesの代わり
                "Total Equity Gross Minority Interest",  # Total Equityの代わり
                "Current Assets",
                "Current Liabilities",
                "Retained Earnings",  # ★これが怪しい
                "Working Capital",  # 計算で使われることがある
            ],
            "CF (キャッシュフロー)": [
                "Operating Cash Flow",
                "Capital Expenditure",
                "Free Cash Flow",
            ],
        }

        # 比較実行
        self.check_category(
            good_stock,
            bad_stock,
            "financials",
            "PL (損益計算書)",
            required_keys["PL (損益計算書)"],
        )
        self.check_category(
            good_stock,
            bad_stock,
            "balance_sheet",
            "BS (貸借対照表)",
            required_keys["BS (貸借対照表)"],
        )
        self.check_category(
            good_stock,
            bad_stock,
            "cashflow",
            "CF (キャッシュフロー)",
            required_keys["CF (キャッシュフロー)"],
        )

    def check_category(self, good, bad, attr_name, category_name, keys):
        self.stdout.write(f"\n=== Checking {category_name} ===")

        # データの取得 (.T はせず、yfinanceのデフォルト形式でindexを確認)
        try:
            df_good = getattr(good, attr_name)
            df_bad = getattr(bad, attr_name)
        except Exception as e:
            self.stdout.write(f"Error accessing {attr_name}: {e}")
            return

        if df_bad.empty:
            self.stdout.write(
                self.style.ERROR(
                    f"🚨 {category_name}: Bad ticker returned EMPTY DataFrame!"
                )
            )
            return

        # 最新年度のカラムを取得
        good_latest = df_good.columns[0]
        bad_latest = df_bad.columns[0]

        print(
            f"{'Key Name':<40} | {'Good (' + str(good_latest.date()) + ')':<20} | {'Bad (' + str(bad_latest.date()) + ')':<20}"
        )
        print("-" * 85)

        for key in keys:
            # Goodの値
            val_good = "MISSING"
            if key in df_good.index:
                val_good = self.format_val(df_good.loc[key].iloc[0])

            # Badの値
            val_bad = "MISSING"
            if key in df_bad.index:
                val_bad = self.format_val(df_bad.loc[key].iloc[0])

                # キーがあるけど NaN (欠損) の場合
                if pd.isna(df_bad.loc[key].iloc[0]):
                    val_bad = "⚠️ NaN (Exists but empty)"
            else:
                # キー自体が存在しない場合 (これが原因の可能性大)
                # 別名チェック
                alt_bad = self.find_alternative(df_bad, key)
                if alt_bad:
                    val_bad = f"Found as '{alt_bad}'"
                else:
                    val_bad = "❌ NOT FOUND"

            # 表示
            row_str = f"{key:<40} | {str(val_good):<20} | {str(val_bad):<20}"

            # Badがダメな時は赤文字で強調
            if (
                "MISSING" in str(val_bad)
                or "NaN" in str(val_bad)
                or "NOT FOUND" in str(val_bad)
            ):
                self.stdout.write(self.style.ERROR(row_str))
            else:
                self.stdout.write(row_str)

    def format_val(self, val):
        if pd.isna(val):
            return "NaN"
        try:
            # 億単位で表示
            return f"{val / 100000000:.1f}億"
        except:
            return str(val)

    def find_alternative(self, df, key):
        """似たようなキーがないか探す"""
        key_parts = key.lower().replace(" ", "").split()
        for idx in df.index:
            idx_clean = str(idx).lower().replace(" ", "")
            if idx_clean == key.lower().replace(" ", ""):
                return idx
        return None
