export interface Option {
  value: string
  label: string
  _raw?: Record<string, unknown>
  parentValue?: string
}

export interface FetchResult {
  options: Option[]
  hasMore: boolean
}

export type FetchOptions = (
  search: string,
  offset: number,
  limit: number,
  parentValue?: string | null
) => Promise<FetchResult>

export type FilterOptions = (
  options: Option[],
  parentValue: string | null
) => Option[]
