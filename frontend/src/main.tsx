import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api, type AIAnalytics, type Animal, type Conversation, type Message, type PortraitStatus, type Preference, type User, setToken, token } from './api'
import './ds.css'
import './lk.css'
import './styles.css'
import logo from './logo-nika.png'
import { ProfileCabinet } from './ProfileCabinet'
import { TinderDeck } from './TinderDeck'

type Route = 'home' | 'discover' | 'chat' | 'tinder' | 'profile' | 'manager' | 'how' | 'auth'

const icon = (d: string) => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>

const nav: Array<[Route, React.ReactNode, string]> = [
  ['home', icon('M3 8.4 10 3l7 5.4V16a1.4 1.4 0 0 1-1.4 1.4h-3.2v-4.6H7.6v4.6H4.4A1.4 1.4 0 0 1 3 16z'), 'Обзор'],
  ['discover', icon('M10 10.6c-2.6 0-4.6 2.3-4.6 4.4 0 1.3 1 2 2.2 2 .9 0 1.5-.4 2.4-.4s1.5.4 2.4.4c1.2 0 2.2-.7 2.2-2 0-2.1-2-4.4-4.6-4.4zM4.6 8.6a1.5 1.9 0 1 0 0 .1M7.9 4.9a1.5 1.9 0 1 0 0 .1M12.1 4.9a1.5 1.9 0 1 0 0 .1M15.4 8.6a1.5 1.9 0 1 0 0 .1'), 'Мои подопечные'],
  ['chat', icon('M3.4 5.6a2.2 2.2 0 0 1 2.2-2.2h8.8a2.2 2.2 0 0 1 2.2 2.2v6a2.2 2.2 0 0 1-2.2 2.2H9.2l-3.6 2.9v-2.9a2.2 2.2 0 0 1-2.2-2.2z'), 'Помощник'],
  ['tinder', icon('M10 16.6s-6.4-3.8-6.4-8.4A3.5 3.5 0 0 1 10 6.1a3.5 3.5 0 0 1 6.4 2.1c0 4.6-6.4 8.4-6.4 8.4z'), 'Выбор сердцами'],
  ['profile', icon('M10 7.4a3.2 3.2 0 1 0 0 .1M3.6 17.2c.9-3.3 3.4-5 6.4-5s5.5 1.7 6.4 5'), 'Профиль и настройки'],
  ['manager', icon('M3 4h14v4H3zM3 12h6v5H3zM12 12h5v5h-5z'), 'Менеджер'],
  ['how', icon('M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 9v4M10 6.6v.1'), 'Как работает'],
]

