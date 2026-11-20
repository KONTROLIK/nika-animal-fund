import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api, type Animal, type Conversation, type Message, type PortraitStatus, type Preference, type User, setToken, token } from './api'
import './styles.css'
import { ProfileCabinet } from './ProfileCabinet'
import { TinderDeck } from './TinderDeck'

type Route = 'home' | 'discover' | 'chat' | 'profile' | 'tinder' | 'manager' | 'how' | 'auth'
const nav: Array<[Route, string, string]> = [['home', '⌂', 'Обзор'], ['discover', '✦', 'Найти питомца'], ['chat', '◌', 'Помощник'], ['tinder', '♡', 'Выбор сердцем'], ['profile', '○', 'Профиль'], ['manager', '▦', 'Менеджер'], ['how', '⌁', 'Как работает']]

function App() {
  const [route, setRoute] = useState<Route>('home')
  const [user, setUser] = useState<User | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [toast, setToast] = useState('')
  useEffect(() => { if (token()) api.me().then(async current => { setUser(current); const saved = await api.conversations(); setConversations(saved); setConversation(saved[0] || null) }).catch(() => setToken(null)) }, [])
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2600) }
  const go = (next: Route) => { setRoute(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const logout = () => { setToken(null); setUser(null); setConversation(null); setConversations([]); go('home'); notify('Вы вышли из аккаунта') }
  const updateConversation = (next: Conversation) => { setConversation(next); setConversations(items => [next, ...items.filter(item => item.id !== next.id)]) }
  const addConversation = (next: Conversation) => { setConversations(items => [next, ...items.filter(item => item.id !== next.id)]); setConversation(next) }
  const onAuth = async (result: { access_token: string; user: User; conversation: Conversation }) => { setToken(result.access_token); setUser(result.user); const saved = await api.conversations().catch(() => [result.conversation]); setConversations(saved); setConversation(saved[0] || result.conversation); go('chat'); notify('Добро пожаловать — знакомство начинается') }
  const content = route === 'auth' ? <Auth onSuccess={onAuth} /> : !user && ['chat', 'profile', 'tinder', 'manager'].includes(route) ? <Auth onSuccess={onAuth} /> : route === 'manager' && user?.role !== 'MANAGER' ? <AccessDenied go={() => go('home')} /> : route === 'home' ? <Home go={go} /> : route === 'discover' ? <Discover notify={notify} go={go} /> : route === 'chat' ? <Chat conversation={conversation} conversations={conversations} setConversation={setConversation} onConversationCreated={addConversation} onConversationUpdated={updateConversation} notify={notify} go={go} /> : route === 'profile' ? <ProfileCabinet user={user!} notify={notify} onUpdated={setUser} /> : route === 'tinder' ? <TinderDeck notify={notify} go={go} /> : route === 'manager' ? <Manager notify={notify} /> : <How />
  const visibleNav = nav.filter(([id]) => id !== 'tinder' && (id !== 'manager' || user?.role === 'MANAGER'))
  return <div className="app-shell"><aside className="sidebar"><div className="brand">PET <span>CONNECT</span></div><div className="side-label">умный поиск дома</div><nav>{visibleNav.map(([id, icon, label]) => <React.Fragment key={id}><button className={route === id ? 'active' : ''} onClick={() => go(id)}><i>{icon}</i><span>{label}</span></button>{id === 'chat' && <button className={`nav-subitem ${route === 'tinder' ? 'active' : ''}`} onClick={() => go('tinder')} aria-label="Выбор сердца"><i>♡</i><span>Выбор сердца</span></button>}</React.Fragment>)}</nav><div className="side-footer"><div className="side-label">новый друг рядом</div><p>Знакомься с питомцами и выбирай сердцем.</p></div></aside><main className="workspace"><header className="topbar"><span className="crumb">{route === 'home' ? 'Добрый день' : `PET CONNECT / ${nav.find(([id]) => id === route)?.[2] || 'Вход'}`}</span><div className="top-actions">{user ? <><button className="user-chip" onClick={() => go('profile')}>{user.name.slice(0, 2).toUpperCase()}</button><button className="logout-button" onClick={logout}>Выйти</button></> : <button className="top-login" onClick={() => go('auth')}>Войти ↗</button>}</div></header><div className="content">{content}</div></main>{toast && <div className="toast">{toast}</div>}</div>
}

function AccessDenied({ go }: { go: () => void }) { return <div className="empty"><h2>Раздел недоступен</h2><p>Рабочее пространство команды доступно только сотрудникам с ролью менеджера.</p><button className="button" onClick={go}>Вернуться на главную</button></div> }

function Home({ go }: { go: (route: Route) => void }) {
  const [animals, setAnimals] = useState<Animal[]>([])
  useEffect(() => { api.animals().then(setAnimals).catch(() => setAnimals([])) }, [])
  return <section><div className="hero"><div><div className="eyebrow">01 / знакомство начинается здесь</div><h1>Новый друг<br />начинается с <em>разговора.</em></h1><p className="lead">PET CONNECT помогает познакомиться с подопечными фонда «НИКА». Без сложных анкет — просто расскажи о себе.</p><div className="hero-actions"><button className="button lime" onClick={() => go('chat')}>Начать разговор ↗</button><button className="button outline" onClick={() => go('discover')}>Смотреть питомцев</button></div></div><div className="hero-visual"><img src="https://nika-design.pages.dev/sayt-2/assets/sayt/bim.jpg" alt="Бим, 7 лет" /><div className="sticker">питомцы<br />ждут своего<br />человека ✦</div><div className="photo-caption"><b>Бим · 7 лет</b><span>Подопечный фонда «НИКА»</span></div></div></div><div className="stats"><div><b>416,2 млн ₽</b><span>направлено на помощь в 2025 году</span></div><div><b>1136</b><span>животных стерилизовано</span></div><div><b>{animals.length || '—'}</b><span>актуальных карточек в каталоге</span></div></div><div className="section-head"><div><div className="eyebrow">02 / актуальные подопечные</div><h2>Им нужна помощь сейчас.</h2></div><button className="link-button" onClick={() => go('discover')}>Все подопечные →</button></div><div className="cards">{animals.slice(0, 3).map(animal => <AnimalCard key={animal.id} animal={animal} />)}</div><div className="callout"><h2>Познакомься с теми, кто ждёт своего человека.</h2><button className="button lime" onClick={() => go('tinder')}>Выбирать сердцем ↗</button></div></section>
}

function AnimalCard({ animal, onFavorite }: { animal: Animal; onFavorite?: () => void }) { const [saved, setSaved] = useState(false); const toggle = async () => { try { await api.favorite(animal.id, saved); setSaved(!saved); onFavorite?.() } catch {} }; return <article className="animal-card"><img src={animal.image_url} alt={`${animal.name}, ${animal.gender}`} /><button className={`heart ${saved ? 'saved' : ''}`} onClick={toggle} aria-label="Добавить в избранное">{saved ? '♥' : '♡'}</button><div className="animal-info"><div className="animal-title"><div><h3>{animal.name}</h3><span>{animal.age} · {animal.gender} · {animal.species}</span></div></div><p>{animal.description?.split('\n')[0] || 'Информация о питомце опубликована фондом.'}</p><div className="card-footer"><span className="tag">{animal.shelter}</span><a href={animal.source_url} target="_blank" rel="noreferrer">Подробнее ↗</a></div><div className="animal-meta">{animal.guardians} · {animal.is_available ? 'ищет дом' : 'статус уточняется'}</div></div></article> }

function Discover({ notify, go }: { notify: (s: string) => void; go: (r: Route) => void }) {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [filters, setFilters] = useState({ search: '', species: 'all', gender: 'all', guardians: 'all', children: 'all', pets: 'all' })

  useEffect(() => { api.animals().then(setAnimals).catch(e => notify(e.message)) }, [])

  const setFilter = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value }))
  const matchesCompatibility = (value: string, actual: boolean | null) => value === 'all' || (value === 'yes' && actual === true) || (value === 'no' && actual === false) || (value === 'unknown' && actual === null)
  const search = filters.search.trim().toLowerCase()
  const visibleAnimals = animals.filter(animal => {
    const text = [animal.name, animal.breed, animal.description].filter(Boolean).join(' ').toLowerCase()
    return (!search || text.includes(search)) &&
      (filters.species === 'all' || animal.species === filters.species) &&
      (filters.gender === 'all' || animal.gender === filters.gender) &&
      (filters.guardians === 'all' || (filters.guardians === 'none' ? animal.guardians === 'Пока без опекунов' : animal.guardians !== 'Пока без опекунов')) &&
      matchesCompatibility(filters.children, animal.children_compatible) &&
      matchesCompatibility(filters.pets, animal.pets_compatible)
  })
  const reset = () => setFilters({ search: '', species: 'all', gender: 'all', guardians: 'all', children: 'all', pets: 'all' })

  return <section><PageTitle eyebrow="02 / актуальный каталог фонда" title="Найти питомца." text="Реальные подопечные, опубликованные на сайте фонда «НИКА»." action={<button className="button" onClick={() => go('tinder')}>Выбирать сердцем ↗</button>} /><div className="catalog-filters"><div className="eyebrow">подробный фильтр</div><div className="filter-grid"><label className="filter-label">Поиск<input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Имя, порода или описание" /></label><label className="filter-label">Вид<select value={filters.species} onChange={e => setFilter('species', e.target.value)}><option value="all">Все виды</option><option value="Собака">Собаки</option><option value="Кошка">Кошки</option></select></label><label className="filter-label">Пол<select value={filters.gender} onChange={e => setFilter('gender', e.target.value)}><option value="all">Любой</option><option value="мальчик">Мальчики</option><option value="девочка">Девочки</option></select></label><label className="filter-label">Опекун<select value={filters.guardians} onChange={e => setFilter('guardians', e.target.value)}><option value="all">Неважно</option><option value="none">Без опекуна</option><option value="has">Есть опекун</option></select></label><label className="filter-label">С детьми<select value={filters.children} onChange={e => setFilter('children', e.target.value)}><option value="all">Неважно</option><option value="yes">Совместим</option><option value="no">Не совместим</option><option value="unknown">Не указано</option></select></label><label className="filter-label">С животными<select value={filters.pets} onChange={e => setFilter('pets', e.target.value)}><option value="all">Неважно</option><option value="yes">Совместим</option><option value="no">Не совместим</option><option value="unknown">Не указано</option></select></label></div><button className="link-button filter-reset" type="button" onClick={reset}>Сбросить фильтры</button></div><div className="catalog-result"><span className="source-note">Показано {visibleAnimals.length} из {animals.length} карточек</span></div><div className="cards">{visibleAnimals.map(animal => <AnimalCard key={animal.id} animal={animal} />)}</div>{visibleAnimals.length === 0 && <div className="empty"><h3>Ничего не найдено</h3><p>Попробуй изменить параметры фильтра.</p></div>}<p className="source-note">Данные обновляются из публичного каталога фонда «НИКА».</p></section>
}

