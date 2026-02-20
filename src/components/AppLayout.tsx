import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { useHideBottomNav } from '../context/HideBottomNavContext'

export function AppLayout() {
  const { hide: hideBottomNav } = useHideBottomNav()
  return (
    <>
      <Header />
      <Outlet />
      {!hideBottomNav && <BottomNav />}
    </>
  )
}
