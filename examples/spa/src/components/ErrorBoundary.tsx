import { Link, useRouteError, isRouteErrorResponse } from 'react-router'

export default function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <>
        <h1>{error.status === 404 ? 'Page Not Found' : `Error ${error.status}`}</h1>
        <p>{error.statusText}</p>
        <Link to="/">← Back to Home</Link>
      </>
    )
  }

  return (
    <>
      <h1>Something went wrong</h1>
      <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
      <Link to="/">← Back to Home</Link>
    </>
  )
}
