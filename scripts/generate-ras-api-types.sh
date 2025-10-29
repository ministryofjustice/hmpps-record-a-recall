npx openapi-typescript https://remand-and-sentencing-api-dev.hmpps.service.justice.gov.uk/v3/api-docs | sed "s/\"/'/g" | sed "s/;//g" > ../server/@types/remandAndSentencingApi/index.d.ts
eslint --fix "../server/@types/remandAndSentencingApi/index.d.ts"
