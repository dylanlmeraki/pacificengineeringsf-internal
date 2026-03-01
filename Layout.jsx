import React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Layout — Client Portal focused.
 * The Internal Portal has been migrated to its own codebase.
 * All pages render inside ErrorBoundary with no internal layout wrapper.
 */
export default function Layout({ children, currentPageName }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}