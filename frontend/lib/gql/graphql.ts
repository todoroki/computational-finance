/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Date (isoformat) */
  Date: { input: any; output: any; }
};

export type AnalysisResultType = {
  __typename?: 'AnalysisResultType';
  accrualsRatio?: Maybe<Scalars['Float']['output']>;
  actualRevenueGrowth?: Maybe<Scalars['Float']['output']>;
  aiSummary?: Maybe<Scalars['String']['output']>;
  date: Scalars['Date']['output'];
  expectationGap?: Maybe<Scalars['Float']['output']>;
  expectationStructure: Scalars['String']['output'];
  fScore?: Maybe<Scalars['Int']['output']>;
  grossProfitability?: Maybe<Scalars['Float']['output']>;
  impliedGrowthRate?: Maybe<Scalars['Float']['output']>;
  impliedRevenueGrowth?: Maybe<Scalars['Float']['output']>;
  isGoodBuy: Scalars['Boolean']['output'];
  marketCap?: Maybe<Scalars['Float']['output']>;
  riskDetails?: Maybe<Scalars['String']['output']>;
  riskLevel: Scalars['String']['output'];
  roiic?: Maybe<Scalars['Float']['output']>;
  state: Scalars['String']['output'];
  status: Scalars['String']['output'];
  stockPrice?: Maybe<Scalars['Float']['output']>;
  zScore?: Maybe<Scalars['Float']['output']>;
};

export type FinancialStatementType = {
  __typename?: 'FinancialStatementType';
  capex?: Maybe<Scalars['Float']['output']>;
  financingCf?: Maybe<Scalars['Float']['output']>;
  fiscalYear: Scalars['Int']['output'];
  inventory?: Maybe<Scalars['Float']['output']>;
  investingCf?: Maybe<Scalars['Float']['output']>;
  netIncome?: Maybe<Scalars['Float']['output']>;
  operatingCf?: Maybe<Scalars['Float']['output']>;
  operatingIncome?: Maybe<Scalars['Float']['output']>;
  periodEnd?: Maybe<Scalars['Date']['output']>;
  quarter: Scalars['Int']['output'];
  revenue?: Maybe<Scalars['Float']['output']>;
  totalAssets?: Maybe<Scalars['Float']['output']>;
  totalEquity?: Maybe<Scalars['Float']['output']>;
};

export type Query = {
  __typename?: 'Query';
  stock?: Maybe<StockType>;
  stocks: Array<StockType>;
};


export type QueryStockArgs = {
  code: Scalars['String']['input'];
};