function Chat({ conversation, conversations, setConversation, onConversationCreated, onConversationUpdated, notify, go }: { conversation: Conversation | null; conversations: Conversation[]; setConversation: (c: Conversation | null) => void; onConversationCreated: (c: Conversation) => void; onConversationUpdated: (c: Conversation) => void; notify: (s: string) => void; go: (route: Route) => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [preference, setPreference] = useState<Preference | null>(null)
  const [portrait, setPortrait] = useState<PortraitStatus | null>(null)
  const [stage, setStage] = useState('ready')
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
      if (payload.type === 'dialog_received') setStage('received')
      if (payload.type === 'portrait_analysis_started') setStage('analysis')
      if (payload.type === 'portrait_updated') { setStage('portrait'); setPortrait(old => old ? { ...old, completeness: payload.completeness, answer_count: payload.covered_topics } : old) }
      if (payload.type === 'assistant_message') setStage('complete')
    }
    return () => socket.close()
  }, [])

  const newChat = async () => {
    try {
      const next = await api.newConversation()
      onConversationCreated(next)
      setMessages([])
      setPreference(null)
      setPortrait(null)
      setStage('ready')
    } catch (e) { notify((e as Error).message) }
  }

  const send = async (text = input) => {
    if (!text.trim() || loading) return
    setLoading(true)
    setStage('received')
    setInput('')
    const optimisticMessage: Message = { id: -Date.now(), role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(old => [...old, optimisticMessage])
    try {
      const result = await api.chat({ conversation_id: conversation?.id, content: text })
      if (conversation) onConversationUpdated(result.conversation)
      else onConversationCreated(result.conversation)
      setMessages(old => [...old, result.assistant_message])
      setPreference(result.preference)
      setPortrait(result.portrait)
      setStage('complete')
    } catch (e) {
      setMessages(old => old.filter(message => message.id !== optimisticMessage.id))
      notify((e as Error).message)
    } finally { setLoading(false) }
  }

  return <section><div className="chat-layout"><aside className="chat-list"><div className="eyebrow">диалоги</div><button className="button small" onClick={newChat}>+ Новый диалог</button><div className="chat-history">{conversations.map(item => <button key={item.id} className={`chat-list-item ${conversation?.id === item.id ? 'active' : ''}`} onClick={() => setConversation(item)}>{item.title || 'Первое знакомство'}<small>{item.interview_complete ? 'интервью завершено' : 'сохранено на сервере'}</small></button>)}</div></aside><div className="chat-main"><div className="chat-header"><div className="bot"><span>✦</span><div>Ника<small>персональный помощник · онлайн</small></div></div><span className="tag">УМНЫЙ ПОДБОР</span></div><ProcessSummary portrait={messages.some(message => message.role === 'user') ? portrait : null} /><div className="messages">{messages.map(message => <div className={`message ${message.role === 'user' ? 'user' : ''}`} key={message.id}><small>{message.role === 'user' ? 'ты' : 'НИКА'}</small><div className="bubble">{message.content}</div></div>)}{loading && <div className="message"><small>НИКА</small><div className="bubble muted">Помощник готовит ответ…</div></div>}{conversation?.interview_complete && !loading && <div className="interview-complete"><div className="eyebrow">интервью завершено</div><h3>Подбор готов.</h3><p>Теперь можно открыть персональные карточки питомцев и выбрать сердцем — свайпом вправо или влево.</p><button className="button lime" onClick={() => go('tinder')}>Открыть карточки с питомцами ↗</button></div>}</div><div className="quick"><button onClick={() => send('Я хотел бы приютить собаку')}>Собака 🐕</button><button onClick={() => send('Я хотел бы приютить кошку')}>Кошка 🐈</button><button onClick={() => send('Пока не знаю')}>Пока не знаю</button></div><form className="chat-form" onSubmit={e => { e.preventDefault(); send() }}><input value={input} onChange={e => setInput(e.target.value)} placeholder="Напиши о себе..." /><button className="send">↑</button></form></div><aside className="chat-context"><div className="eyebrow">контекст подбора</div><div className="context-card"><span className="tag">ПОРТРЕТ ВЛАДЕЛЬЦА</span><strong>{portrait?.completeness || 0}% контекста собрано</strong><p>Подробные ответы используются внутри подбора и не показываются целиком в анкете.</p></div><div className="context-row"><span>Ответов</span><b>{portrait?.answer_count || 0}</b></div><div className="context-row"><span>Ритм жизни</span><b>{preference?.rhythm || 'изучаем'}</b></div><div className="context-row"><span>Дом</span><b>{preference?.home || 'изучаем'}</b></div></aside></div></section>
}