function App() {
  const [route, setRoute] = useState<Route>('home')
  const [user, setUser] = useState<User | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (token()) api.me().then(async current => {
      setUser(current)
      const saved = await api.conversations()
      setConversations(saved)
      setConversation(saved[0] || null)
      if (current.role === 'MANAGER') setRoute('manager')
    }).catch(() => setToken(null))
  }, [])

  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.classList.remove('menu-open'); window.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const go = (next: Route) => { setRoute(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const logout = () => { setToken(null); setUser(null); setConversation(null); setConversations([]); go('home'); notify('Вы вышли из аккаунта') }
  const updateConversation = (next: Conversation) => { setConversation(next); setConversations(items => [next, ...items.filter(item => item.id !== next.id)]) }
  const addConversation = (next: Conversation) => { setConversations(items => [next, ...items.filter(item => item.id !== next.id)]); setConversation(next) }
  const onAuth = async (result: { access_token: string; user: User; conversation: Conversation }) => {
    setToken(result.access_token)
    setUser(result.user)
    const saved = await api.conversations().catch(() => [result.conversation])
    setConversations(saved)
    setConversation(saved[0] || result.conversation)
    go(result.user.role === 'MANAGER' ? 'manager' : 'chat')
    notify('Добро пожаловать — знакомство начинается')
  }

  const visibleNav = nav.filter(([id]) => id !== 'manager' || user?.role === 'MANAGER')
  const locked = !user && ['chat', 'profile', 'tinder', 'manager'].includes(route)

  const content = locked || route === 'auth'
    ? <Auth onSuccess={onAuth} />
    : route === 'home' ? <Home go={go} user={user} notify={notify} />
    : route === 'discover' ? <Discover notify={notify} />
    : route === 'chat' ? <Chat conversation={conversation} conversations={conversations} setConversation={setConversation} onConversationCreated={addConversation} onConversationUpdated={updateConversation} notify={notify} go={go} />
    : route === 'profile' ? <ProfileCabinet user={user!} notify={notify} onUpdated={setUser} />
    : route === 'tinder' ? <TinderDeck notify={notify} go={go} />
    : route === 'manager' ? <Manager notify={notify} />
    : <How go={go} />

  return <>
    <header className="hdr"><div className="hdr__in">
      <a className="brand pc-brand" href="#" onClick={e => { e.preventDefault(); go('home') }} aria-label="PET CONNECT, на главную">
        <img src={logo} alt="" /><span>PET CONNECT</span>
      </a>
      <div className="pc-top">
        <button className="hbtn menu-btn" type="button" aria-expanded={menuOpen} aria-controls="aside" aria-label="Разделы" onClick={() => setMenuOpen(!menuOpen)}>
          <span>{nav.find(([id]) => id === route)?.[2] || 'Обзор'}</span>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true"><path d="M0 1h16M0 5.5h16M0 10h16" stroke="currentColor" strokeWidth="1.4" /></svg>
        </button>
        {user
          ? <>
            <button className="pc-user" onClick={() => go('profile')} aria-label="Профиль">
              {user.avatar_url ? <img src={user.avatar_url} alt="" /> : <i aria-hidden="true">{user.name.slice(0, 2).toUpperCase()}</i>}
              <span>{user.name.split(' ')[0]}</span>
            </button>
            <button className="hbtn" type="button" onClick={logout}>Выйти</button>
          </>
          : <>
            <button className="hbtn" type="button" onClick={() => go('auth')}>Войти</button>
            <button className="btn btn--fill btn--sm" type="button" onClick={() => go('chat')}>Начать подбор</button>
          </>}
      </div>
    </div></header>

    <div className="app">
      <aside className="aside" id="aside" aria-label="Разделы">
        <nav className="snav" aria-label="Подбор питомца">
          <p className="snav__title">Подбор питомца</p>
          {visibleNav.filter(([id]) => ['home', 'discover', 'chat', 'tinder', 'how'].includes(id)).map(([id, ico, label]) =>
            <a key={id} href={`#${id}`} aria-current={route === id ? 'page' : undefined} onClick={e => { e.preventDefault(); go(id) }}>{ico}{label}</a>)}
        </nav>
        <nav className="snav" aria-label="Аккаунт">
          <p className="snav__title">Аккаунт</p>
          {visibleNav.filter(([id]) => ['profile', 'manager'].includes(id)).map(([id, ico, label]) =>
            <a key={id} href={`#${id}`} aria-current={route === id ? 'page' : undefined} onClick={e => { e.preventDefault(); go(id) }}>{ico}{label}</a>)}
        </nav>
      </aside>

      <main className="main" id="main">
        <div id="view">{content}</div>
        <footer className="mfoot">
          <span>© 2026 PET CONNECT · подбор питомцев фонда «НИКА»</span>
          <a href="https://fond-nika.ru/" target="_blank" rel="noreferrer">fond-nika.ru</a>
          <a href="mailto:info@fond-nika.ru">info@fond-nika.ru</a>
        </footer>
      </main>
    </div>

    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
  </>
}

function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return <div className="pc-hello" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
    <div><h1>{title}</h1>{sub && <p className="pc-sub">{sub}</p>}</div>
    {action}
  </div>
}

