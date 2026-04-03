import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// ── Use sessionStorage so every browser tab has its own independent session ──
// localStorage is shared across all tabs → same origin → same user everywhere
// sessionStorage is isolated per tab → each tab can log in as a different role
const storage = sessionStorage

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = storage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [theme, setTheme] = useState('dark')

  // When user changes/logs in, automatically restore their specific theme
  useEffect(() => {
    if (user && user.id) {
      const savedTheme = localStorage.getItem(`theme_${user.id}`)
      if (savedTheme) setTheme(savedTheme)
      else setTheme('dark') // Default
    } else {
      setTheme('dark') // Default for logged out users
    }
  }, [user])

  // Sync visually and save specifically for the logged in user
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (user && user.id) {
      localStorage.setItem(`theme_${user.id}`, theme)
    }
  }, [theme, user])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const login = (userData, tokens) => {
    storage.setItem('access_token', tokens.access)
    storage.setItem('refresh_token', tokens.refresh)
    storage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    storage.removeItem('access_token')
    storage.removeItem('refresh_token')
    storage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
