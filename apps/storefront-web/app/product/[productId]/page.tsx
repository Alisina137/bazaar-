import type {
  MarketplaceProductDetailResponse,
  ProductReviewsResponse
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

interface ProductPageProps {
  params: Promise<{
    productId: string;
  }>;
}

function apiBaseUrl() {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

async function getReviews(
  productId: string
): Promise<ProductReviewsResponse | null> {
  const response = await fetch(
    apiBaseUrl() +
      "/trust/products/" +
      encodeURIComponent(productId) +
      "/reviews",
    { cache: "no-store" }
  );
  if (!response.ok) return null;
  return (await response.json()) as ProductReviewsResponse;
}

async function getProduct(
  productId: string
): Promise<MarketplaceProductDetailResponse | null> {
  const response = await fetch(
    apiBaseUrl() +
      "/marketplace/products/" +
      encodeURIComponent(productId),
    { cache: "no-store" }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("public_product_unavailable");
  }

  return (await response.json()) as MarketplaceProductDetailResponse;
}

export async function generateMetadata({
  params
}: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const data = await getProduct(productId);

  if (!data) {
    return {
      title: "BazaarLink"
    };
  }

  return {
    title: data.product.name + " · BazaarLink",
    description:
      data.product.description ??
      "Discover " +
        data.product.name +
        " from " +
        data.product.store.name +
        " on BazaarLink.",
    openGraph: {
      title: data.product.name,
      description:
        data.product.description ??
        data.product.store.name,
      images: data.product.imageUrl
        ? [{ url: data.product.imageUrl }]
        : undefined
    }
  };
}

export default async function ProductPage({
  params
}: ProductPageProps) {
  const { productId } = await params;
  const [data, reviews] = await Promise.all([
    getProduct(productId),
    getReviews(productId)
  ]);

  if (!data) {
    notFound();
  }

  const product = data.product;
  const locale = product.store.preferredLocale as SupportedLocale;
  const direction = getDirection(locale);
  const t = (key: Parameters<typeof translate>[1]) =>
    translate(locale, key);

  return (
    <main
      className="product-page"
      dir={direction}
      lang={locale}
    >
      <nav className="product-page__nav">
        <Link href={"/store/" + product.store.handle}>
          {product.store.name}
        </Link>
        <span>·</span>
        <span>{t("common.brandName")}</span>
      </nav>

      <section className="product-page__hero">
        <div className="product-page__gallery">
          {product.images.length > 0 ? (
            product.images.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.altText ?? product.name}
                loading="lazy"
                decoding="async"
              />
            ))
          ) : product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
            />
          ) : (
            <div className="product-page__placeholder">
              {product.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="product-page__summary">
          {product.brand ? (
            <p className="product-page__brand">{product.brand}</p>
          ) : null}
          <h1>{product.name}</h1>

          <div className="product-page__price">
            <strong>{formatAfn(product.price, locale)}</strong>
            {product.hasDiscount &&
            product.compareAtPrice !== null ? (
              <span>
                {formatAfn(product.compareAtPrice, locale)}
              </span>
            ) : null}
          </div>

          <p
            className={
              product.inStock
                ? "product-page__stock product-page__stock--available"
                : "product-page__stock"
            }
          >
            {product.inStock
              ? t("marketplace.inStock")
              : t("marketplace.outOfStock")}
          </p>

          {product.variants.length > 0 ? (
            <div className="product-page__variants">
              <h2>{t("marketplace.product.variants")}</h2>
              <div>
                {product.variants.map((variant) => (
                  <span key={variant.id}>
                    {variant.title}
                    {variant.priceOverride !== null
                      ? " · " +
                        formatAfn(variant.priceOverride, locale)
                      : ""}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="product-page__seller">
            <span>{t("marketplace.product.seller")}</span>
            <Link href={"/store/" + product.store.handle}>
              {product.store.name}
            </Link>
            <p>
              {product.store.cityDistrict}, {product.store.province}
            </p>
            <p>
              {product.store.trust.phoneVerified
                ? t("trust.phoneVerified")
                : t("trust.phoneNotVerified")}
            </p>
            <small>{t("trust.planNotVerification")}</small>
          </div>

          {product.description ? (
            <div className="product-page__description">
              <h2>{t("marketplace.product.description")}</h2>
              <p>{product.description}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="product-page__related">
        <h2>{t("review.summary")}</h2>
        {reviews && reviews.summary.averageRating !== null ? (
          <p>
            {"★ " +
              reviews.summary.averageRating +
              " · " +
              reviews.summary.reviewCount +
              " " +
              t("marketplace.reviewsCount")}
          </p>
        ) : null}
        {!reviews || reviews.reviews.length === 0 ? (
          <p>{t("review.noReviews")}</p>
        ) : (
          <div className="storefront__product-grid">
            {reviews.reviews.map((review) => (
              <article className="storefront__product-card" key={review.id}>
                <div className="storefront__product-copy">
                  <strong>{"★ " + review.rating}</strong>
                  <p>{t("trust.verifiedPurchase")}</p>
                  {review.customerDisplayName ? (
                    <h3>{review.customerDisplayName}</h3>
                  ) : null}
                  {review.text ? <p>{review.text}</p> : null}
                  {review.imageUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                  {review.merchantResponse ? (
                    <div>
                      <strong>{t("review.merchantResponse")}</strong>
                      <p>{review.merchantResponse}</p>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {data.relatedProducts.length > 0 ? (
        <section className="product-page__related">
          <h2>{t("marketplace.product.related")}</h2>
          <div className="storefront__product-grid">
            {data.relatedProducts.map((related) => (
              <Link
                className="storefront__product-card product-page__related-card"
                href={"/product/" + related.id}
                key={related.id}
              >
                <div className="storefront__product-media">
                  {related.imageUrl ? (
                    <img
                      src={related.imageUrl}
                      alt={related.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="storefront__product-placeholder">
                      {related.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="storefront__product-copy">
                  <h3>{related.name}</h3>
                  <strong>{formatAfn(related.price, locale)}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
