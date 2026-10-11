import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { actionMapper } from '../../gestures/actionMapper';
import type { ActionPayload } from '../../gestures/types';
import {
  validatePdfFile,
  extractTextFromItems,
  clampPage,
  paginate,
  searchDocument,
  navigateMatch,
  highlightTextMatches,
  PageTextHighlighter,
} from './textbookSearch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure pdfjs worker to unpkg CDN matching installed version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface HighlightBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface OutlineItem {
  title: string;
  dest?: any;
  pageIndex?: number;
  pageNumber?: number;
}

const DEFAULT_SAMPLE_PDF = '/sample_textbook.pdf';
const DEFAULT_TITLE = 'NCERT Physics - Chapter 1 & 2';

export const TextbookViewer: React.FC = () => {
  // Document source & metadata
  const [pdfSource, setPdfSource] = useState<string>(DEFAULT_SAMPLE_PDF);
  const [documentTitle, setDocumentTitle] = useState<string>(DEFAULT_TITLE);
  const [isCustomPdf, setIsCustomPdf] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pagination
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.15);

  // Table of Contents & Outlines
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);

  // Real Text Extraction & Search
  const [pagesText, setPagesText] = useState<Map<number, string>>(new Map());
  const [pageItemsMap, setPageItemsMap] = useState<Map<number, Array<{ str?: string }>>>(new Map());
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const [currentPageItems, setCurrentPageItems] = useState<Array<{ str?: string }>>([]);

  // Multi-span text highlighter for the active page
  const pageHighlighter = useMemo(() => {
    const items = pageItemsMap.get(pageNumber) || currentPageItems;
    return new PageTextHighlighter(items);
  }, [pageItemsMap, pageNumber, currentPageItems]);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<number[]>([1]); // Default page 1 bookmarked
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  // In-memory page highlights: Record<pageNumber, HighlightBox[]>
  const [highlights, setHighlights] = useState<Record<number, HighlightBox[]>>({
    1: [{ id: 'hl-1', x: 50, y: 70, width: 340, height: 26, color: 'rgba(253, 224, 71, 0.4)' }],
  });
  const [highlightColor, setHighlightColor] = useState<string>('rgba(253, 224, 71, 0.4)'); // Yellow
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);

  // Refs
  const highlightStartRef = useRef<{ x: number; y: number } | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pdfDocRef = useRef<any>(null);
  const abortExtractionRef = useRef<boolean>(false);

  const isCurrentPageBookmarked = bookmarks.includes(pageNumber);

  // Clean up object URLs to prevent memory leaks
  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      abortExtractionRef.current = true;
      cleanupObjectUrl();
    };
  }, [cleanupObjectUrl]);

  // Page navigation helpers
  const goToPage = useCallback(
    (num: number) => {
      const clamped = clampPage(num, numPages || 1);
      setPageNumber(clamped);
      setPageInput(String(clamped));
    },
    [numPages]
  );

  const nextPage = useCallback(() => {
    if (numPages <= 0) return;
    goToPage(paginate(pageNumber, numPages, 1));
  }, [goToPage, pageNumber, numPages]);

  const prevPage = useCallback(() => {
    if (numPages <= 0) return;
    goToPage(paginate(pageNumber, numPages, -1));
  }, [goToPage, pageNumber, numPages]);

  // Subscribe to gesture actions: Swipe Left (Next) and Swipe Right (Prev)
  useEffect(() => {
    const unsubscribe = actionMapper.subscribe((action: ActionPayload) => {
      if (action.type === 'SWIPE_LEFT') {
        nextPage();
      } else if (action.type === 'SWIPE_RIGHT') {
        prevPage();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [nextPage, prevPage]);

  // Extract all text content from loaded PDF pages in background
  const extractPdfText = useCallback(async (pdfDoc: any) => {
    abortExtractionRef.current = false;
    setIsExtractingText(true);
    const textMap = new Map<number, string>();
    const itemsMap = new Map<number, Array<{ str?: string }>>();
    const total = pdfDoc.numPages;

    try {
      for (let i = 1; i <= total; i++) {
        if (abortExtractionRef.current) break;
        try {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageStr = extractTextFromItems(textContent.items);
          textMap.set(i, pageStr);
          itemsMap.set(i, textContent.items || []);
          // Stream partial extraction results so search works immediately without waiting for entire book
          setPagesText(new Map(textMap));
          setPageItemsMap(new Map(itemsMap));
        } catch (err) {
          console.warn(`Could not extract text from page ${i}:`, err);
          textMap.set(i, '');
          itemsMap.set(i, []);
        }
      }
    } finally {
      if (!abortExtractionRef.current) {
        setIsExtractingText(false);
      }
    }
  }, []);

  // Handle PDF load success
  const onDocumentLoadSuccess = async (pdfDoc: any) => {
    pdfDocRef.current = pdfDoc;
    setNumPages(pdfDoc.numPages);
    setLoadError(null);

    // Keep page number valid within new document bounds
    setPageNumber((prev) => clampPage(prev, pdfDoc.numPages));
    setPageInput((prev) => String(clampPage(parseInt(prev, 10) || 1, pdfDoc.numPages)));

    // Load table of contents outline
    try {
      const docOutline = await pdfDoc.getOutline();
      if (docOutline && docOutline.length > 0) {
        setOutline(docOutline);
      } else if (pdfSource === DEFAULT_SAMPLE_PDF) {
        // Fallback default outline for the sample physics book
        setOutline([
          { title: 'Chapter 1: Electrostatics', pageIndex: 1 },
          { title: "1.2 Gauss's Law & Flux", pageIndex: 2 },
          { title: '1.3 Electric Potential & Capacitors', pageIndex: 3 },
        ]);
      } else {
        setOutline([]);
      }
    } catch (e) {
      console.warn('Error reading outlines:', e);
      setOutline([]);
    }

    // Begin background text extraction for full-text search
    extractPdfText(pdfDoc);
  };

  // Handle PDF load error
  const onDocumentLoadError = (error: Error) => {
    console.error('Document load error:', error);
    setLoadError(error.message || 'Failed to render PDF document. The file may be corrupt or protected.');
    setNumPages(0);
  };

  // Handle User File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate uploaded file
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setLoadError(validation.error || 'Invalid file format. Please upload a valid PDF document.');
      return;
    }

    // Cancel existing extraction and release previous object URL
    abortExtractionRef.current = true;
    cleanupObjectUrl();

    // Create a new blob object URL
    const newObjectUrl = URL.createObjectURL(file);
    objectUrlRef.current = newObjectUrl;

    setLoadError(null);
    setPdfSource(newObjectUrl);
    setDocumentTitle(file.name);
    setIsCustomPdf(true);
    setPageNumber(1);
    setPageInput('1');
    setSearchQuery('');
    setActiveMatchIndex(0);
    setPagesText(new Map());
    setPageItemsMap(new Map());
    setCurrentPageItems([]);

    // Reset file input value so user can re-upload if needed
    e.target.value = '';
  };

  // Restore built-in sample textbook
  const handleResetToSample = () => {
    abortExtractionRef.current = true;
    cleanupObjectUrl();
    setLoadError(null);
    setPdfSource(DEFAULT_SAMPLE_PDF);
    setDocumentTitle(DEFAULT_TITLE);
    setIsCustomPdf(false);
    setPageNumber(1);
    setPageInput('1');
    setSearchQuery('');
    setActiveMatchIndex(0);
    setPagesText(new Map());
    setPageItemsMap(new Map());
    setCurrentPageItems([]);
  };

  // Perform real text search across extracted pages
  const searchResult = useMemo(() => {
    return searchDocument(pagesText, searchQuery);
  }, [pagesText, searchQuery]);

  // Handle search query change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setActiveMatchIndex(0);
  };

  // Navigate to Next/Prev search matches
  const handleNextMatch = () => {
    if (searchResult.totalMatches === 0) return;
    const nextIdx = navigateMatch(activeMatchIndex, 1, searchResult.totalMatches);
    setActiveMatchIndex(nextIdx);
    const match = searchResult.allMatches[nextIdx];
    if (match) goToPage(match.pageNumber);
  };

  const handlePrevMatch = () => {
    if (searchResult.totalMatches === 0) return;
    const prevIdx = navigateMatch(activeMatchIndex, -1, searchResult.totalMatches);
    setActiveMatchIndex(prevIdx);
    const match = searchResult.allMatches[prevIdx];
    if (match) goToPage(match.pageNumber);
  };

  // If search query produces matches and current page has 0 matches, auto-jump to first matching page
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || searchResult.totalMatches === 0) return;

    const currentPageHasMatch = searchResult.matchingPages.some((p) => p.pageNumber === pageNumber);
    if (!currentPageHasMatch && searchResult.allMatches.length > 0) {
      const firstMatch = searchResult.allMatches[0];
      const timer = setTimeout(() => {
        goToPage(firstMatch.pageNumber);
        setActiveMatchIndex(0);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, searchResult, pageNumber, goToPage]);

  // Determine if active search match is on the currently displayed page
  const activeMatchOnCurrentPage = useMemo(() => {
    if (searchResult.totalMatches === 0) return undefined;
    const match = searchResult.allMatches[activeMatchIndex];
    if (match && match.pageNumber === pageNumber) {
      return match.matchIndexOnPage;
    }
    return undefined;
  }, [searchResult, activeMatchIndex, pageNumber]);

  // Custom text renderer to highlight search terms in the PDF text layer
  const customTextRenderer = useCallback(
    ({ str, itemIndex }: { str: string; itemIndex: number }) => {
      if (!searchQuery.trim()) return str;
      if (pageHighlighter && pageHighlighter.hasItems) {
        return pageHighlighter.getHighlightFor(itemIndex, searchQuery, str, activeMatchOnCurrentPage);
      }
      return highlightTextMatches(str, searchQuery, activeMatchOnCurrentPage);
    },
    [searchQuery, pageHighlighter, activeMatchOnCurrentPage]
  );

  // Smooth scroll active search match into view within viewport
  useEffect(() => {
    if (typeof activeMatchOnCurrentPage === 'number') {
      const timer = setTimeout(() => {
        const activeEl = pageContainerRef.current?.querySelector('.pdf-search-match.active');
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeMatchOnCurrentPage, pageNumber]);

  // Jump to TOC item safely handling destination objects or direct page indices
  const handleTocClick = async (item: OutlineItem) => {
    if (typeof item.pageIndex === 'number' && item.pageIndex > 0) {
      goToPage(item.pageIndex);
      return;
    }
    if (typeof item.pageNumber === 'number' && item.pageNumber > 0) {
      goToPage(item.pageNumber);
      return;
    }
    if (item.dest && pdfDocRef.current) {
      try {
        let dest = item.dest;
        if (typeof dest === 'string') {
          dest = await pdfDocRef.current.getDestination(dest);
        }
        if (Array.isArray(dest) && dest[0]) {
          const pageIdx = await pdfDocRef.current.getPageIndex(dest[0]);
          goToPage(pageIdx + 1);
          return;
        }
      } catch (err) {
        console.warn('Could not resolve destination for TOC item:', err);
      }
    }
  };

  // Toggle Bookmark for current page
  const toggleBookmark = () => {
    setBookmarks((prev) =>
      prev.includes(pageNumber) ? prev.filter((p) => p !== pageNumber) : [...prev, pageNumber].sort((a, b) => a - b)
    );
  };

  // Mouse Highlight Drag Handlers
  const handleHighlightMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHighlighting || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    highlightStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleHighlightMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHighlighting || !highlightStartRef.current || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const startX = highlightStartRef.current.x;
    const startY = highlightStartRef.current.y;

    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    if (width > 8 && height > 6) {
      const newBox: HighlightBox = {
        id: Math.random().toString(36).substring(2, 9),
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width,
        height,
        color: highlightColor,
      };

      setHighlights((prev) => ({
        ...prev,
        [pageNumber]: [...(prev[pageNumber] || []), newBox],
      }));
    }

    highlightStartRef.current = null;
  };

  const clearCurrentPageHighlights = () => {
    setHighlights((prev) => ({
      ...prev,
      [pageNumber]: [],
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-8.5rem)] relative rounded-2xl overflow-hidden bg-[#FAF4FC] border border-[#EDDCEF] shadow-lg select-none">
      {/* Top Controls Bar */}
      <div className="h-14 bg-white/95 backdrop-blur-md border-b border-[#EDDCEF] px-5 flex items-center justify-between z-20 shadow-xs">
        {/* Left: Upload, TOC, Bookmarks, and Reset */}
        <div className="flex items-center gap-2">
          {/* Upload PDF */}
          <label
            title="Upload custom textbook PDF"
            className="px-3 py-1.5 rounded-full bg-[#813DA2] hover:bg-[#702E91] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span>Upload PDF</span>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Reset to Sample Button when custom PDF is active */}
          {isCustomPdf && (
            <button
              type="button"
              onClick={handleResetToSample}
              title="Return to default sample physics book"
              className="px-2.5 py-1.5 rounded-full bg-[#FAF4FC] hover:bg-[#FBE8FF] text-[#813DA2] border border-[#EDDCEF] text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">restart_alt</span>
              <span>Sample Book</span>
            </button>
          )}

          {/* Table of Contents Drawer Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsTocOpen(!isTocOpen);
              setIsBookmarksOpen(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isTocOpen
                ? 'bg-[#FBE8FF] text-[#813DA2] border border-[#A55FC6]'
                : 'text-[#4D4350] hover:bg-[#F9E0FF]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">toc</span>
            <span>Contents</span>
          </button>

          {/* Bookmarks Drawer Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsBookmarksOpen(!isBookmarksOpen);
              setIsTocOpen(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isBookmarksOpen
                ? 'bg-[#FBE8FF] text-[#813DA2] border border-[#A55FC6]'
                : 'text-[#4D4350] hover:bg-[#F9E0FF]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">bookmarks</span>
            <span>Bookmarks ({bookmarks.length})</span>
          </button>
        </div>

        {/* Center: Page Navigation & Zoom */}
        <div className="flex items-center gap-2">
          {/* Previous Page */}
          <button
            type="button"
            onClick={prevPage}
            disabled={numPages <= 0 || pageNumber <= 1}
            title="Previous Page (Swipe Right)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          {/* Page Input */}
          <div className="flex items-center gap-1.5 text-xs text-[#4D4350] font-semibold">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageInput}
              disabled={numPages <= 0}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => {
                const val = parseInt(pageInput, 10);
                if (!isNaN(val)) goToPage(val);
                else setPageInput(String(pageNumber));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(pageInput, 10);
                  if (!isNaN(val)) goToPage(val);
                  else setPageInput(String(pageNumber));
                }
              }}
              className="w-12 text-center py-1 bg-[#FEEFFF] border border-[#EDDCEF] rounded-lg text-xs font-bold text-[#813DA2] focus:outline-none focus:ring-2 focus:ring-[#813DA2] disabled:opacity-50"
            />
            <span>of {numPages || '–'}</span>
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={nextPage}
            disabled={numPages <= 0 || pageNumber >= numPages}
            title="Next Page (Swipe Left)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>

          <div className="w-[1px] h-5 bg-[#EDDCEF] mx-1"></div>

          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.75, Math.round((s - 0.15) * 100) / 100))}
            title="Zoom Out"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_out</span>
          </button>

          <span className="text-[11px] font-mono text-[#7A6F83] w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.2, Math.round((s + 0.15) * 100) / 100))}
            title="Zoom In"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
          </button>
        </div>

        {/* Right: Search, Highlighting & Bookmark Current Page */}
        <div className="flex items-center gap-2">
          {/* Real Text Search Bar */}
          <div className="relative flex items-center">
            <span className="material-symbols-outlined text-[16px] text-[#7A6F83] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search in book..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 pr-7 py-1 bg-[#FEEFFF] border border-[#EDDCEF] rounded-full text-xs text-[#2F0346] placeholder-[#7A6F83] focus:outline-none focus:ring-1 focus:ring-[#813DA2] w-40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                title="Clear search"
                className="absolute right-2 text-[#7A6F83] hover:text-[#2F0346] text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Result Feedback & Navigation */}
          {searchQuery.trim().length > 0 && (
            <div className="flex items-center gap-1 bg-[#FAF4FC] border border-[#EDDCEF] rounded-full px-2 py-0.5">
              {isExtractingText && pagesText.size < (numPages || 1) ? (
                <span className="text-[10px] font-mono text-[#813DA2] font-semibold animate-pulse">
                  Indexing...
                </span>
              ) : searchResult.totalMatches > 0 ? (
                <>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    {searchResult.totalMatches} {searchResult.totalMatches === 1 ? 'match' : 'matches'}
                  </span>
                  <div className="flex items-center ml-1 border-l border-[#EDDCEF] pl-1 gap-0.5">
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      title="Previous match"
                      className="w-4 h-4 flex items-center justify-center text-[#7A6F83] hover:text-[#813DA2]"
                    >
                      <span className="material-symbols-outlined text-[12px]">chevron_left</span>
                    </button>
                    <span className="text-[9px] font-mono text-[#7A6F83]">
                      {activeMatchIndex + 1}/{searchResult.totalMatches}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      title="Next match"
                      className="w-4 h-4 flex items-center justify-center text-[#7A6F83] hover:text-[#813DA2]"
                    >
                      <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    </button>
                  </div>
                  {searchResult.matchingPages.length > 1 && (
                    <div className="flex items-center gap-1 ml-1 border-l border-[#EDDCEF] pl-1">
                      {searchResult.matchingPages.map((mp) => (
                        <button
                          key={mp.pageNumber}
                          type="button"
                          onClick={() => goToPage(mp.pageNumber)}
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold transition-all cursor-pointer ${
                            pageNumber === mp.pageNumber
                              ? 'bg-[#813DA2] text-white shadow-xs'
                              : 'bg-[#FBE8FF] text-[#813DA2] hover:bg-[#F9E0FF]'
                          }`}
                          title={`Jump to Page ${mp.pageNumber} (${mp.count} ${mp.count === 1 ? 'match' : 'matches'})`}
                        >
                          p.{mp.pageNumber}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[10px] font-mono text-rose-600 font-semibold">
                  0 matches
                </span>
              )}
            </div>
          )}

          {/* Text Highlighter Toggle */}
          <button
            type="button"
            onClick={() => setIsHighlighting(!isHighlighting)}
            title="Click and drag to highlight text"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isHighlighting
                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300 font-bold'
                : 'text-[#4D4350] hover:bg-[#F9E0FF]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">ink_highlighter</span>
            <span>{isHighlighting ? 'Highlighting' : 'Highlight'}</span>
          </button>

          {isHighlighting && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setHighlightColor('rgba(253, 224, 71, 0.4)')}
                className="w-4 h-4 rounded-full bg-yellow-300 border border-amber-400 cursor-pointer"
                title="Yellow highlighter"
              />
              <button
                type="button"
                onClick={() => setHighlightColor('rgba(217, 136, 237, 0.4)')}
                className="w-4 h-4 rounded-full bg-purple-300 border border-purple-400 cursor-pointer"
                title="Lavender highlighter"
              />
              <button
                type="button"
                onClick={() => setHighlightColor('rgba(74, 222, 128, 0.4)')}
                className="w-4 h-4 rounded-full bg-green-300 border border-green-400 cursor-pointer"
                title="Green highlighter"
              />
              <button
                type="button"
                onClick={clearCurrentPageHighlights}
                title="Clear highlights on this page"
                className="text-[10px] text-red-600 hover:underline ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Bookmark Current Page Button */}
          <button
            type="button"
            onClick={toggleBookmark}
            title={isCurrentPageBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              isCurrentPageBookmarked
                ? 'text-[#813DA2] bg-[#FBE8FF] ring-2 ring-[#D988ED]'
                : 'text-[#7A6F83] hover:bg-[#F9E0FF]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCurrentPageBookmarked ? 'bookmark_added' : 'bookmark_border'}
            </span>
          </button>
        </div>
      </div>

      {/* Matching Pages Quick Jump Bar (when search has results) */}
      {searchResult.matchingPages.length > 0 && (
        <div className="h-8 bg-[#FDF7FF] border-b border-[#EDDCEF] px-5 flex items-center gap-2 overflow-x-auto z-15 text-xs">
          <span className="text-[11px] font-semibold text-[#813DA2] shrink-0 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">find_in_page</span>
            <span>Pages with matches:</span>
          </span>
          <div className="flex items-center gap-1.5">
            {searchResult.matchingPages.map((mp) => (
              <button
                key={mp.pageNumber}
                type="button"
                onClick={() => goToPage(mp.pageNumber)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  pageNumber === mp.pageNumber
                    ? 'bg-[#813DA2] text-white shadow-xs'
                    : 'bg-[#F4E3F7] text-[#813DA2] hover:bg-[#ECD0F2]'
                }`}
              >
                <span>Page {mp.pageNumber}</span>
                <span className="text-[9px] opacity-75 font-mono">({mp.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Table of Contents Drawer */}
        {isTocOpen && (
          <aside className="w-64 bg-white border-r border-[#EDDCEF] p-4 flex flex-col gap-3 overflow-y-auto z-10 animate-in slide-in-from-left duration-200 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-[#F5E6F8]">
              <h4 className="text-xs font-bold text-[#2F0346]">Table of Contents</h4>
              <button type="button" onClick={() => setIsTocOpen(false)} className="text-xs text-[#7A6F83]">
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {outline.length === 0 ? (
                <p className="text-xs text-[#7A6F83] italic">No chapter outline found in this PDF.</p>
              ) : (
                outline.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTocClick(item)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#4D4350] hover:bg-[#FBE8FF] hover:text-[#813DA2] transition-colors"
                  >
                    {item.title}
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Bookmarks Drawer */}
        {isBookmarksOpen && (
          <aside className="w-64 bg-white border-r border-[#EDDCEF] p-4 flex flex-col gap-3 overflow-y-auto z-10 animate-in slide-in-from-left duration-200 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-[#F5E6F8]">
              <h4 className="text-xs font-bold text-[#2F0346]">Saved Bookmarks</h4>
              <button type="button" onClick={() => setIsBookmarksOpen(false)} className="text-xs text-[#7A6F83]">
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {bookmarks.length === 0 ? (
                <p className="text-xs text-[#7A6F83] italic">No bookmarks saved yet.</p>
              ) : (
                bookmarks.map((bmPage) => (
                  <button
                    key={bmPage}
                    type="button"
                    onClick={() => goToPage(bmPage)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      pageNumber === bmPage
                        ? 'bg-[#FBE8FF] text-[#813DA2] border border-[#A55FC6]'
                        : 'bg-[#FAF4FC] hover:bg-[#FBE8FF] text-[#813DA2]'
                    }`}
                  >
                    <span>Page {bmPage}</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* PDF Page Viewport */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#EFE4F3]/60 relative">
          {/* Load Error State Card */}
          {loadError ? (
            <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-md shadow-xl text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">error</span>
              </div>
              <h3 className="text-sm font-bold text-[#2F0346]">Unable to Open PDF Textbook</h3>
              <p className="text-xs text-rose-600 font-medium leading-relaxed">{loadError}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleResetToSample}
                  className="px-4 py-2 rounded-full bg-[#813DA2] hover:bg-[#702E91] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Reload Sample Textbook
                </button>
                <label className="px-4 py-2 rounded-full bg-[#FBE8FF] text-[#813DA2] hover:bg-[#F9E0FF] text-xs font-semibold transition-all cursor-pointer">
                  Upload Other PDF
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div
              ref={pageContainerRef}
              onMouseDown={handleHighlightMouseDown}
              onMouseUp={handleHighlightMouseUp}
              className={`relative bg-white shadow-2xl rounded-sm transition-transform duration-100 ${
                isHighlighting ? 'cursor-text' : 'cursor-default'
              }`}
            >
              {/* Visible Corner "Dog-Ear" Fold when Page is Bookmarked */}
              {isCurrentPageBookmarked && (
                <div
                  title="Bookmarked Page"
                  className="absolute top-0 right-0 w-0 h-0 border-t-[36px] border-t-[#813DA2] border-l-[36px] border-l-transparent drop-shadow-md z-30 pointer-events-none"
                >
                  <span className="material-symbols-outlined text-white text-[11px] absolute -top-[33px] -right-[0px]">
                    star
                  </span>
                </div>
              )}

              {/* In-Memory Highlight Rectangles Overlay Layer */}
              {(highlights[pageNumber] || []).map((box) => (
                <div
                  key={box.id}
                  className="absolute pointer-events-none rounded-xs z-20 mix-blend-multiply"
                  style={{
                    left: box.x,
                    top: box.y,
                    width: box.width,
                    height: box.height,
                    backgroundColor: box.color,
                  }}
                />
              ))}

              {/* React-PDF Document Component */}
              <Document
                file={pdfSource}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                onSourceError={onDocumentLoadError}
                loading={
                  <div className="p-12 text-center text-xs text-[#7A6F83] font-semibold flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-[#813DA2] border-t-transparent animate-spin"></div>
                    <span>Rendering Textbook Page...</span>
                  </div>
                }
                error={
                  <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-md shadow-xl text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px]">error</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#2F0346]">Unable to Open PDF Textbook</h3>
                    <p className="text-xs text-rose-600 font-medium leading-relaxed">
                      {loadError || 'Failed to render PDF document. The file may be corrupt or protected.'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleResetToSample}
                        className="px-4 py-2 rounded-full bg-[#813DA2] hover:bg-[#702E91] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        Reload Sample Textbook
                      </button>
                    </div>
                  </div>
                }
              >
                {numPages > 0 && (
                  <Page
                    key={`${pdfSource}-${pageNumber}`}
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    customTextRenderer={customTextRenderer}
                    onGetTextSuccess={(tc: any) => {
                      if (tc?.items) {
                        setCurrentPageItems(tc.items);
                      }
                    }}
                  />
                )}
              </Document>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status & Gesture Navigation Hint Banner */}
      <div className="h-8 bg-black/75 backdrop-blur-md px-5 flex items-center justify-between text-[11px] text-white/80 font-mono z-20">
        <span className="flex items-center gap-1.5 truncate max-w-[50%]">
          <span className="material-symbols-outlined text-[13px] text-[#D988ED]">menu_book</span>
          <span className="truncate text-white/90">{documentTitle}</span>
          <span className="text-white/40">({numPages > 0 ? `${numPages} pages` : 'Loading...'})</span>
        </span>
        <span className="flex items-center gap-2">
          <span>🖐️ Palm Swipe Left: Next</span>
          <span className="text-[#D988ED]">•</span>
          <span>🖐️ Palm Swipe Right: Prev</span>
          <span className="text-[#D988ED]">•</span>
          <span className="text-white/60">Highlights saved per page</span>
        </span>
      </div>
    </div>
  );
};
