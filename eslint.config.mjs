import hmppsConfig from '@ministryofjustice/eslint-config-hmpps'

const config = hmppsConfig({ extraIgnorePaths: ['assets/js/*.js'] })

// Add settings for import resolution
const configWithImportSettings = config.map(item => {
  if (item.rules) {
    return {
      ...item,
      settings: {
        ...item.settings,
        'import/resolver': {
          node: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            moduleDirectory: ['node_modules', 'server'],
          },
          typescript: {},
        },
      },
    }
  }
  return item
})

export default configWithImportSettings
