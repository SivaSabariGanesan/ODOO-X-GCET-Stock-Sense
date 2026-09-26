import { db } from "../../db/client";
import { categories } from "../../db/schema/categories";
import { products } from "../../db/schema/products";
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from "./types";
import {
  CategoryNotFoundError,
  DuplicateCategoryNameError,
} from "../../lib/errors";
import { eq, and, or, count, ilike } from "drizzle-orm";

export class CategoryService {
  /**
   * Create a new Category master record.
   */
  static async createCategory(
    input: CreateCategoryInput,
    userId?: string
  ) {
    // Check if category with exact name already exists (case-insensitive)
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(ilike(categories.name, input.name))
      .limit(1);

    if (existing) {
      throw new DuplicateCategoryNameError(input.name);
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? null,
        isActive: input.isActive ?? true,
        createdBy: userId ?? null,
      })
      .returning();

    return newCategory;
  }

  /**
   * Get Category by ID
   */
  static async getCategoryById(id: string) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!cat) {
      throw new CategoryNotFoundError(id);
    }

    return cat;
  }

  /**
   * List Categories with pagination and search/filtering
   */
  static async listCategories(query: ListCategoriesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.isActive !== undefined) {
      conditions.push(eq(categories.isActive, query.isActive));
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(categories.name, searchPattern),
          ilike(categories.description, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const countQuery = db.select({ total: count() }).from(categories);
    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.total ?? 0);

    // Data query
    const selectQuery = db.select().from(categories);
    if (whereClause) {
      selectQuery.where(whereClause);
    }

    const data = await selectQuery
      .orderBy(categories.name)
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update Category master record
   */
  static async updateCategory(
    id: string,
    input: UpdateCategoryInput,
    userId?: string
  ) {
    const existing = await this.getCategoryById(id);

    if (input.name !== undefined && input.name.toLowerCase() !== existing.name.toLowerCase()) {
      const [duplicate] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(ilike(categories.name, input.name), eq(categories.id, id).not))
        .limit(1);

      if (duplicate) {
        throw new DuplicateCategoryNameError(input.name);
      }
    }

    const updateData: Partial<typeof categories.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete or deactivate Category depending on Product references
   */
  static async deleteCategory(id: string): Promise<{ success: boolean; message: string; mode: "deleted" | "deactivated" }> {
    const category = await this.getCategoryById(id);

    // Check if any product references this category
    const [productRef] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(1);

    if (productRef) {
      // Category is referenced by products: deactivate instead of hard-deleting
      await db
        .update(categories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(categories.id, id));

      return {
        success: true,
        message: `Category '${category.name}' is referenced by products and was deactivated to preserve data integrity.`,
        mode: "deactivated",
      };
    }

    // Unreferenced: safe to hard delete
    await db.delete(categories).where(eq(categories.id, id));

    return {
      success: true,
      message: `Category '${category.name}' deleted successfully.`,
      mode: "deleted",
    };
  }
}
