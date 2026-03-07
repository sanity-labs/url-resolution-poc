<nav>
  <a href="/">Home</a>
</nav>

<main>
  <slot />
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
    line-height: 1.6;
  }
  nav {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem 2rem;
  }
  nav a {
    color: inherit;
  }
</style>
