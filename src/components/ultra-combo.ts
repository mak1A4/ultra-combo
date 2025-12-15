import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { getByPath, formatTemplate } from './ultra-combo.utils.js'
import type { Option, FetchResult, FetchOptions } from './ultra-combo.types.js'

// Re-export types for external consumers
export type { Option, FetchResult, FetchOptions }

@customElement('ultra-combo')
export class UltraCombo extends LitElement {
  static styles = css`
    :host { display: block }
    @unocss-placeholder
  `

  @property({ type: Array })
  options: Option[] = []

  @property({ type: String })
  value = ''

  @property({ type: String })
  placeholder = 'Select an option...'

  @property({ attribute: false })
  fetchOptions: FetchOptions | null = null

  @property({ type: Number })
  pageSize = 20

  @property({ type: Number })
  debounce = 150

  @property({ type: Boolean })
  autoload = false

  @property({ type: String, attribute: 'fetch-url' })
  fetchUrl: string | null = null

  @property({ type: String, attribute: 'value-key' })
  valueKey = 'value'

  @property({ type: String, attribute: 'label-key' })
  labelKey = 'label'

  @property({ type: String, attribute: 'results-path' })
  resultsPath = ''

  @property({ type: String, attribute: 'total-path' })
  totalPath = ''

  @property({ type: String })
  columns = ''

  @property({ type: String, attribute: 'column-headers' })
  columnHeaders = ''

  @property({ type: Boolean, attribute: 'show-header' })
  showHeader = false

  @property({ type: String, attribute: 'display-template' })
  displayTemplate = ''

  @state()
  private _isOpen = false

  @state()
  private _inputValue = ''

  @state()
  private _highlightedIndex = -1

  @state()
  private _remoteOptions: Option[] = []

  @state()
  private _isLoading = false

  @state()
  private _isLoadingMore = false

  @state()
  private _hasMore = false

  @state()
  private _offset = 0

