import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans leading-relaxed">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-black tracking-tighter text-gray-900"
          >
            Stock<span className="text-blue-600">MRI</span>
          </Link>
          <Link
            href="/market"
            className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Market Explorer
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 mt-16">
        {/* --- Section 1: The Manifesto (なぜ作ったか) --- */}
        <section className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">
            なぜ、個人投資家の
            <br />
            <span className="text-blue-600">9割は負けるのか？</span>
          </h1>
          <div className="prose prose-lg text-gray-600">
            <p className="mb-4">
              答えはシンプルです。
              <br />
              <strong>「感情」と「情報の非対称性」</strong>に敗北するからです。
            </p>
            <p className="mb-4">
              機関投資家は、冷徹なアルゴリズムと膨大なデータで武装しています。
              一方で個人投資家は、SNSの煽りや一時的な株価変動に心を揺さぶられ、
              「高値で掴み、安値で投げる」を繰り返してしまいます。
            </p>
            <p className="mb-8">
              StockMRIは、この不条理な戦いを終わらせるために開発されました。
              <br />
              徹底的に感情を排除し、財務データという「ファクト」だけを武器にする。
              <br />
              それが、私たちが提供する<strong>「盤石の盾」</strong>です。
            </p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
            <p className="font-bold text-blue-900 text-lg mb-1">
              StockMRI Philosophy
            </p>
            <p className="text-blue-800">
              We trust Math, not Narratives.
              <br />
              物語ではなく、数字を信じる。
            </p>
          </div>
        </section>

        <hr className="border-gray-200 mb-20" />

        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Analysis Logic
          </h2>
          <p className="text-gray-500">
            AIアナリストが使用している分類タグの定義と、その裏側にあるロジック。
            <br />
            これらはブラックボックスではありません。すべて財務諸表に基づいています。
          </p>
        </div>

        {/* --- Section 2: Safety & Quality --- */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-blue-700 border-b border-blue-200 pb-2 mb-8 flex items-center gap-2">
            🛡️ 安全性・クオリティ (Safety & Quality)
          </h2>
          <div className="grid gap-6">
            <TagCard
              icon="🛡️"
              title="盤石の盾 (Safety Shield)"
              desc="倒産リスクが極めて低い、財務鉄壁の企業。不況時でも生存できる「現金の厚み」を持っています。"
              logicSummary="倒産確率モデル(Z-Score)が安全圏、かつ自己資本比率が高く、本業で現金を稼いでいること。"
              logicDetail="Altman Z-Score > 2.99 (安全圏) AND 自己資本比率 > 60% AND Core FCF > 0"
            />
            <TagCard
              icon="👑"
              title="王道成長 (Quality Growth)"
              desc="「高い収益性」と「成長」を両立している、投資の王道銘柄。競争優位性を持つ企業に現れます。"
              logicSummary="本業の利益率が高く、売上が2桁成長しており、財務健全性スコア(F-Score)も高いこと。"
              logicDetail="営業利益率 > 10% AND 売上成長率 > 10% AND Piotroski F-Score >= 6"
            />
            <TagCard
              icon="🧠"
              title="プロ好み (Institutional Quality)"
              desc="機関投資家（プロ）が好む、利益の質が高く安定した企業。派手さはないが、嘘のない決算を出します。"
              logicSummary="利益の質(Accruals)が健全で、財務スコアが高く、一定の規模と安定性があること。"
              logicDetail="Z-Score > 2.5 AND Piotroski F-Score >= 7 AND 営業利益率 > 5%"
            />
          </div>
        </section>

        {/* --- Section 3: Character & Phase --- */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-indigo-700 border-b border-indigo-200 pb-2 mb-8 flex items-center gap-2">
            🧬 性格・フェーズ (Character)
          </h2>
          <div className="grid gap-6">
            <TagCard
              icon="💎"
              title="割安放置 (Gap Opportunity)"
              desc="実力（財務データから算出される理論成長率）に対して、市場の期待（株価）が低すぎる状態。"
              logicSummary="逆算DCFモデルによる「市場期待成長率」がマイナス、または実績成長率より著しく低い。"
              logicDetail="Expectation Gap < 0 (マイナス乖離) OR Implied Growth < 0%"
            />
            <TagCard
              icon="🧱"
              title="キャッシュ製造機 (Cash Cow)"
              desc="成長は落ち着いたが、現金を稼ぐ力が強い成熟企業。配当や自社株買いなどの還元余力があります。"
              logicSummary="売上成長は低いが、営業キャッシュフローマージンが非常に高いこと。"
              logicDetail="営業CFマージン > 15% AND 売上成長率 < 10% AND Core FCF > 0"
            />
            <TagCard
              icon="🚀"
              title="夢株・投機 (Single Engine)"
              desc="利益度外視で売上だけが急成長している企業。ハイリスク・ハイリターンな「片肺飛行」状態。"
              logicSummary="売上は爆発的に伸びているが、フリーキャッシュフローは赤字であること。"
              logicDetail="売上成長率 > 20% AND FCFマージン < 5%"
            />
            <TagCard
              icon="🌱"
              title="静かなる改善 (Silent Improver)"
              desc="株価はまだ反応していないが、財務体質が着実に良くなっている企業。市場が見逃しているチャンス。"
              logicSummary="市場期待は低いが、前年比で利益率や財務スコアが改善していること。"
              logicDetail="Gap < 0 AND (営業利益率改善 OR F-Score >= 6)"
            />
          </div>
        </section>

        {/* --- Section 4: Risk & Warning --- */}
        <section className="mb-24">
          <h2 className="text-xl font-bold text-red-700 border-b border-red-200 pb-2 mb-8 flex items-center gap-2">
            ⚠️ リスク・警告 (Warning)
          </h2>
          <div className="grid gap-6">
            <TagCard
              icon="💀"
              title="ゾンビ企業 (Zombie)"
              desc="稼いだ利益で借金の利息すら払えていない、倒産予備軍。金利上昇局面で死に至ります。"
              logicSummary="インタレスト・カバレッジ・レシオ(ICR)が1倍割れ、または財務危機的状況で赤字。"
              logicDetail="ICR < 1.0 (利払い不能) OR (Z-Score < 1.8 AND 営業赤字)"
            />
            <TagCard
              icon="🧪"
              title="会計リスク (Accounting Risk)"
              desc="「黒字倒産」の予兆。帳簿上は利益が出ているのに、現金が入ってきていません。粉飾の可能性も。"
              logicSummary="純利益は黒字だが、営業キャッシュフローがマイナスであること。"
              logicDetail="Net Income > 0 AND Operating CF < 0"
            />
            <TagCard
              icon="🚨"
              title="前提崩壊 (Fragile)"
              desc="超高期待で買われているが、財務が脆弱。成長が少しでも鈍化すれば暴落する「砂上の楼閣」です。"
              logicSummary="市場期待が極めて高い(Gap大)が、財務スコアが低く、現金を稼げていない。"
              logicDetail="Expectation Gap > 30% AND Z-Score < 1.8 AND Core FCF < 0"
            />
          </div>
        </section>

        <div className="text-center pb-12">
          <Link
            href="/market"
            className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold py-4 px-8 rounded-full hover:bg-gray-800 transition-all shadow-xl hover:scale-105"
          >
            Market Explorer で銘柄を探す →
          </Link>
        </div>
      </main>
    </div>
  );
}

// ▼ 修正: ロジック詳細をアコーディオン(details)で隠す
const TagCard = ({
  icon,
  title,
  desc,
  logicSummary,
  logicDetail,
}: {
  icon: string;
  title: string;
  desc: string;
  logicSummary: string;
  logicDetail: string;
}) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex gap-4 mb-4">
      <div className="text-3xl bg-gray-50 w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-lg text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-3">{desc}</p>
      </div>
    </div>

    <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
      <div className="text-slate-700 font-medium mb-2">💡 {logicSummary}</div>

      <details className="group">
        <summary className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 select-none">
          <span>詳細ロジックを表示</span>
          <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-2 pt-2 border-t border-slate-200 text-xs font-mono text-slate-500 break-all">
          {logicDetail}
        </div>
      </details>
    </div>
  </div>
);
