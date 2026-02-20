import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <BottomNav />
    </>
  )
}
