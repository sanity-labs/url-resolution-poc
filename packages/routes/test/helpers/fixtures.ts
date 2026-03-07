import type {RoutesConfig, RouteMapShard} from '../../src/types.js'

export const WEB_CONFIG: RoutesConfig = {
  _id: 'routes-config-web',
  _type: 'routes.config',
  channel: 'web',
  isDefault: true,
  baseUrls: [
    {_key: 'prod', name: 'production', url: 'https://www.example.com', isDefault: true},
    {_key: 'staging', name: 'staging', url: 'https://staging.example.com'},
  ],
  routes: [
    {
      _key: 'r1',
      types: ['blogPost'],
      basePath: '/blog',
    },
    {
      _key: 'r2',
      types: ['article'],
      basePath: '/docs',
      pathExpression: '*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/" + slug.current',
    },
    {
      _key: 'r3',
      types: ['product'],
      basePath: '/products',
      pathExpression: 'slug[_key == $locale][0].value',
      locales: ['en', 'fr', 'de'],
    },
  ],
}

export const BLOG_SHARD: RouteMapShard = {
  _id: 'routes-web-blogPost',
  _type: 'routes.map',
  channel: 'web',
  documentType: 'blogPost',
  basePath: '/blog',
  entries: [
    {_key: 'e1', doc: {_ref: 'blog-hello', _type: 'reference', _weak: true}, path: 'hello-world'},
    {_key: 'e2', doc: {_ref: 'blog-intro', _type: 'reference', _weak: true}, path: 'introduction'},
  ],
}

export const ARTICLE_SHARD: RouteMapShard = {
  _id: 'routes-web-article',
  _type: 'routes.map',
  channel: 'web',
  documentType: 'article',
  basePath: '/docs',
  entries: [
    {_key: 'e1', doc: {_ref: 'article-setup', _type: 'reference', _weak: true}, path: 'getting-started/setup'},
  ],
}
