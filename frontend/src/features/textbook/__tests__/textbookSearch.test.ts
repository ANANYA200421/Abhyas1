import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePdfFile,
  extractTextFromItems,
  clampPage,
  paginate,
  searchDocument,
  navigateMatch,
  highlightTextMatches,
  createSnippet,
  normalizePunctuation,
  PageTextHighlighter,
} from '../textbookSearch.ts';

// -------------------------------------------------------------
// 1. PDF File Validation Tests
// -------------------------------------------------------------
test('validatePdfFile: accepts valid .pdf file with proper extension', () => {
  const result = validatePdfFile({ name: 'physics_vol1.pdf', size: 102400 });
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('validatePdfFile: accepts valid PDF with application/pdf MIME type', () => {
  const result = validatePdfFile({ name: 'document', type: 'application/pdf', size: 50000 });
  assert.equal(result.valid, true);
});

test('validatePdfFile: rejects non-PDF file extensions', () => {
  const result = validatePdfFile({ name: 'notes.txt', type: 'text/plain', size: 1024 });
  assert.equal(result.valid, false);
  assert.match(result.error || '', /valid PDF document/);
});

test('validatePdfFile: rejects empty (0 bytes) PDF file', () => {
  const result = validatePdfFile({ name: 'empty_book.pdf', type: 'application/pdf', size: 0 });
  assert.equal(result.valid, false);
  assert.match(result.error || '', /empty \(0 bytes\)/);
});

test('validatePdfFile: rejects missing or null file', () => {
  const result = validatePdfFile(null);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /No file provided/);
});

// -------------------------------------------------------------
// 2. Text Extraction from PDF Items Tests
// -------------------------------------------------------------
test('extractTextFromItems: converts PDF text items into clean string', () => {
  const items = [
    { str: 'Chapter' },
    { str: '1:' },
    { str: 'Electric' },
    { str: 'Charges' },
    { str: 'and' },
    { str: 'Fields' },
  ];
  const text = extractTextFromItems(items);
  assert.equal(text, 'Chapter 1: Electric Charges and Fields');
});

test('extractTextFromItems: handles empty or malformed items gracefully', () => {
  assert.equal(extractTextFromItems([]), '');
  assert.equal(extractTextFromItems([{ str: '' }, { str: '   ' }]), '');
  assert.equal(extractTextFromItems([{ str: 'First' }, {}, { str: 'Second' }]), 'First Second');
});

// -------------------------------------------------------------
// 3. Page Clamping and Navigation Tests
// -------------------------------------------------------------
test('clampPage: clamps numbers within range [1, totalPages]', () => {
  assert.equal(clampPage(1, 10), 1);
  assert.equal(clampPage(5, 10), 5);
  assert.equal(clampPage(10, 10), 10);
  assert.equal(clampPage(0, 10), 1);
  assert.equal(clampPage(-3, 10), 1);
  assert.equal(clampPage(999, 10), 10);
  assert.equal(clampPage(NaN, 10), 1);
});

test('paginate: advances and retreats pages accurately', () => {
  assert.equal(paginate(1, 5, 1), 2);
  assert.equal(paginate(2, 5, 1), 3);
  assert.equal(paginate(5, 5, 1), 5, 'Should not exceed total pages');
  assert.equal(paginate(3, 5, -1), 2);
  assert.equal(paginate(1, 5, -1), 1, 'Should not go below page 1');
});

// -------------------------------------------------------------
// 4. Real Text Search Tests
// -------------------------------------------------------------
const samplePages: Record<number, string> = {
  1: 'Chapter 1 Electrostatics. Electric charges create an electric field in the surrounding space.',
  2: 'Gauss Law states that the total electric flux out of a closed surface is equal to the charge divided by permittivity.',
  3: 'Electric potential difference and capacitors. Energy stored in an electric field.',
};

test('searchDocument: finds accurate matches across multiple pages', () => {
  const result = searchDocument(samplePages, 'electric');
  // 'electric' appears in page 1 (twice), page 2 (once), page 3 (twice) -> total 5
  assert.equal(result.query, 'electric');
  assert.equal(result.totalMatches, 5);
  assert.equal(result.matchingPages.length, 3);

  assert.equal(result.matchingPages[0].pageNumber, 1);
  assert.equal(result.matchingPages[0].count, 2);

  assert.equal(result.matchingPages[1].pageNumber, 2);
  assert.equal(result.matchingPages[1].count, 1);

  assert.equal(result.matchingPages[2].pageNumber, 3);
  assert.equal(result.matchingPages[2].count, 2);

  // Check allMatches array
  assert.equal(result.allMatches.length, 5);
  assert.equal(result.allMatches[0].pageNumber, 1);
  assert.equal(result.allMatches[2].pageNumber, 2);
  assert.equal(result.allMatches[3].pageNumber, 3);
});

test('searchDocument: case-insensitive search works seamlessly', () => {
  const lower = searchDocument(samplePages, 'gauss');
  const upper = searchDocument(samplePages, 'GAUSS');
  const mixed = searchDocument(samplePages, 'GaUsS');

  assert.equal(lower.totalMatches, 1);
  assert.equal(upper.totalMatches, 1);
  assert.equal(mixed.totalMatches, 1);
  assert.equal(lower.matchingPages[0].pageNumber, 2);
});

test('searchDocument: handles empty-result searches with 0 matches', () => {
  const result = searchDocument(samplePages, 'quantum entanglement');
  assert.equal(result.totalMatches, 0);
  assert.equal(result.matchingPages.length, 0);
  assert.equal(result.allMatches.length, 0);
});

test('searchDocument: handles blank or whitespace queries gracefully', () => {
  const emptyRes = searchDocument(samplePages, '');
  const spaceRes = searchDocument(samplePages, '   ');
  assert.equal(emptyRes.totalMatches, 0);
  assert.equal(spaceRes.totalMatches, 0);
});

test('searchDocument: safely handles special regex characters in query', () => {
  const pagesWithSpecial = {
    1: 'Formula E = mc^2 and flux (integral) of E.dA = q/e0 [ref 1].',
  };
  const res1 = searchDocument(pagesWithSpecial, '(integral)');
  assert.equal(res1.totalMatches, 1);

  const res2 = searchDocument(pagesWithSpecial, '[ref 1]');
  assert.equal(res2.totalMatches, 1);

  const res3 = searchDocument(pagesWithSpecial, '^2');
  assert.equal(res3.totalMatches, 1);
});

// -------------------------------------------------------------
// 5. Search Navigation & Snippets Tests
// -------------------------------------------------------------
test('createSnippet: produces an excerpt centered on the match', () => {
  const text = 'The fundamental unit of electric charge is denoted by the letter e in modern physics.';
  const snippet = createSnippet(text, 24, 8, 15);
  assert.ok(snippet.includes('electric'));
});

test('navigateMatch: wraps around match navigation index', () => {
  assert.equal(navigateMatch(0, 1, 5), 1);
  assert.equal(navigateMatch(4, 1, 5), 0, 'Wraps forward to first match');
  assert.equal(navigateMatch(0, -1, 5), 4, 'Wraps backwards to last match');
  assert.equal(navigateMatch(2, -1, 5), 1);
  assert.equal(navigateMatch(0, 1, 0), 0, 'Handles 0 matches safely');
});

// -------------------------------------------------------------
// 6. Text Highlighting Tests
// -------------------------------------------------------------
test('highlightTextMatches: wraps matching occurrences in <mark> tags', () => {
  const input = 'Electric field and electric potential';
  const highlighted = highlightTextMatches(input, 'electric');
  assert.match(highlighted, /<mark class="pdf-search-match"[^>]*>Electric<\/mark>/);
  assert.match(highlighted, /<mark class="pdf-search-match"[^>]*>electric<\/mark>/);
  assert.ok(highlighted.includes('field and'));
});

test('highlightTextMatches: returns unchanged text when query is empty', () => {
  const input = 'Hello World';
  assert.equal(highlightTextMatches(input, ''), 'Hello World');
  assert.equal(highlightTextMatches(input, '   '), 'Hello World');
});

// -------------------------------------------------------------
// 7. PDF Loading State & Document Lifecycle Tests
// -------------------------------------------------------------
test('validatePdfFile: accepts uppercase .PDF extension', () => {
  const result = validatePdfFile({ name: 'TEXTBOOK.PDF', size: 20480 });
  assert.equal(result.valid, true);
});

test('Document loading: clamps active page when switching to document with fewer pages', () => {
  const previousPage = 10;
  const newDocTotalPages = 4;
  const clamped = clampPage(previousPage, newDocTotalPages);
  assert.equal(clamped, 4, 'Active page must clamp to new document total pages');
});

test('Document loading: preserves active page if within bounds of new document', () => {
  const previousPage = 2;
  const newDocTotalPages = 5;
  const clamped = clampPage(previousPage, newDocTotalPages);
  assert.equal(clamped, 2);
});

test('Document loading: handles document with scanned pages containing no text', () => {
  const scannedPages: Record<number, string> = {
    1: '',
    2: '',
    3: '',
  };
  const result = searchDocument(scannedPages, 'formula');
  assert.equal(result.totalMatches, 0);
  assert.equal(result.matchingPages.length, 0);
  assert.equal(result.allMatches.length, 0);
});

test('Document loading: correctly maps non-contiguous page matches', () => {
  const multiPages: Record<number, string> = {
    1: 'Introduction to electromagnetism and charges.',
    2: 'Mechanics and kinematics review.',
    3: 'Thermodynamics overview.',
    4: 'Optics and light refraction.',
    5: 'Advanced topics in electromagnetism.',
  };
  const result = searchDocument(multiPages, 'electromagnetism');
  assert.equal(result.totalMatches, 2);
  assert.equal(result.matchingPages.length, 2);
  assert.equal(result.matchingPages[0].pageNumber, 1);
  assert.equal(result.matchingPages[1].pageNumber, 5);
});

// -------------------------------------------------------------
// 8. Unicode Punctuation Normalization Tests
// -------------------------------------------------------------
test('normalizePunctuation: replaces curly quotes and typographic dashes while keeping exact length', () => {
  const original = '“Gauss’s Law” – Chapter 1\u00A0Flux';
  const normalized = normalizePunctuation(original);
  assert.equal(normalized, '"Gauss\'s Law" - Chapter 1 Flux');
  assert.equal(normalized.length, original.length, 'Index parity must be strictly 1:1');
});

test('searchDocument: matches terms with typographic apostrophe when user types ASCII apostrophe', () => {
  const pages = {
    1: 'Coulomb’s Law describes electrostatic force.',
    2: 'Gauss’s Law relates electric flux to enclosed charge.',
  };
  const res1 = searchDocument(pages, "Coulomb's");
  assert.equal(res1.totalMatches, 1);
  assert.equal(res1.matchingPages[0].pageNumber, 1);

  const res2 = searchDocument(pages, "Gauss's");
  assert.equal(res2.totalMatches, 1);
  assert.equal(res2.matchingPages[0].pageNumber, 2);
});

// -------------------------------------------------------------
// 9. PageTextHighlighter Multi-Span Tests
// -------------------------------------------------------------
test('PageTextHighlighter: correctly highlights words split across multiple spans', () => {
  const items = [
    { str: 'Electro' },
    { str: 'statics' },
    { str: ' and Fields' },
  ];
  const highlighter = new PageTextHighlighter(items);
  assert.equal(highlighter.hasItems, true);

  // Searching "Electrostatics" which spans item 0 and item 1
  const h0 = highlighter.getHighlightFor(0, 'Electrostatics');
  const h1 = highlighter.getHighlightFor(1, 'Electrostatics');
  const h2 = highlighter.getHighlightFor(2, 'Electrostatics');

  assert.match(h0, /<mark class="pdf-search-match"[^>]*>Electro<\/mark>/);
  assert.match(h1, /<mark class="pdf-search-match"[^>]*>statics<\/mark>/);
  assert.equal(h2, ' and Fields', 'Item 2 should not be highlighted');
});

test('PageTextHighlighter: handles phrases across separate items with typographic punctuation', () => {
  const items = [
    { str: 'Chapter 1: ' },
    { str: 'Gauss’s Law' },
    { str: ' in action' },
  ];
  const highlighter = new PageTextHighlighter(items);

  // Searching "Gauss's" with standard ASCII apostrophe
  const h1 = highlighter.getHighlightFor(1, "Gauss's");
  assert.match(h1, /<mark class="pdf-search-match"[^>]*>Gauss’s<\/mark>/);
});

test('PageTextHighlighter: preserves raw string when query is empty or item has no matches', () => {
  const items = [{ str: 'Sample Text' }];
  const highlighter = new PageTextHighlighter(items);

  assert.equal(highlighter.getHighlightFor(0, ''), 'Sample Text');
  assert.equal(highlighter.getHighlightFor(0, 'Unrelated'), 'Sample Text');
});

test('PageTextHighlighter: falls back gracefully on out-of-bounds indices', () => {
  const highlighter = new PageTextHighlighter([]);
  assert.equal(highlighter.hasItems, false);
  const fallback = highlighter.getHighlightFor(99, 'test', 'fallback string');
  assert.equal(fallback, 'fallback string');
});

// -------------------------------------------------------------
// 10. Active Match Differentiation Tests
// -------------------------------------------------------------
test('PageTextHighlighter: applies .active class only to the active match on page', () => {
  const items = [
    { str: 'Electric charges produce an electric field and electric flux.' },
  ];
  const highlighter = new PageTextHighlighter(items);

  // Match 0 is active
  const h0 = highlighter.getHighlightFor(0, 'electric', '', 0);
  assert.match(h0, /<mark class="pdf-search-match active"[^>]*>Electric<\/mark>/);
  assert.match(h0, /<mark class="pdf-search-match"[^>]*>electric<\/mark>/);

  // Match 1 is active
  const h1 = highlighter.getHighlightFor(0, 'electric', '', 1);
  assert.match(h1, /<mark class="pdf-search-match"[^>]*>Electric<\/mark>/);
  assert.match(h1, /<mark class="pdf-search-match active"[^>]*>electric<\/mark>/);

  // Match 2 is active
  const h2 = highlighter.getHighlightFor(0, 'electric', '', 2);
  const activeMarks = (h2.match(/pdf-search-match active/g) || []).length;
  assert.equal(activeMarks, 1, 'Only one active match should be rendered');
});

test('highlightTextMatches: marks active match occurrence when activeMatchIndex specified', () => {
  const text = 'Alpha beta alpha gamma';
  const h = highlightTextMatches(text, 'alpha', 1);
  assert.match(h, /<mark class="pdf-search-match"[^>]*>Alpha<\/mark>/);
  assert.match(h, /<mark class="pdf-search-match active"[^>]*>alpha<\/mark>/);
});

// -------------------------------------------------------------
// 11. Real Sample Textbook End-to-End Regression Tests
// -------------------------------------------------------------
test('Sample Textbook: extracts text, searches, and navigates across all 3 pages', () => {
  const page1Items = [
    { str: 'Abhyas Physics - Grade 11' },
    { str: '' },
    { str: 'Chapter 1: Electrostatics and Electric Charges' },
    { str: '' },
    { str: '1.1 Introduction to Electric Charges and Quantization' },
    { str: 'Matter is composed of atoms containing positively charged protons and negatively charged electrons.' },
    { str: 'Charge is quantized in integral multiples of elementary charge e = 1.602 x 10^-19 C.' },
    { str: 'Coulomb’s Law states that force between two point charges is inversely proportional to r^2.' },
  ];

  const page2Items = [
    { str: 'Chapter 1.2: Gauss’s Law and Electric Flux' },
    { str: '' },
    { str: 'Electric flux is the measure of the electric field passing through a given surface area.' },
    { str: 'Formula: Flux = Closed Integral of E . dA = Q_enc / Epsilon_0' },
    { str: 'Gauss’s law provides a powerful technique for calculating electric fields of symmetric charge distributions.' },
    { str: 'Applications include spherical shells, infinite plane sheets, and cylindrical conductors.' },
  ];

  const page3Items = [
    { str: 'Chapter 1.3: Electric Potential & Capacitors' },
    { str: '' },
    { str: 'Electric potential is the work done per unit charge in bringing it from infinity to a point.' },
    { str: 'Capacitance C = Q / V measures the ability of a conductor to store electric potential energy.' },
    { str: 'Parallel plate capacitor capacitance is given by C = (Epsilon_0 * A) / d.' },
  ];

  const p1Text = extractTextFromItems(page1Items);
  const p2Text = extractTextFromItems(page2Items);
  const p3Text = extractTextFromItems(page3Items);

  assert.ok(p1Text.includes('Coulomb’s Law'));
  assert.ok(p2Text.includes('Gauss’s Law'));
  assert.ok(p3Text.includes('Capacitance'));

  const bookMap = new Map([
    [1, p1Text],
    [2, p2Text],
    [3, p3Text],
  ]);

  // Search "Electric"
  const electricSearch = searchDocument(bookMap, 'Electric');
  assert.equal(electricSearch.totalMatches, 9);
  assert.equal(electricSearch.matchingPages.length, 3);
  assert.equal(electricSearch.matchingPages[0].count, 2); // Page 1
  assert.equal(electricSearch.matchingPages[1].count, 4); // Page 2
  assert.equal(electricSearch.matchingPages[2].count, 3); // Page 3

  // Search "Coulomb's" with straight apostrophe
  const coulombSearch = searchDocument(bookMap, "Coulomb's");
  assert.equal(coulombSearch.totalMatches, 1);
  assert.equal(coulombSearch.matchingPages[0].pageNumber, 1);

  // Search "Flux"
  const fluxSearch = searchDocument(bookMap, 'Flux');
  assert.equal(fluxSearch.totalMatches, 3);
  assert.equal(fluxSearch.matchingPages[0].pageNumber, 2);

  // Highlighting page 1 items for "Coulomb's"
  const p1Highlighter = new PageTextHighlighter(page1Items);
  const hCoulomb = p1Highlighter.getHighlightFor(7, "Coulomb's", '', 0);
  assert.match(hCoulomb, /<mark class="pdf-search-match active"[^>]*>Coulomb’s<\/mark>/);

  // Highlighting page 2 items for "Flux" with active match 1
  const p2Highlighter = new PageTextHighlighter(page2Items);
  const hFlux0 = p2Highlighter.getHighlightFor(0, 'Flux', '', 1);
  const hFlux2 = p2Highlighter.getHighlightFor(2, 'Flux', '', 1);
  assert.match(hFlux0, /<mark class="pdf-search-match"[^>]*>Flux<\/mark>/);
  assert.match(hFlux2, /<mark class="pdf-search-match active"[^>]*>flux<\/mark>/);
});


