# StockSense Backend API Integration Documentation

> **Target Audience**: Frontend Engineering Team (Member 3 / UI Developers)  
> **Backend Architecture**: Bun + Hono + Drizzle ORM + PostgreSQL  
> **Base URL**: `http://localhost:3000` (Local Dev) / `https://api.stocksense.com` (Production)  
> **Specification Standard**: OpenAPI 3.0.0 (`/docs` or `/swagger.json`)

---

## 1. API Implementation Status

| Feature Module | API Status | Endpoint Base Path | Description |
| :--- | :--- | :--- | :--- |
| **Authentication & Auth** | Implemented | `/api/auth` | User registration, login, logout, profile (`/me`), OTP forgot & reset password. |
| **Products Master** | Implemented | `/api/products` | Complete Product CRUD with SKU, Category, UOM, stock rules, and batch tracking. |
| **Categories Master** | Implemented | `/api/categories` | Complete Category CRUD with hierarchical parent-category linking. |
| **Units of Measure (UOM)**| Implemented | `/api/uoms` | Complete UOM CRUD with measure types (`unit`, `weight`, `volume`, `length`, `time`). |
| **Warehouses Master** | Implemented | `/api/warehouses` | Complete Warehouse CRUD with address details and activation controls. |
| **Locations Master** | Implemented | `/api/locations` | Complete Location CRUD with hierarchical tree building (`/locations/tree`). |
| **Receipts (Stock In)** | Implemented | `/api/receipts` | Receipt CRUD & processing endpoint (`/receipts/:id/process`) for receiving stock. |
| **Deliveries (Stock Out)** | Implemented | `/api/deliveries` | Delivery CRUD & processing endpoint (`/deliveries/:id/process`) for issuing stock. |
| **Internal Transfers** | Implemented | `/api/transfers` | Transfer CRUD & processing endpoint (`/transfers/:id/process`) between locations. |
| **Inventory Adjustments** | Implemented | `/api/adjustments` | Adjustment CRUD & processing endpoint (`/adjustments/:id/process`) for physical counts. |
| **Reordering Rules** | Implemented | `/api/reordering-rules` | Reorder threshold CRUD linking products & locations to min/max quantities. |
| **Stock Balance** | Implemented | `/api/stock-balances` | Authoritative current stock queries, location breakdowns, and admin mutations. |
| **Stock Ledger / Movements** | Implemented | `/api/stock-movements` | Immutable audit movement history queries with date/product/location filters. |
| **Inventory Service** | Integrated | Handled in `/process` | Central orchestration engine linking operation processing to balance & ledger. |
| **Dashboard** | Implemented | `/api/dashboard` | Read-only metrics: Summary, Stock breakdown, Low-Stock items, Movements, Warehouses. |
| **WebSockets** | *Not Implemented* | N/A | Real-time push updates are **not implemented yet**. Use HTTP polling if needed. |
| **AI Features** | *Not Implemented* | N/A | AI-based demand forecasting is **not implemented yet**. |

---

## 2. Authentication Contract & Frontend Flow

### Mechanism
StockSense supports dual credential authentication:
1. **Bearer Token**: Pass JWT in header: `Authorization: Bearer <token>`
2. **HTTP-Only Cookie**: `stocksense_token` cookie set automatically on `/login`.

### Authentication Flow
```text
1. POST /api/auth/register or POST /api/auth/login
       ↓
2. Backend responds with { user, token } and sets 'stocksense_token' cookie
       ↓
3. Frontend stores 'token' in Memory / LocalStorage / AuthState
       ↓
4. Attach 'Authorization: Bearer <token>' header on all protected API requests
       ↓
5. POST /api/auth/logout clears cookie and invalidates session
```

---

## 3. Authorization & RBAC Matrix

StockSense enforces **Role-Based Access Control (RBAC)** across three system roles:
- `admin`: Full system access including master data deletion.
- `manager`: Full CRUD operations on master data, operational documents, stock balance mutations, and processing.
- `staff`: Read-only access to master data and stock levels; can create/edit draft operational documents.

