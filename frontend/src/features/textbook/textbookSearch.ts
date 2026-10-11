/**
 * Utility functions for Smart Textbook PDF handling, text extraction,
 * real text search, multi-span match highlighting, and pagination.
 */

export interface PageTextData {
  pageNumber: number;
  text: string;
}

export interface SearchMatchOccurrence {
  pageNumber: number;
  matchIndex: number; // 0-based match index across entire document
  matchIndexOnPage: number; // 0-based match index on this page
  snippet: string;
}

export interface PageSearchResult {
  pageNumber: number;
  count: number;
  snippets: string[];
}

export interface SearchDocumentResult {
  query: string;
  totalMatches: number;
  matchingPages: PageSearchResult[];
  allMatches: SearchMatchOccurrence[];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface ItemRange {
  start: number;
  end: number;
  rawStr: string;
}

/**
 * Normalizes typographic punctuation (curly quotes, dashes, non-breaking spaces)
 * into equivalent standard ASCII characters to ensure robust search matching.
 * Maintains 1:1 character index parity with the original string.
 */
export function normalizePunctuation(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2018\u2019\u201A\u201B\u02BC]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u00A0\u2000-\u200B]/g, ' ');
}

/**
 * Validates whether an uploaded file is a valid, readable PDF document.
 */
export function validatePdfFile(file?: { name?: string; type?: string; size?: number } | null): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  const name = file.name || '';
  const isPdfExtension = name.toLowerCase().endsWith('.pdf');
  const isPdfMime = file.type === 'application/pdf';

  if (!isPdfExtension && !isPdfMime) {
    return {
      valid: false,
      error: 'Invalid file format: Please upload a valid PDF document (.pdf)',
    };
  }

  if (typeof file.size === 'number' && file.size <= 0) {
    return {
      valid: false,
      error: 'The uploaded PDF file is empty (0 bytes).',
    };
  }

  return { valid: true };
}

/**
 * Extracts plain text from an array of PDF.js TextItem objects.
 */
