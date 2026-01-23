import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connections
from django.utils import timezone
from stocks.models import Stock, StockFetchLog
from tqdm import tqdm


class Command(BaseCommand):
    help = "DBに登録されている全銘柄のデータを並列で取得・更新する"

    def add_arguments(self, parser):
        # --retry オプション: 今日失敗した銘柄だけを再実行する
        parser.add_argument(
            "--retry",
            action="store_true",
            help="Retry only stocks that failed within the last 24 hours",
        )

    def handle(self, *args, **options):
        # 1. 対象銘柄の選定
        if options["retry"]:
            self.stdout.write("Mode: Retrying failures from the last 24 hours...")
            # 24時間以内に FAILURE ログがあり、かつ SUCCESS ログがない（あるいは古い）ものを抽出
            # 簡易的に「過去24時間の最新ログがFAILUREのもの」を取得
            one_day_ago = timezone.now() - timedelta(hours=24)

            # 最新のログが失敗している銘柄IDを取得
            # (少しクエリが複雑になるので、ここでは簡易的に「今日失敗した記録がある銘柄」を再送対象にします)
            failed_stock_ids = (
                StockFetchLog.objects.filter(
                    executed_at__gte=one_day_ago, status="FAILURE"
                )
                .values_list("stock_id", flat=True)
                .distinct()
            )

            tickers = list(
                Stock.objects.filter(id__in=failed_stock_ids).values_list(
                    "code", flat=True
                )
            )

            if not tickers:
                self.stdout.write(
                    self.style.SUCCESS("No failed stocks found to retry.")
                )
                return
        else:
            # 通常モード: 全銘柄
            tickers = list(Stock.objects.values_list("code", flat=True))

        total = len(tickers)
        if total == 0:
            self.stderr.write("No stocks found. Please run 'update_stock_list' first.")
            return

        # 🔥 並列設定
        MAX_WORKERS = 4
        self.stdout.write(
            f"Starting PARALLEL batch process for {total} stocks (Workers: {MAX_WORKERS})..."
        )

        # 結果集計用
        results = {"SUCCESS": 0, "FAILURE": 0}

        # 1つの銘柄を処理する関数
        def process_ticker(code):
            # DB接続切れ対策: 各スレッドでStockオブジェクトを取得し直す
            try:
                stock = Stock.objects.get(code=code)
            except Stock.DoesNotExist:
                return ("SKIPPED", code, "Stock not found")

            # A. 開始ログを記録 (FETCHING)
            # Createで新規作成（履歴を残す）
            log = StockFetchLog.objects.create(
                stock=stock, status="FETCHING", source="yfinance"
            )

            try:
                # B. データ取得実行
                call_command("fetch_data", code, verbosity=0)
                time.sleep(1.0)  # マナー待機

                # C. 成功ログに更新
                log.status = "SUCCESS"
                log.save()
                return ("SUCCESS", code, None)

            except Exception as e:
                # D. 失敗ログに更新
                error_msg = str(e)
                log.status = "FAILURE"
                log.message = error_msg
                log.save()
                return ("FAILURE", code, error_msg)

            finally:
                # DB接続を閉じる (必須)
                connections.close_all()

        # ThreadPoolExecutor で並列実行
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_ticker = {executor.submit(process_ticker, t): t for t in tickers}

            # プログレスバー表示
            for future in tqdm(
                as_completed(future_to_ticker), total=total, desc="Fetching"
            ):
                status, code, msg = future.result()
                if status in results:
                    results[status] += 1

                # エラー時のみ詳細表示（プログレスバーを崩さないようにwrite）
                if status == "FAILURE":
                    tqdm.write(f"[{code}] Failed: {msg}")

        # 完了レポート
        self.stdout.write(self.style.SUCCESS("Batch process completed!"))
        self.stdout.write(f"Success: {results['SUCCESS']}")
        self.stdout.write(f"Failure: {results['FAILURE']}")