function ProcessSummary({ portrait }: { portrait: PortraitStatus | null }) {
  const completeness = portrait?.completeness || 0
  const remaining = portrait?.topics.filter(topic => !topic.covered).length ?? 15
  return <div className="process-summary"><div className="process-summary-head"><div><div className="eyebrow">прогресс интервью</div><strong>Анализ завершён на {completeness}%</strong></div><span>{remaining === 0 ? 'вопросов не осталось' : `Осталось вопросов: ${remaining}`}</span></div><div className="process-summary-track"><i style={{ width: `${completeness}%` }} /></div></div>
}
function Profile({ notify }: { notify: (s: string) => void }) { const [profile, setProfile] = useState<Preference | null>(null); const [history, setHistory] = useState<Array<{ field: string; old_value: string | null; new_value: string | null; created_at: string }>>([]); const [form, setForm] = useState({ pet_type: '', rhythm: '', home: '', wishes: '' }); useEffect(() => { Promise.all([api.profile(), api.history()]).then(([p, changes]) => { setProfile(p); setHistory(changes); setForm({ pet_type: p.pet_type || '', rhythm: p.rhythm || '', home: p.home || '', wishes: p.wishes || '' }) }).catch(e => notify(e.message)) }, []); const save = async (e: React.FormEvent) => { e.preventDefault(); try { const next = await api.updateProfile(form); setProfile(next); setHistory(await api.history()); notify('Анкета сохранена — подбор обновлён') } catch (e) { notify((e as Error).message) } }; return <section><PageTitle eyebrow="03 / твой контекст" title="Моя анкета." text="Помощник сохраняет только то, чем ты хочешь поделиться. Всё можно изменить." /><div className="profile-grid"><div className="profile-card"><div className="profile-mark">PC</div><h2>Твой профиль</h2><p>Настройки подбора синхронизированы с аккаунтом.</p><div className="pills"><span>{profile?.pet_type || 'вид питомца'}</span><span>{profile?.rhythm || 'ритм жизни'}</span><span>{profile?.home || 'тип дома'}</span></div></div><form className="panel form-grid" onSubmit={save}><div className="panel-head full"><h3>Что важно при выборе</h3><span className="eyebrow">сохранение на сервере</span></div><label>Вид питомца<select value={form.pet_type} onChange={e => setForm({ ...form, pet_type: e.target.value })}><option value="">Выбери вариант</option><option>Собака</option><option>Кошка</option><option>Не определился</option></select></label><label>Ритм жизни<select value={form.rhythm} onChange={e => setForm({ ...form, rhythm: e.target.value })}><option value="">Пока изучаем</option><option>Спокойный</option><option>Активный</option><option>Смешанный</option></select></label><label>Мой дом<select value={form.home} onChange={e => setForm({ ...form, home: e.target.value })}><option value="">Не указано</option><option>Квартира</option><option>Дом</option></select></label><label className="full">Пожелания<textarea value={form.wishes} onChange={e => setForm({ ...form, wishes: e.target.value })} placeholder="Расскажи, каким должен быть ваш общий день..." /></label><div className="full align-right"><button className="button" type="submit">Сохранить изменения ↗</button></div></form></div><div className="panel history"><div className="eyebrow">история изменений</div><h2>Контекст подбора</h2>{history.length ? history.map(item => <div className="history-item" key={`${item.created_at}-${item.field}`}><b>{item.field}</b><span>{item.old_value || 'не задано'} → {item.new_value || 'удалено'}</span></div>) : <p className="source-note">Изменения появятся после первого сохранения.</p>}</div></section> }

