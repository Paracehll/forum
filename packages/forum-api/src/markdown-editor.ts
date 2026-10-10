/** Parses a trimmed single-line HTTP(S) URL, returning null for anything else. */
function parseHttpUrl(text: string): URL | null {
  const candidate = text.trim();
  // The scheme and host are already constrained by this pattern: every accepted
  // candidate either parses to an http(s) URL with a host or throws.
  if (!/^https?:\/\/\S+$/i.test(candidate)) return null;

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

/** Whether replacing `removedLength` characters with `insertedLength` fits. */
function fitsWithinMaxLength(
  element: HTMLTextAreaElement,
  removedLength: number,
  insertedLength: number,
): boolean {
  return (
    element.maxLength < 0 ||
    element.value.length - removedLength + insertedLength <= element.maxLength
  );
}

/** Builds a Markdown link from an already parsed HTTP(S) URL. */
function buildMarkdownLink(selection: string, url: URL): string | null {
  if (!selection || /[\r\n]/.test(selection)) return null;
  const label = selection.replace(/[\\[\]]/g, '\\$&');
  const destination = url.href.replace(/[()]/g, (character) =>
    character === '(' ? '%28' : '%29',
  );
  return `[${label}](${destination})`;
}

/**
 * Builds a Markdown link for a nonempty, single-line selection and an HTTP(S) URL.
 * A selection that is itself a URL is never linkified: pasting a URL over a URL is
 * a plain replacement, not a link whose label is the old URL.
 */
export function createMarkdownLink(
  selection: string,
  clipboardText: string,
): string | null {
  const url = parseHttpUrl(clipboardText);
  if (!url || parseHttpUrl(selection)) return null;
  return buildMarkdownLink(selection, url);
}

/**
 * Inserts `text` into the focused element over its selection and reports whether
 * the edit happened. A synthetic input event keeps the model in sync when the
 * browser does not emit one itself.
 */
function runEditorCommand(
  event: ClipboardEvent,
  element: HTMLTextAreaElement,
  text: string,
): boolean {
  const document = element.ownerDocument;
  // execCommand acts on the focused element, so never mutate another editor.
  if (document.activeElement !== element) return false;
  if (typeof document.execCommand !== 'function') return false;

  let inputFired = false;
  const markInput = () => {
    inputFired = true;
  };
  element.addEventListener('input', markInput);
  let succeeded = false;
  try {
    succeeded = document.execCommand('insertText', false, text);
  } catch {
    return false;
  } finally {
    element.removeEventListener('input', markInput);
  }
  if (!succeeded) return false;

  event.preventDefault();
  if (!inputFired) {
    const EventConstructor = document.defaultView?.Event ?? Event;
    element.dispatchEvent(new EventConstructor('input', { bubbles: true }));
  }
  return true;
}

/**
 * Turns a URL pasted over selected text into a Markdown link. A URL pasted over
 * an existing URL simply replaces it. Returns true only after insertion succeeds
 * and the native paste is prevented. Unsupported insertion falls back to native
 * paste to preserve browser undo behavior.
 */
export function handleMarkdownLinkPaste(
  event: ClipboardEvent,
  element: HTMLTextAreaElement | null | undefined,
): boolean {
  if (
    event.defaultPrevented ||
    !element ||
    element.disabled ||
    element.readOnly
  )
    return false;
  const { selectionStart, selectionEnd, value } = element;
  const clipboardText = event.clipboardData?.getData('text/plain');
  const clipboardUrl = clipboardText ? parseHttpUrl(clipboardText) : null;
  if (!clipboardUrl || selectionStart === selectionEnd) return false;

  // A selected URL is replaced instead of becoming the label of a new link.
  const selection = value.slice(selectionStart, selectionEnd);
  const inserted = parseHttpUrl(selection)
    ? clipboardText
    : buildMarkdownLink(selection, clipboardUrl);
  if (!inserted) return false;
  if (
    !fitsWithinMaxLength(
      element,
      selectionEnd - selectionStart,
      inserted.length,
    )
  )
    return false;

  return runEditorCommand(event, element, inserted);
}