### RBAC Permission Matrix

| Endpoint Group | HTTP Method | Endpoint Path | Required Role |
| :--- | :--- | :--- | :--- |
| **Auth** | POST | `/api/auth/register`, `/login`, `/forgot-password`, `/verify-otp`, `/reset-password` | Public |
| **Auth Profile** | GET / POST | `/api/auth/me`, `/logout` | Any Authenticated |
| **Products** | GET | `/api/products`, `/api/products/:id`, `/api/products/:id/stock-movements` | Any Authenticated |
| **Products** | POST / PATCH | `/api/products`, `/api/products/:id` | `admin`, `manager` |
| **Products** | DELETE | `/api/products/:id` | `admin` |
| **Categories** | GET | `/api/categories`, `/api/categories/:id` | Any Authenticated |
| **Categories** | POST / PATCH | `/api/categories`, `/api/categories/:id` | `admin`, `manager` |
| **Categories** | DELETE | `/api/categories/:id` | `admin` |
| **UOMs** | GET | `/api/uoms`, `/api/uoms/:id` | Any Authenticated |
| **UOMs** | POST / PATCH | `/api/uoms`, `/api/uoms/:id` | `admin`, `manager` |
| **UOMs** | DELETE | `/api/uoms/:id` | `admin` |
| **Warehouses** | GET | `/api/warehouses`, `/api/warehouses/:id` | Any Authenticated |
| **Warehouses** | POST / PATCH | `/api/warehouses`, `/api/warehouses/:id` | `admin`, `manager` |
| **Warehouses** | DELETE | `/api/warehouses/:id` | `admin` |
| **Locations** | GET | `/api/locations`, `/api/locations/tree`, `/api/locations/:id` | Any Authenticated |
| **Locations** | POST / PATCH | `/api/locations`, `/api/locations/:id` | `admin`, `manager` |
| **Locations** | DELETE | `/api/locations/:id` | `admin` |
| **Receipts** | GET / POST / PATCH | `/api/receipts`, `/api/receipts/:id`, `/api/receipts/:id/process` | Any Authenticated |
| **Receipts** | DELETE | `/api/receipts/:id` | `admin`, `manager` |
| **Deliveries** | GET / POST / PATCH | `/api/deliveries`, `/api/deliveries/:id`, `/api/deliveries/:id/process` | Any Authenticated |
| **Deliveries** | DELETE | `/api/deliveries/:id` | `admin`, `manager` |
| **Transfers** | GET / POST / PATCH | `/api/transfers`, `/api/transfers/:id`, `/api/transfers/:id/process` | Any Authenticated |
| **Transfers** | DELETE | `/api/transfers/:id` | `admin`, `manager` |
| **Adjustments** | GET / POST / PATCH | `/api/adjustments`, `/api/adjustments/:id`, `/api/adjustments/:id/process` | Any Authenticated |
| **Adjustments** | DELETE | `/api/adjustments/:id` | `admin`, `manager` |
| **Reorder Rules**| GET | `/api/reordering-rules`, `/api/reordering-rules/:id` | Any Authenticated |
| **Reorder Rules**| POST / PATCH / DELETE | `/api/reordering-rules`, `/api/reordering-rules/:id` | `admin`, `manager` |
| **Stock Balances**| GET | `/api/stock-balances/*` | Any Authenticated |
| **Stock Balances**| POST | `/api/stock-balances/increase`, `/decrease`, `/set` | `admin`, `manager` |
| **Stock Ledger** | GET / POST | `/api/stock-movements/*` | Any Authenticated |
| **Dashboard** | GET | `/api/dashboard/*` | Any Authenticated |

---

## 4. Error Response Contract

The backend uses a standard JSON error payload across all endpoints:

```json
{
  "error": "Human-readable primary error message",
  "details": {
    "fieldErrors": {
      "email": ["Invalid email address format"]
    }
  }
}
```

### HTTP Status Code Reference

