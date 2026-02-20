import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <main>
        <h1>The Memory Trail</h1>
        <p>Community heritage trail recording app</p>
      </main>
    ),
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
