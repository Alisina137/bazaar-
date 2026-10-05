import type { CatalogErrorCode } from "@bazaarlink/contracts";

export class CatalogError extends Error {
  constructor(
    public readonly code: CatalogErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "CatalogError";
  }
}

export class CatalogRepositoryLimitError extends Error {
  constructor(public readonly resource: "category" | "product") {
    super(resource + "_limit_reached");
    this.name = "CatalogRepositoryLimitError";
  }
}

export class CatalogRepositoryInventoryError extends Error {
  constructor(
    public readonly code:
      | "inventory_target_invalid"
      | "inventory_would_be_negative"
  ) {
    super(code);
    this.name = "CatalogRepositoryInventoryError";
  }
}
