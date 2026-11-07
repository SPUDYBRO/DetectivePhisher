// Shown when the address in the browser is not one of our pages
export default function NotFoundPage() {
  return (
    <section className="info-page">
      <h2>Page not found</h2>
      <p>The address you entered does not exist.</p>
      <a className="info-page-link" href="/">Go back to the home page</a>
    </section>
  )
}