document.addEventListener('DOMContentLoaded', () => {
  const enterButton = document.querySelector('.local-name-text-input')

  if (enterButton) {
    enterButton.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        document.querySelector('form').submit()
      }
    })
  }
})