function Tinder({ notify }: { notify: (s: string) => void }) { const [animals, setAnimals] = useState<Animal[]>([]); const [index, setIndex] = useState(0); useEffect(() => { api.tinder().then(setAnimals).catch(e => notify(e.message)) }, []); const current = animals[index]; const swipe = async (decision: 'like' | 'skip') => { if (!current) return; try { await api.swipe(current.id, decision); setIndex(index + 1); if (decision === 'like') notify(`${current.name} добавлен в избранное`) } catch (e) { notify((e as Error).message) } }; return <section><PageTitle eyebrow="04 / выбор сердцем" title="Кому сказать «да»?" text="Листай актуальных подопечных. Понравившиеся питомцы попадут в избранное." />{current ? <div className="tinder"><div className="tinder-card"><img src={current.image_url} alt={current.name} /><div className="tinder-info"><span className="tag">{current.guardians}</span><h2>{current.name}</h2><p>{current.age} · {current.gender}</p><a href={current.source_url} target="_blank" rel="noreferrer">Открыть карточку фонда ↗</a></div></div><div className="swipe-actions"><button className="skip" onClick={() => swipe('skip')}>× <span>Пропустить</span></button><button className="like" onClick={() => swipe('like')}>♥ <span>Нравится</span></button></div><div className="progress-line"><span style={{ width: `${Math.min(100, (index / animals.length) * 100)}%` }} /></div></div> : <div className="empty"><h3>Карточки закончились</h3><p>Ты просмотрел всех питомцев из текущего каталога.</p></div>}</section> }

