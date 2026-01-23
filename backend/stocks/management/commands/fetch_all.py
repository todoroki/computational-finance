import time

from django.core.management import call_command
from django.core.management.base import BaseCommand
from stocks.models import Stock  # モデルから読み込む
from tqdm import tqdm


class Command(BaseCommand):
    help = "DBに登録されている全銘柄のデータを取得・更新する"

    def handle(self, *args, **options):
        # 1. DBから全銘柄コードを取得 (テキストファイル廃止！)
        # values_listでリスト化
        tickers = list(Stock.objects.values_list("code", flat=True))

        total = len(tickers)
        if total == 0:
            self.stderr.write(
                "No stocks found in DB. Please run 'update_stock_list' first."
            )
            return

        self.stdout.write(f"Starting batch process for {total} stocks from Database...")

        success_count = 0
        error_count = 0
        error_list = []

        # プログレスバー
        for ticker in tqdm(tickers, desc="Processing"):
            try:
                call_command("fetch_data", ticker, verbosity=0)
                success_count += 1
                time.sleep(1.0)  # 負荷軽減

            except Exception as e:
                error_count += 1
                error_list.append(f"{ticker}: {str(e)}")

        self.stdout.write(self.style.SUCCESS("Batch process completed!"))
        self.stdout.write(f"Success: {success_count}")
        self.stdout.write(f"Errors: {error_count}")

        if error_list:
            self.stdout.write(self.style.WARNING("--- Error Details ---"))
            # エラーが多すぎるとログが埋まるので最初の10件だけ出す等の工夫もアリ
            for err in error_list[:10]:
                self.stdout.write(err)
