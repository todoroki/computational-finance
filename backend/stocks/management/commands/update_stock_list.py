import pandas as pd
from django.core.management.base import BaseCommand
from stocks.models import Stock


class Command(BaseCommand):
    help = "JPXのExcelから日本語データのみを取り込み、japanese_xxx カラムに保存する"

    def handle(self, *args, **options):
        url = "https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xls"
        self.stdout.write("Downloading stock list from JPX...")

        try:
            df = pd.read_excel("data_j.xls", dtype={"コード": str})
        except Exception as e:
            self.stderr.write(f"Failed to download/parse Excel: {e}")
            return

        self.stdout.write(f"Loaded {len(df)} rows. Updating database...")

        count = 0
        for index, row in df.iterrows():
            code = row["コード"].strip()

            # 銘柄が存在する場合のみアップデートする（余計なゴミを作らないため）
            # あるいは get_or_create で新規作成してもOK
            stock, created = Stock.objects.get_or_create(
                code=code,
                defaults={
                    "name": row[
                        "銘柄名"
                    ].strip(),  # 新規作成時は一旦日本語名をnameにも入れておく
                },
            )

            # ▼▼▼ 既存の英語データは消さずに、日本語フィールドだけ更新 ▼▼▼
            stock.japanese_name = row["銘柄名"].strip()
            stock.japanese_sector = row["33業種区分"].strip()

            # 市場区分は yfinance からはまともな値が取れないため、
            # ここで正確な値を入れておくのがシステムの安定には良いです
            stock.japanese_market = row["市場・商品区分"].strip()

            stock.save()
            count += 1

            if index % 500 == 0:
                print(f"Processed {index}...")

        self.stdout.write(
            self.style.SUCCESS(f"Updated {count} stocks with Japanese data!")
        )
