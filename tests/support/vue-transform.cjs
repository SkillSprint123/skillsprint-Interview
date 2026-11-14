const { createHash } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createTransformer } = require('babel-jest')

const source = readFileSync(__filename, 'utf8')
const babelOptions = {
  babelrc: false,
  configFile: false,
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    ['@babel/preset-typescript', { allExtensions: true }],
  ],
}

module.exports = {
  canInstrument: true,
  getCacheKey(text, filename, options) {
    return createHash('sha256')
      .update(source + text + filename + options.configString + options.instrument)
      .digest('hex')
  },
  process(text, filename, options) {
    if (!filename.endsWith('.vue')) {
      return createTransformer(babelOptions).process(text, filename, options)
    }
    const { descriptor, errors } = parse(text, { filename })
    if (errors.length) throw errors[0]
    const script = compileScript(descriptor, {
      id: createHash('sha256').update(filename).digest('hex').slice(0, 8),
      inlineTemplate: true,
      templateOptions: { compilerOptions: { isTS: true } },
    })
    return createTransformer({ ...babelOptions, inputSourceMap: script.map }).process(
      script.content,
      filename,
      options,
    )
  },
}
