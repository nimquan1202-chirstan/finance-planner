export interface ExtractedTableHeader {
  text: string;
  scope?: string;
}

export interface ExtractedTable {
  caption?: string;
  headers: ExtractedTableHeader[];
  rows: string[][];
  rawClass?: string;
}

export interface ExtractedSvg {
  raw: string;
  ariaHidden?: string;
}

export interface ExtractedAriaExpandedButton {
  text: string;
  ariaExpanded: string;
  raw: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&rarr;": "→",
  "&larr;": "←",
  "&middot;": "·",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(
      /&(?:amp|lt|gt|quot|apos|nbsp|rarr|larr|middot|#39|#x27);/gi,
      (entity) => NAMED_ENTITIES[entity.toLowerCase()] ?? entity,
    )
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    );
}

export function stripTags(html: string): string {
  const withoutScripts = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}

export function hasForbiddenDongSymbol(html: string): boolean {
  return html.includes("\u20ab");
}

export function formatExpectedVnd(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${digits} \u0111`;
}

export function assertContainsVnd(
  html: string,
  amountOrPattern: number | string | RegExp,
): void {
  if (hasForbiddenDongSymbol(html)) {
    throw new Error(
      'HTML contains forbidden currency symbol "₫" (U+20AB); expected "đ" (U+0111)',
    );
  }

  const text = stripTags(html);
  if (typeof amountOrPattern === "number") {
    const expected = formatExpectedVnd(amountOrPattern);
    if (!text.includes(expected)) {
      throw new Error(
        `Expected HTML text to contain VND amount "${expected}", but it was not found.`,
      );
    }
    return;
  }

  if (typeof amountOrPattern === "string") {
    if (!text.includes(amountOrPattern) && !html.includes(amountOrPattern)) {
      throw new Error(
        `Expected HTML to contain "${amountOrPattern}", but it was not found.`,
      );
    }
    return;
  }

  if (!amountOrPattern.test(text)) {
    throw new Error(
      `Expected HTML text to match ${String(amountOrPattern)}, but it did not.`,
    );
  }
}

function extractAttr(attrs: string, attrName: string): string | undefined {
  const regex = new RegExp(
    `(?:^|\\s)${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = attrs.match(regex);
  if (!match) return undefined;
  const raw = match[1] ?? match[2] ?? match[3];
  return raw !== undefined ? decodeHtmlEntities(raw) : undefined;
}

function findClosingTagEnd(
  html: string,
  tagName: string,
  searchFrom: number,
): number {
  const openOrClose = new RegExp(`<(\\/)?${tagName}\\b[^>]*>`, "gi");
  openOrClose.lastIndex = searchFrom;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = openOrClose.exec(html)) !== null) {
    const isClose = Boolean(m[1]);
    const full = m[0];
    const isSelfClosing = !isClose && /\/>$/.test(full);
    if (isSelfClosing) continue;
    depth += isClose ? -1 : 1;
    if (depth === 0) {
      return m.index;
    }
  }
  return html.length;
}

export function extractTables(html: string): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  const tableStartRegex = /<table\b([^>]*)>/gi;

  for (const match of html.matchAll(tableStartRegex)) {
    const attrs = match[1] ?? "";
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = findClosingTagEnd(html, "table", bodyStart);
    const body = html.slice(bodyStart, bodyEnd);
    const rawClass = extractAttr(attrs, "class");

    const captionMatch = body.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
    const caption = captionMatch ? stripTags(captionMatch[1]) : undefined;

    const headers: ExtractedTableHeader[] = [];
    const theadMatch = body.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
    const headerSource = theadMatch ? theadMatch[1] : body;

    for (const thMatch of headerSource.matchAll(/<th\b([^>]*)>([\s\S]*?)<\/th>/gi)) {
      const [, thAttrs = "", thBody = ""] = thMatch;
      const scope = extractAttr(thAttrs, "scope");
      headers.push({
        text: stripTags(thBody),
        ...(scope !== undefined ? { scope } : {}),
      });
    }

    const rows: string[][] = [];
    const tbodyMatch = body.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
    const rowsSource = tbodyMatch
      ? tbodyMatch[1]
      : theadMatch
        ? body.replace(theadMatch[0], "")
        : body;

    for (const trMatch of rowsSource.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const trBody = trMatch[1];
      const cells: string[] = [];
      for (const cellMatch of trBody.matchAll(
        /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi,
      )) {
        cells.push(stripTags(cellMatch[1]));
      }
      if (cells.length > 0 && (tbodyMatch || /<td\b/i.test(trBody))) {
        rows.push(cells);
      }
    }

    tables.push({
      ...(caption !== undefined ? { caption } : {}),
      headers,
      rows,
      ...(rawClass !== undefined ? { rawClass } : {}),
    });
  }

  return tables;
}

export function extractSvgTags(html: string): ExtractedSvg[] {
  const svgs: ExtractedSvg[] = [];
  for (const match of html.matchAll(/<svg\b([^>]*)>/gi)) {
    const [raw, attrs = ""] = match;
    const ariaHidden = extractAttr(attrs, "aria-hidden");
    svgs.push({
      raw,
      ...(ariaHidden !== undefined ? { ariaHidden } : {}),
    });
  }
  return svgs;
}

export function hasAriaHiddenSvg(html: string): boolean {
  return extractSvgTags(html).some((svg) => svg.ariaHidden === "true");
}

export function extractAriaExpandedButtons(
  html: string,
): ExtractedAriaExpandedButton[] {
  const buttons: ExtractedAriaExpandedButton[] = [];
  for (const match of html.matchAll(/<button\b([^>]*)>/gi)) {
    const attrs = match[1] ?? "";
    const ariaExpanded = extractAttr(attrs, "aria-expanded");
    if (ariaExpanded !== undefined) {
      const bodyStart = (match.index ?? 0) + match[0].length;
      const bodyEnd = findClosingTagEnd(html, "button", bodyStart);
      const body = html.slice(bodyStart, bodyEnd);
      const raw = html.slice(match.index ?? 0, bodyEnd + "</button>".length);
      buttons.push({
        text: stripTags(body),
        ariaExpanded,
        raw,
      });
    }
  }
  return buttons;
}

export function hasDialogElement(html: string): boolean {
  return /<dialog\b/i.test(html);
}

function extractByRole(html: string, roleValue: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(
    `<([a-zA-Z0-9-]+)\\b[^>]*\\brole\\s*=\\s*["']${roleValue}["'][^>]*>`,
    "gi",
  );
  for (const match of html.matchAll(regex)) {
    const tagName = match[1];
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = findClosingTagEnd(html, tagName, bodyStart);
    results.push(stripTags(html.slice(bodyStart, bodyEnd)));
  }
  return results;
}

export function extractRoleAlerts(html: string): string[] {
  return extractByRole(html, "alert");
}

export function extractRoleStatus(html: string): string[] {
  return extractByRole(html, "status");
}

export function extractExportCsvHref(html: string): string | null {
  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    const attrs = match[1] ?? "";
    const href = extractAttr(attrs, "href");
    if (href && href.includes("/api/transactions") && href.includes("format=csv")) {
      return href;
    }
  }
  return null;
}
