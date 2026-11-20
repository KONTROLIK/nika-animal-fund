import { useEffect, useRef, useState } from 'react'
import { api, type Animal, type PortraitStatus } from './api'

type Props = { notify: (message: string) => void; go: (route: 'chat') => void }

export function TinderDeck({ notify, go }: Props) {
  const [portrait, setPortrait] = useState<PortraitStatus | null>(null)
  const [animals, setAnimals] = useState<Animal[]>([])
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const startX = useRef<number | null>(null)
  const complete = (portrait?.completeness || 0) >= 100

  useEffect(() => {
    api.portrait().then(setPortrait).catch(error => notify(error.message))
  }, [])

  useEffect(() => {
    if (!complete) return
    api.tinder().then(setAnimals).catch(error => notify(error.message))
  }, [complete])

  const decide = async (decision: 'like' | 'skip') => {
    const animal = animals[index]
    if (!animal) return
    try {
      await api.swipe(animal.id, decision)
      setIndex(value => value + 1)
      setDrag(0)
      if (decision === 'like') notify(`${animal.name} добавлен в избранное`)
    } catch (error) { notify((error as Error).message) }
  }

  const pointerDown = (event: React.PointerEvent) => { startX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId) }
  const pointerMove = (event: React.PointerEvent) => { if (startX.current !== null) setDrag(event.clientX - startX.current) }
  const pointerUp = () => {
    if (Math.abs(drag) > 90) void decide(drag > 0 ? 'like' : 'skip')
    else setDrag(0)
    startX.current = null
  }

  if (!complete) return <section><div className="tinder-locked"><div className="eyebrow">выбор сердца</div><h2>Сначала пройдите интервью</h2><p>После интервью здесь откроются персональные карточки питомцев.</p><button className="button lime" onClick={() => go('chat')}>Перейти к помощнику ↗</button></div></section>

  const animal = animals[index]
  return <section><div className="page-title"><div><div className="eyebrow">04 / выбор сердцем</div><h1>Кому сказать «да»?</h1><p className="lead">Карточки отсортированы по твоему интервью. Потяни влево, вправо или используй кнопки.</p></div><span className="tag">интервью завершено</span></div>{animal ? <div className="tinder-deck"><article className="tinder-card swipe-card" style={{ transform: `translateX(${drag}px) rotate(${drag / 18}deg)` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}><img src={animal.image_url} alt={`${animal.name}, ${animal.species}`} /><div className="tinder-overlay"><span>{drag > 30 ? 'НРАВИТСЯ' : drag < -30 ? 'ПРОПУСТИТЬ' : ''}</span></div><div className="tinder-info"><span className="tag">{animal.shelter}</span><h2>{animal.name}</h2><p>{animal.age} · {animal.gender} · {animal.species}</p><p className="tinder-description">{animal.description?.split('\n')[0] || 'Актуальная информация опубликована фондом.'}</p><a href={animal.source_url} target="_blank" rel="noreferrer">Открыть карточку фонда ↗</a></div></article><div className="swipe-actions"><button className="skip" onClick={() => decide('skip')}>× <span>Пропустить</span></button><button className="like" onClick={() => decide('like')}>♥ <span>Нравится</span></button></div><div className="progress-line"><span style={{ width: `${Math.min(100, index / Math.max(animals.length, 1) * 100)}%` }} /></div></div> : <div className="empty"><h2>Карточки закончились</h2><p>Ты просмотрел весь текущий персональный подбор.</p><button className="button" onClick={() => go('chat')}>Вернуться к помощнику</button></div>}</section>
}
