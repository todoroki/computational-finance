import io

import pandas as pd
import requests
from django.core.management.base import BaseCommand
from stocks.models import Stock


class Command(BaseCommand):
    help = "JPX公式サイトから最新の東証上場銘柄一覧を取得し、Stockマスタを更新する"

    def handle(self, *args, **options):
        # JPXの東証上場銘柄一覧 Excel URL (定期的に変わる可能性があるが、現在はこれが固定リンク)
        url = "https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xls"

        self.stdout.write("Downloading stock list from JPX...")

        try:
            response = requests.get(url)
            response.raise_for_status()

            # Excelを読み込む
            # JPXのフォーマット: コード, 銘柄名, 市場・商品区分, 33業種区分...
            df = pd.read_excel(io.BytesIO(response.content))

            self.stdout.write(f"Downloaded {len(df)} rows. Updating database...")

            count = 0
            for _, row in df.iterrows():
                code = str(row["コード"])

                # 銘柄コードは通常4桁だが、5桁の場合もある(ETF等)。
                # 最後に0がつく予備コード等の処理が必要な場合もあるが、まずは基本の4桁+サフィックスなしを対象にする
                # yfinanceは "7203.T" のようになるので、ここでは純粋なコードだけ保存
                if len(code) > 4:
                    code = code[:4]

                name = row["銘柄名"]
                market = row["市場・商品区分"]
                sector = row["33業種区分"]

                # 市場区分でフィルタリング（プロ向け: 一般株以外を除外したい場合ここで調整）
                # 今回は全銘柄入れます

                Stock.objects.update_or_create(
                    code=code,
                    defaults={
                        "name": name,
                        "market": market,
                        "sector": sector,
                        # description はここにはないので、fetch_dataの時にyfinanceで埋める
                    },
                )
                count += 1
                if count % 100 == 0:
                    self.stdout.write(f"Processed {count} stocks...")

            self.stdout.write(
                self.style.SUCCESS(f"Successfully updated {count} stocks.")
            )

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to update stock list: {e}"))
