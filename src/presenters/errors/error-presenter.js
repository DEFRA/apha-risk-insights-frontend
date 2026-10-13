/**
 * Formats data ready for presenting in the error page
 * @module errorPresenter
 */
export const errorPresenter = ({ statusCode, message }) => ({
  pageTitle: message,
  heading: statusCode,
  message
})
