import { tokenizeMorse } from '../lib/morse'

export function PlaybackText({ text, activeCharacterIndex }: { text: string; activeCharacterIndex?: number | null }) {
  let index = 0
  return <>{(text.match(/<[^>]+>|./g) ?? []).map((value, position) => {
    const active = tokenizeMorse(value).length > 0 && index++ === activeCharacterIndex
    return active ? <mark className="playing-character" key={position}>{value}</mark> : value
  })}</>
}
