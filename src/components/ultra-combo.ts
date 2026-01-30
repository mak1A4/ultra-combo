import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { getByPath, formatTemplate } from './ultra-combo.utils.js'
import type { Option, FetchResult, FetchOptions, FilterOptions } from './ultra-combo.types.js'
import resetCSS from '@unocss/reset/tailwind.css?inline'

// Re-export types for external consumers
export type { Option, FetchResult, FetchOptions, FilterOptions }

@customElement('ultra-combo')
export class UltraCombo extends LitElement {
  static styles = [
    unsafeCSS(resetCSS),
    css`
      :host { display: block }

      /* Custom scrollbar for dropdown */
      .dropdown::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      .dropdown::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 6px;
      }
      .dropdown::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 6px;
      }
      .dropdown::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
      /* Firefox scrollbar */
      .dropdown {
        scrollbar-color: #d1d5db transparent;
      }
      @unocss-placeholder
    `
  ]

  @property({ type: Array })
  options: Option[] = []

  @property({ type: String })
  value = ''

  @property({ type: String })
  placeholder = 'Select an option...'

  @property({ attribute: false })
  fetchOptions: FetchOptions | null = null

  @property({ type: Number, attribute: 'page-size' })
  pageSize = 20

  @property({ type: Number })
  debounce = 150

  @property({ type: Boolean })
  autoload = false

  @property({ type: String, attribute: 'fetch-url' })
  fetchUrl: string | null = null

  @property({ type: Object, attribute: false })
  fetchHeaders: Record<string, string> = {}

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

  @property({ type: String, attribute: 'search-columns' })
  searchColumns = ''

  @property({ type: String, attribute: 'column-headers' })
  columnHeaders = ''

  @property({ type: Boolean, attribute: 'show-header' })
  showHeader = false

  @property({ type: String, attribute: 'dropdown-max-width' })
  dropdownMaxWidth = ''

  @property({ type: String, attribute: 'column-max-width' })
  columnMaxWidth = ''

  @property({ type: Boolean, attribute: 'wrap-text' })
  wrapText = false

  @property({ type: Boolean, attribute: 'full-width' })
  fullWidth = false

  @property({ type: String, attribute: 'static-options' })
  set staticOptions(val: string) {
    if (val) {
      try {
        this.options = JSON.parse(val)
      } catch (e) {
        console.warn('ultra-combo: invalid static-options JSON', e)
      }
    }
  }

  @property({ type: String, attribute: 'display-template' })
  displayTemplate = ''

  @property({ type: String })
  size: 'sm' | 'md' | 'lg' = 'md'

  @property({ type: String, attribute: 'depends-on' })
  dependsOn: string | null = null

  @property({ type: String, attribute: 'depends-param' })
  dependsParam = 'parentValue'

  @property({ type: Boolean, attribute: 'disable-without-parent' })
  disableWithoutParent = false

  @property({ attribute: false })
  filterOptions: FilterOptions | null = null

  @property({ type: Boolean })
  multiple = false

  @property({ type: Boolean })
  disabled = false

  @state()
  private _parentValue: string | null = null

  @state()
  private _isOpen = false

  @state()
  private _inputValue = ''

  @state()
  private _highlightedIndex = -1

  @state()
  private _remoteOptions: Option[] = []

  // Cache for selected options - persists across remote option refreshes
  private _selectedOptionsCache: Map<string, Option> = new Map()

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
  private _boundHandleParentChange = this._handleParentChange.bind(this)
  private _lastSearch = ''

  private get _parentCombo(): UltraCombo | null {
    if (!this.dependsOn) return null
    return document.getElementById(this.dependsOn) as UltraCombo | null
  }

  private get _isEffectivelyDisabled(): boolean {
    return this.disabled || (this.disableWithoutParent && this.dependsOn !== null && !this._parentValue)
  }

