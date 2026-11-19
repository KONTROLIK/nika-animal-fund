const animals = [
  { id: 'porsh-322877', name: 'Порш', age: '7 лет 3 месяца', gender: 'мальчик', guardians: '1 из 5 опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/porsh-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/porsh-322877' },
  { id: 'iriska-265713', name: 'Ириска', age: '8 лет 9 месяцев', gender: 'девочка', guardians: '1 из 5 опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/iriska-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/iriska-265713' },
  { id: 'mishel-265957', name: 'Мишель', age: '7 лет 9 месяцев', gender: 'мальчик', guardians: 'Пока без опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/mishel-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/mishel-265957' },
  { id: 'yustas-266007', name: 'Юстас', age: '6 лет 8 месяцев', gender: 'мальчик', guardians: '2 из 5 опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/yustas-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/yustas-266007' },
  { id: 'akvella-309755', name: 'Аквелла', age: '4 года 3 месяца', gender: 'девочка', guardians: '1 из 5 опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/akvella-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/akvella-309755' },
  { id: 'lyupin-516317', name: 'Люпин', age: '1 год 9 месяцев', gender: 'мальчик', guardians: '3 из 5 опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/lyupin-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/lyupin-516317' },
  { id: 'belyash-753457', name: 'Беляш', age: '5 лет', gender: 'мальчик', guardians: '2 из 5 опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/belyash-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/belyash-753457' },
  { id: 'lemur-724099', name: 'Лемур', age: '4 месяца', gender: 'мальчик', guardians: '2 из 5 опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/lemur-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/lemur-724099' },
  { id: 'smayl-265987', name: 'Смайл', age: '13 лет 9 месяцев', gender: 'мальчик', guardians: '2 из 5 опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/smayl-1.jpg', link: 'https://nika-design.pages.dev/podopechnye/#zhivotnoe/smayl-265987' },
  { id: 'tom-265997', name: 'Том', age: '7 лет 9 месяцев', gender: 'мальчик', guardians: 'Пока без опекунов', image: 'https://nika-design.pages.dev/sayt-2/assets/sayt/zhivotnye/tom-1.jpg', link: 'https://fond-nika.ru/ourpets/tom-265997/' }
];

const state = {
  route: 'home',
  filter: 'Все',
  favorites: JSON.parse(localStorage.getItem('petconnect-favorites') || '[]'),
  profile: JSON.parse(localStorage.getItem('petconnect-profile') || '{}'),
  user: JSON.parse(localStorage.getItem('petconnect-user') || 'null'),
  messages: JSON.parse(localStorage.getItem('petconnect-messages') || 'null') || [
    { role: 'assistant', text: 'Привет! Помогу найти питомца, который подойдёт твоему образу жизни. Давай немного познакомимся? Кого ты хотел бы приютить — собаку, кошку или пока не определился?', time: '09:41' }
  ]
};

const navItems = [
  ['home', '⌂', 'Обзор'], ['discover', '✦', 'Найти питомца'], ['chat', '◌', 'Помощник'],
  ['profile', '○', 'Моя анкета'], ['manager', '▦', 'Менеджер'], ['control', '⌁', 'Центр подбора']
];

