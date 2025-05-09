npx openapi-typescript https://nomis-sync-prisoner-mapping-dev.hmpps.service.justice.gov.uk/v3/api-docs | sed "s/\"/'/g" | sed "s/;//g" > ../server/@types/nomisMappingApi/index.d.ts
eslint --fix "../server/@types/nomisMappingApi/index.d.ts"
