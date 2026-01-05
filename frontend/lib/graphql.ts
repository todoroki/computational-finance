// frontend/lib/graphql.ts
import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print } from "graphql";

// ▼ ここが修正ポイント！
// typeof window === "undefined" は「サーバー側で実行中」という意味です。
// サーバー側ならDocker内部通信用の "http://backend:8000/graphql" を使い、
// ブラウザ側なら環境変数の "http://localhost:8000/graphql" を使います。
const API_URL = typeof window === "undefined"
    ? "http://backend:8000/graphql"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/graphql";

export async function fetchGraphQL<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables
): Promise<TResult> {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query: print(document),
            variables: variables || {},
        }),
        // 開発中はキャッシュしない
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch API: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.errors) {
        throw new Error(json.errors[0].message);
    }

    return json.data;
}