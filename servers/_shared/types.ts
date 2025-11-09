/**
 * Shared Types for MCP Server Wrappers
 *
 * Common types used across all MCP server integrations.
 * Provides consistent interfaces for responses, pagination, and error handling.
 */

/**
 * Generic MCP operation response
 */
export interface MCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * SQL query result row
 */
export interface SQLResult {
  [key: string]: unknown;
}

/**
 * Pagination parameters for list operations
 */
export interface PaginationParams {
  page?: number;
  perPage?: number;
}

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams {
  after?: string;
  before?: string;
  first?: number;
  last?: number;
}

/**
 * File contents from repository
 */
export interface FileContents {
  content: string;
  encoding: string;
  size: number;
  sha: string;
  path: string;
}

/**
 * Git commit metadata
 */
export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer?: {
    name: string;
    email: string;
    date: string;
  };
}

/**
 * GitHub pull request
 */
export interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  merged_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * GitHub issue
 */
export interface Issue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string; avatar_url: string }>;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

/**
 * Code search result
 */
export interface CodeSearchResult {
  name: string;
  path: string;
  sha: string;
  url: string;
  repository: {
    full_name: string;
    html_url: string;
  };
  text_matches?: Array<{
    fragment: string;
    matches: Array<{
      text: string;
      indices: [number, number];
    }>;
  }>;
}

/**
 * Search results with pagination
 */
export interface SearchResults<T> {
  items: T[];
  totalCount: number;
  incompleteResults?: boolean;
}

/**
 * Supabase table metadata
 */
export interface TableInfo {
  schema: string;
  name: string;
  type: 'table' | 'view';
  comment?: string;
  columns: ColumnInfo[];
}

/**
 * Supabase column metadata
 */
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  comment?: string;
}

/**
 * Supabase migration metadata
 */
export interface Migration {
  id: string;
  name: string;
  executed_at: string;
  success: boolean;
}

/**
 * Supabase project metadata
 */
export interface Project {
  id: string;
  name: string;
  organization_id: string;
  region: string;
  status: 'active' | 'inactive' | 'paused';
  created_at: string;
  database: {
    host: string;
    version: string;
  };
}

/**
 * Supabase edge function metadata
 */
export interface EdgeFunction {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase branch metadata
 */
export interface Branch {
  id: string;
  name: string;
  project_id: string;
  parent_project_id: string;
  status: 'active' | 'creating' | 'deleting';
  created_at: string;
}

/**
 * Playwright diagnostic
 */
export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column: number;
  source: string;
}

/**
 * Context7 search result
 */
export interface DocumentationSearchResult {
  title: string;
  url: string;
  library: string;
  excerpt: string;
  relevance: number;
}