export function extractTextFromItems(items: Array<{ str?: string }>): string {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  return items
    .map((item) => (typeof item?.str === 'string' ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clamps a target page number to the valid range [1, totalPages].
 */
export function clampPage(pageNumber: number, totalPages: number): number {
  const max = Math.max(1, totalPages || 1);
  if (isNaN(pageNumber) || pageNumber < 1) return 1;
  if (pageNumber > max) return max;
  return Math.floor(pageNumber);
}

/**
 * Calculates the next or previous page clamped within [1, totalPages].
 */
export function paginate(currentPage: number, totalPages: number, delta: number): number {
  return clampPage(currentPage + delta, totalPages);
}

/**
 * Escapes regex special characters in a search string.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates an excerpt snippet surrounding a match in a text string.
 */
export function createSnippet(text: string, matchStart: number, matchLength: number, contextRadius = 40): string {
  const start = Math.max(0, matchStart - contextRadius);
  const end = Math.min(text.length, matchStart + matchLength + contextRadius);

  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = `...${snippet}`;
  if (end < text.length) snippet = `${snippet}...`;

  return snippet;
}

/**
 * Searches across extracted page texts for a given query string with punctuation normalization.
 * Supports Map<number, string>, Record<number, string>, or Array<PageTextData>.
 */
export function searchDocument(
  pagesText: Map<number, string> | Record<number, string> | PageTextData[],
  query: string
): SearchDocumentResult {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return {
      query: '',
      totalMatches: 0,
      matchingPages: [],
      allMatches: [],
    };
  }

  // Normalize entries into Array<[pageNumber, text]>
  const entries: Array<[number, string]> = [];
  if (pagesText instanceof Map) {
    pagesText.forEach((text, pageNum) => entries.push([pageNum, text]));
  } else if (Array.isArray(pagesText)) {
    pagesText.forEach((item) => entries.push([item.pageNumber, item.text]));
  } else if (typeof pagesText === 'object' && pagesText !== null) {
    Object.entries(pagesText).forEach(([key, text]) => {
      entries.push([parseInt(key, 10), String(text)]);
    });
  }

  // Sort ascending by page number
  entries.sort((a, b) => a[0] - b[0]);

  const normQuery = normalizePunctuation(trimmed);
  const escaped = escapeRegex(normQuery);
  const regex = new RegExp(escaped, 'gi');

  const matchingPages: PageSearchResult[] = [];
  const allMatches: SearchMatchOccurrence[] = [];
  let globalMatchIndex = 0;

  for (const [pageNumber, text] of entries) {
    if (!text) continue;

    // Normalize punctuation without altering string length or character offsets
    const normText = normalizePunctuation(text);
    let pageMatchesCount = 0;
    const pageSnippets: string[] = [];
    let match: RegExpExecArray | null;

    regex.lastIndex = 0;

    while ((match = regex.exec(normText)) !== null) {
      const matchStart = match.index;
      const snippet = createSnippet(text, matchStart, normQuery.length);

      pageSnippets.push(snippet);
      allMatches.push({
        pageNumber,
        matchIndex: globalMatchIndex,
        matchIndexOnPage: pageMatchesCount,
        snippet,
      });

      pageMatchesCount++;
      globalMatchIndex++;

      if (regex.lastIndex === matchStart) {
        regex.lastIndex++;
      }
    }

    if (pageMatchesCount > 0) {
      matchingPages.push({
        pageNumber,
        count: pageMatchesCount,
        snippets: pageSnippets,
      });
    }
  }

  return {
    query: trimmed,
    totalMatches: allMatches.length,
    matchingPages,
    allMatches,
  };
}

/**
 * Cycles through search matches forwards or backwards.
 */
export function navigateMatch(
  currentIndex: number,
  delta: number,
  totalMatches: number
): number {
  if (totalMatches <= 0) return 0;
  let next = currentIndex + delta;
  if (next < 0) next = totalMatches - 1;
  if (next >= totalMatches) next = 0;
  return next;
}

/**
 * Intelligent multi-span text highlighter for PDF.js text layer.
 * Reconstructs the continuous text stream of a page to correctly highlight words
 * and phrases even when split across multiple TextItem spans, kerning fragments,
 * or typesetting boundaries.
 */
export class PageTextHighlighter {
  private itemRanges: ItemRange[] = [];
  private fullText = '';
  private normalizedFullText = '';

  constructor(items: Array<{ str?: string }>) {
    let cumulative = '';
    const safeItems = Array.isArray(items) ? items : [];

    for (let i = 0; i < safeItems.length; i++) {
      const rawStr = typeof safeItems[i]?.str === 'string' ? safeItems[i].str! : '';
      const start = cumulative.length;
      cumulative += rawStr;
      const end = cumulative.length;
      this.itemRanges.push({ start, end, rawStr });
    }

    this.fullText = cumulative;
    this.normalizedFullText = normalizePunctuation(this.fullText).toLowerCase();
  }

  public get hasItems(): boolean {
    return this.itemRanges.length > 0;
  }

  public getHighlightFor(
    itemIndex: number,
    query: string,
    fallbackStr = '',
    activeMatchOnPage?: number
  ): string {
    const itemRange = this.itemRanges[itemIndex];
    const rawStr = itemRange ? itemRange.rawStr : fallbackStr;
    if (!rawStr) {
      return '';
    }

    const trimmed = (query || '').trim();
    if (!trimmed) {
      return rawStr;
    }

    const normQuery = normalizePunctuation(trimmed).toLowerCase();
    if (!normQuery) {
      return rawStr;
    }

    // 1. Find all matches across full continuous page text with match sequence indices
    const matches: Array<{ start: number; end: number; matchIdx: number }> = [];
    const queryTokens = normQuery.split(/\s+/).filter(Boolean);

    let globalMatchCount = 0;
    if (queryTokens.length > 1) {
      const tokenPattern = queryTokens.map(escapeRegex).join('\\s*');
      const tokenRegex = new RegExp(tokenPattern, 'gi');
      let tokenMatch: RegExpExecArray | null;
      while ((tokenMatch = tokenRegex.exec(this.normalizedFullText)) !== null) {
        matches.push({
          start: tokenMatch.index,
          end: tokenMatch.index + tokenMatch[0].length,
          matchIdx: globalMatchCount,
        });
        globalMatchCount++;
        if (tokenRegex.lastIndex === tokenMatch.index) tokenRegex.lastIndex++;
      }
    } else {
      let pos = 0;
      const qLen = normQuery.length;
      while ((pos = this.normalizedFullText.indexOf(normQuery, pos)) !== -1) {
        matches.push({ start: pos, end: pos + qLen, matchIdx: globalMatchCount });
        globalMatchCount++;
        pos += Math.max(1, qLen);
      }
    }

    const itemStart = itemRange ? itemRange.start : 0;
    const itemEnd = itemRange ? itemRange.end : rawStr.length;

    // 2. Identify slice overlapping with this item's character boundaries
    const intervals: Array<{ start: number; end: number; isActive: boolean }> = [];
    for (const m of matches) {
      if (m.end > itemStart && m.start < itemEnd) {
        const relStart = Math.max(0, m.start - itemStart);
        const relEnd = Math.min(rawStr.length, m.end - itemStart);
        if (relEnd > relStart) {
          intervals.push({
            start: relStart,
            end: relEnd,
            isActive: typeof activeMatchOnPage === 'number' && m.matchIdx === activeMatchOnPage,
          });
        }
      }
    }

    // 3. Fallback to intra-item substring search with normalized punctuation
    if (intervals.length === 0) {
      const normItem = normalizePunctuation(rawStr).toLowerCase();
      let fallbackMatchCount = 0;
      if (queryTokens.length > 1) {
        const tokenPattern = queryTokens.map(escapeRegex).join('\\s*');
        const tokenRegex = new RegExp(tokenPattern, 'gi');
        let tokenMatch: RegExpExecArray | null;
        while ((tokenMatch = tokenRegex.exec(normItem)) !== null) {
          intervals.push({
            start: tokenMatch.index,
            end: tokenMatch.index + tokenMatch[0].length,
            isActive: typeof activeMatchOnPage === 'number' && fallbackMatchCount === activeMatchOnPage,
          });
          fallbackMatchCount++;
          if (tokenRegex.lastIndex === tokenMatch.index) tokenRegex.lastIndex++;
        }
      } else {
        let itemPos = 0;
        const qLen = normQuery.length;
        while ((itemPos = normItem.indexOf(normQuery, itemPos)) !== -1) {
          intervals.push({
            start: itemPos,
            end: itemPos + qLen,
            isActive: typeof activeMatchOnPage === 'number' && fallbackMatchCount === activeMatchOnPage,
          });
          fallbackMatchCount++;
          itemPos += Math.max(1, qLen);
        }
      }
    }

    if (intervals.length === 0) {
      return rawStr;
    }

    // 4. Merge overlapping intervals
    intervals.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number; isActive: boolean }> = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = intervals[i];
      if (curr.start <= prev.end) {
        prev.end = Math.max(prev.end, curr.end);
        prev.isActive = prev.isActive || curr.isActive;
      } else {
        merged.push(curr);
      }
    }

    // 5. Construct highlighted HTML preserving exact original characters
    let result = '';
    let currIdx = 0;
    for (const { start, end, isActive } of merged) {
      if (start > currIdx) {
        result += rawStr.slice(currIdx, start);
      }
      const matchText = rawStr.slice(start, end);
      const activeClass = isActive ? ' active' : '';
      const style = isActive
        ? 'background-color: #f97316; color: #ffffff; border-radius: 2px; padding: 0 1px; box-shadow: 0 0 6px rgba(249, 115, 22, 0.85); outline: 2px solid #ea580c;'
        : 'background-color: #fde047; color: #1e1b4b; border-radius: 2px; padding: 0 1px;';
      result += `<mark class="pdf-search-match${activeClass}" style="${style}">${matchText}</mark>`;
      currIdx = end;
    }
    if (currIdx < rawStr.length) {
      result += rawStr.slice(currIdx);
    }

    return result;
  }
}

