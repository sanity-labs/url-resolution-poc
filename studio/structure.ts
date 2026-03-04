import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // Regular content types (exclude system types)
      ...S.documentTypeListItems().filter(
        (item) => !['routes.config', 'routes.map'].includes(item.getId() ?? '')
      ),
      S.divider(),
      // Routes section (read-only via schema)
      S.listItem()
        .title('Routes')
        .child(
          S.list()
            .title('Routes')
            .items([
              S.listItem()
                .title('Route Configuration')
                .child(
                  S.documentTypeList('routes.config')
                    .title('Route Configuration')
                ),
              S.listItem()
                .title('Route Maps')
                .child(
                  S.documentTypeList('routes.map')
                    .title('Route Maps')
                ),
            ])
        ),
    ])
