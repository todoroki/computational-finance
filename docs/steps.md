承知しました。
先ほどの戦略レポートを現実に落とし込むための、**「実装ロードマップ（開発仕様書）」**を提示します。

この手順書は、**「Backend（脳）」の進化**から始まり、**「Frontend（顔）」の整形**、そして**「Navigation（検索）」の構築**へと進みます。

---

# Computational Finance 実装ロードマップ

## 📅 全体フロー（Big Picture）

以下の5段階（Phase）で進めます。現在は Phase 0（プロトタイプ）が完了した状態です。

* **Phase 1: Data Modeling & Logic (最優先・核心)**
* データベースに「構造指標」「期待値指標」のカラムを追加。
* `fetch_data.py` に「Gross Profitability」「逆算DCF」の計算ロジックを実装。


* **Phase 2: API Exposure**
* 計算した新しい指標を GraphQL でフロントエンドに渡せるようにする。


* **Phase 3: "Three Lenses" UI Implementation**
* 詳細ページを「構造・期待・財務」の3つのレンズで評価するUIに作り変える。


* **Phase 4: Search & Screening**
* 4000銘柄から「コード検索」や「Sランク銘柄の絞り込み」ができるようにする。


* **Phase 5: AI Narrative (Optional)**
* 数値の根拠を言語化するAIを組み込む。



---

## 🛠 詳細実装手順（Micro Steps）

ここからは、実際に手を動かす順番に書いています。

### Phase 1: Data Modeling & Logic (脳を作る)

まずは「器（DB）」と「中身（計算ロジック）」を作ります。

#### 1-1. `backend/stocks/models.py` の拡張

`AnalysisResult` モデルに、戦略レポートで定義した指標を保存するフィールドを追加します。

* **追加フィールド:**
* `gross_profitability` (Float): 構造的強さ
* `implied_growth_rate` (Float): 市場期待成長率
* `market_implied_analytics` (JSON/Text): 計算に使ったパラメータ（WACC等）の保存用
* `status` (String): "Strong Buy", "Wait", "Sell" などの最終判定



#### 1-2. マイグレーション実行

* `makemigrations` と `migrate` を実行してDB構造を更新。

#### 1-3. `backend/stocks/management/commands/fetch_data.py` の改造

ここが最大の山場です。前回提示した「簡易ロジック」ではなく、**本番用の計算ロジック**を書き込みます。

* **タスク:**
* `yfinance` から Beta値、株主資本コストの計算に必要なデータを取得。
* **Gross Profitability 計算:** `(売上 - 売上原価) / 総資産`
* **逆算DCF 計算:** `g = WACC - (FCF / Enterprise Value)` ※簡易版として時価総額を使用
* **総合判定ロジック:** 3つの指標（GP, DCF, F-Score）の組み合わせで `status` を決定。



---

### Phase 2: API Exposure (神経を通す)

Backendで作ったデータをFrontendに運びます。

#### 2-1. `backend/stocks/types.py` の更新

GraphQLの型定義（Schema）に、Phase 1で追加したフィールドを公開します。

* `AnalysisResultType` クラスに `gross_profitability`, `implied_growth_rate`, `status` を追加。

#### 2-2. Frontendでの型再生成

* `docker compose run --rm frontend npm run codegen` を実行。

---

### Phase 3: "Three Lenses" UI (顔を作る)

ユーザーに見える画面を「プロ仕様」に変えます。

#### 3-1. `GetStockDetail.graphql` の更新

* 新しいフィールド (`grossProfitability`, `impliedGrowthRate` 等) を取得するようにクエリを書き換え。

#### 3-2. コンポーネント分割 (`frontend/components/`)

詳細ページが肥大化しないよう、部品を作ります。

* `StructuralBadge.tsx`: GPやF-Scoreを表示するバッジ。「Sランク」「Aランク」などのビジュアル化。
* `ExpectationMeter.tsx`: 市場期待成長率を表示するメーター。「現在の期待値8.5%（割高）」などを表示。
* `VerdictCard.tsx`: 最終的な「Wait」や「Buy」を表示するメインカード。

#### 3-3. 詳細ページ (`app/stocks/[code]/page.tsx`) の刷新

* 既存のグラフに加え、上記の3つのコンポーネントを配置し、レポート風のレイアウトに組み直す。

---

### Phase 4: Search & Screening (導線を作る)

トップページを「全件表示」から「検索・抽出」に変えます。

#### 4-1. Backend: 検索APIの実装 (`backend/stocks/schema.py`)

* `stocks(search: String, status: String)` のように引数を受け取れるようにリゾルバを修正。
* `search`: コードや社名での曖昧検索 (icontains)
* `status`: "Strong Buy" だけフィルタリング等



#### 4-2. Frontend: 検索バーの実装

* トップページに `<input>` を配置し、入力された文字でクエリを再取得（refetch）する仕組みを作る。

---

## 🚀 いますぐ実行する First Step

壮大な計画ですが、最初の一歩は常に **「データモデルの定義」** です。
これがないと何も始まりません。

**まずは `Phase 1-1` から始めましょう。**

`backend/stocks/models.py` を開き、以下のコードを追加・修正する準備はできていますか？
（準備ができたら、「models.pyを開いた。コードをくれ」と言ってください。正確なコードを渡します）