| Status Code | Description | Frontend Handling Guidance |
| :--- | :--- | :--- |
| `200 OK` | Success | Render returned `data` object/array. |
| `201 Created` | Resource created | Show success notification; redirect/update state. |
| `400 Bad Request` | Validation failure | Display `error` message and highlight `details.fieldErrors`. |
| `401 Unauthorized` | Missing / expired token | Redirect user to `/login` screen. |
| `403 Forbidden` | Role permission denied | Toast "Access Denied: Requires higher privileges". |
| `404 Not Found` | Resource ID not found | Display 404 Empty State / Not Found component. |
| `405 Method Not Allowed` | Immutability guard triggered | Endpoint is read-only or append-only. |
| `409 Conflict` | Duplicate record / status lock | Show error message (e.g., "SKU already exists" or "Already processed"). |
| `429 Too Many Requests` | OTP rate limit exceeded | Block retry button until timer resets. |
| `500 Internal Error` | Unhandled backend exception | Show "Unexpected server error. Please try again later." |

---

## 5. Common Headers & Pagination Specification

### Standard Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Standard Pagination Response Envelope
All paginated list endpoints return both `meta` and `pagination` properties for maximum compatibility:

```json
{
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Standard Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | `1` | Page number (1-indexed). |
| `limit` | `number` | `20` | Items per page (max 100). |
| `search` | `string` | — | Case-insensitive search string across names/codes/SKUs. |
| `sortBy` | `string` | `createdAt` | Whitelisted sort column name. |
| `sortOrder` | `string` | `desc` | Ordering direction: `asc` or `desc`. |

---

## 6. Feature-by-Feature Detailed API Reference

---

### 6.1 Authentication Module (`/api/auth`)

#### 1. Register User
`POST /api/auth/register`  
**Auth**: Not required  
**Description**: Registers a new user account.

**Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "role": "manager"
}
```

**Success Response (`201 Created`)**:
```json
{
  "user": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "manager",
    "isActive": true,
    "createdAt": "2026-09-26T14:00:00.000Z",
    "updatedAt": "2026-09-26T14:00:00.000Z"
  }
}
```

#### 2. Login User
`POST /api/auth/login`  
**Auth**: Not required  
**Description**: Authenticates credentials and returns JWT bearer token while setting session cookie.

**Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```

**Success Response (`200 OK`)**:
```json
{
  "user": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "manager",
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Current User Profile
`GET /api/auth/me`  
**Auth**: Required  
**Description**: Fetches authenticated user's current session profile.

**Success Response (`200 OK`)**:
```json
{
  "user": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "manager",
    "isActive": true
  }
}
```

#### 4. Forgot Password (Request OTP)
`POST /api/auth/forgot-password`  
**Auth**: Not required  
**Description**: Generates a 6-digit OTP for password reset.

**Request Body**:
```json
{
  "email": "jane@example.com"
}
```

**Success Response (`200 OK`)**:
```json
{
  "message": "If an account with that email exists, a password reset OTP has been sent."
}
```

#### 5. Verify OTP
`POST /api/auth/verify-otp`  
**Auth**: Not required  
**Description**: Verifies if 6-digit OTP code is valid.

**Request Body**:
```json
{
  "email": "jane@example.com",
  "otp": "123456"
}
```

**Success Response (`200 OK`)**:
```json
{
  "message": "OTP verified successfully. You may now reset your password."
}
```

#### 6. Reset Password
`POST /api/auth/reset-password`  
**Auth**: Not required  
**Description**: Resets account password using verified OTP code.

**Request Body**:
```json
{
  "email": "jane@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123!"
}
```

**Success Response (`200 OK`)**:
```json
{
  "message": "Password reset successfully. Please log in with your new password."
}
```

---

### 6.2 Products Module (`/api/products`)

#### 1. List Products
`GET /api/products`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `search`, `categoryId`, `uomId`, `isActive`, `isBatchTracked`, `sortBy`, `sortOrder`.

**Success Response (`200 OK`)**:
```json
{
  "data": [
    {
      "id": "c8f4ny4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "sku": "STEEL-BAR-10",
      "name": "Steel Rod 10mm",
      "description": "High tensile steel rod",
      "categoryId": "7a1e0b4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "uomId": "1b9e0b4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "barcode": "8901234567890",
      "minStockLevel": "50.0000",
      "maxStockLevel": "500.0000",
      "reorderPoint": "100.0000",
      "isBatchTracked": false,
      "isActive": true,
      "createdAt": "2026-09-26T14:00:00.000Z",
      "category": { "id": "7a1e0b4d...", "name": "Raw Metals" },
      "uom": { "id": "1b9e0b4d...", "name": "Kilogram", "abbreviation": "kg" }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

#### 2. Create Product
`POST /api/products`  
**Auth**: Required (`admin`, `manager`)

**Request Body**:
```json
{
  "sku": "STEEL-BAR-10",
  "name": "Steel Rod 10mm",
  "description": "High tensile steel rod",
  "categoryId": "7a1e0b4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "uomId": "1b9e0b4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "barcode": "8901234567890",
  "minStockLevel": 50,
  "maxStockLevel": 500,
  "reorderPoint": 100,
  "isBatchTracked": false
}
```

**Success Response (`201 Created`)**: Returns created Product object.

---

### 6.3 Categories Module (`/api/categories`)

#### 1. List Categories
`GET /api/categories`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `search`, `isActive`, `parentCategoryId`.

**Success Response (`200 OK`)**: Returns array of categories with nested `parentCategory`.

#### 2. Create Category
`POST /api/categories`  
**Auth**: Required (`admin`, `manager`)

**Request Body**:
```json
{
  "name": "Raw Metals",
  "code": "RAW-MET",
  "description": "Raw metallic materials",
  "parentCategoryId": null
}
```

---

### 6.4 Units of Measure Module (`/api/uoms`)

#### 1. List UOMs
`GET /api/uoms`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `search`, `isActive`, `measureType`.

**Success Response (`200 OK`)**: Returns list of units of measure (e.g. Kilogram, Piece, Liter).

#### 2. Create UOM
`POST /api/uoms`  
**Auth**: Required (`admin`, `manager`)

**Request Body**:
```json
{
  "name": "Kilogram",
  "abbreviation": "kg",
  "measureType": "weight"
}
```

---

### 6.5 Warehouses Module (`/api/warehouses`)

#### 1. List Warehouses
`GET /api/warehouses`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `search`, `isActive`.

#### 2. Create Warehouse
`POST /api/warehouses`  
**Auth**: Required (`admin`, `manager`)

**Request Body**:
```json
{
  "name": "Central Storage WH",
  "shortCode": "WH-MAIN",
  "address": "123 Logistics Way",
  "city": "Industrial City",
  "state": "State",
  "postalCode": "12345",
  "country": "Country"
}
```

---

### 6.6 Locations Module (`/api/locations`)

#### 1. List Locations
`GET /api/locations`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `warehouseId`, `locationType`, `parentLocationId`, `search`, `isActive`.

#### 2. Get Location Hierarchy Tree
`GET /api/locations/tree?warehouseId=<uuid>`  
**Auth**: Required  
**Description**: Returns nested tree of locations (Warehouse -> Storage Zones -> Aisles -> Racks -> Shelves).

#### 3. Create Location
`POST /api/locations`  
**Auth**: Required (`admin`, `manager`)

**Request Body**:
```json
{
  "warehouseId": "warehouse-uuid",
  "name": "Rack A1",
  "locationType": "internal",
  "parentLocationId": "zone-a-uuid",
  "isScrapLocation": false
}
```

---

### 6.7 Receipts Module (`/api/receipts`)

#### 1. List Receipts
`GET /api/receipts`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `warehouseId`, `status` (`DRAFT`, `WAITING`, `READY`, `DONE`, `CANCELED`), `supplierName`, `search`, `fromDate`, `toDate`.

#### 2. Create Receipt
`POST /api/receipts`  
**Auth**: Required

**Request Body**:
```json
{
  "supplierName": "SteelCo Inc",
  "warehouseId": "warehouse-uuid",
  "defaultLocationId": "location-uuid",
  "notes": "Purchase order PO-9912",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 100,
      "unitPrice": 15.5,
      "destinationLocationId": "location-uuid"
    }
  ]
}
```

#### 3. Process Receipt (Stock In Orchestration)
`POST /api/receipts/:id/process`  
**Auth**: Required  
**Description**: Atomically processes receipt in database transaction: updates `stock_balances` (+100) and appends `stock_movements` record. Marks receipt status = `"DONE"`.

**Success Response (`200 OK`)**: Returns updated receipt object.

---

### 6.8 Deliveries Module (`/api/deliveries`)

#### 1. Create Delivery
`POST /api/deliveries`  
**Auth**: Required

**Request Body**:
```json
{
  "customerName": "Acme Corp",
  "customerReference": "SO-4410",
  "warehouseId": "warehouse-uuid",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 25,
      "sourceLocationId": "location-uuid"
    }
  ]
}
```

#### 2. Process Delivery (Stock Out Orchestration)
`POST /api/deliveries/:id/process`  
**Auth**: Required  
**Description**: Atomically checks stock availability, decreases `stock_balances` (-25), and logs `stock_movements`. Rejects with `400 InsufficientStockError` if requested qty > available qty.

---

### 6.9 Internal Transfers Module (`/api/transfers`)

#### 1. Create Internal Transfer
`POST /api/transfers`  
**Auth**: Required

**Request Body**:
```json
{
  "sourceLocationId": "source-location-uuid",
  "destinationLocationId": "dest-location-uuid",
  "notes": "Move raw steel to production area",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 30
    }
  ]
}
```

#### 2. Process Transfer
`POST /api/transfers/:id/process`  
**Auth**: Required  
**Description**: Decrements source location balance (-30), increments destination location balance (+30), and logs transfer movement connecting source and destination locations.

---

### 6.10 Inventory Adjustments Module (`/api/adjustments`)

#### 1. Create Inventory Adjustment
`POST /api/adjustments`  
**Auth**: Required

**Request Body**:
```json
{
  "locationId": "location-uuid",
  "reason": "Annual physical cycle count",
  "items": [
    {
      "productId": "product-uuid",
      "countedQuantity": 95
    }
  ]
}
```

#### 2. Process Inventory Adjustment
`POST /api/adjustments/:id/process`  
**Auth**: Required  
**Description**: Resolves current system quantity, updates balance to physical count (`95`), and logs net movement difference (+ or -).

---

### 6.11 Reordering Rules Module (`/api/reordering-rules`)

#### 1. List Reordering Rules
`GET /api/reordering-rules`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `productId`, `locationId`, `warehouseId`, `isActive`, `lowStockOnly`.

#### 2. Create Reordering Rule
`POST /api/reordering-rules`  
**Auth**: Required (`admin`, `manager`)

**Request Body**:
```json
{
  "productId": "product-uuid",
  "locationId": "location-uuid",
  "minQuantity": 50,
  "maxQuantity": 200,
  "reorderQty": 50
}
```

---

### 6.12 Stock Balance Module (`/api/stock-balances`)

#### 1. List Stock Balances
`GET /api/stock-balances`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `productId`, `warehouseId`, `locationId`, `categoryId`, `search`, `lowStock`.

#### 2. Get Stock Balance for Product/Location
`GET /api/stock-balances/check?productId=<uuid>&locationId=<uuid>`  
**Auth**: Required

#### 3. Get Product Aggregate Stock
`GET /api/stock-balances/product/:productId`  
**Auth**: Required  
**Description**: Calculates total quantity, reserved quantity, and available quantity across all locations for a product.

#### 4. Admin Stock Mutations
- `POST /api/stock-balances/increase`
- `POST /api/stock-balances/decrease`
- `POST /api/stock-balances/set`  
**Auth**: Required (`admin`, `manager`)

---

### 6.13 Stock Ledger / Move History Module (`/api/stock-movements`)

#### 1. List Stock Movements History
`GET /api/stock-movements`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `productId`, `warehouseId`, `locationId`, `sourceLocationId`, `destinationLocationId`, `movementType` (`RECEIPT`, `DELIVERY`, `TRANSFER`, `ADJUSTMENT`), `referenceType`, `referenceId`, `createdBy`, `fromDate`, `toDate`, `search`.

#### 2. Get Movement Details by ID
`GET /api/stock-movements/:id`  
**Auth**: Required

#### 3. Immutability Guards
`PUT`, `PATCH`, `DELETE` requests return `HTTP 405 Method Not Allowed`. History entries are strictly append-only.

---

### 6.14 Dashboard Module (`/api/dashboard`)

#### 1. Get Summary Metrics
`GET /api/dashboard/summary`  
**Auth**: Required  
**Response**:
```json
{
  "data": {
    "totalProducts": 42,
    "totalWarehouses": 3,
    "totalLocations": 12,
    "totalStockItems": 85,
    "lowStockCount": 4,
    "recentMovementsCount": 120,
    "stockByUom": [
      {
        "uomId": "uom-uuid",
        "uomName": "Kilogram",
        "uomAbbreviation": "kg",
        "totalQuantity": "500.0000",
        "totalReservedQuantity": "25.0000"
      }
    ]
  }
}
```

#### 2. Get Low Stock Items
`GET /api/dashboard/low-stock`  
**Auth**: Required  
**Query Parameters**: `page`, `limit`, `warehouseId`, `locationId`, `productId`, `search`.  
**Description**: Returns paginated list of items where `currentQuantity < minQuantity` (includes shortage calculations).

#### 3. Get Stock Breakdown
`GET /api/dashboard/stock`  
**Auth**: Required  

#### 4. Get Recent Movements
`GET /api/dashboard/movements`  
**Auth**: Required  

#### 5. Get Warehouse Breakdown Cards
`GET /api/dashboard/warehouses`  
**Auth**: Required  

---

## 7. Inventory Architecture & Workflow Integration

```text
Frontend Action (e.g. Click "Process Receipt")
                     │
                     ▼
       POST /api/receipts/:id/process
                     │
                     ▼
           Database Transaction (tx)
                     │
             InventoryService
             ┌───────┴───────┐
             ▼               ▼
   StockBalanceService   StockLedgerService
   (Current Stock state) (Immutable History log)