function Home({ go, user, notify }: { go: (route: Route) => void; user: User | null; notify: (text: string) => void }) {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [portrait, setPortrait] = useState<PortraitStatus | null>(null)

  useEffect(() => {
    api.animals().then(setAnimals).catch(() => setAnimals([]))
    if (user) api.portrait().then(setPortrait).catch(() => {})
  }, [user?.id])

  const completeness = portrait?.completeness || 0

  return <section>
    <div className="ov">
      <div className="pc-hello">
        <div className="hello">
          <p className="lbl">Личный кабинет</p>
          <h1>{user ? `Здравствуйте, ${user.name.split(' ')[0]}` : 'Новый друг начинается с разговора'}</h1>
          <p className="pc-sub">{user
            ? 'Продолжите знакомство с помощником — он подберёт подопечных фонда под ваш ритм жизни.'
            : 'PET CONNECT помогает познакомиться с подопечными фонда «НИКА» без сложных анкет: просто расскажите о себе.'}</p>
          <p className="pc-sub" style={{ color: 'var(--ink-3)', fontSize: 'var(--fs-xs)' }}>{user ? 'Прогресс и ответы сохраняются в вашем аккаунте.' : 'Начать можно с разговора или с каталога.'}</p>
          <div className="pc-sum">
            {user ? 'Собрано контекста' : 'Подопечных ждут дома'}
            <b>{user ? `${completeness}%` : animals.length || '—'}</b>
          </div>
          <div className="pc-stats">
            <div><b>{animals.length || '—'}</b><span>карточек в каталоге</span></div>
            <div><b>{portrait?.answer_count || 0}</b><span>ответов в интервью</span></div>
            <div><b>{user ? (portrait?.topics.length || 8) : '—'}</b><span>тем подбора</span></div>
            <div><b>{user ? '6' : '—'}</b><span>карточек за раз</span></div>
          </div>
        </div>
        <figure className="pc-hero-photo">
          <figure>
            <img src="https://nika-design.pages.dev/sayt-2/assets/sayt/bim.jpg" alt="Бим, подопечный фонда «НИКА»" />
            <span className="pc-card__mark">ждёт своего человека</span>
          </figure>
          <figcaption><b>Бим · 7 лет</b><span>Центр «Мокрый нос»</span></figcaption>
        </figure>
      </div>

      <div className="pc-qa">
        <button onClick={() => go('chat')}><i>{icon('M3.4 5.6a2.2 2.2 0 0 1 2.2-2.2h8.8a2.2 2.2 0 0 1 2.2 2.2v6a2.2 2.2 0 0 1-2.2 2.2H9.2l-3.6 2.9v-2.9h0a2.2 2.2 0 0 1-2.2-2.2z')}</i><span><b>Продолжить разговор</b><small>Помощник задаст следующий вопрос</small></span>{arrow()}</button>
        <button onClick={() => go('tinder')}><i>{icon('M10 16.6s-6.4-3.8-6.4-8.4A3.5 3.5 0 0 1 10 6.1a3.5 3.5 0 0 1 6.4 2.1c0 4.6-6.4 8.4-6.4 8.4z')}</i><span><b>Выбор сердцами</b><small>Карточки по вашему интервью</small></span>{arrow()}</button>
        <button onClick={() => go('discover')}><i>{icon('M10 10.6c-2.6 0-4.6 2.3-4.6 4.4 0 1.3 1 2 2.2 2 .9 0 1.5-.4 2.4-.4s1.5.4 2.4.4c1.2 0 2.2-.7 2.2-2 0-2.1-2-4.4-4.6-4.4z')}</i><span><b>Весь каталог</b><small>{animals.length || '—'} актуальных карточек фонда</small></span>{arrow()}</button>
        <button onClick={() => go('profile')}><i>{icon('M10 7.4a3.2 3.2 0 1 0 0 .1M3.6 17.2c.9-3.3 3.4-5 6.4-5s5.5 1.7 6.4 5')}</i><span><b>Профиль и настройки</b><small>Предпочтения и избранное</small></span>{arrow()}</button>
      </div>

      {user && completeness > 0 && completeness < 100 && <div className="now">
        <p className="st st--lg">Интервью пройдено на {completeness}%</p>
        <p className="t">Осталось тем: {(portrait?.topics.length || 8) - (portrait?.topics.filter(topic => topic.covered).length || 0)}. После интервью откроются персональные карточки.</p>
        <div className="bar"><i style={{ width: `${completeness}%` }} /></div>
        <div className="acts"><button className="btn btn--fill btn--sm" onClick={() => go('chat')}>Продолжить разговор</button></div>
      </div>}

      <div>
        <div className="sechead">
          <h2 className="h2">Им нужна помощь сейчас</h2>
          <button className="more" onClick={() => go('discover')}>Все подопечные {arrow()}</button>
        </div>
        <ul className="pc-grid">
          {animals.slice(0, 4).map(animal => <AnimalTile key={animal.id} animal={animal} notify={notify} />)}
        </ul>
      </div>

      <div className="pc-callout">
        <div><h2>Познакомьтесь с теми, кто ждёт своего человека</h2><p>Расскажите о себе — и помощник сузит список до тех, кто действительно подойдёт.</p></div>
        <button className="btn btn--light" onClick={() => go('chat')}>{user ? 'Продолжить разговор' : 'Начать разговор'}</button>
      </div>
    </div>
  </section>
}