function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function initials() { return (state.user?.name || 'Г').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase(); }
function save() { localStorage.setItem('petconnect-favorites', JSON.stringify(state.favorites)); localStorage.setItem('petconnect-profile', JSON.stringify(state.profile)); localStorage.setItem('petconnect-messages', JSON.stringify(state.messages)); }
function toast(text) { const el = document.querySelector('#toast'); el.textContent = text; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2400); }
function navigate(route) { state.route = route; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function layout(content) {
  return `<div class="shell">
    <aside class="sidebar">
      <div class="logo">PET <span>CONNECT</span></div>
      <div class="eyebrow">умный поиск дома</div>
      <nav class="nav">${navItems.map(([route, icon, label]) => `<button class="${state.route === route ? 'active' : ''}" data-route="${route}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="eyebrow" style="margin:0">новый друг рядом</div><p class="animal-meta">Знакомься с питомцами и выбирай сердцем.</p></div>
    </aside>
    <section class="workspace">
      <header class="topbar"><div class="crumb">${state.route === 'home' ? 'Добрый день' : `PET CONNECT / ${navItems.find(([route]) => route === state.route)?.[2] || 'Регистрация'}`}</div><div class="top-actions"><button class="avatar" data-route="${state.user ? 'profile' : 'auth'}" aria-label="${state.user ? 'Мой профиль' : 'Создать профиль'}">${state.user ? initials() : '→'}</button></div></header>
      <main class="content">${content}</main>
    </section>
  </div>`;
}

function animalCard(animal) {
  const saved = state.favorites.includes(animal.id);
  return `<article class="animal-card"><img src="${animal.image}" alt="${esc(animal.name)} — ${esc(animal.gender)}" loading="lazy"><button class="heart ${saved ? 'saved' : ''}" data-favorite="${animal.id}" aria-label="В избранное">${saved ? '♥' : '♡'}</button><div class="animal-info"><div class="animal-title"><div><h3>${esc(animal.name)}</h3><div class="animal-meta">${esc(animal.age)} · ${esc(animal.gender)}</div></div></div><p class="animal-description">${esc(animal.guardians)}. Актуальная карточка фонда.</p><div class="card-footer"><span class="tag">Подопечный фонда</span><a class="text-btn" href="${animal.link}" target="_blank" rel="noreferrer">Подробнее ↗</a></div></div></article>`;
}

function homeView() {
  return `<section class="view active"><div class="hero"><div class="hero-copy"><div class="eyebrow">01 / знакомство начинается здесь</div><h1>Новый друг<br>начинается с <em>разговора.</em></h1><p class="lead">PET CONNECT помогает познакомиться с подопечными фонда «НИКА». Без сложных анкет — просто расскажи о себе.</p><div class="hero-actions"><button class="btn lime" data-route="chat">Начать разговор <span>↗</span></button><button class="btn secondary" data-route="discover">Смотреть питомцев</button></div></div><div class="hero-visual"><img class="hero-photo" src="https://nika-design.pages.dev/sayt-2/assets/sayt/bim.jpg" alt="Бим, 7 лет, центр «Мокрый нос»"><div class="round-sticker">питомцы<br>ждут своего<br>человека ✦</div><div class="photo-note"><strong>Бим · 7 лет</strong><span>Подопечный фонда «НИКА»</span></div></div></div><div class="stat-row"><div class="stat"><b>416,2 млн ₽</b><span>направлено на помощь кошкам и собакам в 2025 году</span></div><div class="stat"><b>1136</b><span>животных стерилизовано</span></div><div class="stat"><b>8541</b><span>обращение принято на горячую линию</span></div></div><div class="section-head"><div><div class="eyebrow">02 / актуальные подопечные</div><h2>Им нужна помощь сейчас.</h2></div><button class="text-btn" data-route="discover">Все подопечные →</button></div><div class="cards">${animals.slice(0, 3).map(animalCard).join('')}</div><div class="callout"><h2>Познакомься с теми, кто ждёт опекуна.</h2><button class="btn lime" data-route="discover">Открыть каталог ↗</button></div><p class="eyebrow" style="margin-top:22px">Данные и фотографии: фонд «НИКА», актуально на момент загрузки прототипа · <a href="https://nika-design.pages.dev/sayt-2/" target="_blank" rel="noreferrer" style="color:inherit">источник</a></p></section>`;
}

function discoverView() {
  const filtered = state.filter === 'Все' ? animals : state.filter === 'Без опекунов' ? animals.filter(a => a.guardians === 'Пока без опекунов') : animals.filter(a => a.guardians !== 'Пока без опекунов');
  return `<section class="view active"><div class="page-title"><div><div class="eyebrow">02 / актуальный каталог фонда</div><h1>Найти питомца.</h1><p class="lead">Здесь показаны реальные подопечные, опубликованные на сайте фонда «НИКА».</p></div><button class="btn" data-route="chat">Обсудить выбор ↗</button></div><div class="filter-row">${['Все', 'Без опекунов', 'Есть опекуны'].map(x => `<button class="filter ${state.filter === x ? 'active' : ''}" data-filter="${x}">${x}</button>`).join('')}</div><div class="cards">${filtered.map(animalCard).join('')}</div><p class="eyebrow" style="margin-top:24px">Источник карточек: <a href="https://nika-design.pages.dev/sayt-2/" target="_blank" rel="noreferrer" style="color:inherit">nika-design.pages.dev/sayt-2</a>. Перед показом посетителю данные следует обновлять парсером.</p></section>`;
}

function chatView() {
  return `<section class="view active"><div class="chat-layout"><aside class="chat-sidebar"><div class="eyebrow">диалоги</div><button class="btn small new-chat" data-new-chat>+ Новый диалог</button><button class="chat-item active">Первое знакомство<small>только что</small></button><button class="chat-item">Идеальный выходной<small>вчера</small></button><button class="chat-item">Кто мне подойдёт?<small>12 ноя</small></button></aside><div class="chat-main"><div class="chat-header"><div class="bot-name"><span class="bot-icon">✦</span><div>Ника <small style="display:block;color:var(--muted);font-weight:400">персональный помощник · онлайн</small></div></div><span class="tag">УМНЫЙ ПОДБОР</span></div><div class="messages" id="messages">${state.messages.map(m => `<div class="message ${m.role === 'user' ? 'user' : ''}"><small>${m.role === 'user' ? 'ты' : 'НИКА'}</small><div class="bubble">${esc(m.text)}</div></div>`).join('')}</div><div class="quick-replies"><button class="quick" data-quick="Собака">Собака 🐕</button><button class="quick" data-quick="Кошка">Кошка 🐈</button><button class="quick" data-quick="Пока не знаю">Пока не знаю</button></div><form class="chat-form" id="chat-form"><input id="chat-input" placeholder="Напиши о себе..." autocomplete="off"><button class="send" aria-label="Отправить">↑</button></form></div><aside class="chat-context"><div class="eyebrow">контекст подбора</div><div class="context-card" style="margin-top:18px"><span class="tag">АНАЛИЗ ПРЕДПОЧТЕНИЙ</span><strong>Профиль ещё заполняется</strong><p>Отвечай в удобном темпе. Пропускать вопросы — нормально.</p></div><div class="context-stat"><span>Вид питомца</span><b>${esc(state.profile.type || 'не указан')}</b></div><div class="context-stat"><span>Темп жизни</span><b>${esc(state.profile.rhythm || 'изучаем')}</b></div><div class="context-stat"><span>Совпадений</span><b>${animals.length}</b></div><button class="text-btn" style="margin-top:18px" data-route="profile">Открыть анкету →</button></aside></div></section>`;
}

function profileView() {
  const p = state.profile;
  return `<section class="view active"><div class="page-title"><div><div class="eyebrow">03 / твой контекст</div><h1>Моя анкета.</h1><p class="lead">Помощник сохраняет только то, чем ты хочешь поделиться. Всё можно изменить.</p></div><span class="tag">синхронизировано сейчас</span></div><div class="profile-grid"><div class="profile-card"><div class="avatar-large">${initials()}</div><h2>${esc(state.user?.name || 'Твой профиль')}</h2><p>${esc(state.user?.email || 'Профиль ещё не заполнен')}</p><div class="profile-pills"><span>${esc(p.type || 'вид питомца')}</span><span>${esc(p.rhythm || 'ритм жизни')}</span><span>${esc(p.home || 'тип дома')}</span></div></div><div class="panel"><div class="panel-head"><h3>Что важно при выборе</h3><span class="eyebrow">автосохранение</span></div><form id="profile-form" class="form-grid"><div class="field"><label>Имя</label><input name="name" value="${esc(state.user?.name || '')}" placeholder="Как к тебе обращаться?"></div><div class="field"><label>Вид питомца</label><select name="type"><option value="">Выбери вариант</option><option ${p.type === 'Собака' ? 'selected' : ''}>Собака</option><option ${p.type === 'Кошка' ? 'selected' : ''}>Кошка</option><option ${p.type === 'Не определился' ? 'selected' : ''}>Не определился</option></select></div><div class="field"><label>Ритм жизни</label><select name="rhythm"><option value="">Пока изучаем</option><option ${p.rhythm === 'Спокойный' ? 'selected' : ''}>Спокойный</option><option ${p.rhythm === 'Активный' ? 'selected' : ''}>Активный</option><option ${p.rhythm === 'Смешанный' ? 'selected' : ''}>Смешанный</option></select></div><div class="field"><label>Мой дом</label><select name="home"><option value="">Не указано</option><option ${p.home === 'Квартира' ? 'selected' : ''}>Квартира</option><option ${p.home === 'Дом' ? 'selected' : ''}>Дом</option></select></div><div class="field full"><label>Пожелания</label><textarea name="wishes" placeholder="Например: у меня есть дети, нужен дружелюбный компаньон...">${esc(p.wishes || '')}</textarea></div><div class="save-row full"><button class="btn" type="submit">Сохранить изменения ↗</button></div></form></div></div><div class="section-head"><div><div class="eyebrow">история контекста</div><h2>Как менялся подбор</h2></div></div><div class="panel"><div class="timeline"><div class="timeline-item"><i class="timeline-dot"></i><div><b>Профиль создан</b><p>Пустая анкета открыта после регистрации · только что</p></div></div><div class="timeline-item"><i class="timeline-dot" style="background:var(--lime)"></i><div><b>Помощник начал знакомство</b><p>Первый вопрос отправлен в чат · только что</p></div></div></div></div></section>`;
}

function managerView() {
  return `<section class="view active"><div class="page-title"><div><div class="eyebrow">04 / внутренняя команда</div><h1>Менеджер.</h1><p class="lead">Один экран для людей, которые помогают животным встретить своих людей.</p></div><span class="role">ROLE · MANAGER</span></div><div class="manager-stats"><div class="metric"><b>${animals.length}</b><span>подопечных в актуальном срезе</span></div><div class="metric"><b>${animals.filter(a => a.guardians === 'Пока без опекунов').length}</b><span>пока без опекунов</span></div><div class="metric"><b>—</b><span>пользователи фонда не опубликованы</span></div><div class="metric"><b>—</b><span>закрытая аналитика фонда</span></div></div><div class="two-col"><div class="panel table-panel"><div class="panel-head"><h3>Что доступно публично</h3><span class="eyebrow">source snapshot</span></div><table class="table"><thead><tr><th>Подопечный</th><th>Возраст</th><th>Пол</th><th>Опекуны</th></tr></thead><tbody>${animals.map(a => `<tr><td><b>${a.name}</b></td><td>${a.age}</td><td>${a.gender}</td><td><span class="status">${a.guardians}</span></td></tr>`).join('')}</tbody></table></div><div class="panel"><div class="panel-head"><h3>Питомцы без опекунов</h3><span class="eyebrow">нужна забота</span></div><div class="mini-list">${animals.filter(a => a.guardians === 'Пока без опекунов').map(a => `<div class="mini-item"><div><img class="mini-avatar" src="${a.image}" alt=""><div><b>${a.name}</b><small>${a.age} · ${a.gender}</small></div></div><span class="status">● ждёт</span></div>`).join('')}</div></div></div></section>`;
}

function controlView() {
  return `<section class="view active"><div class="page-title"><div><div class="eyebrow">05 / как работает подбор</div><h1>Центр подбора.</h1><p class="lead">Здесь можно увидеть, как сервис превращает разговор о вашем образе жизни в персональные рекомендации.</p></div><span class="tag">СЕРВИС АКТИВЕН</span></div><div class="room"><div class="room-top"><div><div class="eyebrow">pet connect recommendation layer</div><h2>Как формируется рекомендация</h2></div><span class="live">● connected</span></div><div class="pipeline"><div class="node"><div class="node-icon">◉</div><b>ПОЛЬЗОВАТЕЛЬ</b><span>сообщение получено</span></div><div class="node"><div class="node-icon">✦</div><b>ДИАЛОГ</b><span>уточняем образ жизни</span></div><div class="node"><div class="node-icon">⌁</div><b>АНАЛИЗ</b><span>оцениваем предпочтения</span></div><div class="node"><div class="node-icon">▤</div><b>КАТАЛОГ</b><span>ищем подходящих питомцев</span></div></div><div class="event-log"><div class="event"><time>09:41:02</time><strong>ДИАЛОГ</strong><span>Получено сообщение пользователя</span></div><div class="event"><time>09:41:05</time><strong>АНАЛИЗ</strong><span>Обновлены предпочтения профиля</span></div><div class="event"><time>09:41:06</time><strong>КАТАЛОГ</strong><span>Актуальные карточки готовы к подбору</span></div><div class="event"><time>09:41:09</time><strong>ПОЛЬЗОВАТЕЛЬ</strong><span>Можно продолжить знакомство</span></div></div></div><div class="section-head"><div><div class="eyebrow">принцип работы</div><h2>Понятный путь к своему питомцу.</h2></div></div><div class="two-col"><div class="panel"><h3>Личный помощник</h3><p class="lead" style="font-size:13px">Задаёт понятные вопросы и помогает спокойно разобраться, какой питомец подойдёт вашему образу жизни.</p></div><div class="panel"><h3>Умный анализ</h3><p class="lead" style="font-size:13px">Учитывает ваши ответы и показывает актуальных питомцев, которые могут вам подойти.</p></div></div></section>`;
}

function authView() {
  return `<section class="view active"><div class="auth-wrap"><div class="auth-card"><div class="eyebrow">PET CONNECT / welcome</div><h1>Найдём своего.</h1><p class="lead">Создай профиль — и сразу продолжи разговор с Никой.</p><form class="auth-form" id="auth-form"><div class="field"><label>Имя</label><input name="name" required placeholder="Например, Аня"></div><div class="field"><label>Email</label><input name="email" type="email" required placeholder="you@example.com"></div><div class="field"><label>Пароль</label><input name="password" type="password" required minlength="4" placeholder="не короче 4 символов"></div><button class="btn lime" type="submit">Создать профиль и войти ↗</button></form><div class="auth-switch">Профиль сохраняется только в этом браузере</div></div></div></section>`;
}

function contentForRoute() { return ({ home: homeView, discover: discoverView, chat: chatView, profile: profileView, manager: managerView, control: controlView, auth: authView }[state.route] || homeView)(); }
function publicCopy(content) {
  return content
    .replaceAll('рассказчик', 'помощник').replaceAll('Рассказчик', 'Помощник')
    .replaceAll('NARRATOR', 'ДИАЛОГ').replaceAll('EXPERT', 'АНАЛИЗ')
    .replaceAll('DATABASE', 'КАТАЛОГ').replaceAll('USER', 'ПОЛЬЗОВАТЕЛЬ')
    .replaceAll('выставочный прототип', 'сервис').replaceAll('Демо-профиль для выставочного стенда', 'Профиль ещё не заполнен')
    .replaceAll('AI Control Room', 'Центр подбора').replaceAll('демонстрационный режим', 'режим подбора');
}
function render() { document.querySelector('#app').innerHTML = publicCopy(layout(contentForRoute())); bind(); }

function assistantReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes('собак')) { state.profile.type = 'Собака'; return 'Собака — отличный выбор. А какой у тебя ритм жизни: больше спокойных вечеров или длинных прогулок и приключений?'; }
  if (lower.includes('кош')) { state.profile.type = 'Кошка'; return 'Кошки тоже очень разные — от тихих наблюдателей до настоящих исследователей. Какой у тебя дом: квартира или дом?'; }
  if (lower.includes('актив')) { state.profile.rhythm = 'Активный'; return 'Запомнила: активный ритм. Уже вижу несколько хвостатых спортсменов, с которыми вам будет весело. Хотел бы посмотреть первые совпадения?'; }
  if (lower.includes('квартир')) { state.profile.home = 'Квартира'; return 'Квартира — не ограничение. Подберём друга, которому будет комфортно в твоём пространстве. Показать подходящих питомцев?'; }
  if (lower.includes('показ') || lower.includes('да')) return 'Тогда знакомься с первой подборкой. Я поставила выше тех, с кем у вас больше всего общего — но последнее слово всегда за вами 💚';
  return 'Это важно, я сохраню. Расскажи ещё немного: каким ты видишь ваш обычный день вместе? Можно ответить как угодно или пропустить вопрос.';
}

async function sendMessage(text) {
  if (!text.trim()) return;
  state.messages.push({ role: 'user', text: text.trim(), time: 'сейчас' });
  state.messages.push({ role: 'assistant', text: 'Помощник готовит ответ…', time: 'сейчас' });
  save(); render();
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: state.messages.slice(-8).map(({ role, text }) => ({ role: role === 'assistant' ? 'assistant' : 'user', content: text })) }) });
    if (!response.ok) throw new Error('offline');
    const result = await response.json();
    state.messages[state.messages.length - 1].text = result.content;
  } catch {
    state.messages[state.messages.length - 1].text = assistantReply(text);
  }
  save(); render(); setTimeout(() => document.querySelector('#messages')?.scrollTo({ top: 99999, behavior: 'smooth' }), 0);
}

function bind() {
  document.querySelectorAll('[data-route]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.route)));
  document.querySelectorAll('[data-filter]').forEach(el => el.addEventListener('click', () => { state.filter = el.dataset.filter; render(); }));
  document.querySelectorAll('[data-favorite]').forEach(el => el.addEventListener('click', () => { const id = el.dataset.favorite; state.favorites = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id]; save(); render(); toast(state.favorites.includes(id) ? 'Добавлено в избранное' : 'Убрано из избранного'); }));
  document.querySelectorAll('[data-quick]').forEach(el => el.addEventListener('click', () => sendMessage(el.dataset.quick)));
  document.querySelector('[data-new-chat]')?.addEventListener('click', () => { state.messages = [{ role: 'assistant', text: 'Привет! Начнём знакомство заново. Кого ты хотел бы приютить?', time: 'сейчас' }]; save(); render(); });
  document.querySelector('#chat-form')?.addEventListener('submit', e => { e.preventDefault(); sendMessage(document.querySelector('#chat-input').value); });
  document.querySelector('#profile-form')?.addEventListener('submit', e => { e.preventDefault(); const data = new FormData(e.target); state.profile = Object.fromEntries(data.entries()); if (state.user) { state.user.name = state.profile.name || state.user.name; localStorage.setItem('petconnect-user', JSON.stringify(state.user)); } save(); render(); toast('Анкета сохранена — подбор обновлён'); });
  document.querySelector('#auth-form')?.addEventListener('submit', e => { e.preventDefault(); const data = new FormData(e.target); state.user = { name: data.get('name'), email: data.get('email') }; localStorage.setItem('petconnect-user', JSON.stringify(state.user)); state.profile = { ...state.profile, name: data.get('name') }; save(); toast('Профиль создан — добро пожаловать'); setTimeout(() => navigate('chat'), 350); });
}

render();

