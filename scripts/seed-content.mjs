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
  // Articles
  articleHowItWorks: 'article-how-it-works',
  articleRouteConfig: 'article-route-config',
  articleResolvingUrls: 'article-resolving-urls',
  articlePtLinks: 'article-pt-links',
  articleSyncFunction: 'article-sync-function',
  // Blog posts
  blogIntroducing: 'blog-introducing',
  blogBuildingResolver: 'blog-building-resolver',
  // Nav sections
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
function ptBlockWithTwoLinks({ blockKey, text1, link1Text, link1Key, link1Ref, midText, link2Text, link2Key, link2Ref, endText }) {
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

  // ── Article 1: How URL Resolution Works ───────────────────
  tx.createOrReplace({
    _id: IDS.articleHowItWorks,
    _type: 'article',
    title: 'How URL Resolution Works',
    slug: { _type: 'slug', current: 'how-it-works' },
    body: [
      ptBlock('b1', 'URL resolution bridges the gap between structured content in Sanity and the URLs where that content appears on your website. Since a single document can appear at different URLs depending on the frontend, the mapping is defined as a route configuration document stored in your Sanity dataset.'),

      ptHeading('h1', 'Two-Tier Architecture'),
      ptBlock('b2', 'The system offers two resolver modes, each optimized for different use cases:'),
      ptBlock('b3', 'Realtime mode evaluates GROQ path expressions live against the Content Lake. This is ideal for Studio plugins and preview tools where you need the URL for a single document and freshness matters more than speed.'),
      ptBlock('b4', 'Static mode reads from a pre-computed route map — a set of shard documents that store every document\'s resolved URL. This is ideal for frontend rendering where you need to resolve many URLs at once (e.g., all internal links in a Portable Text body).'),

      ptHeading('h2', 'The Route Config Document'),
      ptBlock('b5', 'At the heart of the system is a route config document that defines how document types map to URL patterns. It specifies a channel (like "web"), base URLs for different environments, and an array of route entries:'),

      ptCode('code1', 'json', JSON.stringify({
        channel: "web",
        baseUrls: [{ name: "production", url: "https://example.com", isDefault: true }],
        routes: [
          { types: ["article"], basePath: "/docs", pathExpression: 'coalesce(*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/", "") + slug.current' },
          { types: ["blogPost"], basePath: "/blog", pathExpression: "slug.current" }
        ]
      }, null, 2)),

      ptBlock('b6', 'Each route entry maps one or more document types to a basePath and a GROQ pathExpression. The pathExpression is evaluated in the context of each document to produce its URL path segment.'),

      ptBlockWithTwoLinks({
        blockKey: 'b7',
        text1: 'For details on the config format, see ',
        link1Text: 'Route Configuration',
        link1Key: 'lnk1',
        link1Ref: IDS.articleRouteConfig,
        midText: '. To learn how to use the resolver API, see ',
        link2Text: 'Resolving URLs',
        link2Key: 'lnk2',
        link2Ref: IDS.articleResolvingUrls,
        endText: '.',
      }),
    ],
  })

  // ── Article 2: Route Configuration ────────────────────────
  tx.createOrReplace({
    _id: IDS.articleRouteConfig,
    _type: 'article',
    title: 'Route Configuration',
    slug: { _type: 'slug', current: 'route-config' },
    body: [
      ptBlock('b1', 'The route configuration document is the single source of truth for how documents map to URLs. It lives in your Sanity dataset as a document with a well-known ID pattern (routes-config-{channel}).'),

      ptHeading('h1', 'Document Structure'),
      ptBlock('b2', 'A route config has three top-level properties:'),
      ptBlock('b3', 'channel — A string identifier like "web" or "mobile" that namespaces the config. You can have multiple route configs for different frontends.'),
      ptBlock('b4', 'baseUrls — An array of named base URLs for different environments (production, staging, etc.). One must be marked isDefault.'),
      ptBlock('b5', 'routes — An array of route entries, each mapping document types to URL patterns.'),

      ptHeading('h2', 'Route Entries'),
      ptBlock('b6', 'Each route entry has three fields:'),
      ptBlock('b7', 'types — An array of document type names this route applies to (e.g., ["article"]).'),
      ptBlock('b8', 'basePath — The URL prefix (e.g., "/docs" or "/blog").'),
      ptBlock('b9', 'pathExpression — A GROQ expression evaluated in the context of each document to produce the path segment after the basePath.'),

      ptHeading('h3', 'Path Expressions'),
      ptBlock('b10', 'Path expressions range from simple to complex. A blog post might use a simple slug lookup:'),
      ptCode('code1', 'groq', 'slug.current'),

      ptBlock('b11', 'A nested docs structure might join the parent section slug with the article slug:'),
      ptCode('code2', 'groq', 'coalesce(\n  *[_type == "docsNavSection" && references(^._id)][0].slug.current + "/",\n  ""\n) + slug.current'),

      ptBlock('b12', 'The coalesce() ensures articles without a parent section still resolve — they just get the slug directly without a section prefix.'),

      ptBlockWithLink({
        blockKey: 'b13',
        beforeText: 'For an overview of the full system, see ',
        linkText: 'How URL Resolution Works',
        afterText: '.',
        linkKey: 'lnk1',
        refId: IDS.articleHowItWorks,
      }),
    ],
  })

  // ── Article 3: Resolving URLs ─────────────────────────────
  tx.createOrReplace({
    _id: IDS.articleResolvingUrls,
    _type: 'article',
    title: 'Resolving URLs',
    slug: { _type: 'slug', current: 'resolving-urls' },
    body: [
      ptBlock('b1', 'The resolver API provides a unified interface for turning document IDs into full URLs. You create a resolver instance by specifying a Sanity client, a channel name, and options.'),

      ptHeading('h1', 'Creating a Resolver'),
      ptCode('code1', 'typescript', `import { createRouteResolver } from '@sanity/routes'

// Realtime mode — evaluates GROQ live
const resolver = createRouteResolver(client, 'web', { mode: 'realtime' })
const url = await resolver.resolveById('article-123')

// Static mode — reads from pre-computed route map
const resolver = createRouteResolver(client, 'web', { mode: 'static' })
const urlMap = await resolver.preload()`),

      ptHeading('h2', 'Realtime Mode'),
      ptBlock('b2', 'In realtime mode, the resolver fetches the route config and evaluates the GROQ pathExpression for each document on demand. This is perfect for Studio plugins where you need the URL for the currently-edited document.'),
      ptBlock('b3', 'The resolver also exposes a groqField() method that returns a GROQ projection fragment you can embed in your own queries:'),

      ptCode('code2', 'typescript', `const pathField = await resolver.groqField('article')
// Returns something like: "path": coalesce(*[...][0].slug.current + "/", "") + slug.current

const articles = await client.fetch(
  \`*[_type == "article"]{ _id, title, \${pathField} }\`
)`),

      ptHeading('h3', 'Static Mode'),
      ptBlock('b4', 'In static mode, the resolver reads pre-computed route map shards from the dataset. The preload() method fetches all shards and returns a Map<documentId, fullUrl> for instant lookups:'),

      ptCode('code3', 'typescript', `const resolver = createRouteResolver(client, 'web', { mode: 'static' })
const urlMap = await resolver.preload()

// Synchronous lookup — no async needed
const url = urlMap.get('article-how-it-works')
// => "https://example.com/docs/concepts/how-it-works"`),

      ptBlock('b5', 'Static mode is ideal for frontend rendering where you need to resolve many URLs at once without making individual GROQ queries.'),

      ptBlockWithLink({
        blockKey: 'b6',
        beforeText: 'For the most common use case of static resolution, see ',
        linkText: 'Portable Text Links',
        afterText: '.',
        linkKey: 'lnk1',
        refId: IDS.articlePtLinks,
      }),
    ],
  })

  // ── Article 4: Portable Text Links ────────────────────────
  tx.createOrReplace({
    _id: IDS.articlePtLinks,
    _type: 'article',
    title: 'Portable Text Links',
    slug: { _type: 'slug', current: 'portable-text-links' },
    body: [
      ptBlock('b1', 'Internal links in Portable Text store a reference to the target document, not a URL. At render time, you need to resolve those references to actual URLs. The static resolver\'s preload() method makes this efficient.'),

      ptHeading('h1', 'The Pattern'),
      ptBlock('b2', 'The preload() method returns a Map<docId, fullUrl> that you can use for synchronous lookups inside your PortableText component. This avoids async operations during rendering:'),

      ptCode('code1', 'tsx', `const urlMap = await resolver.preload()

<PortableText
  value={body}
  components={{
    marks: {
      internalLink: ({ value, children }) => {
        const url = urlMap.get(value.reference._ref)
        return url ? <a href={url}>{children}</a> : <span>{children}</span>
      },
    },
  }}
/>`),

      ptHeading('h2', 'How It Works'),
      ptBlock('b3', 'When an editor creates an internal link in Portable Text, Sanity stores it as a mark definition with a reference field pointing to the target document. The mark definition looks like this:'),

      ptCode('code2', 'json', JSON.stringify({
        _type: "internalLink",
        _key: "abc123",
        reference: { _ref: "article-how-it-works", _type: "reference" }
      }, null, 2)),

      ptBlock('b4', 'The preload() call fetches all route map shards in a single query, builds the lookup map, and returns it. Each entry maps a document ID to its full URL including the base URL and path.'),

      ptBlock('b5', 'If a referenced document doesn\'t have a route (e.g., it was deleted or its type isn\'t in the route config), the map won\'t have an entry for it. The fallback <span> ensures the text still renders without a broken link.'),

      ptBlockWithTwoLinks({
        blockKey: 'b6',
        text1: 'For more on the resolver API, see ',
        link1Text: 'Resolving URLs',
        link1Key: 'lnk1',
        link1Ref: IDS.articleResolvingUrls,
        midText: '. For the full architecture overview, see ',
        link2Text: 'How URL Resolution Works',
        link2Key: 'lnk2',
        link2Ref: IDS.articleHowItWorks,
        endText: '.',
      }),
    ],
  })

  // ── Article 5: The Sync Function ──────────────────────────
  tx.createOrReplace({
    _id: IDS.articleSyncFunction,
    _type: 'article',
    title: 'The Sync Function',
    slug: { _type: 'slug', current: 'sync-function' },
    body: [
      ptBlock('b1', 'The route map needs to stay in sync as content changes. A Sanity Function handles this automatically by listening for document mutations and updating the relevant route map shards.'),

      ptHeading('h1', 'How It Triggers'),
      ptBlock('b2', 'The sync function is configured to trigger on document create, update, and delete events. When a document changes, the function:'),
      ptBlock('b3', '1. Reads the route config to find which route entry applies to the document\'s type.'),
      ptBlock('b4', '2. Evaluates the GROQ pathExpression to compute the document\'s new URL path.'),
      ptBlock('b5', '3. Updates the appropriate route map shard using a single-transaction upsert pattern.'),

      ptHeading('h2', 'The Handler'),
      ptBlock('b6', 'The function handler receives the document event and processes it:'),

      ptCode('code1', 'typescript', `import { createClient } from '@sanity/client'
import { buildRouteMap } from '@sanity/routes'

export default async function handler(event) {
  const client = createClient({
    projectId: event.projectId,
    dataset: event.dataset,
    token: process.env.SANITY_WRITE_TOKEN,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  // Rebuild the full route map
  // In production, you'd do incremental updates per-document
  const result = await buildRouteMap(client, 'web')
  console.log(\`Updated \${result.entries} entries across \${result.shards} shards\`)
}`),

      ptHeading('h3', 'Shard Structure'),
      ptBlock('b7', 'Route map shards are documents with type "routes.map". Each shard covers one document type and stores an array of entries mapping document IDs to their resolved paths. The shard ID follows the pattern routes.map.{channel}.{documentType}.'),

      ptBlock('b8', 'Because shard IDs contain dots, they are private documents — only accessible with an authenticated token, not via the CDN. Your frontend needs a read token to access them.'),

      ptBlockWithLink({
        blockKey: 'b9',
        beforeText: 'For details on how routes are configured, see ',
        linkText: 'Route Configuration',
        afterText: '.',
        linkKey: 'lnk1',
        refId: IDS.articleRouteConfig,
      }),
    ],
  })

  // ── Blog Post 1: Introducing URL Resolution ───────────────
  tx.createOrReplace({
    _id: IDS.blogIntroducing,
    _type: 'blogPost',
    title: 'Introducing URL Resolution for Sanity',
    slug: { _type: 'slug', current: 'introducing-url-resolution' },
    body: [
      ptBlock('b1', 'Structured content doesn\'t know its own URL. A document in Sanity is just data — it has an ID, a type, and fields. But when that document appears on a website, it needs a URL. And that URL depends on the frontend: the same article might live at /docs/getting-started on one site and /help/setup on another.'),

      ptHeading('h1', 'The Problem'),
      ptBlock('b2', 'Without a URL resolution system, every frontend has to hardcode its own URL-building logic. Studio plugins that need to link to the live site have to duplicate that logic. Internal links in Portable Text become fragile — if the URL structure changes, every link breaks.'),

      ptHeading('h2', 'The Solution'),
      ptBlock('b3', 'URL Resolution for Sanity introduces a route config as content — a document in your dataset that defines how document types map to URL patterns. This single source of truth is used by:'),
      ptBlock('b4', 'The Studio — to generate preview URLs and resolve internal links in the editor.'),
      ptBlock('b5', 'The frontend — to resolve document references to clickable URLs at render time.'),
      ptBlock('b6', 'Sanity Functions — to keep a pre-computed route map in sync as content changes.'),

      ptHeading('h3', 'Two Resolver Modes'),
      ptBlock('b7', 'The resolver supports two modes: realtime (live GROQ evaluation for Studio use) and static (pre-computed map for fast frontend rendering). Both read from the same route config, ensuring consistency.'),

      ptBlockWithTwoLinks({
        blockKey: 'b8',
        text1: 'Read the full technical overview in ',
        link1Text: 'How URL Resolution Works',
        link1Key: 'lnk1',
        link1Ref: IDS.articleHowItWorks,
        midText: ', or dive into the config format in ',
        link2Text: 'Route Configuration',
        link2Key: 'lnk2',
        link2Ref: IDS.articleRouteConfig,
        endText: '.',
      }),
    ],
  })

  // ── Blog Post 2: Building the Route Resolver ──────────────
  tx.createOrReplace({
    _id: IDS.blogBuildingResolver,
    _type: 'blogPost',
    title: 'Building the Route Resolver',
    slug: { _type: 'slug', current: 'building-the-resolver' },
    body: [
      ptBlock('b1', 'The route resolver is the core engine that turns document IDs into URLs. This post dives into how it works under the hood.'),

      ptHeading('h1', 'groqField() — Embedding Resolution in Queries'),
      ptBlock('b2', 'One of the most powerful features is groqField(). Instead of resolving URLs after fetching documents, you can embed the resolution directly in your GROQ query:'),

      ptCode('code1', 'typescript', `const resolver = createRouteResolver(client, 'web', { mode: 'realtime' })
const pathField = await resolver.groqField('article')

// The returned field is a GROQ projection like:
// "path": coalesce(*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/", "") + slug.current

const articles = await client.fetch(
  \`*[_type == "article"]{ _id, title, \${pathField} }\`
)
// Each article now has a .path property with its resolved URL path`),

      ptBlock('b3', 'This approach is efficient because the Content Lake evaluates the path expression server-side as part of the query — no extra round trips.'),

      ptHeading('h2', 'preload() — Batch Resolution'),
      ptBlock('b4', 'For frontends that need to resolve many URLs at once (like all internal links on a page), the static resolver\'s preload() method is the right tool:'),

      ptCode('code2', 'typescript', `const resolver = createRouteResolver(client, 'web', { mode: 'static' })
const urlMap = await resolver.preload()

// urlMap is a Map<string, string>:
// "article-how-it-works" => "https://example.com/docs/concepts/how-it-works"
// "blog-introducing"     => "https://example.com/blog/introducing-url-resolution"

// Use it for synchronous lookups in render functions
const url = urlMap.get(someDocId)`),

      ptBlock('b5', 'The preload() method fetches all route map shards in a single GROQ query, then builds an in-memory Map. This is a one-time cost per request — after that, every lookup is O(1).'),

      ptBlockWithLink({
        blockKey: 'b6',
        beforeText: 'For the full resolver API reference, see ',
        linkText: 'Resolving URLs',
        afterText: '.',
        linkKey: 'lnk1',
        refId: IDS.articleResolvingUrls,
      }),
    ],
  })

  // ── Nav Sections ──────────────────────────────────────────
  tx.createOrReplace({
    _id: IDS.navConcepts,
    _type: 'docsNavSection',
    title: 'Concepts',
    slug: { _type: 'slug', current: 'concepts' },
    articles: [
      { _type: 'reference', _ref: IDS.articleHowItWorks, _key: 'ref1' },
      { _type: 'reference', _ref: IDS.articleRouteConfig, _key: 'ref2' },
    ],
  })

  tx.createOrReplace({
    _id: IDS.navGuides,
    _type: 'docsNavSection',
    title: 'Guides',
    slug: { _type: 'slug', current: 'guides' },
    articles: [
      { _type: 'reference', _ref: IDS.articleResolvingUrls, _key: 'ref1' },
      { _type: 'reference', _ref: IDS.articlePtLinks, _key: 'ref2' },
      { _type: 'reference', _ref: IDS.articleSyncFunction, _key: 'ref3' },
    ],
  })

  // ── Commit ────────────────────────────────────────────────
  const result = await tx.commit()
  console.log(`   Created ${result.results.length} documents`)

  console.log('\n✅ Seed complete!')
  console.log('\nDocuments created:')
  console.log('  Articles:')
  console.log('    - How URL Resolution Works (concepts/how-it-works)')
  console.log('    - Route Configuration (concepts/route-config)')
  console.log('    - Resolving URLs (guides/resolving-urls)')
  console.log('    - Portable Text Links (guides/portable-text-links)')
  console.log('    - The Sync Function (guides/sync-function)')
  console.log('  Blog Posts:')
  console.log('    - Introducing URL Resolution (/blog/introducing-url-resolution)')
  console.log('    - Building the Route Resolver (/blog/building-the-resolver)')
  console.log('  Nav Sections:')
  console.log('    - Concepts (concepts)')
  console.log('    - Guides (guides)')
  console.log('\n⚠️  Run build-map.mjs next to rebuild route map shards.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