function arrow() { return <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true"><path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }

function AnimalTile({ animal, notify }: { animal: Animal; notify?: (text: string) => void }) {
  const [saved, setSaved] = useState(false)
  const toggle = async () => {
    try { await api.favorite(animal.id, saved); setSaved(!saved); notify?.(saved ? 'Убрано из избранного' : `${animal.name} в избранном`) } catch { /* keep the previous state when the server rejects the change */ }
  }
  return <li><article className="pc-tile">
    <figure>
      <img src={animal.image_url} alt={`${animal.name}, ${animal.species}`} loading="lazy" />
      <button className={`pc-fav ${saved ? 'is-on' : ''}`} onClick={toggle} aria-label={saved ? 'Убрать из избранного' : 'В избранное'}>{saved ? '♥' : '♡'}</button>
    </figure>
    <h3>{animal.name}</h3>
    <p>{animal.age} · {animal.gender}</p>
    <p className="pc-tile-meta">{animal.guardians}</p>
    <div className="pc-tile__acts">
      <a href={animal.source_url} target="_blank" rel="noreferrer">Карточка фонда</a>
      {animal.shelter && <span className="st st--xs">{animal.shelter}</span>}
    </div>
  </article></li>
}

function Discover({ notify }: { notify: (text: string) => void }) {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [filters, setFilters] = useState({ search: '', species: 'all', gender: 'all', guardians: 'all' })

  useEffect(() => { api.animals().then(setAnimals).catch(error => notify(error.message)) }, [])

  const setFilter = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value }))
  const search = filters.search.trim().toLowerCase()
  const visible = animals.filter(animal => {
    const text = [animal.name, animal.breed, animal.description].filter(Boolean).join(' ').toLowerCase()
    return (!search || text.includes(search)) &&
      (filters.species === 'all' || animal.species === filters.species) &&
      (filters.gender === 'all' || animal.gender === filters.gender) &&
      (filters.guardians === 'all' || (filters.guardians === 'none' ? animal.guardians === 'Пока без опекунов' : animal.guardians !== 'Пока без опекунов'))
  })

  return <section>
    <PageHead title="Подопечные фонда" sub="Реальные карточки из публичного каталога фонда «НИКА». Данные обновляются при запуске сервиса." />
    <div className="pc-filters">
      <div className="pc-field"><label htmlFor="pc-search">Поиск</label><input id="pc-search" className="inp" value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Имя, порода или описание" /></div>
      <div className="pc-field"><label htmlFor="pc-species">Вид</label><select id="pc-species" className="inp" value={filters.species} onChange={e => setFilter('species', e.target.value)}><option value="all">Все виды</option><option value="Собака">Собаки</option><option value="Кошка">Кошки</option></select></div>
      <div className="pc-field"><label htmlFor="pc-gender">Пол</label><select id="pc-gender" className="inp" value={filters.gender} onChange={e => setFilter('gender', e.target.value)}><option value="all">Любой</option><option value="мальчик">Мальчики</option><option value="девочка">Девочки</option></select></div>
      <div className="pc-field"><label htmlFor="pc-guardians">Опекун</label><select id="pc-guardians" className="inp" value={filters.guardians} onChange={e => setFilter('guardians', e.target.value)}><option value="all">Неважно</option><option value="none">Без опекуна</option><option value="has">Есть опекун</option></select></div>
      <div className="pc-filters__foot">
        <span className="st st--xs">Показано {visible.length} из {animals.length}</span>
        <button className="lnk" type="button" onClick={() => setFilters({ search: '', species: 'all', gender: 'all', guardians: 'all' })}>Сбросить фильтры</button>
      </div>
    </div>
    {visible.length
      ? <ul className="pc-grid">{visible.map(animal => <AnimalTile key={animal.id} animal={animal} notify={notify} />)}</ul>
      : <div className="pc-empty"><h3>Ничего не найдено</h3><p>Попробуйте изменить параметры фильтра.</p></div>}
  </section>
}