```

---

## 8. Frontend Integration Code Example

### TypeScript API Client Example
```typescript
import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("stocksense_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Example 1: Login
export async function loginUser(email, password) {
  const response = await api.post("/auth/login", { email, password });
  localStorage.setItem("stocksense_token", response.data.token);
  return response.data.user;
}

// Example 2: Get Dashboard Summary
export async function getDashboardSummary() {
  const response = await api.get("/dashboard/summary");
  return response.data.data;
}

// Example 3: Process Receipt
export async function processReceipt(receiptId: string) {
  const response = await api.post(`/receipts/${receiptId}/process`);
  return response.data.data;
}
```

---

## 9. Full Frontend Integration Reference Matrix

| Feature | Method | Endpoint Path | Auth Required | Role | Main Query / Request Body | Main Response Shape |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth Register** | POST | `/api/auth/register` | No | Public | `{ name, email, password, role }` | `{ user }` |
| **Auth Login** | POST | `/api/auth/login` | No | Public | `{ email, password }` | `{ user, token }` |
| **Auth Logout** | POST | `/api/auth/logout` | Yes | Any | Empty | `{ message }` |
| **Auth Me** | GET | `/api/auth/me` | Yes | Any | None | `{ user }` |
| **Auth Forgot Password**| POST | `/api/auth/forgot-password`| No | Public | `{ email }` | `{ message }` |
| **Auth Verify OTP** | POST | `/api/auth/verify-otp` | No | Public | `{ email, otp }` | `{ message }` |
| **Auth Reset Password** | POST | `/api/auth/reset-password` | No | Public | `{ email, otp, newPassword }` | `{ message }` |
| **List Products** | GET | `/api/products` | Yes | Any | `?page&limit&search&categoryId` | `{ data: Product[], meta }` |
| **Create Product** | POST | `/api/products` | Yes | Manager/Admin | `{ sku, name, categoryId, uomId }` | `{ data: Product }` |
| **List Categories** | GET | `/api/categories` | Yes | Any | `?page&limit&search` | `{ data: Category[], meta }` |
| **Create Category** | POST | `/api/categories` | Yes | Manager/Admin | `{ name, code, parentCategoryId }` | `{ data: Category }` |
| **List UOMs** | GET | `/api/uoms` | Yes | Any | `?page&limit&measureType` | `{ data: Uom[], meta }` |
| **List Warehouses** | GET | `/api/warehouses` | Yes | Any | `?page&limit&search` | `{ data: Warehouse[], meta }` |
| **List Locations** | GET | `/api/locations` | Yes | Any | `?page&limit&warehouseId` | `{ data: Location[], meta }` |
| **Location Tree** | GET | `/api/locations/tree` | Yes | Any | `?warehouseId` | `{ data: LocationTreeNode[] }` |
| **List Receipts** | GET | `/api/receipts` | Yes | Any | `?page&limit&status&warehouseId` | `{ data: Receipt[], meta }` |
| **Create Receipt** | POST | `/api/receipts` | Yes | Any | `{ supplierName, warehouseId, items }`| `{ data: Receipt }` |
| **Process Receipt** | POST | `/api/receipts/:id/process` | Yes | Any | Empty | `{ data: Receipt }` |
| **List Deliveries** | GET | `/api/deliveries` | Yes | Any | `?page&limit&status&warehouseId` | `{ data: Delivery[], meta }` |
| **Process Delivery** | POST | `/api/deliveries/:id/process` | Yes | Any | Empty | `{ data: Delivery }` |
| **List Transfers** | GET | `/api/transfers` | Yes | Any | `?page&limit&status` | `{ data: Transfer[], meta }` |
| **Process Transfer** | POST | `/api/transfers/:id/process` | Yes | Any | Empty | `{ data: Transfer }` |
| **List Adjustments** | GET | `/api/adjustments` | Yes | Any | `?page&limit&status` | `{ data: Adjustment[], meta }` |
| **Process Adjustment** | POST | `/api/adjustments/:id/process`| Yes | Any | Empty | `{ data: Adjustment }` |
| **Reorder Rules** | GET | `/api/reordering-rules` | Yes | Any | `?productId&locationId&lowStockOnly`| `{ data: ReorderRule[], meta }` |
| **Stock Balances** | GET | `/api/stock-balances` | Yes | Any | `?productId&warehouseId&locationId` | `{ data: StockBalance[], meta }` |
| **Stock Movements** | GET | `/api/stock-movements` | Yes | Any | `?productId&locationId&movementType`| `{ data: StockMovement[], meta }` |
| **Dashboard Summary**| GET | `/api/dashboard/summary` | Yes | Any | None | `{ data: DashboardSummary }` |
| **Dashboard Low Stock**| GET | `/api/dashboard/low-stock` | Yes | Any | `?page&limit&warehouseId` | `{ data: LowStockItem[], meta }` |
| **Dashboard Warehouses**| GET| `/api/dashboard/warehouses` | Yes | Any | None | `{ data: WarehouseSummary[] }` |

---

## 10. Non-Existent & Unimplemented Features Note

Member 3 should **NOT** implement integrations for the following features as they are **not currently implemented** on the backend:
1. **WebSockets**: No live socket connections or `/ws` endpoints exist. Use HTTP GET polling for live metrics.
2. **AI Forecasting**: No AI demand prediction APIs exist.
3. **Purchase Order Generation**: Purchase Orders are handled via Receipts (`supplierName`).
