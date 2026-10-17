import type { MarketplaceSearchSuggestion } from "@bazaarlink/contracts";
import { useEffect, useState } from "react";

import { searchSuggestions } from "@/marketplace/api";

/** Debounce remote suggestions and ignore late replies from old queries. */
export function useMarketplaceSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<MarketplaceSearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalized = query.trim();
    let active = true;
    setSuggestions([]);

    if (normalized.length < 2) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      void searchSuggestions(normalized)
        .then((response) => {
          if (active) setSuggestions(response.suggestions);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  return { suggestions, suggestionsLoading: loading };
}