export type QueryStocksArgs = {
  limit?: Scalars['Int']['input'];
  rankingMode?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type StockType = {
  __typename?: 'StockType';
  analysisResults: Array<AnalysisResultType>;
  code: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  financials: Array<FinancialStatementType>;
  japaneseMarket?: Maybe<Scalars['String']['output']>;
  japaneseName?: Maybe<Scalars['String']['output']>;
  japaneseSector?: Maybe<Scalars['String']['output']>;
  market?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  sector?: Maybe<Scalars['String']['output']>;
};

export type GetStockDetailQueryVariables = Exact<{
  code: Scalars['String']['input'];
}>;


export type GetStockDetailQuery = { __typename?: 'Query', stock?: { __typename?: 'StockType', code: string, name: string, sector?: string | null, description?: string | null, market?: string | null, analysisResults: Array<{ __typename?: 'AnalysisResultType', date: any, stockPrice?: number | null, marketCap?: number | null, status: string, isGoodBuy: boolean, aiSummary?: string | null, zScore?: number | null, fScore?: number | null, accrualsRatio?: number | null, grossProfitability?: number | null, roiic?: number | null, impliedGrowthRate?: number | null, impliedRevenueGrowth?: number | null, actualRevenueGrowth?: number | null, expectationGap?: number | null }>, financials: Array<{ __typename?: 'FinancialStatementType', fiscalYear: number, quarter: number, revenue?: number | null, operatingIncome?: number | null, netIncome?: number | null, operatingCf?: number | null, investingCf?: number | null, financingCf?: number | null, totalAssets?: number | null, totalEquity?: number | null, periodEnd?: any | null }> } | null };

export type GetStocksQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  rankingMode?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetStocksQuery = { __typename?: 'Query', stocks: Array<{ __typename?: 'StockType', code: string, name: string, japaneseName?: string | null, japaneseSector?: string | null, japaneseMarket?: string | null, sector?: string | null, market?: string | null, analysisResults: Array<{ __typename?: 'AnalysisResultType', date: any, stockPrice?: number | null, status: string, isGoodBuy: boolean, zScore?: number | null, grossProfitability?: number | null, impliedGrowthRate?: number | null, impliedRevenueGrowth?: number | null, actualRevenueGrowth?: number | null, expectationGap?: number | null }> }> };


export const GetStockDetailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStockDetail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sector"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"market"}},{"kind":"Field","name":{"kind":"Name","value":"analysisResults"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stockPrice"}},{"kind":"Field","name":{"kind":"Name","value":"marketCap"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"isGoodBuy"}},{"kind":"Field","name":{"kind":"Name","value":"aiSummary"}},{"kind":"Field","name":{"kind":"Name","value":"zScore"}},{"kind":"Field","name":{"kind":"Name","value":"fScore"}},{"kind":"Field","name":{"kind":"Name","value":"accrualsRatio"}},{"kind":"Field","name":{"kind":"Name","value":"grossProfitability"}},{"kind":"Field","name":{"kind":"Name","value":"roiic"}},{"kind":"Field","name":{"kind":"Name","value":"impliedGrowthRate"}},{"kind":"Field","name":{"kind":"Name","value":"impliedRevenueGrowth"}},{"kind":"Field","name":{"kind":"Name","value":"actualRevenueGrowth"}},{"kind":"Field","name":{"kind":"Name","value":"expectationGap"}}]}},{"kind":"Field","name":{"kind":"Name","value":"financials"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fiscalYear"}},{"kind":"Field","name":{"kind":"Name","value":"quarter"}},{"kind":"Field","name":{"kind":"Name","value":"revenue"}},{"kind":"Field","name":{"kind":"Name","value":"operatingIncome"}},{"kind":"Field","name":{"kind":"Name","value":"netIncome"}},{"kind":"Field","name":{"kind":"Name","value":"operatingCf"}},{"kind":"Field","name":{"kind":"Name","value":"investingCf"}},{"kind":"Field","name":{"kind":"Name","value":"financingCf"}},{"kind":"Field","name":{"kind":"Name","value":"totalAssets"}},{"kind":"Field","name":{"kind":"Name","value":"totalEquity"}},{"kind":"Field","name":{"kind":"Name","value":"periodEnd"}}]}}]}}]}}]} as unknown as DocumentNode<GetStockDetailQuery, GetStockDetailQueryVariables>;
export const GetStocksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStocks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"rankingMode"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortOrder"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stocks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"rankingMode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"rankingMode"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortOrder"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortOrder"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"japaneseName"}},{"kind":"Field","name":{"kind":"Name","value":"japaneseSector"}},{"kind":"Field","name":{"kind":"Name","value":"japaneseMarket"}},{"kind":"Field","name":{"kind":"Name","value":"sector"}},{"kind":"Field","name":{"kind":"Name","value":"market"}},{"kind":"Field","name":{"kind":"Name","value":"analysisResults"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stockPrice"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"isGoodBuy"}},{"kind":"Field","name":{"kind":"Name","value":"zScore"}},{"kind":"Field","name":{"kind":"Name","value":"grossProfitability"}},{"kind":"Field","name":{"kind":"Name","value":"impliedGrowthRate"}},{"kind":"Field","name":{"kind":"Name","value":"impliedRevenueGrowth"}},{"kind":"Field","name":{"kind":"Name","value":"actualRevenueGrowth"}},{"kind":"Field","name":{"kind":"Name","value":"expectationGap"}}]}}]}}]}}]} as unknown as DocumentNode<GetStocksQuery, GetStocksQueryVariables>;
export const isAnalysisResultType = (field: { __typename?: string; }): field is AnalysisResultType => field.__typename === 'AnalysisResultType';
export const isFinancialStatementType = (field: { __typename?: string; }): field is FinancialStatementType => field.__typename === 'FinancialStatementType';
export const isQuery = (field: { __typename?: string; }): field is Query => field.__typename === 'Query';
export const isStockType = (field: { __typename?: string; }): field is StockType => field.__typename === 'StockType';