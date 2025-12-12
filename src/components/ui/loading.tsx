"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-cyan-500 border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Chargement..." }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

interface LoadingCardProps {
  message?: string;
}

export function LoadingCard({ message = "Chargement..." }: LoadingCardProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Spinner size="lg" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="border-b py-3 px-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b py-4 px-4 flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-gray-100 rounded flex-1"
              style={{ opacity: 1 - rowIndex * 0.15 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6 bg-white rounded-lg border">
      <div className="h-6 bg-gray-200 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="h-4 bg-gray-100 rounded w-4/6" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse p-6 bg-white rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-100 rounded w-32" />
        </div>
        <div className="h-12 w-12 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-pulse p-6 bg-white rounded-lg border">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
        <div className="animate-pulse p-6 bg-white rounded-lg border">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// Full page loading with nice animation
export function PageLoading() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-gray-200" />
          <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Chargement</span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      </div>
    </div>
  );
}

// Button loading state
export function ButtonSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
