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
      <div><p className="lbl">Выбор сердцем</p><h1 className="h1">Сначала интервью</h1><p className="sub">После разговора с помощником здесь откроются персональные карточки питомцев.</p></div>
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
  return <section>
    <div className="pc-hello" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'end' }}>
      <div><p className="lbl">Выбор сердцем</p><h1 className="h1">Кому сказать «да»?</h1><p className="sub">Карточки отсортированы по вашему интервью. Потяните карточку влево или вправо.</p></div>
      <span className="chip">интервью завершено</span>
    </div>

    {animal
      ? <div className="pc-deck" style={{ marginTop: 'var(--block)' }}>
        <div>
          <article className="pc-card" style={{ transform: `translateX(${drag}px) rotate(${drag / 22}deg)` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
            <figure>
              <img src={animal.image_url} alt={`${animal.name}, ${animal.species}`} draggable={false} />
              <span className="pc-card__mark">{animal.guardians}</span>
              {drag > 30 && <span className="pc-stamp pc-stamp--like">Нравится</span>}
              {drag < -30 && <span className="pc-stamp pc-stamp--skip">Пропустить</span>}
            </figure>
            <div className="pc-card__body">
              <span className="chip">{animal.shelter}</span>
              <h2>{animal.name}</h2>
              <p>{animal.age} · {animal.gender} · {animal.species}</p>
              <p>{animal.description?.split('\n')[0] || 'Актуальная информация опубликована фондом.'}</p>
              <p style={{ marginTop: 'var(--s4)' }}><a className="lnk" href={animal.source_url} target="_blank" rel="noreferrer">Открыть карточку фонда</a></p>
            </div>
          </article>
          <div className="pc-swipe">
            <button className="pc-no" onClick={() => decide('skip')} aria-label="Пропустить">×<span>Пропустить</span></button>
            <button className="pc-yes" onClick={() => decide('like')} aria-label="Нравится">♥<span>Нравится</span></button>
          </div>
          <div className="bar" style={{ marginTop: 'var(--s4)' }}><i style={{ width: `${Math.min(100, index / Math.max(animals.length, 1) * 100)}%` }} /></div>
          <p className="hint">{index + 1} из {animals.length}</p>
        </div>

        <aside className="pc-side">
          <div className="card">
            <p className="lbl">Что дальше</p>
            <p className="hint" style={{ marginTop: 0 }}>Понравившиеся питомцы попадают в избранное в вашей анкете. Дальше — карточка фонда и связь с командой.</p>
            <a className="btn btn--line btn--sm" style={{ marginTop: 'var(--s4)', width: '100%' }} href="https://fond-nika.ru/" target="_blank" rel="noreferrer">Сайт фонда</a>
          </div>
          <div className="card">
            <p className="lbl">Портрет подбора</p>
            <h2 className="h3">{portrait?.completeness || 0}%</h2>
            <div className="bar"><i style={{ width: `${portrait?.completeness || 0}%` }} /></div>
            <p className="hint">Ответов: {portrait?.answer_count || 0}</p>
            <button className="btn btn--line btn--sm" style={{ width: '100%' }} onClick={() => go('chat')}>Вернуться к помощнику</button>
          </div>
        </aside>
      </div>
      : <div className="pc-empty" style={{ marginTop: 'var(--block)' }}>
        <h3>Карточки закончились</h3>
        <p>Вы просмотрели весь текущий персональный подбор.</p>
        <button className="btn btn--fill btn--sm" onClick={() => go('chat')}>Вернуться к помощнику</button>
      </div>}
  </section>
}
