npx openapi-typescript https://prison-register-dev.hmpps.service.justice.gov.uk/v3/api-docs | sed "s/\"/'/g" | sed "s/;//g" > ../server/@types/prisonRegisterApi/index.d.ts
eslint --fix "../server/@types/prisonRegisterApi/index.d.ts"