/**
 * Injects HTML <mark> tags into a string to highlight search matches.
 * Normalizes punctuation and handles case insensitivity safely.
 */
export function highlightTextMatches(text: string, query: string, activeMatchIndex?: number): string {
  if (!text || !query || !query.trim()) {
    return text;
  }

  const normQuery = normalizePunctuation(query.trim());
  const normText = normalizePunctuation(text);
  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  const pattern =
    queryTokens.length > 1 ? queryTokens.map(escapeRegex).join('\\s+') : escapeRegex(normQuery);
  const regex = new RegExp(`(${pattern})`, 'gi');

  const matches: Array<[number, number]> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normText)) !== null) {
    matches.push([match.index, match.index + match[0].length]);
    if (regex.lastIndex === match.index) regex.lastIndex++;
  }

  if (matches.length === 0) return text;

  let result = '';
  let currIdx = 0;
  for (let i = 0; i < matches.length; i++) {
    const [start, end] = matches[i];
    if (start > currIdx) result += text.slice(currIdx, start);
    const isActive = typeof activeMatchIndex === 'number' && i === activeMatchIndex;
    const activeClass = isActive ? ' active' : '';
    const style = isActive
      ? 'background-color: #f97316; color: #ffffff; border-radius: 2px; padding: 0 1px; box-shadow: 0 0 6px rgba(249, 115, 22, 0.85); outline: 2px solid #ea580c;'
      : 'background-color: #fde047; color: #1e1b4b; border-radius: 2px; padding: 0 1px;';
    result += `<mark class="pdf-search-match${activeClass}" style="${style}">${text.slice(start, end)}</mark>`;
    currIdx = end;
  }
  if (currIdx < text.length) result += text.slice(currIdx);

  return result;
}
