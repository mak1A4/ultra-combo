import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

export interface Option {
  value: string
  label: string
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

@customElement('ultra-combo')
export class UltraCombo extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .combobox-container {
      position: relative;
      width: 100%;
      max-width: 300px;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
    }

    .input-wrapper:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 1rem;
      outline: none;
      background: transparent;
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #6b7280;
    }

    .toggle-btn:hover {
      color: #374151;
    }

    .toggle-btn svg {
      width: 1rem;
      height: 1rem;
      transition: transform 0.2s;
    }

    .toggle-btn.open svg {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      max-height: 200px;
      overflow-y: auto;
      z-index: 10;
    }

    .dropdown-item {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
    }

    .dropdown-item:hover,
    .dropdown-item.highlighted {
      background: #f3f4f6;
    }

    .dropdown-item.selected {
      background: #eff6ff;
      color: #2563eb;
    }

    .dropdown-item.selected.highlighted {
      background: #dbeafe;
    }

    .no-results,
    .loading {
      padding: 0.5rem 0.75rem;
      color: #6b7280;
      font-style: italic;
    }

    .loading-more {
      padding: 0.5rem 0.75rem;
      color: #6b7280;
      font-size: 0.875rem;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
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
    return this.fetchOptions !== null
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
    return this._selectedOption?.label ?? ''
  }

  render() {
    return html`
      <div class="combobox-container">
        <div class="input-wrapper">
          <input
            type="text"
            .value=${this._displayValue}
            placeholder=${this.placeholder}
            @input=${this._onInput}
            @focus=${this._onFocus}
            @keydown=${this._onKeyDown}
          />
          <button
            class="toggle-btn ${this._isOpen ? 'open' : ''}"
            @click=${this._toggleDropdown}
            type="button"
            tabindex="-1"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
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
        <div class="dropdown">
          <div class="loading">
            <span class="spinner"></span> Loading...
          </div>
        </div>
      `
    }

    if (filtered.length === 0) {
      return html`
        <div class="dropdown">
          <div class="no-results">
            ${this._isRemoteMode && !this._inputValue
              ? 'Type to search...'
              : 'No results found'}
          </div>
        </div>
      `
    }

    return html`
      <div class="dropdown" @scroll=${this._onDropdownScroll}>
        ${filtered.map((opt, index) => html`
          <div
            class="dropdown-item ${opt.value === this.value ? 'selected' : ''} ${index === this._highlightedIndex ? 'highlighted' : ''}"
            @click=${() => this._selectOption(opt)}
            @mouseenter=${() => this._highlightedIndex = index}
          >
            ${opt.label}
          </div>
        `)}
        ${this._isLoadingMore ? html`
          <div class="loading-more">
            <span class="spinner"></span> Loading more...
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
      this._fetchRemote(this._inputValue, true)
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
    if (!this.fetchOptions) return

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
      const result = await this.fetchOptions(search, this._offset, this.pageSize)

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
            this._fetchRemote(this._inputValue, true)
          }
        } else if (filtered.length > 0) {
          this._highlightedIndex = (this._highlightedIndex + 1) % filtered.length
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
      const highlighted = this.shadowRoot?.querySelector('.dropdown-item.highlighted')
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
        this._fetchRemote(this._inputValue, true)
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
