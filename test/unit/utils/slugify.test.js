import { slugify } from '#/utils/slugify.js'

describe('#slugify', () => {
  test('Should lowercase and hyphenate words', () => {
    expect(slugify('Highly Pathogenic Avian Influenza')).toBe(
      'highly-pathogenic-avian-influenza'
    )
  })

  test('Should collapse punctuation and trim hyphens', () => {
    expect(slugify('  Foot & Mouth -- Disease! ')).toBe('foot-mouth-disease')
  })

  test('Should strip characters that are not URL safe', () => {
    expect(slugify('Bluetongue/<script>?x=1')).toBe('bluetongue-script-x-1')
  })

  test('Should remove accents', () => {
    expect(slugify('Café Maladie')).toBe('cafe-maladie')
  })

  test('Should return an empty string when nothing is usable', () => {
    expect(slugify('!!!')).toBe('')
  })
})
