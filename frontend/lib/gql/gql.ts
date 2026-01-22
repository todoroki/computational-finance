/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query GetStockDetail($code: String!) {\n  stock(code: $code) {\n    code\n    name\n    sector\n    description\n    market\n    analysisResults {\n      date\n      stockPrice\n      marketCap\n      status\n      isGoodBuy\n      aiSummary\n      zScore\n      fScore\n      accrualsRatio\n      grossProfitability\n      roiic\n      impliedGrowthRate\n    }\n    financials {\n      fiscalYear\n      quarter\n      revenue\n      operatingIncome\n      netIncome\n      operatingCf\n      investingCf\n      financingCf\n      totalAssets\n      totalEquity\n      periodEnd\n    }\n  }\n}": typeof types.GetStockDetailDocument,
    "query GetStocks($search: String, $status: String) {\n  stocks(search: $search, status: $status) {\n    code\n    name\n    sector\n    market\n    analysisResults {\n      date\n      stockPrice\n      status\n      isGoodBuy\n      zScore\n      grossProfitability\n      impliedGrowthRate\n    }\n  }\n}": typeof types.GetStocksDocument,
};
const documents: Documents = {
    "query GetStockDetail($code: String!) {\n  stock(code: $code) {\n    code\n    name\n    sector\n    description\n    market\n    analysisResults {\n      date\n      stockPrice\n      marketCap\n      status\n      isGoodBuy\n      aiSummary\n      zScore\n      fScore\n      accrualsRatio\n      grossProfitability\n      roiic\n      impliedGrowthRate\n    }\n    financials {\n      fiscalYear\n      quarter\n      revenue\n      operatingIncome\n      netIncome\n      operatingCf\n      investingCf\n      financingCf\n      totalAssets\n      totalEquity\n      periodEnd\n    }\n  }\n}": types.GetStockDetailDocument,
    "query GetStocks($search: String, $status: String) {\n  stocks(search: $search, status: $status) {\n    code\n    name\n    sector\n    market\n    analysisResults {\n      date\n      stockPrice\n      status\n      isGoodBuy\n      zScore\n      grossProfitability\n      impliedGrowthRate\n    }\n  }\n}": types.GetStocksDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetStockDetail($code: String!) {\n  stock(code: $code) {\n    code\n    name\n    sector\n    description\n    market\n    analysisResults {\n      date\n      stockPrice\n      marketCap\n      status\n      isGoodBuy\n      aiSummary\n      zScore\n      fScore\n      accrualsRatio\n      grossProfitability\n      roiic\n      impliedGrowthRate\n    }\n    financials {\n      fiscalYear\n      quarter\n      revenue\n      operatingIncome\n      netIncome\n      operatingCf\n      investingCf\n      financingCf\n      totalAssets\n      totalEquity\n      periodEnd\n    }\n  }\n}"): (typeof documents)["query GetStockDetail($code: String!) {\n  stock(code: $code) {\n    code\n    name\n    sector\n    description\n    market\n    analysisResults {\n      date\n      stockPrice\n      marketCap\n      status\n      isGoodBuy\n      aiSummary\n      zScore\n      fScore\n      accrualsRatio\n      grossProfitability\n      roiic\n      impliedGrowthRate\n    }\n    financials {\n      fiscalYear\n      quarter\n      revenue\n      operatingIncome\n      netIncome\n      operatingCf\n      investingCf\n      financingCf\n      totalAssets\n      totalEquity\n      periodEnd\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetStocks($search: String, $status: String) {\n  stocks(search: $search, status: $status) {\n    code\n    name\n    sector\n    market\n    analysisResults {\n      date\n      stockPrice\n      status\n      isGoodBuy\n      zScore\n      grossProfitability\n      impliedGrowthRate\n    }\n  }\n}"): (typeof documents)["query GetStocks($search: String, $status: String) {\n  stocks(search: $search, status: $status) {\n    code\n    name\n    sector\n    market\n    analysisResults {\n      date\n      stockPrice\n      status\n      isGoodBuy\n      zScore\n      grossProfitability\n      impliedGrowthRate\n    }\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;