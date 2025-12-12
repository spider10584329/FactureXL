"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./button";
import { useLanguage } from "@/lib/i18n";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  showItemsPerPage?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
}: PaginationProps) {
  const { t, language } = useLanguage();

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = window.innerWidth < 640 ? 3 : 5; // Fewer pages on mobile

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
      {/* Items info - Hidden on very small screens */}
      <div className="text-xs sm:text-sm text-muted-foreground text-center hidden xs:block">
        {language === "en" ? (
          <>Showing <span className="font-medium text-foreground">{startItem}</span> to <span className="font-medium text-foreground">{endItem}</span> of <span className="font-medium text-foreground">{totalItems}</span> results</>
        ) : (
          <>Affichage de <span className="font-medium text-foreground">{startItem}</span> à <span className="font-medium text-foreground">{endItem}</span> sur <span className="font-medium text-foreground">{totalItems}</span> résultats</>
        )}
      </div>

      {/* Simplified info for very small screens */}
      <div className="text-xs text-muted-foreground text-center xs:hidden">
        <span className="font-medium text-foreground">{startItem}-{endItem}</span> {language === "en" ? "of" : "sur"} <span className="font-medium text-foreground">{totalItems}</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
        {/* Items per page selector */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              {language === "en" ? "Per page:" : "Par page:"}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="h-7 sm:h-8 w-14 sm:w-16 text-xs sm:text-sm rounded border border-input bg-background px-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}

        {/* Pagination controls */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* First page - Hidden on mobile */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden sm:flex"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title={language === "en" ? "First page" : "Première page"}
          >
            <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title={language === "en" ? "Previous page" : "Page précédente"}
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5 sm:gap-1 mx-0.5 sm:mx-1">
            {getPageNumbers().map((page, index) => (
              typeof page === "number" ? (
                <Button
                  key={index}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs font-medium ${
                    currentPage === page
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "hover:bg-primary/10 hover:text-primary"
                  }`}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              ) : (
                <span key={index} className="px-0.5 sm:px-1 text-muted-foreground text-xs">
                  {page}
                </span>
              )
            ))}
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title={language === "en" ? "Next page" : "Page suivante"}
          >
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>

          {/* Last page - Hidden on mobile */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden sm:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title={language === "en" ? "Last page" : "Dernière page"}
          >
            <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
