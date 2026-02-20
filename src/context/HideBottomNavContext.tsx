import { createContext, useContext, useState, type ReactNode } from 'react'

type HideBottomNavContextValue = {
  hide: boolean
  setHide: (hide: boolean) => void
}

const HideBottomNavContext = createContext<HideBottomNavContextValue | null>(null)

export function HideBottomNavProvider({ children }: { children: ReactNode }) {
  const [hide, setHide] = useState(false)
  const value = { hide, setHide }
  return (
    <HideBottomNavContext.Provider value={value}>
      {children}
    </HideBottomNavContext.Provider>
  )
}

export function useHideBottomNav() {
  const ctx = useContext(HideBottomNavContext)
  return ctx ?? { hide: false, setHide: () => {} }
}
