import { type Product, type InsertProduct, type BuyerInterest, type InsertBuyerInterest, type User, type UpsertUser, products, buyerInterests, users, productImages } from "@shared/schema";
import { db } from "./db";
import { eq, lt, and, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // Referenced from blueprint:javascript_log_in_with_replit integration for user authentication
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  
  // Products
  getAllProducts(): Promise<Product[]>;
  getProductsByUser(userId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(userId: string, product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  
  // Buyer Interests
  getAllBuyerInterests(): Promise<BuyerInterest[]>;
  getBuyerInterestsByProduct(productId: string): Promise<BuyerInterest[]>;
  createBuyerInterest(interest: InsertBuyerInterest): Promise<BuyerInterest>;
  updateBuyerInterest(id: string, updates: Partial<BuyerInterest>): Promise<BuyerInterest | undefined>;
  updateMissedStatuses(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Referenced from blueprint:javascript_log_in_with_replit integration for user authentication
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllProducts(): Promise<(Product & { images: typeof productImages.$inferSelect[] })[]> {
    const productsData = await db.select().from(products).orderBy(desc(products.createdAt));
    
    const productIds = productsData.map(p => p.id);
    const images = await db
      .select()
      .from(productImages)
      .where(sql`${productImages.productId} = ANY(${productIds})`)
      .orderBy(asc(productImages.sortOrder));

    return productsData.map(product => ({
      ...product,
      images: images.filter(img => img.productId === product.id),
    }));
  }

  async getProductsByUser(userId: string): Promise<(Product & { images: typeof productImages.$inferSelect[] })[]> {
    const productsData = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId))
      .orderBy(desc(products.createdAt));

    const productIds = productsData.map(p => p.id);
    const images = await db
      .select()
      .from(productImages)
      .where(sql`${productImages.productId} = ANY(${productIds})`)
      .orderBy(asc(productImages.sortOrder));

    return productsData.map(product => ({
      ...product,
      images: images.filter(img => img.productId === product.id),
    }));
  }

  async getProduct(id: string): Promise<(Product & { images: typeof productImages.$inferSelect[] }) | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return undefined;

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder));

    return { ...product, images };
  }

  async createProduct(userId: string, insertProduct: InsertProduct): Promise<Product & { images: typeof productImages.$inferSelect[] }> {
    const { imageUrls, title, description, price } = insertProduct;
    return await db.transaction(async (tx) => {
      // Create the product first
      const [product] = await tx
        .insert(products)
        .values({
          userId,
          title,
          description,
          price: price || 0,
        })
        .returning();

      // Initialize images array
      const images: typeof productImages.$inferSelect[] = [];

      // If there are image URLs, add them as product images
      if (imageUrls && imageUrls.length > 0) {
        const insertedImages = await tx.insert(productImages).values(
          imageUrls.map((imageUrl, index) => ({
            productId: product.id,
            imageUrl,
            sortOrder: index,
          }))
        ).returning();

        images.push(...insertedImages);
      }

      return { ...product, images };
    });
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getAllBuyerInterests(): Promise<BuyerInterest[]> {
    return await db.select().from(buyerInterests).orderBy(asc(buyerInterests.createdAt));
  }

  async getBuyerInterestsByProduct(productId: string): Promise<BuyerInterest[]> {
    return await db
      .select()
      .from(buyerInterests)
      .where(eq(buyerInterests.productId, productId))
      .orderBy(
        sql`CASE ${buyerInterests.status} WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END`,
        sql`${buyerInterests.position} NULLS LAST`
      );
  }

  async createBuyerInterest(insertInterest: InsertBuyerInterest): Promise<BuyerInterest> {
    try {
      return await db.transaction(async (tx) => {
        await tx
          .select()
          .from(products)
          .where(eq(products.id, insertInterest.productId))
          .for('update');

        const duplicateConditions = [];
        if (insertInterest.phone) {
          duplicateConditions.push(eq(buyerInterests.phone, insertInterest.phone));
        }
        if (insertInterest.email) {
          duplicateConditions.push(eq(buyerInterests.email, insertInterest.email));
        }

        if (duplicateConditions.length > 0) {
          const [existingBuyer] = await tx
            .select()
            .from(buyerInterests)
            .where(
              and(
                eq(buyerInterests.productId, insertInterest.productId),
                eq(buyerInterests.status, "active"),
                sql`(${sql.join(duplicateConditions, sql` OR `)})`
              )
            )
            .limit(1);

          if (existingBuyer) {
            throw new Error("You're already in the queue for this item with this contact information");
          }
        }

        const activeInterests = await tx
          .select()
          .from(buyerInterests)
          .where(
            and(
              eq(buyerInterests.productId, insertInterest.productId),
              eq(buyerInterests.status, "active")
            )
          )
          .orderBy(desc(buyerInterests.position))
          .limit(1)
          .for('update');
        
        const position = activeInterests.length > 0 && activeInterests[0].position !== null
          ? activeInterests[0].position + 1
          : 0;

        const [interest] = await tx
          .insert(buyerInterests)
          .values({
            ...insertInterest,
            pickupTime: new Date(insertInterest.pickupTime),
            position,
          })
          .returning();
        return interest;
      });
    } catch (error) {
      console.error('Failed to create buyer interest:', error);
      throw error;
    }
  }

  async updateBuyerInterest(id: string, updates: Partial<BuyerInterest>): Promise<BuyerInterest | undefined> {
    const [updated] = await db
      .update(buyerInterests)
      .set(updates)
      .where(eq(buyerInterests.id, id))
      .returning();
    return updated || undefined;
  }

  async updateMissedStatuses(): Promise<void> {
    const now = new Date();
    
    const missedInterests = await db
      .select()
      .from(buyerInterests)
      .where(
        and(
          eq(buyerInterests.status, "active"),
          lt(buyerInterests.pickupTime, now)
        )
      );

    const productIdsToUpdate = Array.from(new Set(missedInterests.map(i => i.productId)));

    for (const productId of productIdsToUpdate) {
      await db.transaction(async (tx) => {
        await tx
          .select()
          .from(products)
          .where(eq(products.id, productId))
          .for('update');

        await tx
          .update(buyerInterests)
          .set({ status: "missed", position: null })
          .where(
            and(
              eq(buyerInterests.productId, productId),
              eq(buyerInterests.status, "active"),
              lt(buyerInterests.pickupTime, now)
            )
          );

        const activeInterests = await tx
          .select()
          .from(buyerInterests)
          .where(
            and(
              eq(buyerInterests.productId, productId),
              eq(buyerInterests.status, "active")
            )
          )
          .orderBy(asc(buyerInterests.position));

        for (let i = 0; i < activeInterests.length; i++) {
          await tx
            .update(buyerInterests)
            .set({ position: i })
            .where(eq(buyerInterests.id, activeInterests[i].id));
        }
      });
    }
  }
}

export const storage = new DatabaseStorage();
