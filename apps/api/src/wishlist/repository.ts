import { customerWishlist, type Database } from "@bazaarlink/database";
import { and, desc, eq, count } from "drizzle-orm";

export interface WishlistRepository {
  ids(userId: string): Promise<string[]>;
  contains(userId: string, productId: string): Promise<boolean>;
  add(userId: string, productId: string): Promise<void>;
  remove(userId: string, productId: string): Promise<void>;
  count(userId: string): Promise<number>;
}

export class DatabaseWishlistRepository implements WishlistRepository {
  constructor(private readonly db: Database) {}

  async ids(userId: string): Promise<string[]> {
    const rows = await this.db.select({ productId: customerWishlist.productId })
      .from(customerWishlist)
      .where(eq(customerWishlist.userId, userId))
      .orderBy(desc(customerWishlist.createdAt))
      .limit(100);
    return rows.map(row => row.productId);
  }

  async contains(userId: string, productId: string): Promise<boolean> {
    const [row] = await this.db.select({ productId: customerWishlist.productId })
      .from(customerWishlist)
      .where(and(
        eq(customerWishlist.userId, userId),
        eq(customerWishlist.productId, productId)
      ))
      .limit(1);
    return Boolean(row);
  }

  async count(userId: string): Promise<number> {
    const [row] = await this.db.select({ count: count() })
      .from(customerWishlist).where(eq(customerWishlist.userId, userId));
    return row?.count ?? 0;
  }

  async add(userId: string, productId: string): Promise<void> {
    await this.db.insert(customerWishlist).values({ userId, productId })
      .onConflictDoNothing();
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.db.delete(customerWishlist).where(and(
      eq(customerWishlist.userId, userId),
      eq(customerWishlist.productId, productId)
    ));
  }
}
