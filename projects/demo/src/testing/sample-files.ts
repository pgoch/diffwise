/** The line of the old version of each sample. */
export const OLD_LINE = 'Old line.';

/** The line of the new version of each sample. */
export const NEW_LINE = 'New line.';

/** Name of the file of the old version of a sample. */
const OLD_FILE = 'before';

const HTML_EXTENSION = '.html';
const PATH_SEPARATOR = '/';

/** Answers each request for a sample file with a short sample whose first line is its folder. */
export function serveSampleFiles(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const text = sampleFileText(String(input));

    return new Response(text);
  });
}

/**
 * A short sample: its folder, such as `test-data/text/en/medium`, then the line of its version,
 * as an HTML document or a plain text.
 */
function sampleFileText(path: string): string {
  const slash = path.lastIndexOf(PATH_SEPARATOR);
  const folder = path.slice(0, slash);
  const fileName = path.slice(slash + 1);
  const versionLine = fileName.startsWith(OLD_FILE) ? OLD_LINE : NEW_LINE;
  const isHtml = fileName.endsWith(HTML_EXTENSION);

  return isHtml ? `<p>${folder}</p><p>${versionLine}</p>` : `${folder}\n${versionLine}`;
}
