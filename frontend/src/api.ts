export type User = { id: number; name: string; email: string; role: string; created_at: string }
export type Animal = { id: number; source_id: string; name: string; age: string; gender: string; species: string; breed: string | null; shelter: string; guardians: string; description: string | null; character: string | null; suitable_for: string | null; health: string | null; image_url: string; source_url: string; gallery: string[]; is_available: boolean }
export type Preference = { pet_type: string | null; rhythm: string | null; home: string | null; wishes: string | null; updated_at: string }
export type Message = { id: number; role: 'user' | 'assistant'; content: string; created_at: string }
export type Conversation = { id: number; title: string; created_at: string; updated_at: string }
export type ChatResult = { conversation: Conversation; user_message: Message; assistant_message: Message; preference: Preference; recommendations: Animal[] }

const API = import.meta.env.VITE_API_BASE || ''
const tokenKey = 'petconnect-token'

export function token() { return localStorage.getItem(tokenKey) }
export function setToken(value: string | null) { value ? localStorage.setItem(tokenKey, value) : localStorage.removeItem(tokenKey) }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const current = token()
  if (current) headers.set('Authorization', `Bearer ${current}`)
  const response = await fetch(`${API}${path}`, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Не удалось выполнить запрос' }))
    throw new Error(error.detail || 'Не удалось выполнить запрос')
  }
  return response.json()
}

export const api = {
  register: (body: { name: string; email: string; password: string }) => request<{ access_token: string; user: User; conversation: Conversation }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) => request<{ access_token: string; user: User; conversation: Conversation }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<User>('/api/me'),
  animals: (without = false) => request<Animal[]>(`/api/animals${without ? '?only_without_guardians=true' : ''}`),
  profile: () => request<Preference>('/api/profile'),
  updateProfile: (body: Partial<Preference>) => request<Preference>('/api/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  history: () => request<Array<{ field: string; old_value: string | null; new_value: string | null; created_at: string }>>('/api/profile/history'),
  conversations: () => request<Conversation[]>('/api/conversations'),
  newConversation: () => request<Conversation>('/api/conversations', { method: 'POST' }),
  messages: (id: number) => request<Message[]>(`/api/conversations/${id}/messages`),
  chat: (body: { conversation_id?: number; content: string }) => request<ChatResult>('/api/chat/messages', { method: 'POST', body: JSON.stringify(body) }),
  favorites: () => request<Animal[]>('/api/favorites'),
  favorite: (id: number, saved: boolean) => request(`/api/favorites/${id}`, { method: saved ? 'DELETE' : 'POST' }),
  tinder: () => request<Animal[]>('/api/tinder/next'),
  swipe: (id: number, decision: 'like' | 'skip') => request(`/api/tinder/${id}`, { method: 'POST', body: JSON.stringify({ decision }) }),
  managerOverview: () => request<{ users: number; animals: number; conversations: number; without_guardians: number }>('/api/manager/overview'),
  managerUsers: () => request<Array<User & { preference: Preference | null; favorite_count: number; conversation_count: number }>>('/api/manager/users'),
  managerUser: (id: number) => request(`/api/manager/users/${id}`),
}
