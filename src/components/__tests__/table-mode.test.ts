import { describe, it, expect, vi } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import type { Option } from '../ultra-combo.types.js'
import {
  tableOptions,
  getInput,
  getToggleBtn,
  getTable,
  getTableRows,
  getTableHeaders,
} from './test-utils.js'

describe('UltraCombo - Table Mode', () => {
  it('renders table when columns attribute is set', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    expect(getTable(el)).not.toBeNull()
    expect(getTableRows(el).length).toBe(3)
  })

  it('renders correct number of columns', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const rows = getTableRows(el)
    const cells = rows[0].querySelectorAll('td')
    expect(cells.length).toBe(3)
  })

  it('displays column data from _raw object', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const rows = getTableRows(el)
    const firstRowCells = rows[0].querySelectorAll('td')
    expect(firstRowCells[0].textContent).toBe('John Doe')
    expect(firstRowCells[1].textContent).toBe('john@example.com')
    expect(firstRowCells[2].textContent).toBe('Admin')
  })

  it('shows column headers when show-header is true', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        show-header
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const headers = getTableHeaders(el)
    expect(headers.length).toBe(3)
  })

  it('hides column headers when show-header is false', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const headers = getTableHeaders(el)
    expect(headers.length).toBe(0)
  })

  it('uses custom column-headers labels', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        column-headers="Full Name,Email Address,User Role"
        show-header
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const headers = getTableHeaders(el)
    expect(headers[0].textContent).toBe('Full Name')
    expect(headers[1].textContent).toBe('Email Address')
    expect(headers[2].textContent).toBe('User Role')
  })

  it('capitalizes column keys as default headers', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        show-header
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const headers = getTableHeaders(el)
    expect(headers[0].textContent).toBe('Name')
    expect(headers[1].textContent).toBe('Email')
    expect(headers[2].textContent).toBe('Role')
  })

  it('selects row on click', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const rows = getTableRows(el)
    ;(rows[1] as HTMLElement).click()
    await el.updateComplete

    expect(el.value).toBe('2')
  })

  it('dispatches change event on row selection', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const changeHandler = vi.fn()
    el.addEventListener('change', changeHandler)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const rows = getTableRows(el)
    ;(rows[0] as HTMLElement).click()
    await el.updateComplete

    expect(changeHandler).toHaveBeenCalledTimes(1)
    expect(changeHandler.mock.calls[0][0].detail).toEqual({
      value: '1',
      label: 'John Doe',
    })
  })

  it('keyboard ArrowDown highlights next row', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const input = getInput(el)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    const highlighted = el.shadowRoot!.querySelector('tr.highlighted')
    expect(highlighted).not.toBeNull()
    expect(highlighted?.querySelector('td')?.textContent).toBe('Jane Smith')
  })

  it('keyboard Enter selects highlighted row', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const input = getInput(el)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await el.updateComplete

    expect(el.value).toBe('2')
    expect(getTable(el)).toBeNull() // Dropdown closes
  })

  it('display-template formats selected value', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        display-template="{name} ({email})"
        .options=${tableOptions}
        value="1"
      ></ultra-combo>
    `)

    await el.updateComplete

    const input = getInput(el)
    expect(input.value).toBe('John Doe (john@example.com)')
  })

  it('display-template supports nested paths', async () => {
    const nestedOptions: Option[] = [
      {
        value: '1',
        label: 'Test',
        _raw: {
          id: '1',
          user: { name: 'John', contact: { email: 'john@test.com' } },
        },
      },
    ]

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="user.name"
        display-template="{user.name} - {user.contact.email}"
        .options=${nestedOptions}
        value="1"
      ></ultra-combo>
    `)

    await el.updateComplete

    const input = getInput(el)
    expect(input.value).toBe('John - john@test.com')
  })

  it('falls back to label when no display-template', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        columns="name,email,role"
        .options=${tableOptions}
        value="2"
      ></ultra-combo>
    `)

    await el.updateComplete

    const input = getInput(el)
    expect(input.value).toBe('Jane Smith')
  })
})
