import { useEffect, useRef, useState } from 'react'
import { api, type Animal, type PortraitStatus } from './api'

type Props = { notify: (message: string) => void; go: (route: 'chat') => void }

const deckIcon = (d: string) => <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d={d} stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" /></svg>

export function TinderDeck({ notify, go }: Props) {
  const [portrait, setPortrait] = useState<PortraitStatus | null>(null)
  const [animals, setAnimals] = useState<Animal[]>([])
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const startX = useRef<number | null>(null)
  const complete = (portrait?.completeness || 0) >= 100

  useEffect(() => { api.portrait().then(setPortrait).catch(error => notify(error.message)) }, [])

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

  if (!complete) return <section>
    <div className="pc-hello" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
      <div><p className="lbl">Выбор сердцами</p><h1 className="h1">Сначала интервью</h1><p className="sub">После разговора с помощником здесь откроются персональные карточки питомцев.</p></div>
    </div>
    <div className="nodata" style={{ marginTop: 'var(--block)' }}>
      <span />
      <div>
        <h2 className="h3">Подбор ещё закрыт</h2>
        <p className="hint">Осталось ответить на вопросы в диалоге — прогресс виден в разделе «Помощник».</p>
        <button className="btn btn--fill btn--sm" style={{ marginTop: 'var(--s4)' }} onClick={() => go('chat')}>Перейти к помощнику</button>
      </div>
    </div>
  </section>

  const animal = animals[index]
  return <section className="pc-heart-choice">
    {animal
      ? <div className="pc-deck">
        <div>
          <article className="pc-card" style={{ transform: `translateX(${drag}px) rotate(${drag / 22}deg)` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
            <figure>
              <img className="pc-card__backdrop" src={animal.image_url} alt="" aria-hidden="true" draggable={false} />
              <div className="pc-card__image-frame">
                <img className="pc-card__image" src={animal.image_url} alt={`${animal.name}, ${animal.species}`} draggable={false} />
              </div>
              <div className="pc-card__top"><span>{animal.shelter}</span><span>{index + 1} / {animals.length}</span></div>
              <span className="pc-card__mark">{animal.guardians}</span>
              {drag > 30 && <span className="pc-stamp pc-stamp--like">Нравится</span>}
              {drag < -30 && <span className="pc-stamp pc-stamp--skip">Пропустить</span>}
            </figure>
            <div className="pc-card__body">
              <h2>{animal.name}</h2>
              <p className="pc-card__facts"><span>{animal.age}</span><span>{animal.gender}</span><span>{animal.species}</span></p>
              <p className="pc-card__description">{animal.description?.split('\n')[0] || 'Актуальная информация опубликована фондом.'}</p>
              <a className="pc-card__link" href={animal.source_url} target="_blank" rel="noreferrer">Открыть карточку фонда {deckIcon('M4 10h11M10 5l5 5-5 5')}</a>
            </div>
          </article>
          <div className="pc-swipe">
            <button className="pc-no" onClick={() => decide('skip')} aria-label="Пропустить">{deckIcon('M5 5l10 10M15 5 5 15')}<span>Пропустить</span></button>
            <a className="pc-details" href={animal.source_url} target="_blank" rel="noreferrer" aria-label="Открыть карточку фонда">{deckIcon('M4 4h12v12H4zM7 7h6M7 10h6M7 13h3')}<span>Подробнее</span></a>
            <button className="pc-yes" onClick={() => decide('like')} aria-label="Добавить в избранное">{deckIcon('M10 17s-6-3.6-6-8a3.5 3.5 0 0 1 6-2.2A3.5 3.5 0 0 1 16 9c0 4.4-6 8-6 8z')}<span>Нравится</span></button>
          </div>
        </div>
      </div>
      : <div className="pc-empty" style={{ marginTop: 'var(--block)' }}>
        <h3>Карточки закончились</h3>
        <p>Вы просмотрели весь текущий персональный подбор.</p>
        <button className="btn btn--fill btn--sm" onClick={() => go('chat')}>Вернуться к помощнику</button>
      </div>}
  </section>
}