function Chat({ conversation, conversations, setConversation, onConversationCreated, onConversationUpdated, notify, go }: {
  conversation: Conversation | null; conversations: Conversation[]; setConversation: (c: Conversation | null) => void
  onConversationCreated: (c: Conversation) => void; onConversationUpdated: (c: Conversation) => void
  notify: (text: string) => void; go: (route: Route) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [preference, setPreference] = useState<Preference | null>(null)
  const [portrait, setPortrait] = useState<PortraitStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conversation) { setMessages([]); return }
    api.messages(conversation.id).then(setMessages).catch(() => {})
    api.profile().then(setPreference).catch(() => {})
    api.portrait().then(setPortrait).catch(() => {})
  }, [conversation?.id])

  useEffect(() => {
    const current = token()
    if (!current) return
    const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/portrait?token=${current}`)
    socket.onmessage = event => {
      const payload = JSON.parse(event.data)
      if (payload.type === 'portrait_updated') setPortrait(old => old ? { ...old, completeness: payload.completeness } : old)
      if (payload.type === 'assistant_message') api.portrait().then(setPortrait).catch(() => {})
    }
    return () => socket.close()
  }, [])

  const newChat = async () => {
    try {
      const next = await api.newConversation()
      onConversationCreated(next); setMessages([]); setPreference(null); setPortrait(null)
    } catch (error) { notify((error as Error).message) }
  }

  const send = async (text = input) => {
    if (!text.trim() || loading) return
    setLoading(true); setInput('')
    const optimistic: Message = { id: -Date.now(), role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(old => [...old, optimistic])
    try {
      const result = await api.chat({ conversation_id: conversation?.id, content: text })
      if (conversation) onConversationUpdated(result.conversation)
      else onConversationCreated(result.conversation)
      setMessages(old => [...old, result.assistant_message])
      setPreference(result.preference)
      setPortrait(result.portrait)
    } catch (error) {
      setMessages(old => old.filter(message => message.id !== optimistic.id))
      notify((error as Error).message)
    } finally { setLoading(false) }
  }

  const completeness = portrait?.completeness || 0
  const remaining = portrait?.topics.filter(topic => !topic.covered).length ?? (portrait?.topics.length || 8)

  return <section>
    <PageHead title="Помощник Ника" sub="Обычный разговор вместо анкеты: помощник задаёт по одному вопросу и собирает контекст для подбора." action={<button className="btn btn--line btn--sm" onClick={newChat}>Новый диалог</button>} />
    <div className="pc-chat" style={{ marginTop: 'var(--block)' }}>
      <div className="pc-chat__main">
        <div className="pc-chat__head">
          <div className="pc-bot"><i>✦</i><div><b>Ника</b><small>персональный помощник · онлайн</small></div></div>
          <span className="chip">{conversation?.interview_complete ? 'интервью завершено' : `тем: ${(portrait?.topics.length || 8) - remaining}/${portrait?.topics.length || 8}`}</span>
        </div>
        <div className="pc-progress">
          <div className="pc-progress__h"><span>Прогресс интервью</span><span>{completeness}%</span></div>
          <div className="pc-progress__t"><i style={{ width: `${completeness}%` }} /></div>
        </div>
        <div className="pc-messages">
          {messages.map(message => <div className={`pc-msg ${message.role === 'user' ? 'pc-msg--user' : ''}`} key={message.id}>
            <small>{message.role === 'user' ? 'вы' : 'НИКА'}</small>
            <div className="pc-bubble">{message.content}</div>
          </div>)}
          {loading && <div className="pc-msg"><small>НИКА</small><div className="pc-bubble pc-bubble--dim">Помощник готовит ответ…</div></div>}
          {conversation?.interview_complete && !loading && <div className="pc-done">
            <p className="lbl">Интервью завершено</p>
            <h3>Подбор готов</h3>
            <p>Откройте персональные карточки и выберите сердцем — свайпом вправо или влево.</p>
            <button className="btn btn--fill btn--sm" onClick={() => go('tinder')}>Открыть карточки</button>
          </div>}
        </div>
        {!messages.some(message => message.role === 'user') && <div className="pc-quick">
          <button onClick={() => send('Я хотел бы приютить собаку')}>Собаку</button>
          <button onClick={() => send('Я хотел бы приютить кошку')}>Кошку</button>
          <button onClick={() => send('Пока не знаю')}>Пока не знаю</button>
        </div>}
        <form className="pc-form" onSubmit={e => { e.preventDefault(); send() }}>
          <input className="inp" value={input} onChange={e => setInput(e.target.value)} placeholder="Напишите о себе…" aria-label="Сообщение" />
          <button className="btn btn--fill" type="submit" aria-label="Отправить" disabled={loading}>↑</button>
        </form>
      </div>

      <aside className="pc-side">
        <div className="card">
          <p className="lbl">Контекст подбора</p>
          <h2 className="h3">{completeness}% собрано</h2>
          <p className="hint">Подробные ответы используются внутри подбора и не показываются целиком.</p>
          <dl className="kv">
            <div><dt>Ответов</dt><dd>{portrait?.answer_count || 0}</dd></div>
            <div><dt>Ритм жизни</dt><dd>{preference?.rhythm || 'изучаем'}</dd></div>
            <div><dt>Дом</dt><dd>{preference?.home || 'изучаем'}</dd></div>
            <div><dt>Вид</dt><dd>{preference?.pet_type || 'изучаем'}</dd></div>
          </dl>
        </div>
        <div className="card">
          <p className="lbl">Диалоги</p>
          <div className="pc-hist">
            {conversations.map(item => <button key={item.id} className={conversation?.id === item.id ? 'is-on' : ''} onClick={() => setConversation(item)}>
              {item.title || 'Первое знакомство'}
              <small>{item.interview_complete ? 'интервью завершено' : 'сохранено'}</small>
            </button>)}
          </div>
          <button className="btn btn--line btn--sm" style={{ width: '100%', marginTop: 'var(--s3)' }} onClick={go.bind(null, 'tinder')}>Выбор сердцами</button>
        </div>
      </aside>
    </div>
  </section>
}

function Manager({ notify }: { notify: (text: string) => void }) {
  const [overview, setOverview] = useState<{ users: number; animals: number; conversations: number; without_guardians: number } | null>(null)
  const [users, setUsers] = useState<Array<User & { preference: Preference | null; favorite_count: number; conversation_count: number }>>([])
  const [events, setEvents] = useState<string[]>([])
  const [aiEnabled, setAiEnabled] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [trace, setTrace] = useState<Array<{ agent: string; title: string; content: string; at: string }>>([])

  useEffect(() => {
    Promise.all([api.managerOverview(), api.managerUsers(), api.aiSettings()])
      .then(([stats, people, ai]) => { setOverview(stats); setUsers(people); setAiEnabled(ai.enabled); setHasKey(ai.has_api_key) })
      .catch(error => notify(error.message))
    const current = token()
    if (!current) return
    const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/events?token=${current}`)
    socket.onmessage = event => {
      const payload = JSON.parse(event.data)
      setEvents(old => [`${payload.type} · ${new Date(payload.at).toLocaleTimeString()}`, ...old].slice(0, 8))
      if (payload.type === 'user_message') setTrace(old => [...old, { agent: 'user', title: 'Ответ человека', content: payload.content || 'Ответ получен', at: payload.at }].slice(-12))
      if (payload.type === 'assistant_response') setTrace(old => [...old, { agent: 'assistant', title: 'Помощник Ника', content: payload.content, at: payload.at }].slice(-12))
    }
    return () => socket.close()
  }, [])

  const saveAI = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const next = await api.updateAISettings({ enabled: aiEnabled, api_key: apiKey || undefined })
      setHasKey(next.has_api_key); setApiKey(''); notify(aiEnabled ? 'AI-режим включён' : 'AI-режим выключен')
    } catch (error) { notify((error as Error).message) }
  }

  return <section>
    <PageHead title="Рабочее пространство команды" sub="Пользователи, их анкеты и живой обмен сообщениями между экспертной моделью и помощником." />
    <div className="pc-metrics">
      {([['users', 'пользователей'], ['animals', 'питомцев в каталоге'], ['conversations', 'диалогов'], ['without_guardians', 'без опекунов']] as const).map(([key, label]) =>
        <div className="card" key={key}><b>{overview?.[key] ?? '—'}</b><span>{label}</span></div>)}
    </div>

    <AIAnalyticsPanel notify={notify} />

    <div className="card">
      <form onSubmit={saveAI} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--s3)' }}>
        <div style={{ marginRight: 'auto' }}>
          <p className="lbl">Режим помощника</p>
          <p className="hint" style={{ marginTop: 0 }}>Ключ хранится только на сервере в зашифрованном виде.</p>
        </div>
        <div className="seg" role="group" aria-label="Режим AI">
          <button type="button" aria-pressed={!aiEnabled} onClick={() => setAiEnabled(false)}>Обычный</button>
          <button type="button" aria-pressed={aiEnabled} onClick={() => setAiEnabled(true)}>AI</button>
        </div>
        <input className="inp" style={{ maxWidth: 300 }} type="password" autoComplete="new-password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={hasKey ? 'Ключ сохранён — введите новый' : 'Вставьте API-ключ'} />
        <button className="btn btn--fill btn--sm" type="submit">Сохранить</button>
      </form>
    </div>

    <div className="card" style={{ marginTop: 'var(--s3)' }}>
      <div className="sechead"><h2 className="h2">Обмен сообщениями агентов</h2><span className="chip">{trace.length ? 'идёт обмен' : 'ожидание'}</span></div>
      {trace.length
        ? <div className="pc-trace">{trace.map((item, index) => <article className={`pc-trace__it ${item.agent}`} key={`${item.at}-${index}`}>
          <div><b>{item.title}</b><small>{new Date(item.at).toLocaleTimeString()}</small></div>
          <pre>{item.content}</pre>
        </article>)}</div>
        : <div className="pc-empty"><p>Отправьте ответ в пользовательском диалоге — здесь появятся реальные сообщения агентов.</p></div>}
    </div>

    <div className="card" style={{ marginTop: 'var(--s3)' }}>
      <div className="sechead"><h2 className="h2">Пользователи</h2><span className="st st--xs">{users.length}</span></div>
      <table className="pc-table">
        <thead><tr><th>Пользователь</th><th>Роль</th><th>Диалогов</th><th>Избранное</th><th>Анкета</th></tr></thead>
        <tbody>{users.map(person => <tr key={person.id}>
          <td><b>{person.name}</b><small>{person.email}</small></td>
          <td><span className="chip">{person.role}</span></td>
          <td>{person.conversation_count}</td>
          <td>{person.favorite_count}</td>
          <td>{person.preference?.pet_type || 'не заполнена'}</td>
        </tr>)}</tbody>
      </table>
    </div>

    <div className="card" style={{ marginTop: 'var(--s3)' }}>
      <div className="sechead"><h2 className="h2">Живые события</h2></div>
      <p className="hint" style={{ marginTop: 0 }}>{events.length ? events.join(' · ') : 'Новые сообщения и обновления появятся здесь через WebSocket.'}</p>
    </div>
  </section>
}