  private _handleParentChange(e: Event) {
    const detail = (e as CustomEvent<{ value: string; label: string }>).detail
    const newParentValue = detail.value || null

    if (newParentValue === this._parentValue) return

    this._parentValue = newParentValue

    // Clear child value
    if (this.value) {
      this.value = ''
      this._inputValue = ''
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: '', label: '' },
        bubbles: true,
        composed: true
      }))
    }

    // Clear cache
    this._remoteOptions = []
    this._offset = 0
    this._hasMore = false
    this._lastSearch = ''

    // Auto-fetch if needed
    if (this._isRemoteMode && newParentValue && (this._isOpen || this.autoload)) {
      this._fetchRemote('', true)
    }
  }

  private _setupDependency() {
    const parent = this._parentCombo
    if (!parent) {
      console.warn(`UltraCombo: depends-on="${this.dependsOn}" not found`)
      return
    }
    this._parentValue = parent.value || null
    parent.addEventListener('change', this._boundHandleParentChange)
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('click', this._boundHandleClickOutside)
    if (this.dependsOn) {
      requestAnimationFrame(() => this._setupDependency())
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._boundHandleClickOutside)
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
    this._parentCombo?.removeEventListener('change', this._boundHandleParentChange)
  }

  protected willUpdate(changedProperties: PropertyValues) {
    // Clear cached results when fetchUrl changes
    if (changedProperties.has('fetchUrl') && changedProperties.get('fetchUrl') !== undefined) {
      this._remoteOptions = []
      this._offset = 0
      this._hasMore = false
      this._lastSearch = ''
    }
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

  private get _searchColumnKeys(): string[] {
    return this.searchColumns ? this.searchColumns.split(',').map(c => c.trim()) : []
  }

  private get _sizeClasses() {
    const sizes = {
      sm: {
        input: 'px-2 py-1 text-sm',
        button: 'p-1',
        icon: 'w-3.5 h-3.5',
        dropdown: 'max-h-[160px]',
        item: 'px-2 py-1 text-sm',
      },
      md: {
        input: 'px-2.5 py-1.5 text-sm',
        button: 'p-1.5',
        icon: 'w-4 h-4',
        dropdown: 'max-h-[200px]',
        item: 'px-2.5 py-1.5 text-sm',
      },
      lg: {
        input: 'px-3 py-2 text-base',
        button: 'p-2',
        icon: 'w-4 h-4',
        dropdown: 'max-h-[240px]',
        item: 'px-3 py-2',
      },
    }
    return sizes[this.size] || sizes.md
  }

  private async _fetchFromUrl(search: string, offset: number, limit: number): Promise<FetchResult> {
    let url = this.fetchUrl!
      .replaceAll('{search}', encodeURIComponent(search))
      .replace('{offset}', String(offset))
      .replace('{limit}', String(limit))

    // Handle dependency placeholder
    if (this._parentValue !== null) {
      url = url.replace('{depends}', encodeURIComponent(this._parentValue))
    } else if (url.includes('{depends}')) {
      // No parent value but placeholder exists - return empty
      return { options: [], hasMore: false }
    }

    const res = await fetch(url, {
      headers: this.fetchHeaders
    })
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

    let opts = this.options

    // Local mode: filter by parentValue or filterOptions
    if (this.dependsOn) {
      if (this.filterOptions) {
        opts = this.filterOptions(opts, this._parentValue)
      } else if (this._parentValue) {
        opts = opts.filter(opt => !opt.parentValue || opt.parentValue === this._parentValue)
      } else {
        // No parent value selected, show nothing unless option has no parentValue requirement
        opts = opts.filter(opt => !opt.parentValue)
      }
    }

    if (!this._inputValue) return opts

    const search = this._inputValue.toLowerCase()
    // Use specified search columns, or all columns if in table mode, or empty
    const searchKeys = this._searchColumnKeys.length > 0
      ? this._searchColumnKeys
      : this._columnKeys

    return opts.filter(opt => {
      // If search columns available, search those fields in _raw
      if (searchKeys.length > 0 && opt._raw) {
        return searchKeys.some(key => {
          const value = getByPath(opt._raw, key)
          return value && String(value).toLowerCase().includes(search)
        })
      }
      // Default: search label only
      return opt.label.toLowerCase().includes(search)
    })
  }

  private get _selectedOption(): Option | undefined {
    // Check cache first (for persisted selections across refreshes)
    if (this._selectedOptionsCache.has(this.value)) {
      return this._selectedOptionsCache.get(this.value)
    }
    const allOptions = this._isRemoteMode ? this._remoteOptions : this.options
    return allOptions.find(opt => opt.value === this.value)
  }

  // Multiselect: split comma-separated value into array
  private get _selectedValues(): string[] {
    if (!this.value) return []
    return this.value.split(',').filter(v => v.trim())
  }

  // Multiselect: get Option objects for all selected values
  private get _selectedOptions(): Option[] {
    const allOptions = this._isRemoteMode ? this._remoteOptions : this.options
    return this._selectedValues
      .map(v => {
        // Check cache first (for persisted selections across refreshes)
        if (this._selectedOptionsCache.has(v)) {
          return this._selectedOptionsCache.get(v)
        }
        return allOptions.find(opt => opt.value === v)
      })
      .filter((opt): opt is Option => opt !== undefined)
  }

  private get _displayValue(): string {
    if (this._isOpen) return this._inputValue

    // In multiselect mode, values are shown as badges, so input is empty
    if (this.multiple) return ''

    const selected = this._selectedOption
    if (!selected) return ''

    if (this.displayTemplate && selected._raw) {
      return formatTemplate(this.displayTemplate, selected._raw)
    }

    return selected.label
  }

  render() {
    const s = this._sizeClasses
    const disabled = this._isEffectivelyDisabled
    return html`
      <div class="relative w-full ${this.fullWidth ? '' : 'max-w-[300px]'}">
        <div class="flex items-center border border-gray-300 rounded-md ${disabled ? 'bg-gray-50 opacity-60' : 'bg-white'} focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
          <input
            type="text"
            class="flex-1 ${s.input} border-none rounded-md outline-none bg-transparent ${disabled ? 'cursor-not-allowed' : ''}"
            .value=${this._displayValue}
            placeholder=${disabled ? 'Select parent first...' : this.placeholder}
            ?disabled=${disabled}
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            @input=${this._onInput}
            @focus=${this._onFocus}
            @keydown=${this._onKeyDown}
          />
          ${this.value && !this.multiple ? html`
            <button
              class="clear-btn flex items-center justify-center ${s.button} border-none bg-transparent cursor-pointer text-gray-400 hover:text-gray-600"
              @click=${this._clearValue}
              type="button"
              tabindex="-1"
            >
              <svg class="${s.icon}" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          ` : null}
          <button
            class="toggle-btn flex items-center justify-center ${s.button} border-none bg-transparent cursor-pointer text-gray-500 hover:text-gray-700"
            @click=${this._toggleDropdown}
            type="button"
            tabindex="-1"
          >
            <svg class="${s.icon} transition-transform duration-200 ${this._isOpen ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        ${this._isOpen ? this._renderDropdown() : null}
        ${this._renderBadges()}
      </div>
    `
  }

  private _renderDropdown() {
    const filtered = this._filteredOptions
    const s = this._sizeClasses

    if (this._isLoading) {
      return html`
        <div class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md ${s.dropdown} overflow-y-auto z-10">
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
        <div class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md ${s.dropdown} overflow-y-auto z-10">
          <div class="no-results ${s.item} text-gray-500 italic">
            No results found
          </div>
        </div>
      `
    }

    if (this._isTableMode) {
      return this._renderTableDropdown(filtered)
    }

    return html`
      <div class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md ${s.dropdown} overflow-y-auto z-10" @scroll=${this._onDropdownScroll}>
        ${filtered.map((opt, index) => {
          const isSelected = this.multiple
            ? this._selectedValues.includes(opt.value)
            : opt.value === this.value
          const isHighlighted = index === this._highlightedIndex
          return html`
            <div
              class="dropdown-item ${s.item} cursor-pointer hover:bg-gray-100 ${isHighlighted ? 'highlighted bg-gray-100' : ''} ${isSelected ? 'selected bg-blue-50 text-blue-600' : ''} ${isSelected && isHighlighted ? 'bg-blue-100' : ''}"
              @click=${() => this._selectOption(opt)}
              @mouseenter=${() => this._highlightedIndex = index}
            >
              ${this.multiple && isSelected ? html`<span class="mr-1">✓</span>` : null}${opt.label}
            </div>
          `
        })}
        ${this._isLoadingMore ? html`
          <div class="loading-more ${s.item} text-gray-500 text-sm text-center flex items-center justify-center gap-2">
            <span class="spinner w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></span> Loading more...
          </div>
        ` : null}
      </div>
    `
  }

  private _renderTableDropdown(options: Option[]) {
    const s = this._sizeClasses
    return html`
      <div class="dropdown absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md ${s.dropdown} overflow-y-auto overflow-x-auto z-10 min-w-full ${this.dropdownMaxWidth ? '' : 'w-max'}" style="${this.dropdownMaxWidth ? `width: ${this.dropdownMaxWidth}; max-width: 100vw` : ''}" @scroll=${this._onDropdownScroll}>
        <table class="w-full border-collapse" style="${this.columnMaxWidth ? 'table-layout: fixed' : ''}">
          ${this.showHeader ? html`
            <thead>
              <tr>
                ${this._columnHeaderLabels.map(h => html`
                  <th class="text-left ${s.item} font-semibold text-xs uppercase text-gray-500 bg-gray-50 border-b border-gray-200 sticky top-0">${h}</th>
                `)}
              </tr>
            </thead>
          ` : null}
          <tbody>
            ${options.map((opt, index) => {
              const isSelected = this.multiple
                ? this._selectedValues.includes(opt.value)
                : opt.value === this.value
              const isHighlighted = index === this._highlightedIndex
              return html`
                <tr
                  class="cursor-pointer border-b border-gray-100 hover:bg-gray-100 ${isSelected ? 'bg-blue-50 text-blue-600' : ''} ${isHighlighted ? 'highlighted bg-gray-100' : ''} ${isSelected && isHighlighted ? 'bg-blue-100' : ''}"
                  @click=${() => this._selectOption(opt)}
                  @mouseenter=${() => this._highlightedIndex = index}
                >
                  ${this._columnKeys.map((key, colIndex) => {
                    const cellValue = getByPath(opt._raw ?? opt, key) ?? ''
                    return html`
                    <td class="${s.item} ${this.columnMaxWidth ? (this.wrapText ? 'break-words' : 'truncate') : 'whitespace-nowrap'}"
                        style="${this.columnMaxWidth ? `max-width: ${this.columnMaxWidth}` : ''}"
                        title="${this.columnMaxWidth && !this.wrapText ? cellValue : ''}">${colIndex === 0 && this.multiple && isSelected ? html`<span class="mr-1">✓</span>` : null}${cellValue}</td>
                  `})}
                </tr>
              `
            })}
          </tbody>
        </table>
        ${this._isLoadingMore ? html`
          <div class="loading-more ${s.item} text-gray-500 text-sm text-center flex items-center justify-center gap-2">
            <span class="spinner w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></span> Loading more...
          </div>
        ` : null}
      </div>
    `
  }

  private _renderBadges() {
    if (!this.multiple || this._selectedOptions.length === 0) return null

    const s = this._sizeClasses
    return html`
      <div class="flex flex-wrap gap-1 mt-2">
        ${this._selectedOptions.map(opt => html`
          <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 ${s.item} rounded">
            ${opt.label}
            <button
              type="button"
              class="hover:bg-blue-200 rounded p-0.5"
              @click=${(e: Event) => {
                e.stopPropagation()
                this._removeSelection(opt.value)
              }}
            >
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </span>
        `)}
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
    // Clear input on focus so all options show initially
    this._inputValue = ''
    this._highlightedIndex = 0

    if (this._isRemoteMode && this._remoteOptions.length === 0) {
      this._fetchRemote('', true)  // Always fetch with empty search on focus
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

    // Skip if dependency required but no parent value
    if (this.dependsOn && !this._parentValue) {
      this._remoteOptions = []
      this._hasMore = false
      return
    }

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
      // Pass parent value as 4th parameter
      const result = await fetcher(search, this._offset, this.pageSize, this._parentValue)

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
          // In multiselect mode, always clear input on open (values are shown as badges)
          this._inputValue = this.multiple ? '' : (this._selectedOption?.label ?? '')
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
      // In multiselect mode, always clear input on open (values are shown as badges)
      this._inputValue = this.multiple ? '' : (this._selectedOption?.label ?? '')
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
    // Cache selected option for persistence across remote refreshes
    this._selectedOptionsCache.set(opt.value, opt)

    if (this.multiple) {
      const values = [...this._selectedValues]
      const index = values.indexOf(opt.value)

      if (index >= 0) {
        // Remove if already selected
        values.splice(index, 1)
        this._selectedOptionsCache.delete(opt.value)
      } else {
        // Add if not selected
        values.push(opt.value)
      }

      this.value = values.join(',')
      this._inputValue = ''
      this._isOpen = false
      this._highlightedIndex = -1

      // Dispatch with comma string and arrays
      const selectedOpts = this._selectedOptions
      this.dispatchEvent(new CustomEvent('change', {
        detail: {
          value: this.value,
          values: values,
          labels: selectedOpts.map(o => o.label)
        },
        bubbles: true,
        composed: true
      }))
    } else {
      // Single-select mode
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

  private _removeSelection(valueToRemove: string) {
    const values = this._selectedValues.filter(v => v !== valueToRemove)
    this.value = values.join(',')

    // Remove from cache
    this._selectedOptionsCache.delete(valueToRemove)

    const selectedOpts = this._selectedOptions
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        value: this.value,
        values: values,
        labels: selectedOpts.map(o => o.label)
      },
      bubbles: true,
      composed: true
    }))
  }

  private _clearValue(e: Event) {
    e.stopPropagation()
    this.clear()
  }

  // Public API methods

  /** Get the current parent combo's value (readonly) */
  get parentValue(): string | null {
    return this._parentValue
  }

  /** Force reload remote options */
  refresh() {
    if (this._isRemoteMode) {
      this._fetchRemote('', true)
    }
    this.requestUpdate()
  }

  /** Clear value and options cache */
  clear() {
    this.value = ''
    this._inputValue = ''
    this._isOpen = false
    this._highlightedIndex = -1
    this._remoteOptions = []
    this._selectedOptionsCache.clear()
    this._offset = 0
    this._hasMore = false
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: '', label: '' },
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
