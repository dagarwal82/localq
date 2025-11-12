import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ...existing code...
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ...existing code...
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // user or admin
  facebookId: varchar("facebook_id"),
  facebookProfileUrl: varchar("facebook_profile_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  status: text("status").notNull().default("active"), // active, sold, removed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0), // for ordering images
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  productImageOrder: uniqueIndex("unique_product_image_order").on(table.productId, table.sortOrder),
}));

export const buyerInterests = pgTable("buyer_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  buyerName: text("buyer_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  smsOptIn: boolean("sms_opt_in").notNull().default(false),
  pickupTime: timestamp("pickup_time").notNull(),
  offerPrice: integer("offer_price"), // in cents, null means free
  status: text("status").notNull().default("active"), // active, missed, completed
  position: integer("position"), // queue position, NULL for missed/completed, unique per product when active
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueActivePosition: uniqueIndex("unique_active_position")
    .on(table.productId, table.position)
    .where(sql`status = 'active'`),
}));

export const insertProductSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number().min(0).optional(),
  imageUrls: z.array(z.string()).optional(), // Array of image URLs for creating product
});

export const insertBuyerInterestSchema = createInsertSchema(buyerInterests).omit({
  id: true,
  createdAt: true,
  position: true,
}).extend({
  pickupTime: z.string().datetime(),
  offerPrice: z.number().min(0).optional().nullable(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Please enter a valid phone number in E.164 format (e.g., +12345678901)").optional().nullable(),
  email: z.string().email("Please enter a valid email address").optional().nullable(),
}).refine((data) => data.phone || data.email, {
  message: "Please provide at least one contact method (phone or email)",
  path: ["phone"],
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductImage = typeof productImages.$inferSelect;
export type Product = typeof products.$inferSelect & { images?: ProductImage[] };
export type InsertBuyerInterest = z.infer<typeof insertBuyerInterestSchema>;
export type BuyerInterest = typeof buyerInterests.$inferSelect;
