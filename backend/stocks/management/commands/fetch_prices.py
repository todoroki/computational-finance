import math

import pandas as pd
import yfinance as yf
from django.core.management.base import BaseCommand
from django.db import transaction
from stocks.models import DailyStockPrice, Stock


class Command(BaseCommand):
    help = "yfinanceから過去の株価(調整後終値含む)を取得してDBに保存します"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days", type=int, default=100, help="何日分取得するか (デフォルト: 100)"
        )
        parser.add_argument(
            "--chunk_size",
            type=int,
            default=100,
            help="一度にAPIリクエストする銘柄数 (デフォルト: 100)",
        )

    def handle(self, *args, **options):
        days = options["days"]
        chunk_size = options["chunk_size"]

        # DBに登録されている全銘柄を取得
        stocks = list(Stock.objects.all())
        total_stocks = len(stocks)

        if total_stocks == 0:
            self.stdout.write(
                self.style.WARNING(
                    "DBにStock(銘柄)が登録されていません。先に銘柄マスタを作成してください。"
                )
            )
            return

        self.stdout.write(
            f"全 {total_stocks} 銘柄の直近 {days} 日分の株価データを取得します..."
        )

        # NaN(欠損値)をNone(DBのNULL)に変換する安全装置
        def safe_float(val):
            if pd.isna(val) or math.isnan(val) or math.isinf(val):
                return None
            return float(val)

        # 銘柄をチャンク(例: 100件ずつ)に分割して処理
        for i in range(0, total_stocks, chunk_size):
            chunk_stocks = stocks[i : i + chunk_size]

            # yfinance用のティッカーシンボルを作成 (例: "7203" -> "7203.T")
            # 辞書にしておくと、後で ticker から Stock オブジェクトを逆引きできて便利
            ticker_to_stock = {f"{stock.code}.T": stock for stock in chunk_stocks}
            tickers = list(ticker_to_stock.keys())

            self.stdout.write(
                f"  [{i + 1}/{total_stocks}] 取得中... ({len(tickers)} 銘柄)"
            )

            try:
                # yfinanceで一括ダウンロード (group_by='ticker' でティッカーごとにまとめる)
                # 複数銘柄を指定するとマルチインデックスのDataFrameが返る
                data = yf.download(
                    tickers, period=f"{days}d", group_by="ticker", progress=False
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"APIエラーが発生しました: {e}"))
                continue

            records_to_create = []

            for ticker, stock in ticker_to_stock.items():
                # 取得データにそのティッカーが含まれているか確認
                if (
                    ticker not in data.columns.levels[0]
                    if isinstance(data.columns, pd.MultiIndex)
                    else data.empty
                ):
                    continue

                # 1銘柄だけ取得した場合と複数銘柄取得した場合で構造が変わるのを吸収
                if isinstance(data.columns, pd.MultiIndex):
                    ticker_data = data[ticker].dropna(how="all")
                else:
                    ticker_data = data.dropna(how="all")

                if ticker_data.empty:
                    continue

                for date_index, row in ticker_data.iterrows():
                    # DB用のレコードを作成 (まだ保存しない)
                    records_to_create.append(
                        DailyStockPrice(
                            stock=stock,  # ForeignKeyで紐付け
                            date=date_index.date(),
                            open_price=safe_float(row.get("Open")),
                            high_price=safe_float(row.get("High")),
                            low_price=safe_float(row.get("Low")),
                            close_price=safe_float(row.get("Close")),
                            adjusted_close=safe_float(
                                row.get("Adj Close")
                            ),  # ★これがリターン計算の要！
                            volume=int(safe_float(row.get("Volume")) or 0),
                        )
                    )

            # DBに一括保存 (ignore_conflicts=True で、既に同じ日のデータがあればスキップ)
            if records_to_create:
                with transaction.atomic():
                    DailyStockPrice.objects.bulk_create(
                        records_to_create, ignore_conflicts=True
                    )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"    -> {len(records_to_create)} 件のレコードをDBに保存しました。"
                    )
                )
            else:
                self.stdout.write("    -> 新しいデータはありませんでした。")

        self.stdout.write(
            self.style.SUCCESS("🎉 すべての株価データの取得と保存が完了しました！")
        )
