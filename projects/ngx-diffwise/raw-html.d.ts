/** HTML files imported as text in tests, such as `import before from './before.html?raw'`. */
declare module '*.html?raw' {
  const html: string;
  export default html;
}

/** Plain text files imported as text in tests, such as `import before from './before.txt?raw'`. */
declare module '*.txt?raw' {
  const text: string;
  export default text;
}
