import type { PublicStoreRecord } from "@bazaarlink/contracts";
import {
  getDirection,
  translate,
  type SupportedLocale
} from "@bazaarlink/localization";
import type { Metadata } from "next";
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
  const store = await getStore(handle);

  if (!store) {
    notFound();
  }

  const locale = store.preferredLocale as SupportedLocale;
  const direction = getDirection(locale);
  const t = (key: Parameters<typeof translate>[1]) =>
    translate(locale, key);

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
          // eslint-disable-next-line @next/next/no-img-element
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

      <section className="storefront__empty">
        <div className="storefront__empty-icon" aria-hidden="true">
          BL
        </div>
        <h2>{t("storefront.emptyTitle")}</h2>
        <p>{t("storefront.emptyMessage")}</p>
      </section>
    </main>
  );
}
