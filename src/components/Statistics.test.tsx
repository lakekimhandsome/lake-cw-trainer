import type { KeyboardEvent, ReactElement } from 'react'
import { expect, it, vi } from 'vitest'
import { defaultStatistics } from '../lib/storage'
import { Statistics } from './Statistics'

it('makes frequent errors accessible playback buttons, preserving order and prosigns', () => {
  const onPlayCharacter = vi.fn()
  const view = Statistics({ statistics: defaultStatistics(), presetLabel: '20 / 10 WPM', errors: { A: 2, '<AR>': 3, '<': 1 }, onPlayCharacter, onReset: vi.fn() })
  const mistakes = (view.props.children as ReactElement<{ className?: string; children: unknown }>[]).find((child) => child?.props?.className === 'mistakes')!
  const buttons = (mistakes.props.children as unknown[])[1] as ReactElement<{ 'aria-label': string; onClick: () => void; onKeyDown: (event: KeyboardEvent) => void }>[]
  expect(buttons.map((button) => button.props['aria-label'])).toEqual(['<AR> 한 번 듣기', 'A 한 번 듣기'])
  expect(buttons.every((button) => button.type === 'button')).toBe(true)
  buttons[0].props.onClick()
  expect(onPlayCharacter).toHaveBeenCalledExactlyOnceWith('<AR>')
  const stopPropagation = vi.fn()
  buttons[0].props.onKeyDown({ key: 'Enter', stopPropagation } as unknown as KeyboardEvent)
  expect(stopPropagation).toHaveBeenCalledOnce()
})
