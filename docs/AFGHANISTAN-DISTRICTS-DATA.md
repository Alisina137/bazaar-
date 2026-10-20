# Afghanistan province and district choices

BazaarLink's **Sell on BazaarLink → Create your store** form uses the 34 canonical province names already used for Marketplace province filtering. Province-specific city/district choices are bundled locally to work offline without geolocation or a separate district API.

The district data originates from **Afghanistan Administrative Divisions** by **Open Admin Data** (dataset update 2026-09-08). It supplies **401 districts** over **34 provinces**.

- Source: https://github.com/open-admin-data/afghanistan-administrative-divisions
- Source files: `data/all-province.json` and `data/all-district.json`
- License: **Creative Commons Attribution 4.0 International (CC BY 4.0)**, https://creativecommons.org/licenses/by/4.0/
- Changes: simplified to district English and local-script names, grouped by the existing BazaarLink province keys (including spelling aliases, e.g. Herat / Hirat), sorted alphabetically, and stripped coordinates and unused metadata.
- Canonical saved district is the source English name; localized display names use the source local script (shared for Dari/Pashto). A user-selectable **Other district / city** value allows locations not represented by this administrative list.

These choices are a reference dataset, not an official or guaranteed-current government boundary registry. Some commonly used neighborhood names are not formal districts and require the "Other" entry.
