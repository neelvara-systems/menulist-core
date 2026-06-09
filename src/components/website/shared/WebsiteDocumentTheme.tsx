"use client";

import { useEffect } from "react";

export default function WebsiteDocumentTheme() {
  useEffect(() => {
    const previousBackgroundColor = document.body.style.backgroundColor;
    const previousColor = document.body.style.color;
    const previousValue = document.body.dataset.menulistWebsite;

    document.body.dataset.menulistWebsite = "true";
    document.body.style.backgroundColor = "var(--ws-bg-primary)";
    document.body.style.color = "var(--ws-text-primary)";

    return () => {
      document.body.style.backgroundColor = previousBackgroundColor;
      document.body.style.color = previousColor;

      if (previousValue === undefined) {
        delete document.body.dataset.menulistWebsite;
      } else {
        document.body.dataset.menulistWebsite = previousValue;
      }
    };
  }, []);

  return null;
}
