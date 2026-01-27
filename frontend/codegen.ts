import type { CodegenConfig } from "@graphql-codegen/cli";

// 環境変数(Docker)があればそれを使い、なければ localhost(手元実行) を使う
const SCHEMA_URL = process.env.SCHEMA_URL || "http://localhost:8000/graphql";

const config: CodegenConfig = {
    overwrite: true,
    schema: SCHEMA_URL,
    documents: "app/**/*.graphql",
    generates: {
        "lib/gql/": {
            preset: "client",
            plugins: [
                "@newmo/graphql-codegen-plugin-type-guards"
                
            ],
            config: {
                skipTypename: false,
            }
        }
    },
    ignoreNoDocuments: true,
};

export default config;