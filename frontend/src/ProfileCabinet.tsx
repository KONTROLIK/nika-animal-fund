import { useEffect, useState, type FormEvent } from 'react'
import { api, type Animal, type PortraitStatus, type Preference, type User } from './api'

type Props = { user: User; notify: (message: string) => void; onUpdated: (user: User) => void }
type Tab = 'account' | 'preferences' | 'favorites'

export function ProfileCabinet({ user, notify, onUpdated }: Props) {
  const [tab, setTab] = useState<Tab>('account')
  const [account, setAccount] = useState({ name: user.name, email: user.email, phone: user.phone || '', city: user.city || '', postal_code: user.postal_code || '', address: user.address || '', contact_method: user.contact_method || 'email', avatar_url: user.avatar_url || '' })
  const [profile, setProfile] = useState<Preference | null>(null)
  const [portrait, setPortrait] = useState<PortraitStatus | null>(null)
  const [favorites, setFavorites] = useState<Animal[]>([])
  const [form, setForm] = useState({ pet_type: '', rhythm: '', home: '', wishes: '' })

  useEffect(() => {
    Promise.all([api.profile(), api.portrait(), api.favorites()]).then(([preferences, privatePortrait, savedFavorites]) => {
      setProfile(preferences)
      setPortrait(privatePortrait)
      setFavorites(savedFavorites)
      setForm({ pet_type: preferences.pet_type || '', rhythm: preferences.rhythm || '', home: preferences.home || '', wishes: preferences.wishes || '' })
    }).catch(error => notify(error.message))
  }, [])

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault()
    try { const updated = await api.updateAccount(account); onUpdated(updated); notify('Личные данные сохранены') } catch (error) { notify((error as Error).message) }
  }

  const uploadAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 1_500_000) { notify('Выберите изображение размером до 1,5 МБ'); return }
    const reader = new FileReader()
    reader.onload = () => setAccount(current => ({ ...current, avatar_url: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  const savePreferences = async (event: FormEvent) => {
    event.preventDefault()
    try { const next = await api.updateProfile(form); setProfile(next); notify('Анкета сохранена — подбор обновлён') } catch (error) { notify((error as Error).message) }
  }

  const completeness = portrait?.completeness || 0

  return <section>
    <div className="pc-hello" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s5)' }}>
        <label className="pc-avatar">
          {account.avatar_url ? <img src={account.avatar_url} alt="Аватар профиля" /> : <span>{user.name.slice(0, 2).toUpperCase()}</span>}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadAvatar} />
          <small>Изменить</small>
        </label>
        <div>
          <p className="lbl">Личный кабинет</p>
          <h1 className="h1" style={{ fontSize: 'var(--fs-3xl)' }}>{user.name}</h1>
          <p className="sub" style={{ marginTop: 'var(--s1)' }}>{user.email}</p>
        </div>
      </div>
      <span className="chip">{user.role === 'MANAGER' ? 'Менеджер' : 'Пользователь'}</span>
    </div>

    <div className="pc-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'account'} onClick={() => setTab('account')}>Личные данные</button>
      <button role="tab" aria-selected={tab === 'preferences'} onClick={() => setTab('preferences')}>Моя анкета</button>
      <button role="tab" aria-selected={tab === 'favorites'} onClick={() => setTab('favorites')}>Избранное{favorites.length ? ` · ${favorites.length}` : ''}</button>
    </div>

    {tab === 'account' && <form className="card" onSubmit={saveAccount}>
      <div className="sechead"><h2 className="h2">Контактная информация</h2><span className="st st--xs">сохраняется на сервере</span></div>
      <div className="pc-form2">
        <label>Имя<input className="inp" value={account.name} onChange={e => setAccount({ ...account, name: e.target.value })} required /></label>
        <label>Email<input className="inp" type="email" value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })} required /></label>
        <label>Телефон<input className="inp" value={account.phone} onChange={e => setAccount({ ...account, phone: e.target.value })} placeholder="+7 (___) ___-__-__" /></label>
        <label>Город<input className="inp" value={account.city} onChange={e => setAccount({ ...account, city: e.target.value })} placeholder="Москва" /></label>
        <label>Почтовый индекс<input className="inp" value={account.postal_code} onChange={e => setAccount({ ...account, postal_code: e.target.value })} placeholder="123456" /></label>
        <label>Способ связи<select value={account.contact_method} onChange={e => setAccount({ ...account, contact_method: e.target.value })}><option value="email">Email</option><option value="phone">Телефон</option><option value="telegram">Telegram</option></select></label>
        <label className="full">Адрес<textarea value={account.address} onChange={e => setAccount({ ...account, address: e.target.value })} placeholder="Улица, дом, квартира" /></label>
      </div>
      <div className="pc-hrow"><button className="btn btn--fill btn--sm" type="submit">Сохранить личные данные</button></div>
    </form>}

    {tab === 'preferences' && <div className="pc-deck">
      <form className="card" onSubmit={savePreferences}>
        <div className="sechead"><h2 className="h2">Что важно при выборе</h2><span className="st st--xs">сохранение на сервере</span></div>
        <div className="pc-form2">
          <label>Вид питомца<select value={form.pet_type} onChange={e => setForm({ ...form, pet_type: e.target.value })}><option value="">Выберите вариант</option><option>Собака</option><option>Кошка</option><option>Не определился</option></select></label>
          <label>Ритм жизни<select value={form.rhythm} onChange={e => setForm({ ...form, rhythm: e.target.value })}><option value="">Пока изучаем</option><option>Спокойный</option><option>Активный</option><option>Смешанный</option></select></label>
          <label>Мой дом<select value={form.home} onChange={e => setForm({ ...form, home: e.target.value })}><option value="">Не указано</option><option>Квартира</option><option>Дом</option></select></label>
          <label className="full">Пожелания<textarea value={form.wishes} onChange={e => setForm({ ...form, wishes: e.target.value })} placeholder="Расскажите, каким должен быть ваш общий день…" /></label>
        </div>
        <div className="pc-hrow"><button className="btn btn--fill btn--sm" type="submit">Сохранить анкету</button></div>
      </form>
      <aside className="pc-side">
        <div className="card">
          <p className="lbl">Портрет подбора</p>
          <h2 className="h3">{completeness}%</h2>
          <div className="bar"><i style={{ width: `${completeness}%` }} /></div>
          <p className="hint">Ответов: {portrait?.answer_count || 0}. Подробный портрет собирается в диалоге и целиком не показывается.</p>
          <dl className="kv">
            <div><dt>Вид</dt><dd>{profile?.pet_type || 'не задано'}</dd></div>
            <div><dt>Ритм</dt><dd>{profile?.rhythm || 'не задано'}</dd></div>
            <div><dt>Дом</dt><dd>{profile?.home || 'не задано'}</dd></div>
          </dl>
        </div>
      </aside>
    </div>}

    {tab === 'favorites' && <div className="card">
      <div className="sechead"><h2 className="h2">Те, кто понравился</h2><span className="st st--xs">{favorites.length} карточек</span></div>
      {favorites.length
        ? <ul className="pc-grid pc-grid--3">{favorites.map(animal => <FavoriteTile key={animal.id} animal={animal} onRemove={() => setFavorites(items => items.filter(item => item.id !== animal.id))} />)}</ul>
        : <div className="pc-empty"><h3>Пока пусто</h3><p>Поставьте лайк в «Выборе сердцем» — питомец появится здесь.</p></div>}
    </div>}
  </section>
}

function FavoriteTile({ animal, onRemove }: { animal: Animal; onRemove: () => void }) {
  const remove = async () => {
    try { await api.favorite(animal.id, true); onRemove() } catch { /* keep the card when the server rejects the removal */ }
  }
  return <li><article className="pc-tile">
    <figure>
      <img src={animal.image_url} alt={`${animal.name}, ${animal.species}`} loading="lazy" />
      <button className="pc-fav is-on" onClick={remove} aria-label="Убрать из избранного">♥</button>
    </figure>
    <h3>{animal.name}</h3>
    <p>{animal.age} · {animal.gender} · {animal.species}</p>
    <div className="pc-tile__acts">
      <a href={animal.source_url} target="_blank" rel="noreferrer">Карточка фонда</a>
    </div>
  </article></li>
}
