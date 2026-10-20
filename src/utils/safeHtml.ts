type SafeHtmlElement = HTMLElement & {
  setHTML?: (html: string, options: { sanitizer: SanitizerConfig }) => void;
};

const sanitizer: SanitizerConfig = {
  elements: [
    "p",
    "br",
    "a",
    "span",
    "b",
    "i",
    "strong",
    "em",
    "u",
    "ruby",
    "rt",
    "rp",
    "del",
    "s",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "img",
  ],
  attributes: ["href", "src", "alt", "title", "class", "rel", "lang", "translate", "start", "reversed", "value"],
  comments: false,
  dataAttributes: false,
};

const isWebUrl = (value: string): boolean => {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** Insert provider HTML with Chromium's safe parser; unsupported runtimes display literal text. */
export const setSafeHtml = (element: SafeHtmlElement, html: string): void => {
  if (typeof element.setHTML !== "function") {
    element.textContent = html;
    return;
  }
  try {
    element.setHTML(html, { sanitizer });
    for (const link of element.querySelectorAll("a[href]")) {
      if (!isWebUrl(link.getAttribute("href") ?? "")) link.removeAttribute("href");
      link.setAttribute("rel", "noopener noreferrer");
    }
    for (const image of element.querySelectorAll("img[src]")) {
      if (!isWebUrl(image.getAttribute("src") ?? "")) image.removeAttribute("src");
    }
  } catch {
    element.textContent = html;
  }
};
