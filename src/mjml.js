#!/usr/bin/env node

import binary                  from 'commander'
import fs                      from 'fs'
import minify                  from 'html-minify'
import { tidy as htmltidy }    from 'htmltidy'
import mjmlEngine              from './index'
import { version as VERSION }  from '../package.json'

const engine = mjmlEngine.mjml2html

/*
 * Default component template.
 * Will be used to create custom mjml components
 */
import createComponent from './create-component'

/*
 * Importing this library in your project will
 * give you the MJML engine
 */
export default mjmlEngine

/*
 * The version number is the NPM
 * version number. It should be the same as the MJML engine
 */
const version = () => VERSION

/*
 * Turns a callback style to a Promise style one
 */
const promisify = fn =>
  (...args) =>
    new Promise((resolve, reject) =>
      fn(...args.concat((err, ...data) =>
        err ? reject(err) : resolve(...data))))

/*
 * Minimal Error Handling
 */
const error   = (e) => {
  console.log(e.stack ? e.stack : e)
  process.exit(42)
}

/*
 * Utility functions
 * write: write to a file
 * pretty: prettify an html file
 * read: read a fileexists: ensure the file exists
 */
const write   = promisify(fs.writeFile)
const read    = promisify(fs.readFile)
const exists  = promisify((file, cb) => fs.access(file, fs.R_OK | fs.W_OK, cb))
const pretty  = (html) =>
  promisify(htmltidy)(html, { indent: true, wrap: 0, bare: true })

/*
 * Turns an MJML input file into a pretty HTML file
 * min: boolean that specify the output format (pretty/minified)
 */
const render = (input, { min, output }) => {
  exists(input)
    .then(()      => read(input))
    .then(mjml    => engine(mjml.toString()))
    .then(html    => min ? minify(html) : pretty(html))
    .then(result  => write(output, result))
    .catch(error)
}

/*
 * Watch changes on a specific input file by calling render on each change
 */
const watch = (input, options) =>
  fs.watch(input, (_, file) => render(input, options))

const capitalize = name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase().replace(/-/g, '')

/*
 * Create a new component based on the default template
 */
const register = (name, ending) =>
  write(`./${capitalize(name)}.js`, createComponent(capitalize(name), ending))
    .then(() => console.log(`Component created: ${capitalize(name)}`))
  
/*
 * If require.main
 */
const main = () => {
  /*
   * Parse the command line arguments
   */
  binary
    .version(version())

  binary
    .option('-r, --render <file>', 'Compiles an MJML file')
    .option('-w, --watch <file>', 'Watch and render an MJML file')
    .option('-o, --output <file>', 'Redirect the HTML to a file', 'a.html')
    .option('-m, --min', 'Minify the final output file', 'false')
    .option('-e, --ending', 'Specifies that the newly created component is an ending tag')
    .option('--register <name>', 'Create an MJML component')

  binary.parse(process.argv)

  switch (true) {
    case (!!binary.watch)     : return watch(binary.watch, binary)
    case (!!binary.render)    : return render(binary.render, binary)
	  case (!!binary.register)  : return register(binary.register, binary.ending)
    default                   : return console.log(version())
  }
}

if (require.main === module)
  main();
