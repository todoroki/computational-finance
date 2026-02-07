import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-black tracking-tighter text-gray-900"
          >
            ASSET<span className="text-blue-600">OS</span>
          </Link>
          <Link
            href="/market"
            className="text-sm font-bold text-gray-500 hover:text-blue-600"
          >
            ← Marketに戻る
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 mt-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AssetOS 分析ロジック解説
        </h1>
        <p className="text-gray-500 mb-10">
          AIが使用している分類タグと指標の定義について
        </p>

        {/* 1. 安全性・クオリティ (Safety & Quality) */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-blue-700 border-b border-blue-200 pb-2 mb-6 flex items-center gap-2">
            🛡️ 安全性・クオリティ (Safety & Quality)
          </h2>
          <div className="grid gap-6">
            <TagCard
              icon="🛡️"
              title="盤石の盾 (Safety Shield)"
              desc="倒産リスクが極めて低い、財務鉄壁の企業。"
              logic="Altman Z-Score > 2.99 かつ 自己資本比率 > 60% かつ FCF黒字"
            />
            <TagCard
              icon="👑"
              title="王道成長 (Quality Growth)"
              desc="高い収益性を保ちながら成長を続ける、投資の王道銘柄。"
              logic="営業利益率 > 10% かつ 売上成長率 > 10% かつ F-Score >= 6"
            />
            <TagCard
              icon="🧠"
              title="プロ好み (Institutional Quality)"
              desc="機関投資家（プロ）が好む、利益の質が高く安定した企業。"
              logic="Z-Score > 2.5 かつ アクルーアル比率が健全"
            />
          </div>
        </section>

        {/* 2. 性格・フェーズ (Character & Phase) */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-indigo-700 border-b border-indigo-200 pb-2 mb-6 flex items-center gap-2">
            🧬 性格・フェーズ (Character)
          </h2>
          <div className="grid gap-6">
            <TagCard
              icon="🧱"
              title="キャッシュ製造機 (Cash Cow)"
              desc="成長は落ち着いたが、現金を稼ぐ力が強い成熟企業。配当に期待。"
              logic="営業CFマージン > 15% かつ 成長率 < 10%"
            />
            <TagCard
              icon="🚀"
              title="夢株・投機 (Single Engine)"
              desc="利益度外視で売上だけが急成長している企業。ハイリスク。"
              logic="売上成長率 > 20% かつ FCFマイナス"
            />
            <TagCard
              icon="🌱"
              title="静かなる改善 (Silent Improver)"
              desc="株価はまだ反応していないが、財務体質が着実に良くなっている企業。"
              logic="期待乖離 < 0 (割安) かつ 前年比で利益率改善"
            />
            <TagCard
              icon="🔁"
              title="復活の兆し (Turnaround)"
              desc="赤字から黒字へ転換した、または底打ちした企業。"
              logic="純利益が赤字から黒字へ転換"
            />
          </div>
        </section>

        {/* 3. リスク・警告 (Risk & Warning) */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-red-700 border-b border-red-200 pb-2 mb-6 flex items-center gap-2">
            ⚠️ リスク・警告 (Warning)
          </h2>
          <div className="grid gap-6">
            <TagCard
              icon="💀"
              title="ゾンビ企業 (Zombie)"
              desc="稼いだ利益で借金の利息すら払えていない、倒産予備軍。"
              logic="インタレスト・カバレッジ・レシオ < 1.0 (利払い能力不足)"
            />
            <TagCard
              icon="🧪"
              title="会計リスク (Accounting Risk)"
              desc="帳簿上は黒字だが、現金が入ってきていない。粉飾の可能性も。"
              logic="純利益は黒字だが、営業CFが赤字"
            />
            <TagCard
              icon="🚨"
              title="前提崩壊 (Fragile)"
              desc="超高期待で買われているが、財務が脆弱。成長が止まれば暴落する。"
              logic="期待乖離 > 30% (超割高) かつ 財務スコア低"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

const TagCard = ({
  icon,
  title,
  desc,
  logic,
}: {
  icon: string;
  title: string;
  desc: string;
  logic: string;
}) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex gap-4">
    <div className="text-3xl bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-lg text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600 text-sm mb-3">{desc}</p>
      <div className="bg-slate-50 px-3 py-2 rounded text-xs font-mono text-slate-500 border border-slate-100 inline-block">
        🔍 判定条件: {logic}
      </div>
    </div>
  </div>
);
