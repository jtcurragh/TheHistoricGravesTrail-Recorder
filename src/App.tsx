import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { TrailProvider } from './context/TrailProvider'
import { SetupGate } from './components/SetupGate'
import { HomeScreen } from './screens/HomeScreen'
import { TrailScreen } from './screens/TrailScreen'
import { ExportScreen } from './screens/ExportScreen'

const router = createBrowserRouter([
  {
    path: '/',
    element: <SetupGate />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'trail', element: <TrailScreen /> },
      { path: 'export', element: <ExportScreen /> },
    ],
  },
])

function App() {
  return (
    <TrailProvider>
      <RouterProvider router={router} />
    </TrailProvider>
  )
}

export default App
