import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { SetupGate } from './components/SetupGate'

const router = createBrowserRouter([
  {
    path: '/',
    element: <SetupGate />,
    children: [
      {
        index: true,
        element: (
          <main>
            <h1>The Memory Trail</h1>
            <p>Community heritage trail recording app</p>
          </main>
        ),
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
