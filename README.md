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
- Table mode with multi-column display
- Cascading/dependent comboboxes
- Size presets (sm, md, lg)
- Clear button
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

  combo.fetchOptions = async (search, offset, limit, parentValue) => {
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

### Table Mode

Display options in a multi-column table format:

```html
<ultra-combo
  id="users"
  columns="name,email,role"
  column-headers="Name,Email,Role"
  show-header
  placeholder="Select a user..."
></ultra-combo>

<script>
  document.getElementById('users').options = [
    { value: '1', label: 'John', _raw: { name: 'John Doe', email: 'john@example.com', role: 'Admin' } },
    { value: '2', label: 'Jane', _raw: { name: 'Jane Smith', email: 'jane@example.com', role: 'Editor' } },
  ]
</script>
```

### Cascading/Dependent Comboboxes

Create dependent comboboxes where child options depend on parent selection:

```html
<!-- Parent combo -->
<ultra-combo id="category" placeholder="Select category..."></ultra-combo>

<!-- Child combo - depends on category -->
<ultra-combo
  id="product"
  depends-on="category"
  disable-without-parent
  placeholder="Select product..."
></ultra-combo>

<script>
  document.getElementById('category').options = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
  ]

  // Products with parentValue property for auto-filtering
  document.getElementById('product').options = [
    { value: 'phone', label: 'Phone', parentValue: 'electronics' },
    { value: 'laptop', label: 'Laptop', parentValue: 'electronics' },
    { value: 'shirt', label: 'Shirt', parentValue: 'clothing' },
    { value: 'pants', label: 'Pants', parentValue: 'clothing' },
  ]
</script>
```

**With Remote Mode:**

Use `{depends}` placeholder in `fetch-url`:

```html
<ultra-combo id="country" autoload></ultra-combo>

<ultra-combo
  id="city"
  depends-on="country"
  fetch-url="https://api.example.com/cities?country={depends}&q={search}"
  disable-without-parent
></ultra-combo>
```

**Complex Multi-Parent Dependencies (Scripting):**

```html
<ultra-combo id="dept"></ultra-combo>
<ultra-combo id="role"></ultra-combo>
<ultra-combo id="employee"></ultra-combo>

<script>
  const employee = document.getElementById('employee')
  const dept = document.getElementById('dept')
  const role = document.getElementById('role')

  const updateEmployee = () => {
    if (!dept.value || !role.value) {
      employee.clear()
      return
    }

    employee.fetchOptions = async (search, offset, limit) => {
      const res = await fetch(`/api/employees?dept=${dept.value}&role=${role.value}&q=${search}`)
      return res.json()
    }
    employee.refresh()
  }

  dept.addEventListener('change', updateEmployee)
  role.addEventListener('change', updateEmployee)
</script>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `placeholder` | String | `'Select an option...'` | Input placeholder text |
| `value` | String | `''` | Currently selected value |
| `size` | String | `'md'` | Size preset: `sm`, `md`, `lg` |
| `page-size` | Number | `20` | Items per page for pagination |
| `debounce` | Number | `150` | Debounce delay (ms) for remote search |
| `autoload` | Boolean | `false` | Auto-fetch results when dropdown opens |
| `fetch-url` | String | `null` | URL template with `{search}`, `{offset}`, `{limit}`, `{depends}` placeholders |
| `value-key` | String | `'value'` | Key to extract option value (supports dot notation) |
| `label-key` | String | `'label'` | Key to extract option label (supports dot notation) |
| `results-path` | String | `''` | Dot-notation path to results array in response |
| `total-path` | String | `''` | Dot-notation path to total count for pagination |
| `columns` | String | `''` | Comma-separated column keys for table mode |
| `column-headers` | String | `''` | Comma-separated headers (defaults to capitalized keys) |
| `show-header` | Boolean | `false` | Show table header row |
| `search-columns` | String | `''` | Columns to search (defaults to all in table mode) |
| `depends-on` | String | `null` | ID of parent combobox for cascading |
| `depends-param` | String | `'parentValue'` | Parameter name for parent's value in fetch |
| `disable-without-parent` | Boolean | `false` | Disable until parent has value |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `options` | `Array<Option>` | Static options for local mode |
| `fetchOptions` | `Function` | Custom fetch function: `(search, offset, limit, parentValue?) => Promise<FetchResult>` |
| `filterOptions` | `Function` | Custom filter for local mode: `(options, parentValue) => Option[]` |
| `value` | `string` | Get/set the selected value |
| `parentValue` | `string \| null` | Current parent combo's value (readonly) |

## Methods

| Method | Description |
|--------|-------------|
| `refresh()` | Force reload remote options |
| `clear()` | Clear value and options cache |

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