function AIAnalyticsPanel({ notify }: { notify: (text: string) => void }) {
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null)
  const [pricing, setPricing] = useState<Array<{ model: string; input_usd_per_million: number; output_usd_per_million: number; updated_at: string | null }>>([])
  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [model, setModel] = useState('')
  const [granularity, setGranularity] = useState('day')
  const [pricingForm, setPricingForm] = useState({ model: '', input_usd_per_million: '', output_usd_per_million: '' })

  const load = () => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate, granularity })
    if (model) params.set('model', model)
    api.aiAnalytics(`?${params}`).then(setAnalytics).catch(error => notify(error.message))
  }

  useEffect(() => {
    load()
    api.aiPricing().then(setPricing).catch(error => notify(error.message))
  }, [])

  const savePricing = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!pricingForm.model) return
    try {
      const saved = await api.updateAIPricing({ model: pricingForm.model, input_usd_per_million: Number(pricingForm.input_usd_per_million) || 0, output_usd_per_million: Number(pricingForm.output_usd_per_million) || 0, updated_at: null })
      setPricing(items => [...items.filter(item => item.model !== saved.model), saved].sort((a, b) => a.model.localeCompare(b.model)))
      setPricingForm({ model: '', input_usd_per_million: '', output_usd_per_million: '' })
      notify('Тариф сохранён')
    } catch (error) { notify((error as Error).message) }
  }

  const summary = analytics?.summary
  const maxCost = Math.max(...(analytics?.series.map(item => item.cost_usd) || [0]), 0.000001)
  const money = (value: number | null | undefined) => value == null ? '—' : `$${value.toFixed(6)}`

  return <div className="pc-ai-analytics">
    <div className="sechead"><div><h2 className="h2">Финансовая аналитика AI</h2><p className="hint">Стоимость рассчитывается только по usage провайдера и сохранённым тарифам модели.</p></div><span className="chip">{summary?.incomplete_requests || 0} неполных</span></div>
    <div className="pc-ai-filters">
      <label>С <input className="inp" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
      <label>По <input className="inp" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
      <label>Модель <select className="inp" value={model} onChange={event => setModel(event.target.value)}><option value="">Все модели</option>{(analytics?.models || []).map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Период <select className="inp" value={granularity} onChange={event => setGranularity(event.target.value)}><option value="day">По дням</option><option value="week">По неделям</option><option value="month">По месяцам</option></select></label>
      <button className="btn btn--line btn--sm" onClick={load}>Обновить</button>
    </div>
    <div className="pc-ai-metrics">
      <div><b>{summary?.total_tokens.toLocaleString() || '0'}</b><span>всего токенов</span></div>
      <div><b>{summary?.input_tokens.toLocaleString() || '0'}</b><span>input tokens</span></div>
      <div><b>{summary?.output_tokens.toLocaleString() || '0'}</b><span>output tokens</span></div>
      <div><b>{money(summary?.cost_usd)}</b><span>общая стоимость</span></div>
      <div><b>{money(summary?.average_cost_usd)}</b><span>средняя стоимость</span></div>
      <div><b>{summary?.requests || 0}</b><span>запросов</span></div>
    </div>
    <div className="pc-ai-grid">
      <div className="card pc-ai-chart"><div className="sechead"><h3 className="h3">Динамика расходов</h3><span className="st st--xs">по дням</span></div>{analytics?.series.length ? <div className="pc-bars">{analytics.series.map(item => <div className="pc-bar" key={item.date} title={`${item.date}: ${money(item.cost_usd)}`}><i style={{ height: `${Math.max(3, item.cost_usd / maxCost * 100)}%` }} /><small>{item.date.slice(5)}</small></div>)}</div> : <div className="pc-empty">Нет usage за выбранный период.</div>}</div>
      <div className="card"><div className="sechead"><h3 className="h3">По моделям</h3><span className="st st--xs">сравнение</span></div>{analytics?.by_model.length ? <table className="pc-table"><thead><tr><th>Модель</th><th>Запросов</th><th>Токенов</th><th>Стоимость</th></tr></thead><tbody>{analytics.by_model.map(item => <tr key={item.model}><td>{item.model}</td><td>{item.requests}</td><td>{item.tokens.toLocaleString()}</td><td>{money(item.cost_usd)}</td></tr>)}</tbody></table> : <div className="pc-empty">Модели появятся после первого запроса.</div>}</div>
    </div>
    <div className="pc-ai-grid">
      <div className="card"><div className="sechead"><h3 className="h3">Самые затратные запросы</h3></div><AIUsageTable items={analytics?.most_expensive || []} money={money} /></div>
      <div className="card"><div className="sechead"><h3 className="h3">Тарифы моделей</h3><span className="st st--xs">USD за 1M</span></div><form className="pc-ai-pricing" onSubmit={savePricing}><input className="inp" placeholder="Название модели" value={pricingForm.model} onChange={event => setPricingForm({ ...pricingForm, model: event.target.value })} required /><input className="inp" type="number" min="0" step="any" placeholder="Input" value={pricingForm.input_usd_per_million} onChange={event => setPricingForm({ ...pricingForm, input_usd_per_million: event.target.value })} required /><input className="inp" type="number" min="0" step="any" placeholder="Output" value={pricingForm.output_usd_per_million} onChange={event => setPricingForm({ ...pricingForm, output_usd_per_million: event.target.value })} required /><button className="btn btn--fill btn--sm" type="submit">Сохранить</button></form>{pricing.length ? <table className="pc-table"><thead><tr><th>Модель</th><th>Input</th><th>Output</th></tr></thead><tbody>{pricing.map(item => <tr key={item.model}><td>{item.model}</td><td>${item.input_usd_per_million}</td><td>${item.output_usd_per_million}</td></tr>)}</tbody></table> : <p className="hint">Тарифы не настроены. Стоимость останется неизвестной, пока менеджер не добавит тариф.</p>}</div>
    </div>
    <div className="card"><div className="sechead"><h3 className="h3">История запросов</h3><span className="st st--xs">последние 100</span></div><AIUsageTable items={analytics?.history || []} money={money} /></div>
  </div>
}

