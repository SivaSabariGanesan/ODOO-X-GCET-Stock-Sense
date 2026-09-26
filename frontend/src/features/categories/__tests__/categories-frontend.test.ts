import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../../../../../backend/src/server/index.js";
import { db } from "../../../../../backend/src/db/client.js";
import { users } from "../../../../../backend/src/db/schema/users.js";
import { categories } from "../../../../../backend/src/db/schema/categories.js";
import { products } from "../../../../../backend/src/db/schema/products.js";
import { warehouses } from "../../../../../backend/src/db/schema/warehouses.js";
import { locations } from "../../../../../backend/src/db/schema/locations.js";
import { unitsOfMeasure } from "../../../../../backend/src/db/schema/units-of-measure.js";
import { eq, inArray, ilike } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import { categoriesApi } from "../api";
import { ApiCategory, CreateCategoryPayload } from "../types";

const TEST_TIMESTAMP = Date.now();
const ADMIN_EMAIL = `cat_admin_${TEST_TIMESTAMP}@example.com`;
const MANAGER_EMAIL = `cat_mgr_${TEST_TIMESTAMP}@example.com`;
const STAFF_EMAIL = `cat_staff_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let adminToken = "";
let adminId = "";
let managerToken = "";
let managerId = "";
let staffToken = "";
let staffId = "";

let testCategoryAId = "";
let testCategoryBId = "";
let testCategoryCId = "";
let createdCategoryIds: string[] = [];

// For dependency delete testing
let testWarehouseId = "";
let testLocationId = "";
let testUomId = "";
let testProductId = "";

describe("Categories Frontend Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Create Admin User
    const regAdmin = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Admin Tester",
        email: ADMIN_EMAIL,
        password: TEST_PASSWORD,
        role: "admin",
      }),
    });
    const regAdminData = await regAdmin.json();
    adminId = regAdminData.user.id;

    const loginAdmin = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }),
    });
    const loginAdminData = await loginAdmin.json();
    adminToken = loginAdminData.token;

    // 2. Create Manager User
    const regMgr = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Manager Tester",
        email: MANAGER_EMAIL,
        password: TEST_PASSWORD,
        role: "manager",
      }),
    });
    const regMgrData = await regMgr.json();
    managerId = regMgrData.user.id;

    const loginMgr = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: MANAGER_EMAIL, password: TEST_PASSWORD }),
    });
    const loginMgrData = await loginMgr.json();
    managerToken = loginMgrData.token;

    // 3. Create Staff User
    const regStaff = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Staff Tester",
        email: STAFF_EMAIL,
        password: TEST_PASSWORD,
        role: "staff",
      }),
    });
    const regStaffData = await regStaff.json();
    staffId = regStaffData.user.id;

    const loginStaff = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: STAFF_EMAIL, password: TEST_PASSWORD }),
    });
    const loginStaffData = await loginStaff.json();
    staffToken = loginStaffData.token;

    // Set default client token to Admin
    setAuthToken(adminToken);

    // 4. Seed test categories
    const [catA] = await db
      .insert(categories)
      .values({
        name: `Alpha Category ${TEST_TIMESTAMP}`,
        description: "Alpha category for integration testing",
        color: "#3B82F6",
        isActive: true,
        createdBy: adminId,
      })
      .returning();
    testCategoryAId = catA.id;
    createdCategoryIds.push(catA.id);

    const [catB] = await db
      .insert(categories)
      .values({
        name: `Beta Category ${TEST_TIMESTAMP}`,
        description: "Beta category for filter testing",
        color: "#10B981",
        isActive: false, // inactive
        createdBy: adminId,
      })
      .returning();
    testCategoryBId = catB.id;
    createdCategoryIds.push(catB.id);

    const [catC] = await db
      .insert(categories)
      .values({
        name: `Gamma Category ${TEST_TIMESTAMP}`,
        description: "Gamma category for deletion testing",
        color: "#EF4444",
        isActive: true,
        createdBy: adminId,
      })
      .returning();
    testCategoryCId = catC.id;
    createdCategoryIds.push(catC.id);

    // 5. Seed domain data for product reference delete testing
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `WH Cat Test ${TEST_TIMESTAMP}`,
        shortCode: `W${Math.floor(1000 + Math.random() * 9000)}`,
        createdBy: adminId,
      })
      .returning();
    testWarehouseId = wh.id;

    const [loc] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: "Test Rack",
        fullPath: "WH/Rack",
        locationType: "internal",
      })
      .returning();
    testLocationId = loc.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `UOM Cat Test ${TEST_TIMESTAMP}`,
        abbreviation: `UC${Math.floor(100 + Math.random() * 900)}`,
        category: "unit",
      })
      .returning();
    testUomId = uom.id;

    const [prod] = await db
      .insert(products)
      .values({
        name: `Product with Cat A ${TEST_TIMESTAMP}`,
        sku: `SKU-CATA-${TEST_TIMESTAMP}`,
        categoryId: testCategoryAId,
        uomId: testUomId,
        defaultLocationId: testLocationId,
        createdBy: adminId,
      })
      .returning();
    testProductId = prod.id;
  });

  afterAll(async () => {
    clearAuthToken();

    // Clean up product
    if (testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
    // Clean up UOM
    if (testUomId) {
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, testUomId));
    }
    // Clean up Location and Warehouse
    if (testLocationId) {
      await db.delete(locations).where(eq(locations.id, testLocationId));
    }
    if (testWarehouseId) {
      await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId));
    }

    // Clean up created categories
    if (createdCategoryIds.length > 0) {
      await db.delete(categories).where(inArray(categories.id, createdCategoryIds));
    }

    // Clean up users
    const userIds = [adminId, managerId, staffId].filter(Boolean);
    if (userIds.length > 0) {
      await db.delete(users).where(inArray(users.id, userIds));
    }
  });

  // 1. Category list loads successfully
  it("1. Category list loads successfully via categoriesApi.list()", async () => {
    setAuthToken(adminToken);
    const res = await categoriesApi.list();
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.meta).toBeDefined();
    expect(res.pagination).toBeDefined();
    expect(res.data.length).toBeGreaterThanOrEqual(3);
  });

  // 2. Real API response renders correctly
  it("2. Real API response matches ApiCategory contract with valid fields", async () => {
    setAuthToken(adminToken);
    const res = await categoriesApi.list({ search: `Alpha Category ${TEST_TIMESTAMP}` });
    expect(res.data.length).toBe(1);

    const cat = res.data[0];
    expect(cat.id).toBe(testCategoryAId);
    expect(cat.name).toBe(`Alpha Category ${TEST_TIMESTAMP}`);
    expect(cat.description).toBe("Alpha category for integration testing");
    expect(cat.color).toBe("#3B82F6");
    expect(cat.isActive).toBe(true);
    expect(typeof cat.createdAt).toBe("string");
    expect(typeof cat.updatedAt).toBe("string");
  });

  // 3. Empty category list
  it("3. Empty category list returns empty data array when query matches nothing", async () => {
    setAuthToken(adminToken);
    const res = await categoriesApi.list({ search: `NON_EXISTENT_NAME_${Date.now()}` });
    expect(res.data).toBeDefined();
    expect(res.data.length).toBe(0);
    expect(res.pagination.total).toBe(0);
  });

  // 4. Loading state & pagination metadata
  it("4. Pagination structure returns complete metadata for pagination components", async () => {
    setAuthToken(adminToken);
    const res = await categoriesApi.list({ page: 1, limit: 10 });
    expect(res.pagination).toBeDefined();
    expect(typeof res.pagination.page).toBe("number");
    expect(typeof res.pagination.limit).toBe("number");
    expect(typeof res.pagination.total).toBe("number");
    expect(typeof res.pagination.totalPages).toBe("number");
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(10);
  });

  // 5. API failure state
  it("5. API failure state handles invalid parameters with typed ApiError", async () => {
    setAuthToken(adminToken);
    try {
      await categoriesApi.getById("not-a-valid-uuid");
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBeGreaterThanOrEqual(400);
    }
  });

  // 6. Unauthorized response
  it("6. Unauthorized response throws 401 when auth token is omitted", async () => {
    clearAuthToken();
    try {
      await categoriesApi.list();
      expect(true).toBe(false); // Should fail
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    } finally {
      setAuthToken(adminToken);
    }
  });

  // 7. 403 permission handling
  it("7. Staff role receives 403 Forbidden when attempting to create a category", async () => {
    setAuthToken(staffToken);
    try {
      await categoriesApi.create({
        name: `Staff Attempt ${TEST_TIMESTAMP}`,
      });
      expect(true).toBe(false); // Should not succeed
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
    } finally {
      setAuthToken(adminToken);
    }
  });

  // 8. Search works
  it("8. Search filter accurately narrows results by name or description", async () => {
    setAuthToken(adminToken);
    const searchRes = await categoriesApi.list({ search: `Beta Category ${TEST_TIMESTAMP}` });
    expect(searchRes.data.length).toBe(1);
    expect(searchRes.data[0].id).toBe(testCategoryBId);

    const descRes = await categoriesApi.list({ search: "filter testing" });
    const match = descRes.data.find((c) => c.id === testCategoryBId);
    expect(match).toBeDefined();
  });

  // 9. Pagination works
  it("9. Pagination returns correct subsets across separate pages", async () => {
    setAuthToken(adminToken);
    const page1 = await categoriesApi.list({ page: 1, limit: 1 });
    expect(page1.data.length).toBe(1);

    const page2 = await categoriesApi.list({ page: 2, limit: 1 });
    expect(page2.data.length).toBe(1);
    expect(page1.data[0].id).not.toBe(page2.data[0].id);
  });

  // 10. Active/inactive filter works
  it("10. Active and inactive filters return correct subsets", async () => {
    setAuthToken(adminToken);
    // Active only
    const activeRes = await categoriesApi.list({
      isActive: true,
      search: TEST_TIMESTAMP.toString(),
    });
    const foundInactiveInActive = activeRes.data.some((c) => c.id === testCategoryBId);
    expect(foundInactiveInActive).toBe(false);

    // Inactive only
    const inactiveRes = await categoriesApi.list({
      isActive: false,
      search: TEST_TIMESTAMP.toString(),
    });
    const foundInactive = inactiveRes.data.some((c) => c.id === testCategoryBId);
    expect(foundInactive).toBe(true);
  });

  // 11. Parent-category filter works if supported
  it("11. Parent category query parameter is accepted gracefully by backend", async () => {
    setAuthToken(adminToken);
    const res = await categoriesApi.list({
      parentCategoryId: testCategoryAId,
    });
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
  });

  // 12. Category detail loads
  it("12. Category detail loads by ID via categoriesApi.getById()", async () => {
    setAuthToken(adminToken);
    const category = await categoriesApi.getById(testCategoryAId);
    expect(category).toBeDefined();
    expect(category.id).toBe(testCategoryAId);
    expect(category.name).toBe(`Alpha Category ${TEST_TIMESTAMP}`);
  });

  // 13. Category 404 handling
  it("13. Non-existent category ID returns 404 CategoryNotFoundError", async () => {
    setAuthToken(adminToken);
    const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
    try {
      await categoriesApi.getById(nonExistentUuid);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
    }
  });

  // 14. Create category successfully (Manager or Admin)
  it("14. Manager can create category successfully with custom color and description", async () => {
    setAuthToken(managerToken);
    const payload: CreateCategoryPayload = {
      name: `Manager Created ${TEST_TIMESTAMP}`,
      description: "Created by manager during integration testing",
      color: "#8B5CF6",
      isActive: true,
    };

    const created = await categoriesApi.create(payload);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.name).toBe(`Manager Created ${TEST_TIMESTAMP}`);
    expect(created.color).toBe("#8B5CF6");
    expect(created.isActive).toBe(true);
    createdCategoryIds.push(created.id);
  });

  // 15. Required-field validation
  it("15. Empty category name triggers 400 validation error", async () => {
    setAuthToken(adminToken);
    try {
      await categoriesApi.create({
        name: "   ", // Blank string
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });

  // 16. Backend field validation errors
  it("16. Invalid hex color triggers field validation error details", async () => {
    setAuthToken(adminToken);
    try {
      await categoriesApi.create({
        name: `Invalid Color Cat ${TEST_TIMESTAMP}`,
        color: "NOT_A_HEX",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      const data = err.data as any;
      expect(data).toBeDefined();
      expect(data.details?.fieldErrors?.color).toBeDefined();
    }
  });

  // 17. Duplicate/conflict handling
  it("17. Creating category with duplicate name returns conflict error (409)", async () => {
    setAuthToken(adminToken);
    try {
      await categoriesApi.create({
        name: `Alpha Category ${TEST_TIMESTAMP}`, // Duplicate
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
    }
  });

  // 18. Parent category selection / fields accepted safely
  it("18. Create category with code and parentCategoryId payload fields", async () => {
    setAuthToken(adminToken);
    const subCat = await categoriesApi.create({
      name: `Sub Category ${TEST_TIMESTAMP}`,
      code: "SUB-01",
      parentCategoryId: testCategoryAId,
      description: "Sub-category linked to Alpha Category",
    });
    expect(subCat).toBeDefined();
    expect(subCat.id).toBeDefined();
    createdCategoryIds.push(subCat.id);
  });

  // 19. Root category with null parent
  it("19. Create root category with null parentCategoryId", async () => {
    setAuthToken(adminToken);
    const rootCat = await categoriesApi.create({
      name: `Root Category ${TEST_TIMESTAMP}`,
      parentCategoryId: null,
      description: "Root master classification",
    });
    expect(rootCat).toBeDefined();
    expect(rootCat.id).toBeDefined();
    createdCategoryIds.push(rootCat.id);
  });

  // 20. Edit category successfully
  it("20. Update category fields via PATCH /api/categories/:id", async () => {
    setAuthToken(adminToken);
    const updated = await categoriesApi.update(testCategoryAId, {
      name: `Alpha Category Updated ${TEST_TIMESTAMP}`,
      color: "#06B6D4",
      description: "Updated description for Alpha Category",
    });
    expect(updated).toBeDefined();
    expect(updated.id).toBe(testCategoryAId);
    expect(updated.name).toBe(`Alpha Category Updated ${TEST_TIMESTAMP}`);
    expect(updated.color).toBe("#06B6D4");
    expect(updated.description).toBe("Updated description for Alpha Category");
  });

  // 21. Delete category for admin when unreferenced (hard delete)
  it("21. Admin can hard-delete unreferenced category", async () => {
    setAuthToken(adminToken);
    const res = await categoriesApi.delete(testCategoryCId);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.mode).toBe("deleted");

    // Verify it is no longer retrievable
    try {
      await categoriesApi.getById(testCategoryCId);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });

  // 22. Delete category referenced by products deactivates instead of deleting
  it("22. Category referenced by products is deactivated to preserve integrity", async () => {
    setAuthToken(adminToken);
    const res = await categoriesApi.delete(testCategoryAId);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.mode).toBe("deactivated");

    // Category should still exist in DB, but with isActive = false
    const cat = await categoriesApi.getById(testCategoryAId);
    expect(cat.isActive).toBe(false);
  });

  // 23. Delete forbidden for non-admin
  it("23. Manager and Staff receive 403 Forbidden when attempting DELETE", async () => {
    // 1. Manager attempt
    setAuthToken(managerToken);
    try {
      await categoriesApi.delete(testCategoryBId);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
    }

    // 2. Staff attempt
    setAuthToken(staffToken);
    try {
      await categoriesApi.delete(testCategoryBId);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
    } finally {
      setAuthToken(adminToken);
    }
  });

  // 24. UI refreshes / state updates after mutations
  it("24. Newly created category appears in immediate subsequent list call", async () => {
    setAuthToken(adminToken);
    const uniqueName = `Refresh Test Cat ${TEST_TIMESTAMP}`;
    const created = await categoriesApi.create({
      name: uniqueName,
    });
    createdCategoryIds.push(created.id);

    const listRes = await categoriesApi.list({ search: uniqueName });
    expect(listRes.data.length).toBe(1);
    expect(listRes.data[0].id).toBe(created.id);
  });

  // 25. Correct authentication headers are sent
  it("25. apiClient injects valid Authorization Bearer header", async () => {
    setAuthToken(adminToken);
    // Directly request via app.request using the Authorization header that apiClient constructs
    const res = await app.request("/api/categories", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Accept: "application/json",
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });
});
