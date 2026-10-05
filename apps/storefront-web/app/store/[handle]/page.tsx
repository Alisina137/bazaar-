import type {
  PublicStoreCatalogResponse,
  PublicStoreRecord
} from "@bazaarlink/contracts";
import {
  formatAfn,
  getDirection,
  translate,
  type SupportedLocale
} from "@bazaarlink/localization";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface StorePageProps {
  params: Promise<{
    handle: string;
  }>;
}

function apiBaseUrl() {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

async function getStore(handle: string): Promise<PublicStoreRecord | null> {
  const response = await fetch(
    apiBaseUrl() + "/stores/" + encodeURIComponent(handle),
    {
      cache: "no-store"
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("public_store_unavailable");
  }

  return (await response.json()) as PublicStoreRecord;
}

async function getCatalog(
  handle: string
): Promise<PublicStoreCatalogResponse | null> {
  const response = await fetch(
    apiBaseUrl() + "/stores/" + encodeURIComponent(handle) + "/catalog",
    {
      cache: "no-store"
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("public_catalog_unavailable");
  }

  return (await response.json()) as PublicStoreCatalogResponse;
}

export async function generateMetadata({
  params
}: StorePageProps): Promise<Metadata> {
  const { handle } = await params;
  const store = await getStore(handle);

  if (!store) {
    return {
      title: "BazaarLink"
    };
  }

  return {
    title: store.name + " · BazaarLink",
    description:
      store.description ??
      "Discover " + store.name + " on BazaarLink."
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { handle } = await params;
  const [store, catalog] = await Promise.all([
    getStore(handle),
    getCatalog(handle)
  ]);

  if (!store) {
    notFound();
  }

  const locale = store.preferredLocale as SupportedLocale;
  const direction = getDirection(locale);
  const t = (key: Parameters<typeof translate>[1]) =>
    translate(locale, key);
  const products = catalog?.products ?? [];
  const categories = catalog?.categories ?? [];

  return (
    <main
      className={"storefront storefront--" + store.theme}
      dir={direction}
      lang={locale}
      style={{
        ["--store-accent" as string]: store.accentColor
      }}
    >
      {store.coverImageUrl ? (
        <div
          className="storefront__cover"
          style={{
            backgroundImage: "url(" + store.coverImageUrl + ")"
          }}
          aria-hidden="true"
        />
      ) : null}

      <section className="storefront__header">
        {store.logoUrl ? (
          <img
            className="storefront__logo"
            src={store.logoUrl}
            alt=""
          />
        ) : (
          <div className="storefront__logo storefront__logo--fallback">
            {store.name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="storefront__identity">
          <p className="storefront__eyebrow">
            {t("common.brandName")}
          </p>
          <h1>{store.name}</h1>
          {store.description ? <p>{store.description}</p> : null}
        </div>
      </section>

      <section className="storefront__facts">
        <div>
          <span>{t("storefront.categoryLabel")}</span>
          <strong>{store.category}</strong>
        </div>
        <div>
          <span>{t("storefront.locationLabel")}</span>
          <strong>
            {store.cityDistrict}, {store.province}
          </strong>
        </div>
        <div>
          <span>{t("storefront.contactLabel")}</span>
          <strong>{store.phone}</strong>
        </div>
        {store.businessHours ? (
          <div>
            <span>{t("storefront.hoursLabel")}</span>
            <strong>{store.businessHours}</strong>
          </div>
        ) : null}
      </section>

      {products.length > 0 ? (
        <section className="storefront__catalog">
          <div className="storefront__catalog-heading">
            <h2>{t("storefront.catalogTitle")}</h2>
            {categories.length > 0 ? (
              <div className="storefront__category-list">
                {categories.map((category) => (
                  <span key={category.id}>{category.name}</span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="storefront__product-grid">
            {products.map((product) => {
              const variantPrices = product.variants
                .map((variant) => variant.priceOverride)
                .filter((price): price is number => price !== null);
              const displayPrice =
                variantPrices.length > 0
                  ? Math.min(product.price, ...variantPrices)
                  : product.price;
              const hasPriceRange =
                variantPrices.some((price) => price !== product.price);
              const image = product.images[0];

              return (
                <Link
                  className="storefront__product-card"
                  href={"/product/" + product.id}
                  key={product.id}
                >
                  <div className="storefront__product-media">
                    {image ? (
                      <img
                        src={image.url}
                        alt={image.altText ?? product.name}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className="storefront__product-placeholder"
                        aria-hidden="true"
                      >
                        {product.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {product.status === "out_of_stock" ? (
                      <span className="storefront__stock-badge">
                        {t("storefront.outOfStock")}
                      </span>
                    ) : null}
                  </div>
                  <div className="storefront__product-copy">
                    {product.brand ? (
                      <p className="storefront__product-brand">
                        {product.brand}
                      </p>
                    ) : null}
                    <h3>{product.name}</h3>
                    {product.description ? (
                      <p className="storefront__product-description">
                        {product.description}
                      </p>
                    ) : null}
                    <div className="storefront__price-row">
                      <strong>
                        {hasPriceRange ? t("storefront.fromPrice") + " " : ""}
                        {formatAfn(displayPrice, locale)}
                      </strong>
                      {product.compareAtPrice ? (
                        <span>{formatAfn(product.compareAtPrice, locale)}</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="storefront__empty">
          <div className="storefront__empty-icon" aria-hidden="true">
            BL
          </div>
          <h2>{t("storefront.emptyTitle")}</h2>
          <p>{t("storefront.emptyMessage")}</p>
        </section>
      )}
    </main>
  );
}
