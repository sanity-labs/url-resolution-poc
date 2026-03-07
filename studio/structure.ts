import type {StructureResolver} from 'sanity/structure'
import {
  LinkIcon,
  CogIcon,
  WarningOutlineIcon,
  TransferIcon,
  DatabaseIcon,
} from '@sanity/icons'

const ROUTE_TYPES = ['routes.config', 'routes.map', 'routes.redirect', 'routes.collision']

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // Content types (exclude route system types)
      ...S.documentTypeListItems().filter(
        (item) => !ROUTE_TYPES.includes(item.getId() ?? ''),
      ),

      S.divider(),

      // URL Management section
      S.listItem()
        .title('URL Management')
        .icon(LinkIcon)
        .child(
          S.list()
            .title('URL Management')
            .items([
              // Route Configuration (singleton)
              S.listItem()
                .title('Route Configuration')
                .icon(CogIcon)
                .child(
                  S.document()
                    .schemaType('routes.config')
                    .documentId('routes-config-web')
                    .title('Route Configuration'),
                ),

              S.divider(),

              // URL Collisions
              S.listItem()
                .title('URL Collisions')
                .icon(WarningOutlineIcon)
                .child(
                  S.documentTypeList('routes.collision')
                    .title('URL Collisions')
                    .defaultOrdering([{field: 'detectedAt', direction: 'desc'}]),
                ),

              // Redirects
              S.listItem()
                .title('Redirects')
                .icon(TransferIcon)
                .child(
                  S.documentTypeList('routes.redirect')
                    .title('Redirects')
                    .defaultOrdering([{field: '_createdAt', direction: 'desc'}]),
                ),

              S.divider(),

              // Route Map Shards (debugging)
              S.listItem()
                .title('Route Map Shards')
                .icon(DatabaseIcon)
                .child(
                  S.documentTypeList('routes.map')
                    .title('Route Map Shards'),
                ),
            ]),
        ),
    ])
