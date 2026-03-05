import {createClient} from '@sanity/client'
import {createRouteResolver} from '../packages/routes/dist/resolver.js'

const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  token: process.env.SANITY_AUTH_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

console.log('=== i18n Locale Parameter Test ===\n')

// Step 1: Create the test document
console.log('1. Creating test document: product-i18n-sneakers')
await client.createOrReplace({
  _id: 'product-i18n-sneakers',
  _type: 'product',
  title: 'Classic Sneakers',
  slug: [
    {_key: 'en', value: 'classic-sneakers'},
    {_key: 'fr', value: 'baskets-classiques'},
    {_key: 'de', value: 'klassische-turnschuhe'},
  ],
})
console.log('   ✓ Document created\n')

// Step 2: Ensure route config has a product route with i18n pathExpression
console.log('2. Checking route config for product route...')
const config = await client.fetch('*[_type == "routes.config" && channel == "web"][0]')
if (!config) {
  console.error('   ✗ No route config found for channel "web"')
  process.exit(1)
}

const hasProductRoute = config.routes?.some((r) => r.types?.includes('product'))
if (!hasProductRoute) {
  console.log('   Adding product route with i18n pathExpression...')
  await client
    .patch(config._id)
    .setIfMissing({routes: []})
    .append('routes', [
      {
        _key: 'product-i18n-route',
        types: ['product'],
        basePath: '/products',
        pathExpression: 'slug[_key == $locale][0].value',
        locales: ['en', 'fr', 'de'],
      },
    ])
    .commit()
  console.log('   ✓ Product route added\n')
} else {
  console.log('   ✓ Product route already exists\n')
}

// Step 3: Test realtime resolution with locale
console.log('3. Testing realtime resolution with locale...\n')
const resolver = createRouteResolver(client, 'web')

const enUrl = await resolver.resolveUrlById('product-i18n-sneakers', {locale: 'en'})
console.log(`   EN: ${enUrl}`)

const frUrl = await resolver.resolveUrlById('product-i18n-sneakers', {locale: 'fr'})
console.log(`   FR: ${frUrl}`)

const deUrl = await resolver.resolveUrlById('product-i18n-sneakers', {locale: 'de'})
console.log(`   DE: ${deUrl}`)

// Step 4: Test resolveUrlByIds with locale
console.log('\n4. Testing resolveUrlByIds with locale...\n')
const enUrls = await resolver.resolveUrlByIds(['product-i18n-sneakers'], {locale: 'en'})
console.log(`   EN (batch): ${enUrls.get('product-i18n-sneakers')}`)

const frUrls = await resolver.resolveUrlByIds(['product-i18n-sneakers'], {locale: 'fr'})
console.log(`   FR (batch): ${frUrls.get('product-i18n-sneakers')}`)

// Step 5: Test with default locale
console.log('\n5. Testing with default locale (resolver-level)...\n')
const frResolver = createRouteResolver(client, {channel: 'web', locale: 'fr'})
const defaultFrUrl = await frResolver.resolveUrlById('product-i18n-sneakers')
console.log(`   Default FR: ${defaultFrUrl}`)

// Override default with per-call locale
const overrideDeUrl = await frResolver.resolveUrlById('product-i18n-sneakers', {locale: 'de'})
console.log(`   Override DE: ${overrideDeUrl}`)

// Step 6: Validate results
console.log('\n=== Validation ===\n')
const tests = [
  {name: 'EN URL contains classic-sneakers', pass: enUrl?.includes('classic-sneakers')},
  {name: 'FR URL contains baskets-classiques', pass: frUrl?.includes('baskets-classiques')},
  {name: 'DE URL contains klassische-turnschuhe', pass: deUrl?.includes('klassische-turnschuhe')},
  {name: 'EN batch matches single', pass: enUrls.get('product-i18n-sneakers') === enUrl},
  {name: 'Default FR matches explicit FR', pass: defaultFrUrl === frUrl},
  {name: 'Override DE matches explicit DE', pass: overrideDeUrl === deUrl},
]

let allPassed = true
for (const test of tests) {
  console.log(`   ${test.pass ? '✓' : '✗'} ${test.name}`)
  if (!test.pass) allPassed = false
}

console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'}`)
process.exit(allPassed ? 0 : 1)