function AIUsageTable({ items, money }: { items: AIAnalytics['history']; money: (value: number | null | undefined) => string }) {
  if (!items.length) return <div className="pc-empty">Запросов с usage пока нет.</div>
  return <div className="pc-ai-table-wrap"><table className="pc-table"><thead><tr><th>Время / пользователь</th><th>Модель</th><th>Input</th><th>Output</th><th>Стоимость</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString()}<small>{item.user_name || 'системный запрос'} · {item.agent}</small></td><td>{item.model}</td><td>{item.input_tokens?.toLocaleString() || '—'}</td><td>{item.output_tokens?.toLocaleString() || '—'}</td><td>{item.cost_usd == null ? <span className="pc-incomplete">неполная статистика</span> : money(item.cost_usd)}</td></tr>)}</tbody></table></div>
}

function How({ go }: { go: (route: Route) => void }) {
  return <section>
    <PageHead title="Как работает подбор" sub="Сервис бережно собирает контекст разговора и соединяет его с актуальным каталогом фонда «НИКА»." />
    <div className="pc-steps">
      <article><b>01</b><h3>Познакомьтесь</h3><p>Расскажите помощнику о ритме жизни, доме и ожиданиях. Это разговор, а не анкета.</p></article>
      <article><b>02</b><h3>Уточните важное</h3><p>Ответы сохраняются в анкете и портрете подбора. Их можно менять в любой момент.</p></article>
      <article><b>03</b><h3>Выберите друга</h3><p>После интервью откроются карточки, отсортированные под вас, и «Выбор сердцем».</p></article>
    </div>
    <div className="pc-callout" style={{ marginTop: 'var(--block)' }}>
      <div><h2>Готовы начать?</h2><p>Первый вопрос уже ждёт в диалоге с помощником.</p></div>
      <button className="btn btn--light" onClick={() => go('chat')}>Начать разговор</button>
    </div>
  </section>
}

