import { describe, it, expect, vi } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import { sampleOptions, getInput, getClearBtn, getDropdown, getToggleBtn } from './test-utils.js'

describe('UltraCombo - Clear Button', () => {
  it('clear button is hidden when no value selected', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const clearBtn = getClearBtn(el)
    expect(clearBtn).toBeNull()
  })

  it('clear button is visible when value is selected', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
    `)

    const clearBtn = getClearBtn(el)
    expect(clearBtn).not.toBeNull()
  })

  it('clicking clear button clears the value', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
    `)

    expect(el.value).toBe('us')

    const clearBtn = getClearBtn(el)!
    clearBtn.click()
    await el.updateComplete

    expect(el.value).toBe('')
  })

  it('clear button dispatches change event with empty value', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
    `)

    const changeHandler = vi.fn()
    el.addEventListener('change', changeHandler)

    const clearBtn = getClearBtn(el)!
    clearBtn.click()
    await el.updateComplete

    expect(changeHandler).toHaveBeenCalledTimes(1)
    expect(changeHandler.mock.calls[0][0].detail).toEqual({
      value: '',
      label: '',
    })
  })

  it('clear button closes the dropdown', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
    `)

    // Open dropdown first
    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete
    expect(getDropdown(el)).not.toBeNull()

    // Click clear button
    const clearBtn = getClearBtn(el)!
    clearBtn.click()
    await el.updateComplete

    // Dropdown should be closed
    expect(getDropdown(el)).toBeNull()
  })

  it('clear button resets the input value', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
    `)

    const input = getInput(el)
    // Input should show the selected label
    expect(input.value).toBe('United States')

    const clearBtn = getClearBtn(el)!
    clearBtn.click()
    await el.updateComplete

    // Input should be empty
    expect(input.value).toBe('')
  })

  it('clear button disappears after clearing', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
    `)

    expect(getClearBtn(el)).not.toBeNull()

    const clearBtn = getClearBtn(el)!
    clearBtn.click()
    await el.updateComplete

    expect(getClearBtn(el)).toBeNull()
  })

  it('clear button has correct size classes', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo size="sm" .options=${sampleOptions} value="us"></ultra-combo>
    `)

    const clearBtn = getClearBtn(el)!
    expect(clearBtn.className).toContain('p-1')

    const icon = clearBtn.querySelector('svg')
    expect(icon?.className).toContain('w-3.5')
    expect(icon?.className).toContain('h-3.5')
  })
})
