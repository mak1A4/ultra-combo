import type { UltraCombo } from '../ultra-combo.js'
import type { Option } from '../ultra-combo.types.js'

// Ensure the component is registered
import '../ultra-combo.js'

// Sample data for local mode tests
export const sampleOptions: Option[] = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
]

// Sample data for table mode tests
export const tableOptions: Option[] = [
  { value: '1', label: 'John Doe', _raw: { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' } },
  { value: '2', label: 'Jane Smith', _raw: { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User' } },
  { value: '3', label: 'Bob Wilson', _raw: { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'Editor' } },
]

// DOM helper functions
export const getInput = (el: UltraCombo) =>
  el.shadowRoot!.querySelector('input') as HTMLInputElement

export const getDropdown = (el: UltraCombo) =>
  el.shadowRoot!.querySelector('.dropdown') as HTMLElement | null

export const getDropdownItems = (el: UltraCombo) =>
  el.shadowRoot!.querySelectorAll('.dropdown-item')

export const getToggleBtn = (el: UltraCombo) =>
  el.shadowRoot!.querySelector('.toggle-btn') as HTMLButtonElement

// Table-specific helpers
export const getTable = (el: UltraCombo) =>
  el.shadowRoot!.querySelector('table') as HTMLTableElement | null

export const getTableRows = (el: UltraCombo) =>
  el.shadowRoot!.querySelectorAll('tbody tr')

export const getTableHeaders = (el: UltraCombo) =>
  el.shadowRoot!.querySelectorAll('thead th')

export const getClearBtn = (el: UltraCombo) =>
  el.shadowRoot!.querySelector('.clear-btn') as HTMLButtonElement | null

// Sample data for cascading tests
export const categoryOptions: Option[] = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
]

export const productOptions: Option[] = [
  { value: 'phone', label: 'Phone', parentValue: 'electronics' },
  { value: 'laptop', label: 'Laptop', parentValue: 'electronics' },
  { value: 'shirt', label: 'Shirt', parentValue: 'clothing' },
  { value: 'pants', label: 'Pants', parentValue: 'clothing' },
]