function Auth({ onSuccess }: { onSuccess: (result: { access_token: string; user: User; conversation: Conversation }) => void }) {
  const [loginMode, setLoginMode] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = Object.fromEntries(new FormData(event.currentTarget))
    try {
      const result = loginMode
        ? await api.login({ email: String(data.email), password: String(data.password) })
        : await api.register({ name: String(data.name), email: String(data.email), password: String(data.password) })
      onSuccess(result)
    } catch (e) { setError((e as Error).message) }
  }
  return <div className="pc-auth">
    <form className="card" onSubmit={submit}>
      <p className="lbl">PET CONNECT / {loginMode ? 'вход' : 'регистрация'}</p>
      <h1>{loginMode ? 'С возвращением' : 'Найдём своего'}</h1>
      <p>{loginMode ? 'Продолжите подбор с того места, где остановились.' : 'Создайте профиль и сразу начните знакомство с помощником.'}</p>
      {!loginMode && <label>Имя<input className="inp" name="name" minLength={2} required placeholder="Например, Аня" /></label>}
      <label>Email<input className="inp" name="email" type="email" required placeholder="you@example.com" /></label>
      <label>Пароль<input className="inp" name="password" type="password" minLength={8} required placeholder="не короче 8 символов" /></label>
      {error && <div className="pc-err" style={{ marginBottom: 'var(--s3)' }}>{error}</div>}
      <button className="btn btn--fill" type="submit">{loginMode ? 'Войти' : 'Создать профиль'}</button>
      <button className="lnk" type="button" onClick={() => setLoginMode(!loginMode)}>{loginMode ? 'Создать новый профиль' : 'У меня уже есть аккаунт'}</button>
    </form>
  </div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
