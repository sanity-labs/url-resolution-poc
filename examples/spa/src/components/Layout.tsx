import { Link, Outlet } from 'react-router'

export default function Layout() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}
