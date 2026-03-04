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
  // AI section articles
  articleAgentContext: 'article-agent-context',
  articleModelSelection: 'article-model-selection',
  // Getting Started section articles
  articleInstallation: 'article-installation',
  articleConfiguration: 'article-configuration',
  // Standalone article (no nav section — tests coalesce fallback)
  articleChangelog: 'article-changelog',
  articleMigrationGuide: 'article-migration-guide',
  // Blog posts
  blogAiLaunch: 'blog-ai-launch',
  blogGettingStartedGuide: 'blog-getting-started-guide',
  // Nav sections
  navAi: 'nav-ai',
  navGettingStarted: 'nav-getting-started',
  // Route config
  routeConfig: 'routes-config-web',
}

// ── Helper: make a PT block with an internal link ─────────────
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

// ── Helper: plain PT block ────────────────────────────────────
function ptBlock(key, text) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    children: [{ _type: 'span', _key: `${key}-s1`, text }],
    markDefs: [],
  }
}

// ── Seed data ─────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding URL Resolution POC data...\n')

  // ── Step 1: Create content documents ──────────────────────
  console.log('📝 Creating content documents...')
  const tx = client.transaction()

  // ── Articles (created BEFORE nav sections that reference them) ──

  // AI section articles
  tx.createOrReplace({
    _id: IDS.articleAgentContext,
    _type: 'article',
    title: 'Agent Context',
    slug: { _type: 'slug', current: 'agent-context' },
    body: [
      ptBlock('b1', 'Agent Context allows AI agents to understand your content model and make intelligent decisions about content operations.'),
      ptBlockWithLink({
        blockKey: 'b2',
        beforeText: 'For choosing the right model, see ',
        linkText: 'Model Selection',
        afterText: '.',
        linkKey: 'lnk1',
        refId: IDS.articleModelSelection,
      }),
    ],
  })

  tx.createOrReplace({
    _id: IDS.articleModelSelection,
    _type: 'article',
    title: 'Model Selection',
    slug: { _type: 'slug', current: 'model-selection' },
    body: [
      ptBlock('b1', 'Choosing the right AI model depends on your use case — speed vs accuracy, cost vs capability.'),
      ptBlockWithLink({
        blockKey: 'b2',
        beforeText: 'Learn how models interact with content in ',
        linkText: 'Agent Context',
        afterText: '.',
        linkKey: 'lnk1',
        refId: IDS.articleAgentContext,
      }),
    ],
  })

  // Getting Started section articles
  tx.createOrReplace({
    _id: IDS.articleInstallation,
    _type: 'article',
    title: 'Installation',
    slug: { _type: 'slug', current: 'installation' },
    body: [
      ptBlock('b1', 'Install the Sanity CLI globally with npm install -g sanity. Then run sanity init to create a new project.'),
      ptBlockWithLink({
        blockKey: 'b2',
        beforeText: 'After installing, proceed to ',
        linkText: 'Configuration',
        afterText: ' to set up your studio.',
        linkKey: 'lnk1',
        refId: IDS.articleConfiguration,
      }),
    ],
  })

  tx.createOrReplace({
    _id: IDS.articleConfiguration,
    _type: 'article',
    title: 'Configuration',
    slug: { _type: 'slug', current: 'configuration' },
    body: [
      ptBlock('b1', 'Configure your Sanity Studio by editing sanity.config.ts. Define schemas, plugins, and workspace settings.'),
      ptBlockWithLink({
        blockKey: 'b2',
        beforeText: 'If you haven\'t set up yet, start with ',
        linkText: 'Installation',
        afterText: '.',
        linkKey: 'lnk1',
        refId: IDS.articleInstallation,
      }),
      ptBlockWithLink({
        blockKey: 'b3',
        beforeText: 'For AI-powered features, check out ',
        linkText: 'Agent Context',
        afterText: '.',
        linkKey: 'lnk2',
        refId: IDS.articleAgentContext,
      }),
    ],
  })

  // Standalone articles (no nav section — tests coalesce fallback to "")
  tx.createOrReplace({
    _id: IDS.articleChangelog,
    _type: 'article',
    title: 'Changelog',
    slug: { _type: 'slug', current: 'changelog' },
    body: [
      ptBlock('b1', 'Track all changes and releases for the Sanity platform.'),
      ptBlockWithLink({
        blockKey: 'b2',
        beforeText: 'See the ',
        linkText: 'Migration Guide',
        afterText: ' for upgrade instructions.',
        linkKey: 'lnk1',
        refId: IDS.articleMigrationGuide,
      }),
    ],
  })

  tx.createOrReplace({
    _id: IDS.articleMigrationGuide,
    _type: 'article',
    title: 'Migration Guide',
    slug: { _type: 'slug', current: 'migration-guide' },
    body: [
      ptBlock('b1', 'Step-by-step guide for migrating between major versions of Sanity.'),
      ptBlockWithLink({
        blockKey: 'b2',
        beforeText: 'Check the ',
        linkText: 'Changelog',
        afterText: ' for what changed in each release.',
        linkKey: 'lnk1',
        refId: IDS.articleChangelog,
      }),
    ],
  })

  // ── Blog posts ────────────────────────────────────────────
  tx.createOrReplace({
    _id: IDS.blogAiLaunch,
    _type: 'blogPost',
    title: 'Introducing AI Features in Sanity',
    slug: { _type: 'slug', current: 'introducing-ai-features' },
    body: [
      ptBlock('b1', 'We are thrilled to announce a suite of AI-powered features that transform how you work with structured content.'),
      ptBlockWithLink({
        blockKey: 'b2',
        beforeText: 'Dive into the technical details in our ',
        linkText: 'Agent Context',
        afterText: ' documentation.',
        linkKey: 'lnk1',
        refId: IDS.articleAgentContext,
      }),
      ptBlockWithLink({
        blockKey: 'b3',
        beforeText: 'Also read about ',
        linkText: 'Model Selection',
        afterText: ' to pick the best model for your needs.',
        linkKey: 'lnk2',
        refId: IDS.articleModelSelection,
      }),
    ],
  })

  tx.createOrReplace({
    _id: IDS.blogGettingStartedGuide,
    _type: 'blogPost',
    title: 'Getting Started with Sanity in 2024',
    slug: { _type: 'slug', current: 'getting-started-2024' },
    body: [
      ptBlock('b1', 'A comprehensive guide to getting up and running with Sanity Studio, from installation to deployment.'),
      ptBlockWithLink({
        blockKey: 'b2',
        beforeText: 'Begin with the ',
        linkText: 'Installation',
        afterText: ' guide.',
        linkKey: 'lnk1',
        refId: IDS.articleInstallation,
      }),
      ptBlockWithLink({
        blockKey: 'b3',
        beforeText: 'Then follow up with ',
        linkText: 'our other blog post on AI',
        afterText: ' for the latest features.',
        linkKey: 'lnk2',
        refId: IDS.blogAiLaunch,
      }),
    ],
  })

  // ── Docs Nav Sections (AFTER articles, since they reference them) ──
  tx.createOrReplace({
    _id: IDS.navAi,
    _type: 'docsNavSection',
    title: 'AI',
    slug: { _type: 'slug', current: 'ai' },
    articles: [
      { _type: 'reference', _ref: IDS.articleAgentContext, _key: 'ref1' },
      { _type: 'reference', _ref: IDS.articleModelSelection, _key: 'ref2' },
    ],
  })

  tx.createOrReplace({
    _id: IDS.navGettingStarted,
    _type: 'docsNavSection',
    title: 'Getting Started',
    slug: { _type: 'slug', current: 'getting-started' },
    articles: [
      { _type: 'reference', _ref: IDS.articleInstallation, _key: 'ref1' },
      { _type: 'reference', _ref: IDS.articleConfiguration, _key: 'ref2' },
    ],
  })

  console.log('  Added 6 articles, 2 blog posts, 2 nav sections to transaction')

  console.log('\n📤 Committing content transaction...')
  const result = await tx.commit()
  console.log(`✅ Content committed! ${result.documentIds.length} documents written.\n`)

  // ── Step 2: Create route config document ──────────────────
  // Try with _.routes.web first (system prefix), fall back to regular ID
  console.log('📝 Creating route config document...')
  
  try {
    // Try the system-prefixed ID first
    await client.createOrReplace({
      _id: '_.routes.web',
      _type: 'routes.config',
      channel: 'web',
      baseUrls: [
        { _key: 'prod', name: 'production', url: 'https://www.sanity.io', isDefault: true },
        { _key: 'dev', name: 'development', url: 'http://localhost:3000' },
      ],
      routes: [
        {
          _key: 'blog',
          types: ['blogPost'],
          basePath: '/blog',
          pathExpression: 'slug.current',
        },
        {
          _key: 'article',
          types: ['article'],
          basePath: '/docs',
          pathExpression:
            'coalesce(*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/", "") + slug.current',
        },
      ],
    })
    console.log('  ✅ Route config created with _id: _.routes.web')
  } catch (err) {
    console.log(`  ⚠️  Could not create _.routes.web (${err.message})`)
    console.log('  Trying with regular ID: routes-config-web...')
    
    await client.createOrReplace({
      _id: 'routes-config-web',
      _type: 'routes.config',
      channel: 'web',
      baseUrls: [
        { _key: 'prod', name: 'production', url: 'https://www.sanity.io', isDefault: true },
        { _key: 'dev', name: 'development', url: 'http://localhost:3000' },
      ],
      routes: [
        {
          _key: 'blog',
          types: ['blogPost'],
          basePath: '/blog',
          pathExpression: 'slug.current',
        },
        {
          _key: 'article',
          types: ['article'],
          basePath: '/docs',
          pathExpression:
            'coalesce(*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/", "") + slug.current',
        },
      ],
    })
    console.log('  ✅ Route config created with _id: routes-config-web')
  }

  // ── Verify ────────────────────────────────────────────────
  console.log('\n🔍 Verifying data...\n')

  const routeConfig = await client.fetch('*[_type == "routes.config"][0]')
  console.log('  Route config:', JSON.stringify(routeConfig, null, 2))

  const articles = await client.fetch('*[_type == "article"]{_id, title, "slug": slug.current} | order(title)')
  console.log('\n  Articles:', JSON.stringify(articles, null, 2))

  const blogPosts = await client.fetch('*[_type == "blogPost"]{_id, title, "slug": slug.current}')
  console.log('\n  Blog Posts:', JSON.stringify(blogPosts, null, 2))

  const navSections = await client.fetch('*[_type == "docsNavSection"]{_id, title, "slug": slug.current, "articleCount": count(articles)}')
  console.log('\n  Nav Sections:', JSON.stringify(navSections, null, 2))

  // Test URL resolution query for an article with a nav section
  const resolvedArticle = await client.fetch(`
    *[_id == "article-agent-context"][0]{
      _id,
      title,
      "slug": slug.current,
      "navSection": *[_type == "docsNavSection" && references(^._id)][0]{
        title,
        "slug": slug.current
      },
      "expectedPath": "/docs/" + coalesce(*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/", "") + slug.current
    }
  `)
  console.log('\n  🔗 Resolved article (with nav section):', JSON.stringify(resolvedArticle, null, 2))

  // Test URL resolution for standalone article (coalesce fallback)
  const standaloneArticle = await client.fetch(`
    *[_id == "article-changelog"][0]{
      _id,
      title,
      "slug": slug.current,
      "navSection": *[_type == "docsNavSection" && references(^._id)][0]{
        title,
        "slug": slug.current
      },
      "expectedPath": "/docs/" + coalesce(*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/", "") + slug.current
    }
  `)
  console.log('\n  🔗 Resolved article (standalone, coalesce fallback):', JSON.stringify(standaloneArticle, null, 2))

  // Test blog post resolution
  const resolvedBlog = await client.fetch(`
    *[_id == "blog-ai-launch"][0]{
      _id,
      title,
      "slug": slug.current,
      "expectedPath": "/blog/" + slug.current
    }
  `)
  console.log('\n  🔗 Resolved blog post:', JSON.stringify(resolvedBlog, null, 2))

  console.log('\n🎉 Seed complete!')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
