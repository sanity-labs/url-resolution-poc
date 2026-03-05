import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

// ── Document IDs ──────────────────────────────────────────────
const IDS = {
  // Getting Started articles
  articleWhy: 'article-why',
  articleInstallation: 'article-installation',
  articleConfiguration: 'article-configuration',
  // Concepts articles
  articleArchitecture: 'article-architecture',
  articleRouteConfig: 'article-route-config',
  // Guides articles
  articleResolverApi: 'article-resolver-api',
  articlePtLinks: 'article-pt-links',
  articleSyncFunction: 'article-sync-function',
  articlePresentation: 'article-presentation',
  // Blog posts
  blogIntroducing: 'blog-introducing',
  blogDx: 'blog-dx',
  // Nav sections
  navGettingStarted: 'nav-getting-started',
  navConcepts: 'nav-concepts',
  navGuides: 'nav-guides',
  // Route config
  routeConfig: 'routes-config-web',
}

// ── Helper: plain PT block ────────────────────────────────────
function ptBlock(key, text, style = 'normal') {
  return {
    _type: 'block',
    _key: key,
    style,
    children: [{ _type: 'span', _key: `${key}-s1`, text }],
    markDefs: [],
  }
}

// ── Helper: heading block ─────────────────────────────────────
function ptHeading(key, text, level = 'h2') {
  return ptBlock(key, text, level)
}

// ── Helper: code block ────────────────────────────────────────
function ptCode(key, language, code) {
  return {
    _type: 'code',
    _key: key,
    language,
    code,
  }
}

// ── Helper: PT block with one internal link ───────────────────
function ptBlockWithLink({ blockKey, beforeText, linkText, afterText, linkKey, refId }) {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    children: [
      { _type: 'span', _key: `${blockKey}-s1`, text: beforeText },
      { _type: 'span', _key: `${blockKey}-s2`, text: linkText, marks: [linkKey] },
      { _type: 'span', _key: `${blockKey}-s3`, text: afterText },
    ],
    markDefs: [
      {
        _type: 'internalLink',
        _key: linkKey,
        reference: { _type: 'reference', _ref: refId },
      },
    ],
  }
}

// ── Helper: PT block with two internal links ──────────────────
function ptBlockWithTwoLinks({
  blockKey,
  text1,
  link1Text,
  link1Key,
  link1Ref,
  midText,
  link2Text,
  link2Key,
  link2Ref,
  endText,
}) {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    children: [
      { _type: 'span', _key: `${blockKey}-s1`, text: text1 },
      { _type: 'span', _key: `${blockKey}-s2`, text: link1Text, marks: [link1Key] },
      { _type: 'span', _key: `${blockKey}-s3`, text: midText },
      { _type: 'span', _key: `${blockKey}-s4`, text: link2Text, marks: [link2Key] },
      { _type: 'span', _key: `${blockKey}-s5`, text: endText },
    ],
    markDefs: [
      {
        _type: 'internalLink',
        _key: link1Key,
        reference: { _type: 'reference', _ref: link1Ref },
      },
      {
        _type: 'internalLink',
        _key: link2Key,
        reference: { _type: 'reference', _ref: link2Ref },
      },
    ],
  }
}

// ── Helper: PT block with three internal links ────────────────
function ptBlockWithThreeLinks({
  blockKey,
  text1,
  link1Text,
  link1Key,
  link1Ref,
  text2,
  link2Text,
  link2Key,
  link2Ref,
  text3,
  link3Text,
  link3Key,
  link3Ref,
  endText,
}) {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    children: [
      { _type: 'span', _key: `${blockKey}-s1`, text: text1 },
      { _type: 'span', _key: `${blockKey}-s2`, text: link1Text, marks: [link1Key] },
      { _type: 'span', _key: `${blockKey}-s3`, text: text2 },
      { _type: 'span', _key: `${blockKey}-s4`, text: link2Text, marks: [link2Key] },
      { _type: 'span', _key: `${blockKey}-s5`, text: text3 },
      { _type: 'span', _key: `${blockKey}-s6`, text: link3Text, marks: [link3Key] },
      { _type: 'span', _key: `${blockKey}-s7`, text: endText },
    ],
    markDefs: [
      {
        _type: 'internalLink',
        _key: link1Key,
        reference: { _type: 'reference', _ref: link1Ref },
      },
      {
        _type: 'internalLink',
        _key: link2Key,
        reference: { _type: 'reference', _ref: link2Ref },
      },
      {
        _type: 'internalLink',
        _key: link3Key,
        reference: { _type: 'reference', _ref: link3Ref },
      },
    ],
  }
}

