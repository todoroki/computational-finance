"use client";

// ▼ v4 対応: Provider は /react からインポート
import { ApolloProvider } from "@apollo/client/react";
// ▼ Client 本体や Cache は従来通り @apollo/client (または /core) から
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

// クライアントの作成
const client = new ApolloClient({
  // ブラウザからアクセスするURL (Dockerのポートフォワード設定による)
  link: new HttpLink({ uri: "http://localhost:8000/graphql" }),
  cache: new InMemoryCache(),
});

// ラッパーコンポーネント
export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
