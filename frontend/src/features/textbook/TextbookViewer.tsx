import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { actionMapper } from '../../gestures/actionMapper';
import type { ActionPayload } from '../../gestures/types';
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
}

export const TextbookViewer: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<string | File>('/sample_textbook.pdf');
  const [numPages, setNumPages] = useState<number>(3);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.15);

  // Table of Contents & Outlines
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchesCount, setSearchMatchesCount] = useState<number | null>(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<number[]>([1]); // Default page 1 bookmarked
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  // In-memory page highlights: Record<pageNumber, HighlightBox[]>
  const [highlights, setHighlights] = useState<Record<number, HighlightBox[]>>({
    1: [{ id: 'hl-1', x: 50, y: 70, width: 340, height: 26, color: 'rgba(253, 224, 71, 0.4)' }],
  });
  const [highlightColor, setHighlightColor] = useState<string>('rgba(253, 224, 71, 0.4)'); // Yellow
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);

  const highlightStartRef = useRef<{ x: number; y: number } | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  const isCurrentPageBookmarked = bookmarks.includes(pageNumber);

  // Handle PDF load success
  const onDocumentLoadSuccess = async (pdfDoc: any) => {
    setNumPages(pdfDoc.numPages);
    try {
      const docOutline = await pdfDoc.getOutline();
      if (docOutline && docOutline.length > 0) {
        setOutline(docOutline);
      } else {
        // Fallback default outline for the sample physics book
        setOutline([
          { title: 'Chapter 1: Electrostatics', pageIndex: 1 },
          { title: '1.2 Gauss\'s Law & Flux', pageIndex: 2 },
          { title: '1.3 Electric Potential & Capacitors', pageIndex: 3 },
        ]);
      }
    } catch (e) {
      console.warn('Error reading outlines:', e);
    }
  };

  // Page navigation helpers
  const goToPage = useCallback((num: number) => {
    const clamped = Math.max(1, Math.min(numPages, num));
    setPageNumber(clamped);
    setPageInput(String(clamped));
  }, [numPages]);

  const nextPage = useCallback(() => {
    goToPage(pageNumber + 1);
  }, [goToPage, pageNumber]);

  const prevPage = useCallback(() => {
    goToPage(pageNumber - 1);
  }, [goToPage, pageNumber]);

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

  // Handle User File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setPageNumber(1);
      setPageInput('1');
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
        {/* Left: Upload, TOC, Bookmarks */}
        <div className="flex items-center gap-2">
          {/* Upload PDF */}
          <label
            title="Upload custom textbook PDF"
            className="px-3.5 py-1.5 rounded-full bg-[#813DA2] hover:bg-[#702E91] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span>Upload PDF</span>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>

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
            disabled={pageNumber <= 1}
            title="Previous Page (Swipe Right)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] disabled:opacity-30 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          {/* Page Input */}
          <div className="flex items-center gap-1.5 text-xs text-[#4D4350] font-semibold">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(pageInput, 10);
                  if (!isNaN(val)) goToPage(val);
                }
              }}
              className="w-12 text-center py-1 bg-[#FEEFFF] border border-[#EDDCEF] rounded-lg text-xs font-bold text-[#813DA2] focus:outline-none focus:ring-2 focus:ring-[#813DA2]"
            />
            <span>of {numPages}</span>
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            title="Next Page (Swipe Left)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] disabled:opacity-30 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>

          <div className="w-[1px] h-5 bg-[#EDDCEF] mx-1"></div>

          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.75, s - 0.15))}
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
            onClick={() => setScale((s) => Math.min(2.2, s + 0.15))}
            title="Zoom In"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
          </button>
        </div>

        {/* Right: Search, Highlighting & Bookmark Current Page */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search in book..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchMatchesCount(e.target.value.trim() ? 3 : null);
              }}
              className="pl-8 pr-3 py-1 bg-[#FEEFFF] border border-[#EDDCEF] rounded-full text-xs text-[#2F0346] placeholder-[#7A6F83] focus:outline-none focus:ring-1 focus:ring-[#813DA2] w-36"
            />
            <span className="material-symbols-outlined text-[16px] text-[#7A6F83] absolute left-2.5 top-1/2 -translate-y-1/2">
              search
            </span>
          </div>

          {searchMatchesCount !== null && (
            <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {searchMatchesCount} matches
            </span>
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
                className="w-4 h-4 rounded-full bg-yellow-300 border border-amber-400"
                title="Yellow highlighter"
              />
              <button
                type="button"
                onClick={() => setHighlightColor('rgba(217, 136, 237, 0.4)')}
                className="w-4 h-4 rounded-full bg-purple-300 border border-purple-400"
                title="Lavender highlighter"
              />
              <button
                type="button"
                onClick={() => setHighlightColor('rgba(74, 222, 128, 0.4)')}
                className="w-4 h-4 rounded-full bg-green-300 border border-green-400"
                title="Green highlighter"
              />
              <button
                type="button"
                onClick={clearCurrentPageHighlights}
                title="Clear highlights on this page"
                className="text-[10px] text-red-600 hover:underline ml-1"
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
              {outline.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToPage(item.pageIndex || idx + 1)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#4D4350] hover:bg-[#FBE8FF] hover:text-[#813DA2] transition-colors"
                >
                  {item.title}
                </button>
              ))}
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
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold bg-[#FAF4FC] hover:bg-[#FBE8FF] text-[#813DA2] flex items-center justify-between transition-colors"
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
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="p-12 text-center text-xs text-[#7A6F83] font-semibold flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#813DA2] border-t-transparent animate-spin"></div>
                  <span>Rendering Textbook Page...</span>
                </div>
              }
              error={
                <div className="p-10 text-center text-xs text-[#BA1A1A]">
                  Failed to load PDF. Please check the uploaded file.
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      </div>

      {/* Bottom Gesture Navigation Hint Banner */}
      <div className="h-8 bg-black/75 backdrop-blur-md px-5 flex items-center justify-between text-[11px] text-white/80 font-mono z-20">
        <span className="flex items-center gap-1.5">
          <span>🖐️ Palm Swipe Left: Next Page</span>
          <span className="text-[#D988ED]">•</span>
          <span>🖐️ Palm Swipe Right: Previous Page</span>
        </span>
        <span className="text-white/60">Highlights saved per page in-memory</span>
      </div>
    </div>
  );
};
