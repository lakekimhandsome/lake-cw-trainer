type Props = { isPlaying: boolean; onPlay: () => void; onStop: () => void; onNext: () => void }

export function AudioControls({ isPlaying, onPlay, onStop, onNext }: Props) {
  return <div className="controls" aria-label="CW 재생 제어">
    <button className="play-button" onClick={isPlaying ? onStop : onPlay}>{isPlaying ? '■  정지' : '▶  재생'}</button>
    <button className="secondary-button" onClick={onPlay}>↻ 다시 듣기</button>
    <button className="secondary-button next-button" onClick={onNext}>다음 문제 <span>→</span></button>
  </div>
}