  private _debounceTimer: number | null = null
  private _abortController: AbortController | null = null
  private _boundHandleClickOutside = this._handleClickOutside.bind(this)
  private _lastSearch = ''

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('click', this._boundHandleClickOutside)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._boundHandleClickOutside)
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
  }

  private get _isRemoteMode(): boolean {
    return this.fetchOptions !== null || this.fetchUrl !== null
  }

  private get _isTableMode(): boolean {
    return this.columns !== ''
  }

  private get _columnKeys(): string[] {
    return this.columns ? this.columns.split(',').map(c => c.trim()) : []
  }

  private get _columnHeaderLabels(): string[] {
    if (this.columnHeaders) {
      return this.columnHeaders.split(',').map(h => h.trim())
    }
    return this._columnKeys.map(k => k.charAt(0).toUpperCase() + k.slice(1))
  }

  private async _fetchFromUrl(search: string, offset: number, limit: number): Promise<FetchResult> {
    const url = this.fetchUrl!
      .replace('{search}', encodeURIComponent(search))
      .replace('{offset}', String(offset))
      .replace('{limit}', String(limit))

    const res = await fetch(url)
    if (!res.ok) return { options: [], hasMore: false }

    const data = await res.json()
    const results = getByPath(data, this.resultsPath)

    const options = Array.isArray(results)
      ? results.map(item => ({
          value: String(getByPath(item, this.valueKey)),
          label: String(getByPath(item, this.labelKey)),
          _raw: item as Record<string, unknown>,
        }))
      : []

    const total = this.totalPath ? getByPath(data, this.totalPath) : null
    const hasMore = typeof total === 'number'
      ? offset + options.length < total
      : options.length === limit

    return { options, hasMore }
  }

  private _handleClickOutside(e: Event) {
    if (!this.contains(e.target as Node)) {
      this._isOpen = false
      this._highlightedIndex = -1
    }
  }

  private get _filteredOptions(): Option[] {
    if (this._isRemoteMode) {
      return this._remoteOptions
    }
    if (!this._inputValue) return this.options
    const search = this._inputValue.toLowerCase()
    return this.options.filter(opt =>
      opt.label.toLowerCase().includes(search)
    )
  }

  private get _selectedOption(): Option | undefined {
    const allOptions = this._isRemoteMode ? this._remoteOptions : this.options
    return allOptions.find(opt => opt.value === this.value)
  }

  private get _displayValue(): string {
    if (this._isOpen) return this._inputValue

    const selected = this._selectedOption
    if (!selected) return ''

    if (this.displayTemplate && selected._raw) {
      return formatTemplate(this.displayTemplate, selected._raw)
    }

    return selected.label
  }

  render() {
    return html`
      <div class="relative w-full max-w-[300px]">
        <div class="flex items-center border border-gray-300 rounded-md bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
          <input
            type="text"
            class="flex-1 px-3 py-2 border-none rounded-md text-base outline-none bg-transparent"
            .value=${this._displayValue}
            placeholder=${this.placeholder}
            @input=${this._onInput}
            @focus=${this._onFocus}
            @keydown=${this._onKeyDown}
          />
          <button
            class="toggle-btn flex items-center justify-center p-2 border-none bg-transparent cursor-pointer text-gray-500 hover:text-gray-700"
            @click=${this._toggleDropdown}
            type="button"
            tabindex="-1"
          >
            <svg class="w-4 h-4 transition-transform duration-200 ${this._isOpen ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        ${this._isOpen ? this._renderDropdown() : null}
      </div>
    `
  }

  private _renderDropdown() {
    const filtered = this._filteredOptions

    if (this._isLoading) {
      return html`
        <div class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md max-h-[200px] overflow-y-auto z-10">
          <div class="skeleton-container py-1">
            <div class="skeleton-item h-8 mx-2 my-1 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer rounded w-[85%]"></div>
            <div class="skeleton-item h-8 mx-2 my-1 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer rounded w-[70%]"></div>
            <div class="skeleton-item h-8 mx-2 my-1 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer rounded w-[90%]"></div>
            <div class="skeleton-item h-8 mx-2 my-1 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer rounded w-[60%]"></div>
          </div>
        </div>
      `
    }

    if (filtered.length === 0) {
      return html`
        <div class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md max-h-[200px] overflow-y-auto z-10">
          <div class="no-results px-3 py-2 text-gray-500 italic">
            ${this._isRemoteMode && !this._inputValue && !this.autoload
              ? 'Type to search...'
              : 'No results found'}
          </div>
        </div>
      `
    }

    if (this._isTableMode) {
      return this._renderTableDropdown(filtered)
    }

    return html`
      <div class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md max-h-[200px] overflow-y-auto z-10" @scroll=${this._onDropdownScroll}>
        ${filtered.map((opt, index) => {
          const isSelected = opt.value === this.value
          const isHighlighted = index === this._highlightedIndex
          return html`
            <div
              class="dropdown-item px-3 py-2 cursor-pointer hover:bg-gray-100 ${isHighlighted ? 'highlighted bg-gray-100' : ''} ${isSelected ? 'selected bg-blue-50 text-blue-600' : ''} ${isSelected && isHighlighted ? 'bg-blue-100' : ''}"
              @click=${() => this._selectOption(opt)}
              @mouseenter=${() => this._highlightedIndex = index}
            >
              ${opt.label}
            </div>
          `
        })}
        ${this._isLoadingMore ? html`
          <div class="loading-more px-3 py-2 text-gray-500 text-sm text-center flex items-center justify-center gap-2">
            <span class="spinner w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></span> Loading more...
          </div>
        ` : null}
      </div>
    `
  }

  private _renderTableDropdown(options: Option[]) {
    return html`
      <div class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md max-h-[200px] overflow-y-auto z-10" @scroll=${this._onDropdownScroll}>
        <table class="w-full border-collapse">
          ${this.showHeader ? html`
            <thead>
              <tr>
                ${this._columnHeaderLabels.map(h => html`
                  <th class="text-left px-3 py-2 font-semibold text-xs uppercase text-gray-500 bg-gray-50 border-b border-gray-200 sticky top-0">${h}</th>
                `)}
              </tr>
            </thead>
          ` : null}
          <tbody>
            ${options.map((opt, index) => {
              const isSelected = opt.value === this.value
              const isHighlighted = index === this._highlightedIndex
              return html`
                <tr
                  class="cursor-pointer border-b border-gray-100 hover:bg-gray-100 ${isSelected ? 'bg-blue-50 text-blue-600' : ''} ${isHighlighted ? 'highlighted bg-gray-100' : ''} ${isSelected && isHighlighted ? 'bg-blue-100' : ''}"
                  @click=${() => this._selectOption(opt)}
                  @mouseenter=${() => this._highlightedIndex = index}
                >
                  ${this._columnKeys.map(key => html`
                    <td class="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">${getByPath(opt._raw ?? opt, key) ?? ''}</td>
                  `)}
                </tr>
              `
            })}
          </tbody>
        </table>
        ${this._isLoadingMore ? html`
          <div class="loading-more px-3 py-2 text-gray-500 text-sm text-center flex items-center justify-center gap-2">
            <span class="spinner w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></span> Loading more...
          </div>
        ` : null}
      </div>
    `
  }

  private _onInput(e: Event) {
    const input = e.target as HTMLInputElement
    this._inputValue = input.value
    this._isOpen = true
    this._highlightedIndex = 0

    if (this._isRemoteMode) {
      this._debouncedFetch(input.value)
    }
  }

  private _onFocus() {
    this._isOpen = true
    this._inputValue = this._selectedOption?.label ?? ''
    this._highlightedIndex = 0

    if (this._isRemoteMode && this._remoteOptions.length === 0) {
      const search = this.autoload ? '' : this._inputValue
      this._fetchRemote(search, true)
    }
  }

  private _debouncedFetch(search: string) {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer)
    }
    this._debounceTimer = window.setTimeout(() => {
      this._fetchRemote(search, true)
    }, this.debounce)
  }

  private async _fetchRemote(search: string, reset: boolean) {
    if (!this._isRemoteMode) return

    const fetcher = this.fetchOptions ?? this._fetchFromUrl.bind(this)

    if (this._abortController) {
      this._abortController.abort()
    }
    this._abortController = new AbortController()

    if (reset) {
      this._offset = 0
      this._isLoading = true
    } else {
      this._isLoadingMore = true
    }

    this._lastSearch = search

    try {
      const result = await fetcher(search, this._offset, this.pageSize)

      if (this._lastSearch !== search) return

      if (reset) {
        this._remoteOptions = result.options
      } else {
        this._remoteOptions = [...this._remoteOptions, ...result.options]
      }
      this._hasMore = result.hasMore
      this._offset += result.options.length
      this._highlightedIndex = reset ? 0 : this._highlightedIndex
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to fetch options:', err)
      }
    } finally {
      this._isLoading = false
      this._isLoadingMore = false
    }
  }

  private _onDropdownScroll(e: Event) {
    if (!this._isRemoteMode || !this._hasMore || this._isLoadingMore) return

    const dropdown = e.target as HTMLElement
    const scrollBottom = dropdown.scrollHeight - dropdown.scrollTop - dropdown.clientHeight

    if (scrollBottom < 50) {
      this._fetchRemote(this._lastSearch, false)
    }
  }

  private _onKeyDown(e: KeyboardEvent) {
    const filtered = this._filteredOptions

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!this._isOpen) {
          this._isOpen = true
          this._inputValue = this._selectedOption?.label ?? ''
          this._highlightedIndex = 0
          if (this._isRemoteMode && this._remoteOptions.length === 0) {
            const search = this.autoload ? '' : this._inputValue
            this._fetchRemote(search, true)
          }
        } else if (filtered.length > 0) {
          const isAtEnd = this._highlightedIndex >= filtered.length - 1

          if (isAtEnd && this._isRemoteMode && this._hasMore && !this._isLoadingMore) {
            this._fetchRemote(this._lastSearch, false)
          } else if (isAtEnd) {
            this._highlightedIndex = 0
          } else {
            this._highlightedIndex++
          }
          this._scrollHighlightedIntoView()
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (this._isOpen && filtered.length > 0) {
          this._highlightedIndex = this._highlightedIndex <= 0
            ? filtered.length - 1
            : this._highlightedIndex - 1
          this._scrollHighlightedIntoView()
        }
        break

      case 'Enter':
        e.preventDefault()
        if (this._isOpen && this._highlightedIndex >= 0 && this._highlightedIndex < filtered.length) {
          this._selectOption(filtered[this._highlightedIndex])
        }
        break

      case 'Escape':
        e.preventDefault()
        this._isOpen = false
        this._highlightedIndex = -1
        break

      case 'Tab':
        this._isOpen = false
        this._highlightedIndex = -1
        break
    }
  }

  private _scrollHighlightedIntoView() {
    this.updateComplete.then(() => {
      const highlighted = this.shadowRoot?.querySelector('.highlighted')
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' })
      }
    })
  }

  private _toggleDropdown(e: Event) {
    e.stopPropagation()
    this._isOpen = !this._isOpen
    if (this._isOpen) {
      this._inputValue = this._selectedOption?.label ?? ''
      this._highlightedIndex = 0
      if (this._isRemoteMode && this._remoteOptions.length === 0) {
        const search = this.autoload ? '' : this._inputValue
        this._fetchRemote(search, true)
      }
      // Focus input for keyboard navigation
      const input = this.shadowRoot?.querySelector('input')
      input?.focus()
    }
  }

  private _selectOption(opt: Option) {
    this.value = opt.value
    this._inputValue = ''
    this._isOpen = false
    this._highlightedIndex = -1
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: opt.value, label: opt.label },
      bubbles: true,
      composed: true
    }))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ultra-combo': UltraCombo
  }
}