// ── Seed data ─────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding self-documenting content...\n')

  // ── Step 1: Delete all existing content ───────────────────
  console.log('🗑️  Deleting existing content...')
  const existingDocs = await client.fetch(
    `*[_type in ["article", "blogPost", "docsNavSection", "routes.map"]]._id`
  )
  if (existingDocs.length > 0) {
    const deleteTx = client.transaction()
    for (const id of existingDocs) {
      deleteTx.delete(id)
    }
    await deleteTx.commit()
    console.log(`   Deleted ${existingDocs.length} documents`)
  } else {
    console.log('   No existing content to delete')
  }

  // ── Step 2: Create all new content ────────────────────────
  console.log('\n📝 Creating new content...')
  const tx = client.transaction()

  // ═══════════════════════════════════════════════════════════
  // GETTING STARTED ARTICLES
  // ═══════════════════════════════════════════════════════════

  // ── Article 1: Why URL Resolution? ────────────────────────
  tx.createOrReplace({
    _id: IDS.articleWhy,
    _type: 'article',
    title: 'Why URL Resolution?',
    slug: { _type: 'slug', current: 'why-url-resolution' },
    body: [
      ptBlock(
        'b1',
        'Every Sanity project needs to answer the same question: "What URL does this document live at?" And every project answers it differently — hardcoded path builders scattered across the codebase, fragile string concatenation, manual GROQ queries that break when slugs change. There has never been a single source of truth for document-to-URL mapping.'
      ),

      ptHeading('h1', 'The Problem'),
      ptBlock(
        'b2',
        'Consider a typical Sanity project with articles organized into sections. To build a URL, you need the section slug and the article slug. In the frontend, you write a GROQ query that joins them. In the Studio, you write a different resolve function for the Presentation tool. In your sitemap generator, you write yet another version. Three places, three chances to get out of sync.'
      ),
      ptBlock(
        'b3',
        'Now add Portable Text links. An editor creates an internal link to another article. At render time, you need to resolve that reference to a URL. But you are inside a PortableText component — you cannot make async calls. So you either pre-fetch all possible URLs (wasteful) or pass URL maps through context (awkward). Neither feels right.'
      ),

      ptCode(
        'code1',
        'typescript',
        `// ❌ The old way — manual GROQ, duplicated everywhere
const article = await client.fetch(\`
  *[_type == "article" && _id == $id][0]{
    "url": "/docs/" +
      coalesce(
        *[_type == "docsNavSection" && references(^._id)][0].slug.current + "/",
        ""
      ) + slug.current
  }
\`, { id: articleId })

// You write this once for the frontend, again for the Studio,
// again for the sitemap, again for the RSS feed...`
      ),

      ptHeading('h2', 'The Solution'),
      ptBlock(
        'b4',
        'The @sanity/routes package gives you one configuration, stored as a document in your dataset, that defines how every document type maps to a URL. The resolver reads this config and handles the rest — in the Studio, in the frontend, everywhere.'
      ),

      ptCode(
        'code2',
        'typescript',
        `// ✅ The new way — one config, automatic everywhere
import { createRouteResolver } from '@sanity/routes'

const resolver = createRouteResolver(client, 'web')
const url = await resolver.resolveUrlById('article-123')
// => "https://www.example.com/docs/guides/my-article"

// Or embed resolution directly in GROQ queries:
const pathField = await resolver.groqField('article')
const articles = await client.fetch(\`
  *[_type == "article"]{ _id, title, \${pathField} }
\`)`
      ),

      ptBlock(
        'b5',
        'No more duplicated logic. No more hardcoded paths. Slug changes propagate automatically. Portable Text links resolve from a pre-loaded map with zero async overhead. The Studio Presentation tool configures itself from the same route config.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b6',
        text1: 'Ready to get started? Head to ',
        link1Text: 'Installation',
        link1Key: 'lnk1',
        link1Ref: IDS.articleInstallation,
        midText: ' to add @sanity/routes to your project, or read the ',
        link2Text: 'Route Configuration',
        link2Key: 'lnk2',
        link2Ref: IDS.articleRouteConfig,
        endText: ' deep dive to understand the config format.',
      }),
    ],
  })

  // ── Article 2: Installation ───────────────────────────────
  tx.createOrReplace({
    _id: IDS.articleInstallation,
    _type: 'article',
    title: 'Installation',
    slug: { _type: 'slug', current: 'installation' },
    body: [
      ptBlock(
        'b1',
        'Getting @sanity/routes into your project takes about five minutes. You install the package, add the Studio plugin, and create a route config document. After that, URL resolution works automatically in both Studio and frontend.'
      ),

      ptHeading('h1', 'Install the Package'),
      ptBlock('b2', 'Add @sanity/routes to your project using your preferred package manager:'),

      ptCode(
        'code1',
        'bash',
        `pnpm add @sanity/routes
# or
npm install @sanity/routes
# or
yarn add @sanity/routes`
      ),

      ptHeading('h2', 'Add the Studio Plugin'),
      ptBlock(
        'b3',
        'The Studio plugin registers the route config schema, adds a custom input component for editing routes, and provides the Presentation tool integration. Add it to your sanity.config.ts:'
      ),

      ptCode(
        'code2',
        'typescript',
        `// sanity.config.ts
import { defineConfig } from 'sanity'
import { routesPlugin } from '@sanity/routes/plugin'

export default defineConfig({
  // ... your existing config
  plugins: [
    routesPlugin(),
    // ... other plugins
  ],
})`
      ),

      ptHeading('h3', 'Create the Route Config'),
      ptBlock(
        'b4',
        'The route config is a document in your dataset that defines how document types map to URLs. You can create it through the Studio UI, but the recommended approach is a seed script that you can version-control and re-run:'
      ),

      ptCode(
        'code3',
        'typescript',
        `// scripts/seed-routes.ts
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'your-project-id',
  dataset: 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

await client.createOrReplace({
  _id: 'routes-config-web',
  _type: 'routes.config',
  channel: 'web',
  baseUrls: [
    { _key: 'prod', name: 'production', url: 'https://www.example.com', isDefault: true },
    { _key: 'dev', name: 'development', url: 'http://localhost:3000' },
  ],
  routes: [
    {
      _key: 'page',
      types: ['page'],
      basePath: '',
      mode: 'simpleSlug',
      slugField: 'slug.current',
      pathExpression: 'slug.current',
    },
    {
      _key: 'blog',
      types: ['blogPost'],
      basePath: '/blog',
      mode: 'simpleSlug',
      slugField: 'slug.current',
      pathExpression: 'slug.current',
    },
  ],
})`
      ),

      ptBlock(
        'b5',
        'The seed script pattern is important because it makes your route config reproducible. You can run it in CI, share it across environments, and track changes in version control. The createOrReplace method ensures the script is idempotent — safe to run multiple times.'
      ),

      ptHeading('h4', 'Verify the Setup'),
      ptBlock('b6', 'After creating the route config, verify that resolution works:'),

      ptCode(
        'code4',
        'typescript',
        `import { createRouteResolver } from '@sanity/routes'

const resolver = createRouteResolver(client, 'web')
const url = await resolver.resolveUrlById('some-document-id')
console.log(url) // => "https://www.example.com/blog/my-post"`
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b7',
        text1: 'Next, learn how to set up route entries with mode presets in ',
        link1Text: 'Configuration',
        link1Key: 'lnk1',
        link1Ref: IDS.articleConfiguration,
        midText: '. For background on the problems this solves, see ',
        link2Text: 'Why URL Resolution?',
        link2Key: 'lnk2',
        link2Ref: IDS.articleWhy,
        endText: '',
      }),
    ],
  })

  // ── Article 3: Configuration ──────────────────────────────
  tx.createOrReplace({
    _id: IDS.articleConfiguration,
    _type: 'article',
    title: 'Configuration',
    slug: { _type: 'slug', current: 'configuration' },
    body: [
      ptBlock(
        'b1',
        'Route entries define how document types map to URL paths. The @sanity/routes package uses a progressive disclosure approach: most routes need zero GROQ knowledge. You pick a mode preset, fill in a few fields, and the system generates the GROQ path expression for you.'
      ),

      ptHeading('h1', 'Mode Presets'),
      ptBlock(
        'b2',
        'Each route entry has a mode field that determines how the URL path is computed. There are three built-in modes, each progressively more powerful:'
      ),

      ptHeading('h2', 'Simple Slug Mode'),
      ptBlock(
        'b3',
        'The simplest mode. The URL path is just the document\'s slug field. Perfect for blog posts, pages, and any flat content structure.'
      ),

      ptCode(
        'code1',
        'json',
        `{
  "_key": "blog",
  "types": ["blogPost"],
  "basePath": "/blog",
  "mode": "simpleSlug",
  "slugField": "slug.current"
}
// blogPost with slug "hello-world" → /blog/hello-world`
      ),

      ptHeading('h3', 'Parent Slug Mode'),
      ptBlock(
        'b4',
        'For nested content structures where a document\'s URL includes its parent\'s slug. Common for docs organized into sections, products in categories, or any parent-child hierarchy.'
      ),

      ptCode(
        'code2',
        'json',
        `{
  "_key": "article",
  "types": ["article"],
  "basePath": "/docs",
  "mode": "parentSlug",
  "slugField": "slug.current",
  "parentType": "docsNavSection",
  "parentSlugField": "slug.current",
  "parentRelationship": "parentReferencesChild"
}
// article "installation" in section "getting-started"
// → /docs/getting-started/installation`
      ),

      ptBlock(
        'b5',
        'The parentRelationship field tells the system how to find the parent. "parentReferencesChild" means the parent document has a reference array that includes the child (like a nav section with an articles array). "childReferencesParent" means the child has a reference field pointing to the parent (like a category field on a product).'
      ),

      ptHeading('h4', 'Custom GROQ Mode'),
      ptBlock(
        'b6',
        'For complex URL patterns that don\'t fit the presets. You write a raw GROQ expression that\'s evaluated in the context of each document. This is the escape hatch — you can express any URL pattern that GROQ can compute.'
      ),

      ptCode(
        'code3',
        'groq',
        `// Custom GROQ for date-based blog URLs:
// /blog/2024/03/my-post
select(
  defined(publishedAt) =>
    string::split(publishedAt, "-")[0] + "/" +
    string::split(publishedAt, "-")[1] + "/" +
    slug.current,
  slug.current
)`
      ),

      ptBlock(
        'b7',
        'The progressive disclosure UX means most users never see GROQ. The Studio input component shows a friendly form for simpleSlug and parentSlug modes, and only reveals the raw GROQ editor when you choose custom mode. This keeps the common case simple while preserving full flexibility.'
      ),

      ptHeading('h5', 'Generated Path Expressions'),
      ptBlock(
        'b8',
        'When you use simpleSlug or parentSlug mode, the system generates the GROQ pathExpression automatically. You can see the generated expression in the Studio UI — it updates live as you change the mode fields. This is a great way to learn GROQ path expressions before graduating to custom mode.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b9',
        text1: 'For the initial setup steps, see ',
        link1Text: 'Installation',
        link1Key: 'lnk1',
        link1Ref: IDS.articleInstallation,
        midText: '. To learn how to use the resolver in your frontend code, see the ',
        link2Text: 'Route Resolver API',
        link2Key: 'lnk2',
        link2Ref: IDS.articleResolverApi,
        endText: ' guide.',
      }),
    ],
  })

  // ═══════════════════════════════════════════════════════════
  // CONCEPTS ARTICLES
  // ═══════════════════════════════════════════════════════════

  // ── Article 4: Architecture ───────────────────────────────
  tx.createOrReplace({
    _id: IDS.articleArchitecture,
    _type: 'article',
    title: 'Architecture',
    slug: { _type: 'slug', current: 'architecture' },
    body: [
      ptBlock(
        'b1',
        'The URL resolution system is built on a two-tier architecture: a route config that defines the mapping rules, and a route map that caches the computed results. This separation lets you choose the right trade-off between freshness and performance for each use case.'
      ),

      ptHeading('h1', 'The Route Config (Tier 1)'),
      ptBlock(
        'b2',
        'The route config is a document of type routes.config stored in your Sanity dataset. It defines the "what" — which document types map to which URL patterns, what base URLs to use for different environments, and how path expressions are evaluated. The config is the single source of truth that all resolver modes read from.'
      ),
      ptBlock(
        'b3',
        'Because the config is a regular Sanity document, it benefits from all the platform features: real-time collaboration, revision history, access control, and the Studio editing UI. You can even have different route configs for different channels (web, mobile app, etc.).'
      ),

      ptHeading('h2', 'The Route Map (Tier 2)'),
      ptBlock(
        'b4',
        'The route map is a set of shard documents of type routes.map that store pre-computed URL mappings. Each shard covers one document type and contains an array of entries mapping document IDs to their resolved paths. Shards are identified by the pattern routes.map.{channel}.{documentType}.'
      ),
      ptBlock(
        'b5',
        'The route map is a cache — it can always be rebuilt from the route config and the content. Its purpose is to enable O(1) URL lookups without evaluating GROQ at read time. This is critical for frontend rendering where you might need to resolve dozens of URLs per page (e.g., all internal links in a Portable Text body).'
      ),

      ptHeading('h3', 'Realtime Mode'),
      ptBlock(
        'b6',
        'In realtime mode, the resolver reads the route config and evaluates GROQ path expressions live against the Content Lake. There is no route map involved — every resolution is a fresh query. This mode is ideal for Studio plugins and preview tools where you need the URL for a single document and freshness matters more than latency.'
      ),

      ptCode(
        'code1',
        'typescript',
        `// Realtime mode — evaluates GROQ live
const resolver = createRouteResolver(client, 'web', { mode: 'realtime' })

// Each call makes a GROQ query to the Content Lake
const url = await resolver.resolveUrlById('article-123')
// => "https://www.example.com/docs/guides/my-article"

// groqField() returns a GROQ fragment for embedding in queries
const pathField = await resolver.groqField('article')
const results = await client.fetch(\`
  *[_type == "article"]{ _id, title, \${pathField} }
\`)`
      ),

      ptHeading('h4', 'Static Mode'),
      ptBlock(
        'b7',
        'In static mode, the resolver reads from the pre-computed route map shards. The preload() method fetches all shards in a single query and returns a Map for instant lookups. This mode is ideal for frontend rendering where you need to resolve many URLs at once.'
      ),

      ptCode(
        'code2',
        'typescript',
        `// Static mode — reads from pre-computed route map
const resolver = createRouteResolver(client, 'web', { mode: 'static' })
const urlMap = await resolver.preload()

// Synchronous O(1) lookups — no async, no GROQ
const url = urlMap.get('article-123')
// => "https://www.example.com/docs/guides/my-article"`
      ),

      ptHeading('h5', 'When to Use Which Mode'),
      ptBlock(
        'b8',
        'Use realtime mode when: you need the URL for one or a few documents, freshness is critical (e.g., Studio preview), or you want to embed resolution in GROQ queries with groqField(). Use static mode when: you need to resolve many URLs at once (e.g., all PT links on a page), you want synchronous lookups in render functions, or you are building a sitemap or RSS feed.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b9',
        text1: 'The route map is kept in sync by ',
        link1Text: 'the Sync Function',
        link1Key: 'lnk1',
        link1Ref: IDS.articleSyncFunction,
        midText: '. For the full resolver API, see the ',
        link2Text: 'Route Resolver API',
        link2Key: 'lnk2',
        link2Ref: IDS.articleResolverApi,
        endText: ' guide.',
      }),
    ],
  })

  // ── Article 5: Route Configuration (deep dive) ────────────
  tx.createOrReplace({
    _id: IDS.articleRouteConfig,
    _type: 'article',
    title: 'Route Configuration',
    slug: { _type: 'slug', current: 'route-config' },
    body: [
      ptBlock(
        'b1',
        'The route configuration document is the heart of the URL resolution system. It is a single document in your Sanity dataset that defines how every routable document type maps to a URL. This page is a deep dive into its structure, fields, and how GROQ evaluation works under the hood.'
      ),

      ptHeading('h1', 'Document Structure'),
      ptBlock(
        'b2',
        'A route config document has the type routes.config and a well-known ID following the pattern routes-config-{channel}. It has three top-level fields: channel, baseUrls, and routes.'
      ),

      ptCode(
        'code1',
        'json',
        `{
  "_id": "routes-config-web",
  "_type": "routes.config",
  "channel": "web",
  "baseUrls": [
    {
      "_key": "prod",
      "name": "production",
      "url": "https://www.example.com",
      "isDefault": true
    },
    {
      "_key": "dev",
      "name": "development",
      "url": "http://localhost:3000"
    }
  ],
  "routes": [
    {
      "_key": "blog",
      "types": ["blogPost"],
      "basePath": "/blog",
      "mode": "simpleSlug",
      "slugField": "slug.current",
      "pathExpression": "slug.current"
    }
  ]
}`
      ),

      ptHeading('h2', 'Channels'),
      ptBlock(
        'b3',
        'The channel field is a string identifier that namespaces the route config. You can have multiple route configs for different frontends — "web" for your marketing site, "docs" for your documentation site, "app" for a mobile app. Each channel has its own set of base URLs and route entries.'
      ),
      ptBlock(
        'b4',
        'When creating a resolver, you specify which channel to use. This lets a single Sanity dataset serve multiple frontends with different URL structures.'
      ),

      ptHeading('h3', 'Base URLs'),
      ptBlock(
        'b5',
        'The baseUrls array defines the root URLs for different environments. Each entry has a name (like "production" or "staging"), a url, and an optional isDefault flag. The default base URL is used when resolving full URLs — the resolver combines it with the basePath and the computed path segment.'
      ),
      ptBlock(
        'b6',
        'Having multiple base URLs lets you resolve the same document to different domains depending on the environment. The Studio might use the development URL for preview, while the frontend uses the production URL for rendering.'
      ),

      ptHeading('h4', 'Path Expressions and GROQ Evaluation'),
      ptBlock(
        'b7',
        'Each route entry\'s pathExpression is a GROQ expression evaluated in the context of the target document. The expression has access to all of the document\'s fields and can use GROQ functions and operators. The result is joined with the basePath to form the full URL path.'
      ),
      ptBlock(
        'b8',
        'For simple cases, the expression is just a field reference like slug.current. For nested structures, it might join parent and child slugs using coalesce() and string concatenation. For complex cases, you can use select(), string functions, or even sub-queries.'
      ),

      ptCode(
        'code2',
        'groq',
        `// Simple: just the slug
slug.current

// Nested: parent section slug + article slug
coalesce(
  *[_type == "docsNavSection" && references(^._id)][0].slug.current + "/",
  ""
) + slug.current

// Complex: date-based paths with fallback
select(
  defined(publishedAt) =>
    string::split(publishedAt, "-")[0] + "/" +
    string::split(publishedAt, "-")[1] + "/" +
    slug.current,
  slug.current
)`
      ),

      ptBlock(
        'b9',
        'The coalesce() pattern is important for robustness. If a document does not have a parent (or the parent query returns nothing), coalesce falls back to an empty string, so the URL still resolves — just without the parent prefix. This prevents broken URLs for orphaned documents.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b10',
        text1: 'For the big picture of how config and map work together, see ',
        link1Text: 'Architecture',
        link1Key: 'lnk1',
        link1Ref: IDS.articleArchitecture,
        midText: '. For the practical setup with mode presets, see ',
        link2Text: 'Configuration',
        link2Key: 'lnk2',
        link2Ref: IDS.articleConfiguration,
        endText: '.',
      }),
    ],
  })

  // ═══════════════════════════════════════════════════════════
  // GUIDES ARTICLES
  // ═══════════════════════════════════════════════════════════

  // ── Article 6: Route Resolver API ─────────────────────────
  tx.createOrReplace({
    _id: IDS.articleResolverApi,
    _type: 'article',
    title: 'Route Resolver API',
    slug: { _type: 'slug', current: 'resolver-api' },
    body: [
      ptBlock(
        'b1',
        'The route resolver is the main interface for turning document IDs into URLs. You create a resolver instance, then use its methods to resolve single documents, batches, or embed resolution directly in GROQ queries. This guide covers every method with copy-pasteable examples.'
      ),

      ptHeading('h1', 'createRouteResolver()'),
      ptBlock(
        'b2',
        'Create a resolver by passing a Sanity client, a channel name, and optional configuration. The resolver reads the route config document for the specified channel and uses it for all subsequent resolution calls.'
      ),

      ptCode(
        'code1',
        'typescript',
        `import { createClient } from '@sanity/client'
import { createRouteResolver } from '@sanity/routes'

const client = createClient({
  projectId: 'your-project-id',
  dataset: 'production',
  token: process.env.SANITY_READ_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// Realtime mode (default) — evaluates GROQ live
const resolver = createRouteResolver(client, 'web')

// Static mode — reads from pre-computed route map shards
const staticResolver = createRouteResolver(client, 'web', {
  mode: 'static',
})`
      ),

      ptHeading('h2', 'resolveUrlById() / resolveUrlByIds()'),
      ptBlock(
        'b3',
        'Resolve one or more document IDs to full URLs. In realtime mode, each call evaluates the GROQ path expression against the Content Lake. In static mode, it reads from the pre-loaded route map.'
      ),

      ptCode(
        'code2',
        'typescript',
        `// Single document
const url = await resolver.resolveUrlById('article-123')
// => "https://www.example.com/docs/guides/my-article"

// Multiple documents
const urls = await resolver.resolveUrlByIds([
  'article-123',
  'article-456',
  'blog-789',
])
// => Map {
//   "article-123" => "https://www.example.com/docs/guides/my-article",
//   "article-456" => "https://www.example.com/docs/concepts/architecture",
//   "blog-789" => "https://www.example.com/blog/hello-world"
// }`
      ),

      ptHeading('h3', 'groqField()'),
      ptBlock(
        'b4',
        'Returns a GROQ projection fragment that you can embed in your own queries. This is the most efficient way to get URLs — the Content Lake evaluates the path expression server-side as part of your query, with no extra round trips.'
      ),

      ptCode(
        'code3',
        'typescript',
        `const pathField = await resolver.groqField('article')
// Returns: "path": coalesce(*[_type == "docsNavSection" && ...][0].slug.current + "/", "") + slug.current

// Embed it in your query
const articles = await client.fetch(\`
  *[_type == "article"]{
    _id,
    title,
    \${pathField}
  }
\`)

// Each result has a .path property:
// { _id: "article-123", title: "My Article", path: "guides/my-article" }`
      ),

      ptBlock(
        'b5',
        'The groqField() method reads the route config once, finds the route entry for the specified type, and returns the pathExpression wrapped in a GROQ projection. The field name defaults to "path" but can be customized.'
      ),

      ptHeading('h4', 'preload()'),
      ptBlock(
        'b6',
        'Fetches all route map shards for the channel and returns a Map<documentId, fullUrl>. This is the key method for Portable Text link resolution — you call it once, then use the map for synchronous lookups during rendering.'
      ),

      ptCode(
        'code4',
        'typescript',
        `const staticResolver = createRouteResolver(client, 'web', {
  mode: 'static',
})
const urlMap = await staticResolver.preload()

// urlMap is a Map<string, string>
// "article-why"     => "https://www.example.com/docs/getting-started/why-url-resolution"
// "blog-introducing" => "https://www.example.com/blog/introducing-url-resolution"

// Synchronous lookup — no async, no GROQ
const url = urlMap.get('article-why')`
      ),

      ptBlock(
        'b7',
        'The preload() method fetches all shards in a single GROQ query, iterates over every entry, and builds the Map. The cost is proportional to the total number of routable documents in your dataset — typically a few hundred to a few thousand entries. For most sites, this takes under 100ms.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b8',
        text1: 'For the most common use case of preload(), see ',
        link1Text: 'Portable Text Links',
        link1Key: 'lnk1',
        link1Ref: IDS.articlePtLinks,
        midText: '. For the system design behind these APIs, see ',
        link2Text: 'Architecture',
        link2Key: 'lnk2',
        link2Ref: IDS.articleArchitecture,
        endText: '.',
      }),
    ],
  })

  // ── Article 7: Portable Text Links ────────────────────────
  tx.createOrReplace({
    _id: IDS.articlePtLinks,
    _type: 'article',
    title: 'Portable Text Links',
    slug: { _type: 'slug', current: 'portable-text-links' },
    body: [
      ptBlock(
        'b1',
        'Internal links in Portable Text are one of the hardest URL resolution problems. The editor stores a reference to the target document, not a URL. At render time, you need to turn that reference into a clickable link. But you are inside a React component — you cannot make async calls per link without waterfall requests or complex state management.'
      ),

      ptHeading('h1', 'The Pattern'),
      ptBlock(
        'b2',
        'The solution is a two-step pattern: preload all URLs in parallel with your content fetch, then use the resulting Map for synchronous lookups inside your PortableText component. No async, no waterfalls, no context providers.'
      ),

      ptCode(
        'code1',
        'typescript',
        `// app/docs/[...slug]/page.tsx
import { createClient } from '@sanity/client'
import { createRouteResolver } from '@sanity/routes'
import { PortableText } from '@portabletext/react'

const client = createClient({ /* ... */ })

export default async function ArticlePage({ params }) {
  const slug = (await params).slug.join('/')

  // Fetch content and URL map in parallel
  const [article, urlMap] = await Promise.all([
    client.fetch(
      \`*[_type == "article" && slug.current == $slug][0]{
        title,
        body
      }\`,
      { slug }
    ),
    createRouteResolver(client, 'web', { mode: 'static' }).preload(),
  ])

  return (
    <article>
      <h1>{article.title}</h1>
      <PortableText
        value={article.body}
        components={{
          marks: {
            internalLink: ({ value, children }) => {
              const url = urlMap.get(value.reference._ref)
              return url
                ? <a href={url}>{children}</a>
                : <span>{children}</span>
            },
          },
        }}
      />
    </article>
  )
}`
      ),

      ptHeading('h2', 'Why This Works'),
      ptBlock(
        'b3',
        'The key insight is that preload() and the content fetch are independent — they can run in parallel with Promise.all(). The preload() call fetches all route map shards (typically 2-5 small documents) and builds a Map. By the time the content arrives, the URL map is ready.'
      ),
      ptBlock(
        'b4',
        'Inside the PortableText component, every internal link resolves with a synchronous Map.get() call. No async, no useEffect, no loading states. If a referenced document does not have a route (deleted, unpublished, or not in the route config), the Map returns undefined and the fallback <span> renders the text without a link.'
      ),

      ptHeading('h3', 'Why Not Async Per Link?'),
      ptBlock(
        'b5',
        'You might wonder: why not just resolve each link individually? The problem is the rendering model. In React Server Components (Next.js App Router), the PortableText component renders synchronously. You cannot await inside a component\'s render function. Even in client components, resolving each link individually would create a waterfall of requests — one per link, serialized by React\'s rendering cycle.'
      ),
      ptBlock(
        'b6',
        'The preload() pattern avoids both problems. One request fetches all URLs. The Map lookup is synchronous. The component renders in a single pass.'
      ),

      ptHeading('h4', 'How Internal Links Are Stored'),
      ptBlock('b7', 'When an editor creates an internal link in Portable Text, Sanity stores it as a mark definition with a reference:'),

      ptCode(
        'code2',
        'json',
        `{
  "_type": "block",
  "_key": "abc",
  "children": [
    { "_type": "span", "_key": "s1", "text": "Read the " },
    { "_type": "span", "_key": "s2", "text": "installation guide", "marks": ["lnk1"] },
    { "_type": "span", "_key": "s3", "text": " to get started." }
  ],
  "markDefs": [
    {
      "_type": "internalLink",
      "_key": "lnk1",
      "reference": {
        "_ref": "article-installation",
        "_type": "reference"
      }
    }
  ]
}`
      ),

      ptBlock(
        'b8',
        'The reference._ref is the document ID of the target. The preload() Map uses document IDs as keys, so the lookup is direct — no slug resolution, no type checking, just a Map.get() with the _ref value.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b9',
        text1: 'For the full resolver API including preload(), see the ',
        link1Text: 'Route Resolver API',
        link1Key: 'lnk1',
        link1Ref: IDS.articleResolverApi,
        midText: ' guide. For Studio integration with visual editing, see ',
        link2Text: 'Presentation Integration',
        link2Key: 'lnk2',
        link2Ref: IDS.articlePresentation,
        endText: '.',
      }),
    ],
  })

  // ── Article 8: The Sync Function ──────────────────────────
  tx.createOrReplace({
    _id: IDS.articleSyncFunction,
    _type: 'article',
    title: 'The Sync Function',
    slug: { _type: 'slug', current: 'sync-function' },
    body: [
      ptBlock(
        'b1',
        'The route map is a cache of pre-computed URLs. When content changes — a slug is updated, a document is moved to a different section, or a new document is published — the route map needs to update. A Sanity Function handles this automatically, listening for mutations and rebuilding the affected shards.'
      ),

      ptHeading('h1', 'How It Triggers'),
      ptBlock(
        'b2',
        'The sync function is deployed as a Sanity Function that triggers on document events: create, update, and delete. When any document of a routable type changes, the function fires and rebuilds the route map shards for that type.'
      ),
      ptBlock(
        'b3',
        'The function also triggers when nav section documents change (or any parent type referenced in a parentSlug route). If a section\'s slug changes, all articles in that section get new URLs — the function detects this and rebuilds the article shard.'
      ),

      ptHeading('h2', 'The Single-Transaction Upsert Pattern'),
      ptBlock(
        'b4',
        'The sync function uses a single-transaction pattern to update route map shards atomically. It fetches the route config, evaluates all path expressions for the affected document type, and writes the entire shard in one transaction. This avoids partial updates and race conditions.'
      ),

      ptCode(
        'code1',
        'typescript',
        `import { createClient } from '@sanity/client'
import { buildRouteMap } from '@sanity/routes/build'

export default async function syncRouteMap(event) {
  const client = createClient({
    projectId: event.projectId,
    dataset: event.dataset,
    token: process.env.SANITY_WRITE_TOKEN,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  // Rebuild all shards for the "web" channel
  const result = await buildRouteMap(client, 'web')
  console.log(\`Rebuilt \${result.shards} shards with \${result.entries} entries\`)

  if (result.errors.length > 0) {
    console.error('Errors:', result.errors)
  }
}`
      ),

      ptHeading('h3', 'Handling Edge Cases'),
      ptBlock(
        'b5',
        'The sync function handles several edge cases that manual URL management would miss:'
      ),
      ptBlock(
        'b6',
        'Slug changes: When a document\'s slug changes, the old URL becomes stale. The rebuild replaces the entire shard, so the old entry is automatically removed and the new one is added.'
      ),
      ptBlock(
        'b7',
        'Parent changes: When an article is moved from one nav section to another (by updating the section\'s articles array), the article\'s URL changes. The rebuild evaluates the path expression fresh, picking up the new parent.'
      ),
      ptBlock(
        'b8',
        'Deletes: When a document is deleted, the rebuild simply does not include it in the new shard. The old entry disappears. Frontends that still reference the deleted document will get undefined from the Map lookup and can render a fallback.'
      ),

      ptHeading('h4', 'Shard Structure'),
      ptBlock('b9', 'Each route map shard is a document with this structure:'),

      ptCode(
        'code2',
        'json',
        `{
  "_id": "routes.map.web.article",
  "_type": "routes.map",
  "channel": "web",
  "documentType": "article",
  "basePath": "/docs",
  "entries": [
    { "_key": "e1", "documentId": "article-why", "path": "getting-started/why-url-resolution" },
    { "_key": "e2", "documentId": "article-installation", "path": "getting-started/installation" },
    { "_key": "e3", "documentId": "article-architecture", "path": "concepts/architecture" }
  ]
}`
      ),

      ptBlock(
        'b10',
        'Note that shard IDs contain dots (routes.map.web.article), which makes them private documents in Sanity. They are only accessible with an authenticated token, not via the CDN. Your frontend needs a read token configured to access them.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b11',
        text1: 'For the two-tier architecture that the sync function supports, see ',
        link1Text: 'Architecture',
        link1Key: 'lnk1',
        link1Ref: IDS.articleArchitecture,
        midText: '. For the config format that drives the sync, see ',
        link2Text: 'Route Configuration',
        link2Key: 'lnk2',
        link2Ref: IDS.articleRouteConfig,
        endText: '.',
      }),
    ],
  })

  // ── Article 9: Presentation Integration ───────────────────
  tx.createOrReplace({
    _id: IDS.articlePresentation,
    _type: 'article',
    title: 'Presentation Integration',
    slug: { _type: 'slug', current: 'presentation-integration' },
    body: [
      ptBlock(
        'b1',
        'The Sanity Presentation tool needs to know two things: where does a document appear on the frontend (locations), and what is the main document for a given URL (mainDocuments). Traditionally, you configure these manually — writing resolve functions that duplicate your URL logic. With @sanity/routes, one function call replaces all of that.'
      ),

      ptHeading('h1', 'routesPresentation()'),
      ptBlock(
        'b2',
        'The routesPresentation() function reads your route config and automatically generates the locations and mainDocuments resolvers for the Presentation tool. You pass it to presentationTool() and you are done.'
      ),

      ptCode(
        'code1',
        'typescript',
        `// sanity.config.ts
import { defineConfig } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { routesPlugin, routesPresentation } from '@sanity/routes/plugin'

export default defineConfig({
  plugins: [
    routesPlugin(),
    presentationTool({
      previewUrl: {
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      // One line replaces 30+ lines of manual resolve config
      resolve: routesPresentation({ channel: 'web' }),
    }),
  ],
})`
      ),

      ptHeading('h2', 'What It Generates'),
      ptBlock(
        'b3',
        'The routesPresentation() function generates two things from your route config:'
      ),
      ptBlock(
        'b4',
        'locations — For each document type in your route config, it creates a location resolver that computes the document\'s URL using the same GROQ path expression. When you open a document in the Studio, the Presentation tool shows where it appears on the frontend.'
      ),
      ptBlock(
        'b5',
        'mainDocuments — For each route entry, it creates a resolver that maps a frontend URL back to the Sanity document that owns it. When you navigate the frontend in the Presentation tool\'s iframe, the Studio automatically selects the corresponding document.'
      ),

      ptHeading('h3', 'How It Works Under the Hood'),
      ptBlock(
        'b6',
        'The function fetches the route config document for the specified channel, then iterates over the route entries. For each entry, it builds a GROQ query that evaluates the path expression and compares it to the current URL. This is the same GROQ that the resolver uses — ensuring consistency between the Presentation tool and the frontend.'
      ),

      ptHeading('h4', 'Extending with Extra Locations'),
      ptBlock(
        'b7',
        'Some documents appear on multiple pages. A featured article might appear on the homepage, in a category listing, and on its own page. The route config only knows about the canonical URL (the article\'s own page). For additional locations, you can extend the generated config:'
      ),

      ptCode(
        'code2',
        'typescript',
        `import { routesPresentation } from '@sanity/routes/plugin'

const routesResolve = routesPresentation({ channel: 'web' })

// Extend with additional locations
export const resolve = {
  ...routesResolve,
  locations: {
    ...routesResolve.locations,
    // Add homepage as an extra location for featured articles
    article: [
      ...routesResolve.locations.article,
      {
        title: 'Homepage (featured)',
        href: '/',
      },
    ],
  },
}`
      ),

      ptBlock(
        'b8',
        'This composable pattern means you get the automatic route-based locations for free, and only need to manually specify the edge cases where a document appears outside its canonical URL.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b9',
        text1: 'For the resolver API that powers this integration, see the ',
        link1Text: 'Route Resolver API',
        link1Key: 'lnk1',
        link1Ref: IDS.articleResolverApi,
        midText: ' guide. For the initial setup including the plugin, see ',
        link2Text: 'Configuration',
        link2Key: 'lnk2',
        link2Ref: IDS.articleConfiguration,
        endText: '.',
      }),
    ],
  })

  // ═══════════════════════════════════════════════════════════
  // BLOG POSTS
  // ═══════════════════════════════════════════════════════════

  // ── Blog Post 1: Introducing URL Resolution ───────────────
  tx.createOrReplace({
    _id: IDS.blogIntroducing,
    _type: 'blogPost',
    title: 'Introducing URL Resolution for Sanity',
    slug: { _type: 'slug', current: 'introducing-url-resolution' },
    body: [
      ptBlock(
        'b1',
        'Structured content does not know its own URL. A document in Sanity is just data — it has an ID, a type, and fields. But when that document appears on a website, it needs a URL. And that URL depends on the frontend: the same article might live at /docs/getting-started on one site and /help/setup on another.'
      ),

      ptHeading('h1', 'Every Project Reinvents This'),
      ptBlock(
        'b2',
        'We have watched hundreds of Sanity projects solve the same problem from scratch. A utility function that concatenates slugs. A GROQ query that joins parent and child paths. A Studio plugin that hardcodes preview URLs. A Presentation tool config that duplicates the frontend\'s routing logic. Every project writes this code, and every project gets it slightly wrong in slightly different ways.'
      ),
      ptBlock(
        'b3',
        'The worst part is the drift. The frontend changes its URL structure, but the Studio preview URLs do not update. An editor renames a section slug, but the sitemap generator still uses the old one. Internal links in Portable Text point to documents that have moved. There is no single source of truth.'
      ),

      ptHeading('h2', 'One Config, Automatic Everywhere'),
      ptBlock(
        'b4',
        'Today we are introducing @sanity/routes — a package that gives you one route configuration, stored as a document in your dataset, that drives URL resolution everywhere. The Studio reads it. The frontend reads it. The Presentation tool reads it. Sanity Functions read it. One config, zero drift.'
      ),

      ptHeading('h3', 'Key Features'),
      ptBlock(
        'b5',
        'Two resolver modes: Realtime mode evaluates GROQ path expressions live — perfect for Studio plugins where freshness matters. Static mode reads from a pre-computed route map — perfect for frontends where you need to resolve dozens of URLs per page with O(1) lookups.'
      ),
      ptBlock(
        'b6',
        'Portable Text link resolution: The preload() method fetches all URLs in a single query. You call it in parallel with your content fetch, then use the resulting Map for synchronous lookups inside your PortableText component. No async per link, no waterfalls, no context providers.'
      ),
      ptBlock(
        'b7',
        'Studio integration: The routesPresentation() function reads your route config and auto-generates the Presentation tool\'s locations and mainDocuments resolvers. One line of code replaces 30+ lines of manual configuration.'
      ),
      ptBlock(
        'b8',
        'Progressive disclosure: Most routes need zero GROQ. Pick a mode preset (simpleSlug or parentSlug), fill in a few fields, and the system generates the GROQ for you. Custom mode is there when you need it, but most projects never will.'
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b9',
        text1: 'Read ',
        link1Text: 'Why URL Resolution?',
        link1Key: 'lnk1',
        link1Ref: IDS.articleWhy,
        midText: ' for the full problem statement, or dive into the ',
        link2Text: 'Architecture',
        link2Key: 'lnk2',
        link2Ref: IDS.articleArchitecture,
        endText: ' to understand the two-tier system design.',
      }),
    ],
  })

  // ── Blog Post 2: The DX of Route Resolution ───────────────
  tx.createOrReplace({
    _id: IDS.blogDx,
    _type: 'blogPost',
    title: 'The DX of Route Resolution',
    slug: { _type: 'slug', current: 'developer-experience' },
    body: [
      ptBlock(
        'b1',
        'Developer experience is not just about having a nice API. It is about the entire journey — from first encounter to production deployment. Every decision in @sanity/routes was made with DX in mind. Here is how.'
      ),

      ptHeading('h1', 'Progressive Disclosure in the Studio'),
      ptBlock(
        'b2',
        'The route config editor in the Studio uses progressive disclosure. When you create a new route entry, you see a simple form: pick the document types, set the base path, choose a mode. For simpleSlug mode, that is it — you are done. The GROQ path expression is generated automatically and hidden behind a disclosure.'
      ),
      ptBlock(
        'b3',
        'Switch to parentSlug mode and you get a few more fields: parent type, parent slug field, relationship direction. Still no GROQ. The system generates the coalesce() expression that joins parent and child slugs.'
      ),
      ptBlock(
        'b4',
        'Only when you choose custom mode does the raw GROQ editor appear. And even then, the previously generated expression is pre-filled — you are editing, not writing from scratch. This means most developers never need to learn GROQ path expressions. They just work.'
      ),

      ptHeading('h2', 'Zero-GROQ for Simple Routes'),
      ptBlock(
        'b5',
        'The most common URL pattern is /{basePath}/{slug}. Blog posts, pages, products — they all follow this pattern. With simpleSlug mode, you configure this in seconds. No GROQ, no path expressions, no string concatenation. Just set the base path and the slug field.'
      ),
      ptBlock(
        'b6',
        'The second most common pattern is /{basePath}/{parentSlug}/{slug}. Docs in sections, products in categories, articles in topics. With parentSlug mode, you add the parent type and relationship direction. Still no GROQ.'
      ),
      ptBlock(
        'b7',
        'Together, these two modes cover roughly 90% of real-world URL patterns. The remaining 10% use custom GROQ — and even those start from a generated template.'
      ),

      ptHeading('h3', 'groqField() — URLs as First-Class GROQ Fields'),
      ptBlock(
        'b8',
        'One of the most powerful DX features is groqField(). Instead of resolving URLs after fetching documents, you embed the resolution directly in your GROQ query. The Content Lake evaluates the path expression server-side — no extra round trips, no post-processing.'
      ),

      ptCode(
        'code1',
        'typescript',
        `const resolver = createRouteResolver(client, 'web')
const pathField = await resolver.groqField('article')

// pathField is a GROQ projection fragment like:
// "path": coalesce(*[...][0].slug.current + "/", "") + slug.current

const articles = await client.fetch(\`
  *[_type == "article"]{
    _id,
    title,
    "publishedAt": _createdAt,
    \${pathField}
  } | order(publishedAt desc)
\`)

// Each article now has a .path property — no post-processing needed
// [{ _id: "...", title: "...", path: "guides/my-article" }, ...]`
      ),

      ptBlock(
        'b9',
        'This pattern treats URLs as just another computed field on your documents. You do not need a separate resolution step. You do not need to join data from multiple queries. The URL is right there in the query result, computed by the same GROQ engine that handles everything else.'
      ),

      ptHeading('h4', 'routesPresentation() — One Line Replaces Thirty'),
      ptBlock(
        'b10',
        'The Presentation tool is one of Sanity\'s most powerful features, but configuring it has always been tedious. You need to write a resolve function that maps document types to locations, and another that maps URLs back to documents. For a project with 5 document types, that is 30+ lines of boilerplate.'
      ),
      ptBlock(
        'b11',
        'With routesPresentation(), you pass your channel name and get back a complete resolve config. The function reads your route config and generates everything automatically. If you add a new document type to your route config, the Presentation tool picks it up immediately — no code changes needed.'
      ),

      ptCode(
        'code2',
        'typescript',
        `// Before: 30+ lines of manual configuration
presentationTool({
  resolve: {
    locations: {
      article: defineLocations({
        select: { title: 'title', slug: 'slug.current', section: '...' },
        resolve: (doc) => ({
          locations: [{ title: doc.title, href: \`/docs/\${doc.section}/\${doc.slug}\` }],
        }),
      }),
      blogPost: defineLocations({ /* ... */ }),
      page: defineLocations({ /* ... */ }),
    },
    mainDocuments: defineDocuments([
      { route: '/docs/:section/:slug', filter: '...' },
      { route: '/blog/:slug', filter: '...' },
    ]),
  },
})

// After: one line
presentationTool({
  resolve: routesPresentation({ channel: 'web' }),
})`
      ),

      ptBlockWithTwoLinks({
        blockKey: 'b12',
        text1: 'For the full configuration guide including mode presets, see ',
        link1Text: 'Configuration',
        link1Key: 'lnk1',
        link1Ref: IDS.articleConfiguration,
        midText: '. For the Presentation tool setup details, see ',
        link2Text: 'Presentation Integration',
        link2Key: 'lnk2',
        link2Ref: IDS.articlePresentation,
        endText: '.',
      }),
    ],
  })

  // ═══════════════════════════════════════════════════════════
  // NAV SECTIONS
  // ═══════════════════════════════════════════════════════════

  tx.createOrReplace({
    _id: IDS.navGettingStarted,
    _type: 'docsNavSection',
    title: 'Getting Started',
    slug: { _type: 'slug', current: 'getting-started' },
    articles: [
      { _type: 'reference', _ref: IDS.articleWhy, _key: 'ref1' },
      { _type: 'reference', _ref: IDS.articleInstallation, _key: 'ref2' },
      { _type: 'reference', _ref: IDS.articleConfiguration, _key: 'ref3' },
    ],
  })

  tx.createOrReplace({
    _id: IDS.navConcepts,
    _type: 'docsNavSection',
    title: 'Concepts',
    slug: { _type: 'slug', current: 'concepts' },
    articles: [
      { _type: 'reference', _ref: IDS.articleArchitecture, _key: 'ref1' },
      { _type: 'reference', _ref: IDS.articleRouteConfig, _key: 'ref2' },
    ],
  })

  tx.createOrReplace({
    _id: IDS.navGuides,
    _type: 'docsNavSection',
    title: 'Guides',
    slug: { _type: 'slug', current: 'guides' },
    articles: [
      { _type: 'reference', _ref: IDS.articleResolverApi, _key: 'ref1' },
      { _type: 'reference', _ref: IDS.articlePtLinks, _key: 'ref2' },
      { _type: 'reference', _ref: IDS.articleSyncFunction, _key: 'ref3' },
      { _type: 'reference', _ref: IDS.articlePresentation, _key: 'ref4' },
    ],
  })

  // ── Commit ────────────────────────────────────────────────
  const result = await tx.commit()
  console.log(`   Created ${result.results.length} documents`)

  console.log('\n✅ Seed complete!')
  console.log('\nDocuments created:')
  console.log('  Getting Started:')
  console.log('    - Why URL Resolution? (getting-started/why-url-resolution)')
  console.log('    - Installation (getting-started/installation)')
  console.log('    - Configuration (getting-started/configuration)')
  console.log('  Concepts:')
  console.log('    - Architecture (concepts/architecture)')
  console.log('    - Route Configuration (concepts/route-config)')
  console.log('  Guides:')
  console.log('    - Route Resolver API (guides/resolver-api)')
  console.log('    - Portable Text Links (guides/portable-text-links)')
  console.log('    - The Sync Function (guides/sync-function)')
  console.log('    - Presentation Integration (guides/presentation-integration)')
  console.log('  Blog Posts:')
  console.log('    - Introducing URL Resolution (/blog/introducing-url-resolution)')
  console.log('    - The DX of Route Resolution (/blog/developer-experience)')
  console.log('  Nav Sections:')
  console.log('    - Getting Started (getting-started)')
  console.log('    - Concepts (concepts)')
  console.log('    - Guides (guides)')
  console.log('\n⚠️  Run build-map.mjs next to rebuild route map shards.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
