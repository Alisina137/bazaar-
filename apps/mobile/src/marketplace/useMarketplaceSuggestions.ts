import type { MarketplaceSearchSuggestion } from "@bazaarlink/contracts";
import { useEffect, useState } from "react";

import { searchSuggestions } from "@/marketplace/api";

/** Debounce remote suggestions and ignore late replies from old queries. */
export function useMarketplaceSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<MarketplaceSearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvedQuery, setResolvedQuery] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    let active = true;
    setSuggestions([]);

    if (normalized.length < 2) {
      setResolvedQuery("");
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      void searchSuggestions(normalized)
        .then((response) => {
          if (active) {
            setSuggestions(response.suggestions);
            setResolvedQuery(normalized);
          }
        })
        .catch(() => {
          if (active) {
            setSuggestions([]);
            setResolvedQuery(normalized);
          }
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

  // Old suggestions never belong to newly typed text, even for the single
  // frame before the previous effect's cleanup runs.
  const normalized = query.trim();
  const queryMatches = resolvedQuery === normalized;
  return {
    suggestions: queryMatches ? suggestions : [],
    suggestionsLoading: normalized.length >= 2 && (loading || !queryMatches)
  };
}
