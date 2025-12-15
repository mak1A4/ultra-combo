# Ultra Combo

A lightweight, accessible combobox web component built with [Lit](https://lit.dev/). Supports both local filtering and remote data fetching with infinite scroll pagination.

## Installation

```bash
npm install ultra-combo
# or
pnpm add ultra-combo
```

## Quick Start

```html
<script type="module">
  import 'ultra-combo'
</script>

<ultra-combo
  placeholder="Select a country..."
></ultra-combo>

<script>
  const combo = document.querySelector('ultra-combo')
  combo.options = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
  ]

  combo.addEventListener('change', (e) => {
    console.log('Selected:', e.detail) // { value: 'us', label: 'United States' }
  })
</script>
```

## Features

- Local mode with client-side filtering
- Remote mode with debounced search
- Infinite scroll pagination
- Keyboard navigation (Arrow keys, Enter, Escape, Tab)
- Skeleton loading animation
- Autoload initial results
- Fully declarative with HTML attributes
- Accessible and lightweight

## Usage Modes

### Local Mode

Provide static options that are filtered client-side:

```html
<ultra-combo
  placeholder="Select a fruit..."
></ultra-combo>

<script>
  document.querySelector('ultra-combo').options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
  ]
</script>
```

### Remote Mode (Declarative)

Use `fetch-url` for simple API integration without JavaScript:

```html
<ultra-combo
  fetch-url="https://api.example.com/search?q={search}&skip={offset}&take={limit}"
  value-key="id"
  label-key="name"
  autoload
></ultra-combo>
```

**URL Placeholders:**
- `{search}` - The current search query (URL encoded)
- `{offset}` - Pagination offset (starts at 0)
- `{limit}` - Page size (from `page-size` attribute)

**Response Mapping:**

For nested API responses, use `results-path` and `total-path`:

```html
<!-- API returns: { data: { users: [...] }, meta: { total: 100 } } -->
<ultra-combo
  fetch-url="https://api.example.com/users?q={search}"
  results-path="data.users"
  total-path="meta.total"
  value-key="id"
  label-key="fullName"
></ultra-combo>
```

For nested properties in items, use dot notation:

```html
<!-- Items have: { code: 'US', name: { common: 'United States' } } -->
<ultra-combo
  fetch-url="https://restcountries.com/v3.1/name/{search}"
  value-key="code"
  label-key="name.common"
></ultra-combo>
```

### Remote Mode (Custom Function)

For complex scenarios, provide a custom `fetchOptions` function:

```html
<ultra-combo id="combo"></ultra-combo>

<script>
  const combo = document.getElementById('combo')

  combo.fetchOptions = async (search, offset, limit) => {
    const response = await fetch(
      `https://api.example.com/search?q=${search}&skip=${offset}&take=${limit}`
    )
    const data = await response.json()

    return {
      options: data.items.map(item => ({
        value: item.id,
        label: item.name,
      })),
      hasMore: offset + data.items.length < data.total,
    }
  }
</script>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `placeholder` | String | `'Select an option...'` | Input placeholder text |
| `value` | String | `''` | Currently selected value |
| `page-size` | Number | `20` | Items per page for pagination |
| `debounce` | Number | `150` | Debounce delay (ms) for remote search |
| `autoload` | Boolean | `false` | Auto-fetch results when dropdown opens |
| `fetch-url` | String | `null` | URL template with `{search}`, `{offset}`, `{limit}` placeholders |
| `value-key` | String | `'value'` | Key to extract option value (supports dot notation) |
| `label-key` | String | `'label'` | Key to extract option label (supports dot notation) |
| `results-path` | String | `''` | Dot-notation path to results array in response |
| `total-path` | String | `''` | Dot-notation path to total count for pagination |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `options` | `Array<{value: string, label: string}>` | Static options for local mode |
| `fetchOptions` | `Function` | Custom fetch function for remote mode |
| `value` | `string` | Get/set the selected value |

## Events

### `change`

Fired when an option is selected.

```javascript
combo.addEventListener('change', (e) => {
  console.log(e.detail.value) // Selected value
  console.log(e.detail.label) // Selected label
})
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowDown` | Open dropdown / Move highlight down |
| `ArrowUp` | Move highlight up |
| `Enter` | Select highlighted option |
| `Escape` | Close dropdown |
| `Tab` | Close dropdown and move focus |

## Styling

The component uses Shadow DOM. To customize styles, use CSS custom properties or `::part()` selectors (coming soon).

The default max-width is `300px`. Override the host styles:

```css
ultra-combo {
  --combo-max-width: 400px;
}
```

## Examples

### Countries with REST Countries API

```html
<ultra-combo
  fetch-url="https://restcountries.com/v3.1/name/{search}?fields=name,cca2"
  value-key="cca2"
  label-key="name.common"
  placeholder="Search countries..."
  autoload
  page-size="10"
></ultra-combo>
```

### Users with Pagination

```html
<ultra-combo
  fetch-url="https://api.example.com/users?search={search}&offset={offset}&limit={limit}"
  results-path="data"
  total-path="total"
  value-key="id"
  label-key="email"
  placeholder="Search users..."
  debounce="300"
></ultra-combo>
```

### Local with Pre-selected Value

```html
<ultra-combo
  placeholder="Select status..."
  value="active"
></ultra-combo>

<script>
  document.querySelector('ultra-combo').options = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ]
</script>
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## License

ISC
