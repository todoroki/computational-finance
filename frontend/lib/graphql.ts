const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://backend:8000/graphql";

// <T>: レスポンスデータの型 (Response Type)
// <V>: 変数の型 (Variables Type) - デフォルトは「キーが文字列のオブジェクト」
export async function fetchGraphQL<T = any, V = Record<string, unknown>>(
    query: string,
    variables?: V
): Promise<T> {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query,
            variables: variables || {},
        }),
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