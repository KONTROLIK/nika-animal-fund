export type User = { id: number; name: string; email: string; phone: string | null; city: string | null; postal_code: string | null; address: string | null; contact_method: string | null; avatar_url: string | null; role: string; created_at: string }
export type Animal = { id: number; source_id: string; name: string; age: string; gender: string; species: string; breed: string | null; shelter: string; guardians: string; description: string | null; character: string | null; suitable_for: string | null; health: string | null; children_compatible: boolean | null; pets_compatible: boolean | null; image_url: string; source_url: string; gallery: string[]; is_available: boolean }
export type Preference = { pet_type: string | null; rhythm: string | null; home: string | null; wishes: string | null; updated_at: string }
export type PortraitTopic = { id: string; label: string; covered: boolean }
export type PortraitStatus = { completeness: number; answer_count: number; next_topic: string | null; topics: PortraitTopic[] }
export type Message = { id: number; role: 'user' | 'assistant'; content: string; created_at: string }
export type Conversation = { id: number; title: string; interview_complete: boolean; created_at: string; updated_at: string }
export type ChatResult = { conversation: Conversation; user_message: Message; assistant_message: Message; preference: Preference; recommendations: Animal[]; portrait: PortraitStatus }
export type ManagerDetails = { user: User; preference: Preference | null; portrait: { summary: string | null; facts: Record<string, string>; answers: Array<{ topic: string; answer: string; at: string }>; status: PortraitStatus }; favorites: Animal[]; conversations: Array<{ id: number; title: string; messages: Message[] }> }
export type AISettings = { enabled: boolean; has_api_key: boolean; updated_at: string | null }
export type AIPricing = { model: string; input_usd_per_million: number; output_usd_per_million: number; updated_at: string | null }
export type AIUsageItem = { id: number; created_at: string; agent: string; model: string; input_tokens: number | null; output_tokens: number | null; total_tokens: number | null; cost_usd: number | null; usage_available: boolean; pricing_available: boolean; status: string; user_name: string | null }
export type AIAnalytics = { period: { start_date: string; end_date: string }; summary: { requests: number; input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number; average_cost_usd: number; complete_requests: number; incomplete_requests: number }; series: Array<{ date: string; requests: number; tokens: number; cost_usd: number }>; by_model: Array<{ model: string; requests: number; tokens: number; cost_usd: number }>; most_expensive: AIUsageItem[]; history: AIUsageItem[]; models: string[] }

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
  portrait: () => request<PortraitStatus>('/api/portrait'),
  updateProfile: (body: Partial<Preference>) => request<Preference>('/api/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  updateAccount: (body: { name: string; email: string; phone?: string; city?: string; postal_code?: string; address?: string; contact_method?: string; avatar_url?: string }) => request<User>('/api/account', { method: 'PATCH', body: JSON.stringify(body) }),
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
  managerUser: (id: number) => request<ManagerDetails>(`/api/manager/users/${id}`),
  aiSettings: () => request<AISettings>('/api/manager/ai-settings'),
  updateAISettings: (body: { enabled: boolean; api_key?: string; clear_api_key?: boolean; base_url?: string }) => request<AISettings>('/api/manager/ai-settings', { method: 'PUT', body: JSON.stringify(body) }),
  aiFlow: () => request<{ enabled: boolean; conversation_id: number | null; user_name: string | null; user_answer: string | null; expert: { covered_topics: string[]; facts: Record<string, string>; summary: string | null; preferences: Preference | null }; assistant_reply: string | null; recommendation_ready: boolean }>('/api/manager/ai-flow'),
  aiAnalytics: (params = '') => request<AIAnalytics>(`/api/manager/ai-analytics${params}`),
  aiPricing: () => request<AIPricing[]>('/api/manager/ai-pricing'),
  updateAIPricing: (body: AIPricing) => request<AIPricing>('/api/manager/ai-pricing', { method: 'PUT', body: JSON.stringify(body) }),
}
