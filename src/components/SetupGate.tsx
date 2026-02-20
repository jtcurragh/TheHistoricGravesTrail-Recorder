import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { UserSetupScreen } from '../screens/UserSetupScreen'
import { isUserSetupComplete } from '../utils/storage'

export function SetupGate() {
  const [setupComplete, setSetupComplete] = useState(isUserSetupComplete)
  const navigate = useNavigate()

  if (!setupComplete) {
    return (
      <UserSetupScreen
        onCreateComplete={() => {
          setSetupComplete(true)
          navigate('/', { replace: true })
        }}
      />
    )
  }

  return <Outlet />
}
