export interface Option {
  value: string
  label: string
  _raw?: Record<string, unknown>
}

export interface FetchResult {
  options: Option[]
  hasMore: boolean
}

export type FetchOptions = (
  search: string,
  offset: number,
  limit: number
) => Promise<FetchResult>
