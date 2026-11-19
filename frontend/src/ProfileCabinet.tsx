import { useEffect, useState, type FormEvent } from 'react'
import { api, type PortraitStatus, type Preference, type User } from './api'

type Props = { user: User; notify: (message: string) => void; onUpdated: (user: User) => void }
type Tab = 'account' | 'preferences'

export function ProfileCabinet({ user, notify, onUpdated }: Props) {
  const [tab, setTab] = useState<Tab>('account')
  const [account, setAccount] = useState({ name: user.name, email: user.email, phone: user.phone || '', city: user.city || '', postal_code: user.postal_code || '', address: user.address || '', contact_method: user.contact_method || 'email' })
  const [profile, setProfile] = useState<Preference | null>(null)
  const [portrait, setPortrait] = useState<PortraitStatus | null>(null)
  const [form, setForm] = useState({ pet_type: '', rhythm: '', home: '', wishes: '' })

  useEffect(() => {
    Promise.all([api.profile(), api.portrait()]).then(([preferences, privatePortrait]) => {
      setProfile(preferences)
      setPortrait(privatePortrait)
      setForm({ pet_type: preferences.pet_type || '', rhythm: preferences.rhythm || '', home: preferences.home || '', wishes: preferences.wishes || '' })
    }).catch(error => notify(error.message))
  }, [])

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault()
    try { const updated = await api.updateAccount(account); onUpdated(updated); notify('Личные данные сохранены') } catch (error) { notify((error as Error).message) }
  }

  const savePreferences = async (event: FormEvent) => {
    event.preventDefault()
    try { const next = await api.updateProfile(form); setProfile(next); notify('Анкета сохранена — подбор обновлён') } catch (error) { notify((error as Error).message) }
  }

  return <section>
    <div className="page-title"><div><div className="eyebrow">03 / личный кабинет</div><h1>Профиль.</h1><p className="lead">Управляй контактными данными и отдельно настрой подбор питомца.</p></div></div>
    <div className="account-hero"><div className="account-avatar">{user.name.slice(0, 2).toUpperCase()}</div><div><div className="eyebrow">личный кабинет</div><h2>{user.name}</h2><p>{user.email}</p></div><span className="account-role">{user.role === 'MANAGER' ? 'Менеджер' : 'Пользователь'}</span></div>
    <div className="profile-tabs"><button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>Личные данные</button><button className={tab === 'preferences' ? 'active' : ''} onClick={() => setTab('preferences')}>Моя анкета</button></div>
    {tab === 'account' ? <form className="panel account-form" onSubmit={saveAccount}><div className="panel-head"><div><div className="eyebrow">аккаунт</div><h3>Контактная информация</h3></div><span className="source-note">сохраняется на сервере</span></div><div className="form-grid"><label>Имя<input value={account.name} onChange={e => setAccount({ ...account, name: e.target.value })} required /></label><label>Email<input type="email" value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })} required /></label><label>Телефон<input value={account.phone} onChange={e => setAccount({ ...account, phone: e.target.value })} placeholder="+7 (___) ___-__-__" /></label><label>Город<input value={account.city} onChange={e => setAccount({ ...account, city: e.target.value })} placeholder="Москва" /></label><label>Почтовый индекс<input value={account.postal_code} onChange={e => setAccount({ ...account, postal_code: e.target.value })} placeholder="123456" /></label><label>Способ связи<select value={account.contact_method} onChange={e => setAccount({ ...account, contact_method: e.target.value })}><option value="email">Email</option><option value="phone">Телефон</option><option value="telegram">Telegram</option></select></label><label className="full">Адрес<textarea value={account.address} onChange={e => setAccount({ ...account, address: e.target.value })} placeholder="Улица, дом, квартира" /></label></div><div className="align-right"><button className="button" type="submit">Сохранить личные данные ↗</button></div></form> : <div className="profile-grid"><div className="profile-card"><div className="profile-mark">PC</div><h2>Контекст подбора</h2><p>Основные предпочтения видны тебе. Подробный портрет собирается отдельно в диалоге.</p><div className="pills"><span>{profile?.pet_type || 'вид питомца'}</span><span>{profile?.rhythm || 'ритм жизни'}</span><span>{profile?.home || 'тип дома'}</span></div><div className="portrait-progress"><b>{portrait?.completeness || 0}%</b><span>подробного контекста собрано</span><div><i style={{ width: `${portrait?.completeness || 0}%` }} /></div></div></div><form className="panel form-grid" onSubmit={savePreferences}><div className="panel-head full"><h3>Что важно при выборе</h3><span className="eyebrow">сохранение на сервере</span></div><label>Вид питомца<select value={form.pet_type} onChange={e => setForm({ ...form, pet_type: e.target.value })}><option value="">Выбери вариант</option><option>Собака</option><option>Кошка</option><option>Не определился</option></select></label><label>Ритм жизни<select value={form.rhythm} onChange={e => setForm({ ...form, rhythm: e.target.value })}><option value="">Пока изучаем</option><option>Спокойный</option><option>Активный</option><option>Смешанный</option></select></label><label>Мой дом<select value={form.home} onChange={e => setForm({ ...form, home: e.target.value })}><option value="">Не указано</option><option>Квартира</option><option>Дом</option></select></label><label className="full">Пожелания<textarea value={form.wishes} onChange={e => setForm({ ...form, wishes: e.target.value })} placeholder="Расскажи, каким должен быть ваш общий день..." /></label><div className="full align-right"><button className="button" type="submit">Сохранить анкету ↗</button></div></form></div>}
  </section>
}
