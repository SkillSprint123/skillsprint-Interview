import latin400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url'
import latin500 from '@fontsource/inter/files/inter-latin-500-normal.woff2?url'
import latin600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url'
import cyrillic400 from '@fontsource/inter/files/inter-cyrillic-400-normal.woff2?url'
import cyrillic500 from '@fontsource/inter/files/inter-cyrillic-500-normal.woff2?url'
import cyrillic600 from '@fontsource/inter/files/inter-cyrillic-600-normal.woff2?url'
import type { CssFunction } from '../../app/types'

// Font faces live in the same owned style target as component rules.
// The private family name avoids changing the shell's fonts.
export function registerFonts(css: CssFunction) {
  const latin =
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
  const cyrillic = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'
  for (const [src, weight, range] of [
    [latin400, 400, latin],
    [latin500, 500, latin],
    [latin600, 600, latin],
    [cyrillic400, 400, cyrillic],
    [cyrillic500, 500, cyrillic],
    [cyrillic600, 600, cyrillic],
  ] as const) {
    css({
      '@font-face': {
        fontFamily: 'SkillSprintInterviewInter',
        fontStyle: 'normal',
        fontDisplay: 'swap',
        fontWeight: weight,
        src: `url("${src}") format("woff2")`,
        unicodeRange: range,
      },
    })
  }
}
