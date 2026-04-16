import json
import os
import re
import time

from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone
from google import genai
from google.genai import types


class Command(BaseCommand):
    help = "Gemini 2.5 Flash (Grounding) を使用して、企業の事業概要・強み・弱みを生成します"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit", type=int, default=5, help="一度に処理する最大銘柄数"
        )
        parser.add_argument(
            "--ticker", type=str, help="テスト用に特定の銘柄コードを指定"
        )
        parser.add_argument(
            "--force", action="store_true", help="強制的に上書き更新する"
        )

    def handle(self, *args, **options):
        api_key = os.environ.get(
            "GEMINI_API_KEY", "AIzaSyCVEo49KC4cLf7g2ZM1b504epksKWiXZiw"
        )

        masked_key = f"{api_key[:8]}..." if len(api_key) > 8 else "未設定"
        print(f"Using Gemini API Key: {masked_key}")

        if not api_key:
            self.stdout.write(
                self.style.ERROR("環境変数 GEMINI_API_KEY が設定されていません。")
            )
            return

        client = genai.Client(
            api_key=api_key, http_options=types.HttpOptions(timeout=60000)
        )

        limit = options["limit"]
        ticker = options["ticker"]
        force = options["force"]

        from stocks.models import Stock

        qs = Stock.objects.all()

        if ticker:
            qs = qs.filter(code=ticker)
        elif not force:
            qs = qs.order_by(F("ai_profile_updated_at").asc(nulls_first=True))

        stocks_to_process = list(qs[:limit])

        if not stocks_to_process:
            self.stdout.write("処理対象の銘柄がありません。")
            return

        self.stdout.write(
            f"{len(stocks_to_process)} 件の企業プロファイルを生成します..."
        )

        for stock in stocks_to_process:
            self.stdout.write(f"\n[{stock.code}] {stock.name} の情報を検索・生成中...")

            prompt = f"""
            あなたはプロの証券アナリストです。
            日本株の「{stock.name} (証券コード: {stock.code})」について、Google検索で最新の情報を取得し、以下のJSON形式で出力してください。
            
            要求事項:
            1. business_summary: 現在の主力事業やビジネスモデルを端的に（150〜200文字程度）
            2. strengths: この企業の現在の競争優位性や強みを、短い文章で2〜3個のリストに
            3. weaknesses: 直近の決算やニュースで指摘されている課題、リスク、弱みを2〜3個のリストに
            
            絶対のルール:
            - 出力は純粋なJSONフォーマットのみとすること。
            - 検索結果に情報がない場合は、無理に嘘をつかず空にして構いません。
            """

            # 🚀 修正ポイント: response_mime_type を削除し、検索ツールと温度設定のみにする
            config = types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.2,
            )

            max_retries = 3
            for attempt in range(max_retries):
                raw_text = None
                try:
                    response = client.models.generate_content(
                        model="gemini-3.1-flash-lite-preview",
                        contents=prompt,
                        config=config,
                    )

                    raw_text = response.text

                    # 🚀 修正ポイント: LLMが勝手に付ける可能性のあるMarkdownを取り除く
                    clean_text = re.sub(r"```json\s*", "", raw_text)
                    clean_text = re.sub(r"```\s*", "", clean_text).strip()

                    parsed_data = json.loads(clean_text)

                    # DBへの保存
                    stock.ai_business_summary = parsed_data.get("business_summary", "")
                    stock.ai_strengths = parsed_data.get("strengths", [])
                    stock.ai_weaknesses = parsed_data.get("weaknesses", [])
                    stock.ai_profile_updated_at = timezone.now()
                    stock.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  -> ✅ 成功: {stock.ai_business_summary[:30]}..."
                        )
                    )
                    break

                except Exception as e:
                    # JSONのパースエラー(JSONDecodeError)か、APIのエラーかを判別しやすく
                    if attempt < max_retries - 1:
                        self.stdout.write(
                            self.style.WARNING(
                                f"  -> ⏳ エラー発生: {e}。5秒後にリトライします ({attempt + 1}/{max_retries})..."
                            )
                        )
                        time.sleep(5)
                    else:
                        self.stdout.write(
                            self.style.ERROR(f"  -> ❌ 最終エラー ({stock.code}): {e}")
                        )
                        self.stdout.write(f"  -> Raw Response: {raw_text}")

        self.stdout.write("\n🎉 処理が完了しました！")
