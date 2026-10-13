/**
 * Formats data ready for presenting in the `/about` page
 * @module aboutPresenter
 */
export const aboutPresenter = () => ({
  pageTitle: 'About',
  heading: 'About',
  breadcrumbs: [
    {
      text: 'Home',
      href: '/'
    },
    {
      text: 'About'
    }
  ]
})