function Manager({ notify }: { notify: (s: string) => void }) { const [overview, setOverview] = useState<{ users: number; animals: number; conversations: number; without_guardians: number } | null>(null); const [users, setUsers] = useState<Array<User & { preference: Preference | null; favorite_count: number; conversation_count: number }>>([]); const [events, setEvents] = useState<string[]>([]); const [activeStage, setActiveStage] = useState('ready'); const [aiEnabled, setAiEnabled] = useState(false); const [hasKey, setHasKey] = useState(false); const [apiKey, setApiKey] = useState(''); useEffect(() => { Promise.all([api.managerOverview(), api.managerUsers(), api.aiSettings()]).then(([stats, people, ai]) => { setOverview(stats); setUsers(people); setAiEnabled(ai.enabled); setHasKey(ai.has_api_key) }).catch(e => notify((e as Error).message)); const current = token(); if (!current) return; const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/events?token=${current}`); socket.onmessage = event => { const payload = JSON.parse(event.data); setActiveStage(payload.type); setEvents(old => [`${payload.type} · ${new Date(payload.at).toLocaleTimeString()}`, ...old].slice(0, 8)) }; return () => socket.close() }, []); const saveAI = async (event: React.FormEvent) => { event.preventDefault(); try { const next = await api.updateAISettings({ enabled: aiEnabled, api_key: apiKey || undefined }); setHasKey(next.has_api_key); setApiKey(''); notify(aiEnabled ? 'AI-режим включён' : 'AI-режим выключен') } catch (e) { notify((e as Error).message) } }; return <section><PageTitle eyebrow="05 / рабочее пространство команды" title="Менеджер." text="Пользователи, их анкеты и актуальные статусы подбора." /><div className="panel ai-settings"><div><div className="eyebrow">режим помощника</div><h3>Использовать AI для ответов</h3><p className="source-note">Ключ хранится только на сервере в зашифрованном виде. В браузер он не возвращается.</p></div><form onSubmit={saveAI} className="ai-settings-form"><label className="toggle"><input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} /><span>{aiEnabled ? 'AI включён' : 'Обычный режим'}</span></label><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={hasKey ? 'Ключ сохранён · введите новый для замены' : 'Вставьте API-ключ'} autoComplete="new-password" /><button className="button" type="submit">Сохранить режим</button></form></div><div className="metrics">{[['users', 'пользователей'], ['animals', 'питомцев в каталоге'], ['conversations', 'диалогов'], ['without_guardians', 'без опекунов']].map(([key, label]) => <div className="metric" key={key}><b>{overview?.[key as keyof typeof overview] ?? '—'}</b><span>{label}</span></div>)}</div><div className="panel table-wrap"><table><thead><tr><th>Пользователь</th><th>Роль</th><th>Диалогов</th><th>Избранное</th><th>Профиль</th></tr></thead><tbody>{users.map(person => <tr key={person.id}><td><b>{person.name}</b><small>{person.email}</small></td><td><span className="status">{person.role}</span></td><td>{person.conversation_count}</td><td>{person.favorite_count}</td><td>{person.preference?.pet_type || 'не заполнен'}</td></tr>)}</tbody></table></div><div className="room"><div className="eyebrow">живые события</div><h2>Как формируется рекомендация</h2><p>{events.length ? events.join(' · ') : 'Новые сообщения и обновления профилей появятся здесь через WebSocket.'}</p></div></section> }

function How() { return <section><PageTitle eyebrow="06 / как работает подбор" title="Понятный путь к своему питомцу." text="Сервис бережно собирает контекст разговора и соединяет его с актуальным каталогом фонда." /><div className="steps"><div><b>01</b><h3>Познакомьтесь</h3><p>Расскажите помощнику о ритме жизни, доме и своих ожиданиях.</p></div><div><b>02</b><h3>Уточните важное</h3><p>Ответы сохраняются в анкете. Её можно менять в любой момент.</p></div><div><b>03</b><h3>Выберите друга</h3><p>Смотрите реальные карточки питомцев и связывайтесь с фондом.</p></div></div></section> }

function Auth({ onSuccess }: { onSuccess: (result: { access_token: string; user: User; conversation: Conversation }) => void }) { const [loginMode, setLoginMode] = useState(false); const [error, setError] = useState(''); const submit = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); setError(''); const data = Object.fromEntries(new FormData(e.currentTarget)); try { const result = loginMode ? await api.login({ email: String(data.email), password: String(data.password) }) : await api.register({ name: String(data.name), email: String(data.email), password: String(data.password) }); onSuccess(result) } catch (e) { setError((e as Error).message) } }; return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}><div className="eyebrow">PET CONNECT / {loginMode ? 'вход' : 'регистрация'}</div><h1>{loginMode ? 'С возвращением.' : 'Найдём своего.'}</h1><p className="lead">{loginMode ? 'Продолжи подбор с того места, где остановился.' : 'Создай профиль и сразу начни знакомство с помощником.'}</p>{!loginMode && <label>Имя<input name="name" minLength={2} required placeholder="Например, Аня" /></label>}<label>Email<input name="email" type="email" required placeholder="you@example.com" /></label><label>Пароль<input name="password" type="password" minLength={8} required placeholder="не короче 8 символов" /></label>{error && <div className="error">{error}</div>}<button className="button lime full" type="submit">{loginMode ? 'Войти' : 'Создать профиль'} ↗</button><button className="link-button center" type="button" onClick={() => setLoginMode(!loginMode)}>{loginMode ? 'Создать новый профиль' : 'У меня уже есть аккаунт'}</button></form></div> }

function PageTitle({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) { return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="lead">{text}</p></div>{action}</div> }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)


