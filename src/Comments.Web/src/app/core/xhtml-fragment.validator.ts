import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Набір HTML-тегів, дозволених ТЗ для тексту коментарів. */
const allowedTags = new Set(['a', 'code', 'i', 'strong']);

/**
 * Перевіряє, що HTML-фрагмент є валідним XHTML і містить лише дозволені теги/атрибути.
 */
export function xhtmlFragmentValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(`<root>${value}</root>`, 'application/xhtml+xml');

    const parserError = document.querySelector('parsererror');
    if (parserError) {
      return { xhtmlFragment: true };
    }

    const root = document.documentElement;
    const allElements = Array.from(root.getElementsByTagName('*'));

    for (const element of allElements) {
      if (element === root) {
        continue;
      }

      const tagName = element.tagName.toLowerCase();
      if (!allowedTags.has(tagName)) {
        return { unsupportedTag: tagName };
      }

      if (tagName === 'a') {
        const attrs = Array.from(element.attributes);
        for (const attribute of attrs) {
          if (attribute.name.toLowerCase() !== 'href') {
            return { invalidAnchorAttributes: true };
          }

          if (!isAbsoluteHttpUrl(attribute.value)) {
            return { invalidAnchorHref: true };
          }
        }

        continue;
      }

      if (element.attributes.length > 0) {
        return { disallowedAttributes: tagName };
      }
    }

    return null;
  };
}

/** Перевіряє, що URL є абсолютним і використовує http/https-схему. */
function isAbsoluteHttpUrl(value: string): boolean {
  const href = value.trim();
  if (!href) {
    return false;
  }

  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
