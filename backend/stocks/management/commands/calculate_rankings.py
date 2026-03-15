from datetime import timedelta

import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F
from stocks.models import AnalysisResult, DailyStockPrice, Stock


class Command(BaseCommand):
    help = "蓄積されたデータから、ランキング、パーセンタイル、アルファ(市場超過リターン)を計算します"

    def handle(self, *args, **options):
        self.stdout.write("🧠 StockMRI ランキング＆アルファ計算エンジンを起動します...")

        # ==========================================
        # 1. データの準備 (DBから一括取得してPandasへ)
        # ==========================================
        self.stdout.write("  -> データベースからデータを読み込んでいます...")

        # 処理を高速化するため、各銘柄の「最新の」AnalysisResultのみを対象とする
        # ※ 実運用では `filter(date=最新日付)` などで絞り込むのがベターですが、
        # ここではStockごとの最新レコードを取得する前提とします。

        # 必要なフィールドだけを取得してDataFrame化 (メモリ節約)
        qs_analysis = (
            AnalysisResult.objects.select_related("stock")
            .annotate(
                code=F("stock__code"),
                sector=F(
                    "stock__sector_17_code_name"
                ),  # ※Stockモデルに業種名がある前提。なければ適宜変更してください
            )
            .values("id", "code", "sector", "market_cap", "roe", "per")
        )
        df = pd.DataFrame(list(qs_analysis))

        if df.empty:
            self.stdout.write(
                self.style.WARNING(
                    "AnalysisResultが見つかりません。先に基礎分析を完了させてください。"
                )
            )
            return

        total_stocks = len(df)

        # ==========================================
        # 2. 全体ランキングの計算 (時価総額 & ROE)
        # ==========================================
        self.stdout.write("  -> 全体ランキング(時価総額・ROE)を計算中...")

        # 時価総額 (大きい方が上位)
        # rank(ascending=False) で 1位が最大値になる
        df["market_cap_rank"] = df["market_cap"].rank(ascending=False, method="min")
        df["market_cap_percentile"] = (
            df["market_cap"].rank(ascending=False, pct=True) * 100
        )
        df["market_cap_total"] = total_stocks

        # ROE (大きい方が上位)
        df["roe_rank"] = df["roe"].rank(ascending=False, method="min")
        df["roe_percentile"] = df["roe"].rank(ascending=False, pct=True) * 100

        # ==========================================
        # 3. 業種内(セクター)ランキングの計算 (PER)
        # ==========================================
        self.stdout.write("  -> 業種内ランキング(PER)を計算中...")

        # PERは「0より大きい(黒字) かつ 低い方」が上位(割安)とする
        # 赤字企業(PER <= 0)や未算出のものは一旦ランキングの対象外(NaN)にする
        df["valid_per"] = df["per"].apply(
            lambda x: x if pd.notnull(x) and x > 0 else None
        )

        # 業種ごとにグループ化して計算
        df["per_sector_avg"] = df.groupby("sector")["valid_per"].transform("mean")
        df["per_sector_rank"] = df.groupby("sector")["valid_per"].transform(
            lambda x: x.rank(ascending=True, method="min")
        )
        df["per_sector_percentile"] = df.groupby("sector")["valid_per"].transform(
            lambda x: x.rank(ascending=True, pct=True) * 100
        )
        df["per_sector_total"] = df.groupby("sector")["id"].transform("count")

        # ==========================================
        # 4. 神経反射テスト (アルファ計算) の準備
        # ==========================================
        self.stdout.write("  -> 株価履歴から超過リターン(Alpha)を計算中...")

        # 直近の株価データを取得
        qs_prices = DailyStockPrice.objects.values(
            "stock__code", "date", "adjusted_close"
        )
        df_prices = pd.DataFrame(list(qs_prices))

        if not df_prices.empty:
            df_prices["date"] = pd.to_datetime(df_prices["date"])
            df_prices = df_prices.sort_values("date")

            # 🚀 【爆速化の魔法】全データを銘柄コードごとに分割して「辞書」にしておく
            # これで44万件から毎回検索する必要がなくなり、一瞬で取り出せます
            grouped_prices = dict(tuple(df_prices.groupby("stock__code")))
        else:
            grouped_prices = {}

        BENCHMARK_CODE = "1306"
        df_bm = grouped_prices.get(BENCHMARK_CODE, pd.DataFrame())

        # 計算結果を格納する列を初期化
        df["alpha_1month"] = None
        df["alpha_3month"] = None
        df["alpha_benchmark"] = "TOPIX(1306)"

        if not df_bm.empty:
            latest_date = df_bm["date"].max()
            date_1m_ago = latest_date - timedelta(days=30)
            date_3m_ago = latest_date - timedelta(days=90)

            # 近似の日付の株価を取得するヘルパー関数
            def get_price_asof(df_target, target_date):
                past_prices = df_target[df_target["date"] <= target_date]
                if not past_prices.empty:
                    return past_prices.iloc[-1]["adjusted_close"]
                return None

            bm_latest_price = get_price_asof(df_bm, latest_date)
            bm_price_1m = get_price_asof(df_bm, date_1m_ago)
            bm_price_3m = get_price_asof(df_bm, date_3m_ago)

            bm_ret_1m = (
                ((bm_latest_price / bm_price_1m) - 1) * 100 if bm_price_1m else 0
            )
            bm_ret_3m = (
                ((bm_latest_price / bm_price_3m) - 1) * 100 if bm_price_3m else 0
            )

            # 各銘柄のアルファを計算
            for idx, row in df.iterrows():
                code = row["code"]

                # 🚀 辞書から一瞬で取り出す（空なら空のDataFrame）
                df_stock = grouped_prices.get(code, pd.DataFrame())

                if df_stock.empty:
                    continue

                stock_latest = get_price_asof(df_stock, latest_date)
                stock_1m = get_price_asof(df_stock, date_1m_ago)
                stock_3m = get_price_asof(df_stock, date_3m_ago)

                if stock_latest and stock_1m:
                    stock_ret_1m = ((stock_latest / stock_1m) - 1) * 100
                    df.at[idx, "alpha_1month"] = stock_ret_1m - bm_ret_1m

                if stock_latest and stock_3m:
                    stock_ret_3m = ((stock_latest / stock_3m) - 1) * 100
                    df.at[idx, "alpha_3month"] = stock_ret_3m - bm_ret_3m
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"ベンチマーク({BENCHMARK_CODE})の株価データがないため、Alpha計算はスキップします。"
                )
            )

        # ==========================================
        # 5. DBへ一括保存 (Bulk Update)
        # ==========================================
        self.stdout.write("  -> 計算結果をデータベースに保存しています...")

        # 更新用のリストを作成
        results_to_update = []
        for idx, row in df.iterrows():
            # NaN を None(DBのNULL) に変換するヘルパー
            def clean_nan(val):
                return None if pd.isna(val) else val

            result = AnalysisResult(id=row["id"])

            result.market_cap_rank = clean_nan(row["market_cap_rank"])
            result.market_cap_percentile = clean_nan(row["market_cap_percentile"])
            result.market_cap_total = clean_nan(row["market_cap_total"])

            result.roe_rank = clean_nan(row["roe_rank"])
            result.roe_percentile = clean_nan(row["roe_percentile"])

            result.per_sector_avg = clean_nan(row["per_sector_avg"])
            result.per_sector_rank = clean_nan(row["per_sector_rank"])
            result.per_sector_percentile = clean_nan(row["per_sector_percentile"])
            result.per_sector_total = clean_nan(row["per_sector_total"])

            result.alpha_benchmark = row["alpha_benchmark"]
            result.alpha_1month = clean_nan(row["alpha_1month"])
            result.alpha_3month = clean_nan(row["alpha_3month"])

            results_to_update.append(result)

        # 指定したフィールドだけを一括更新 (超高速)
        with transaction.atomic():
            AnalysisResult.objects.bulk_update(
                results_to_update,
                [
                    "market_cap_rank",
                    "market_cap_percentile",
                    "market_cap_total",
                    "roe_rank",
                    "roe_percentile",
                    "per_sector_avg",
                    "per_sector_rank",
                    "per_sector_percentile",
                    "per_sector_total",
                    "alpha_benchmark",
                    "alpha_1month",
                    "alpha_3month",
                ],
                batch_size=1000,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"🎉 {len(results_to_update)} 件のランキング・アルファ計算が完了しました！"
            )
        )
