import { ArrowRight, Play, RotateCcw, Square } from 'lucide-react'

type Props = { isPlaying: boolean; onPlay: () => void; onStop: () => void; onNext: () => void }

export function AudioControls({ isPlaying, onPlay, onStop, onNext }: Props) {
  return <div className="controls" aria-label="CW 재생 제어">
    <button className="play-button" onClick={isPlaying ? onStop : onPlay}>{isPlaying ? <Square size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}{isPlaying ? '정지' : '재생'}</button>
    <button className="secondary-button" onClick={onPlay}><RotateCcw size={16} aria-hidden="true" />다시 듣기</button>
    <button className="secondary-button next-button" onClick={onNext}>다음 문제 <ArrowRight size={17} aria-hidden="true" /></button>
  </div>
}
