# StockSense — Excalidraw Context

> Source: StockSense 8-hour scope / Excalidraw planning diagram.
> Purpose: Use this file as implementation context for frontend/backend agents.
> Rule: Treat this document as the intended product scope. Do not add unrelated modules unless explicitly requested.

---

## 1. Product Scope

StockSense is an Odoo-style inventory operations system focused on:

- Products / SKU master data
- Stock quantities and locations
- Warehouses
- Receipts / inbound operations
- Deliveries / outbound operations
- Inventory activity / move history
- Operational dashboard

The UI should feel like modern enterprise inventory software:
- clean
- dense but readable
- operational
- data-first
- production-oriented

### Visual identity

Retain the existing StockSense visual language:

- Purple / lavender as the primary accent
- White/light neutral surfaces
- Dark readable typography
- Purple for active navigation, primary actions, selection and important interactive states
- Avoid excessive purple-filled surfaces
- Avoid gradients, glassmorphism, decorative marketing UI and unnecessary animations

---

## 2. Main Navigation

### Overview
- Dashboard

### Inventory
- Products

### Operations
- Receipts
- Deliveries
- Internal Transfers
- Inventory Adjustments
- Move History

### Configuration
- Warehouses

### Account
- Profile

Navigation should remain simple and consistent with the existing application.

---

## 3. Core Domain Relationships

The inventory system should be built around shared stock movement logic rather than isolated CRUD screens.

```text
                 ┌──────────────┐
                 │   Receipt    │
                 │   Inbound    │
                 └──────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Stock Movement│
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Location Stock│
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Product Stock │
                │   On-Hand     │
                └───────────────┘
                        ▲
                        │
                ┌───────┴───────┐
                │ Stock Movement│
                └───────┬───────┘
                        ▲
                        │
                 ┌──────┴───────┐
                 │   Delivery   │
                 │   Outbound   │
                 └──────────────┘
```

### Stock rules

- Receipt / inbound operation increases stock.
- Delivery / outbound operation decreases stock.
- Inventory adjustment changes stock according to the adjustment quantity.
- Internal transfer moves stock between locations without changing total warehouse stock.
- Product pages expose current stock.
- Location pages expose stock held at each location.
- Move History records the resulting stock movements.

---

## 4. Dashboard

### Purpose

Provide a real-time operational overview rather than an analytics-heavy dashboard.

### Main content

Operational KPI summaries such as:

- Total tracked SKUs
- Inbound receipts due
- Outbound deliveries/dispatches
- Low stock alerts

### Activity

Show a recent operational records table containing fields such as:

- Reference
- Activity Type
- Source / Destination
- Status
- Timestamp
- Actions

### Dashboard behavior

Dashboard should provide quick access into:
- Products
- Receipts
- Deliveries
- Stock-related alerts

Do not turn the dashboard into a chart-heavy analytics page.

---

## 5. Products

### Purpose

Product master catalog for SKU and inventory information.

### Product list

Expected capabilities:

- Search products
- Search by SKU
- Filter
- Group by
- View product
- Create product if supported by current implementation
- Export if already implemented

### Product table

Preferred columns:

- Product SKU
- Product Name
- On-hand
- Status
- Category
- Actions

### Product information

A product can contain concepts such as:

- SKU
- Name
- Specification
- Category
- Unit of measure
- Product lifecycle status
- Stock quantity
- Location-level stock

### Important

Do not use ambiguous workflow states such as `DONE`, `READY`, or `CONFIRMED` for product lifecycle unless those values are actually defined by the domain model.

Use appropriate product/stock terminology based on the existing backend semantics.

---

## 6. Warehouses and Locations

### Purpose

Represent the physical inventory structure.

Conceptually:

```text
Warehouse
   └── Location(s)
          └── Stock by Product
```

Example:

```text
WH01 — Main Central Warehouse
    ├── Receiving
    ├── Storage / Zone A
    ├── Storage / Zone B
    └── Dispatch
```

Keep this module lightweight for the 8-hour scope.

Do not build a full warehouse-management subsystem.

The important relationship is:

`Warehouse → Location → Product Stock`

---

## 7. Receipts

### Purpose

Manage inbound inventory operations.

### Receipt list

Show operational records such as:

- Receipt reference
- Supplier/source
- Date/time
- Status
- Quantity
- Destination/location
- Action

### Receipt detail

The detail flow should expose:

- Receipt reference
- Source / supplier
- Destination warehouse/location
- Product lines
- Quantities
- Status
- Relevant timestamps
- Confirmation/receiving action

### Core behavior

When a receipt is confirmed/received:

```text
Receipt
   ↓
Create stock movement
   ↓
Increase destination location stock
   ↓
Update product on-hand quantity
   ↓
Record movement in Move History
```

---

## 8. Deliveries

### Purpose

Manage outbound inventory operations.

### Delivery list

Show:

- Delivery reference
- Customer/destination
- Date/time
- Status
- Quantity
- Source location
- Action

### Delivery detail

Expose:

- Delivery reference
- Source warehouse/location
- Destination/customer
- Product lines
- Quantities
- Status
- Relevant timestamps
- Dispatch/validation action

### Core behavior

When a delivery is validated/dispatched:

```text
Delivery
   ↓
Create stock movement
   ↓
Decrease source location stock
   ↓
Update product on-hand quantity
   ↓
Record movement in Move History
```

---

## 9. Internal Transfers

### Purpose

Move inventory between locations.

Example:

```text
Storage Zone A
      ↓
Internal Transfer
      ↓
Storage Zone B
```

Core behavior:

- Decrease source location quantity.
- Increase destination location quantity.
- Total warehouse stock remains unchanged.
- Record the movement in Move History.

Keep the UI simple for the initial scope.

---

## 10. Inventory Adjustments

### Purpose

Correct physical-vs-system inventory discrepancies.

Example:

```text
System quantity: 120
Physical count: 116
Adjustment: -4
```

Core behavior:

- Apply positive or negative quantity adjustment.
- Update location stock.
- Update product on-hand.
- Record adjustment in Move History.

Adjustments should be clearly distinguished from receipts and deliveries.

---

## 11. Move History

### Purpose

Provide an auditable operational history of stock movements.

Expected fields:

- Movement reference
- Product
- Movement type
- Source
- Destination
- Quantity
- Date/time
- Related operation

Movement types can include:

- Receipt
- Delivery
- Internal Transfer
- Inventory Adjustment

Move History should reflect actual stock-changing operations.

---

## 12. Status Model

Statuses must reflect the actual domain semantics.

Examples:

### Receipt
- Draft
- Ready
- Received / Done

### Delivery
- Draft
- Ready
- Confirmed / Dispatched / Done

### Product
- Active
- Archived

### Stock
- In Stock
- Low Stock
- Out of Stock

Do not blindly reuse one status vocabulary across unrelated entities.

---

## 13. UX Principles

### Clean enterprise UI

Prefer:

- clear hierarchy
- whitespace
- restrained borders
- minimal shadows
- compact tables
- strong primary data
- subtle secondary metadata
- consistent spacing
- consistent control sizing

Avoid:

- excessive cards
- excessive pills
- excessive rounded containers
- decorative dashboards
- gradients
- glassmorphism
- fake controls
- development/debug information in production UI

### Purple usage

Purple should communicate interaction and state:

- active navigation
- primary CTA
- selected rows
- focus/active states
- important interactive links

Do not make every component purple.

---

## 14. 8-Hour Implementation Priority

The intended priority is:

### P0 — Core inventory flow
1. Existing project foundation
2. Product list/detail
3. Warehouse/location relationships
4. Receipt flow
5. Delivery flow
6. Stock movement updates

### P1 — Operational visibility
7. Dashboard
8. Move History
9. Inventory Adjustments
10. Internal Transfers

### P2 — Polish
11. Search/filter improvements
12. Table UX
13. Empty/loading/error states
14. Responsive behavior
15. Visual consistency

Do not spend the majority of the available implementation time on dashboard decoration before the receipt → stock → delivery flow works end-to-end.

---

## 15. End-to-End Acceptance Flow

The system should support this conceptual scenario:

```text
1. Create/identify a Product
        ↓
2. Product belongs to a Warehouse/Location
        ↓
3. Receive inventory
        ↓
4. Stock quantity increases
        ↓
5. Product On-Hand updates
        ↓
6. Move History records receipt
        ↓
7. Create/validate Delivery
        ↓
8. Stock quantity decreases
        ↓
9. Product On-Hand updates
        ↓
10. Move History records delivery
```

This end-to-end consistency is more important than adding additional screens.

---

## 16. Scope Boundary

For this implementation phase, do NOT introduce unrelated enterprise modules such as:

- Accounting
- Purchasing
- Sales CRM
- HR
- Manufacturing
- Advanced forecasting
- Complex barcode infrastructure
- Full procurement automation
- Advanced analytics

Only extend the scope when explicitly requested.

---

## 17. Implementation Rule

Before modifying UI terminology or business behavior:

1. Inspect existing frontend components/types.
2. Inspect existing backend routes/services.
3. Inspect the database/schema.
4. Preserve existing domain semantics.
5. Reuse existing APIs and components where possible.
6. Do not create fake data or fake workflows merely to make the UI look complete.

The diagram represents the intended product flow; the existing codebase remains the source of truth for what is already implemented.


---

# 18. Confirmed 8-Hour UI Flow + Team Architecture

> This section reconciles the Excalidraw/8-hour planning diagram with the current implementation approach.
> The diagram is treated as the intended UI flow; the backend architecture below is the implementation boundary.

## 18.1 Confirmed screens and entry behavior

The planning diagram confirms these primary operational screens:

- Dashboard
- Products / Stock
- Warehouses
- Locations
- Receipts
- Receipt detail
- Deliveries
- Delivery detail
- Move History

The diagram explicitly emphasizes list-first behavior for operational modules:

```text
Operations → Receipts
                ↓
          Receipt List
                ↓
          Receipt Detail

Operations → Deliveries
                ↓
          Delivery List
                ↓
          Delivery Detail

Operations → Move History
                ↓
          Move History List
```

Therefore:

- Clicking **Receipts** should land on the receipt list view.
- Clicking **Deliveries** should land on the delivery list view.
- Clicking **Move History** should land on the move-history list view.
- Detail/create screens are secondary screens reached from those operational lists.

Do not make operational navigation open directly into a detail/create form unless explicitly requested.

---

## 18.2 Confirmed UI relationship

The diagram reinforces this navigation/domain relationship:

```text
Dashboard
   │
   ├── Products / Stock
   │       └── Product stock / on-hand
   │
   ├── Warehouses
   │       └── Locations
   │
   ├── Receipts
   │       └── Receipt Detail
   │
   ├── Deliveries
   │       └── Delivery Detail
   │
   └── Move History
           └── Stock movement records
```

The important implementation principle is:

```text
UI screen
   ↓
API
   ↓
Service
   ↓
Stock engine
   ↓
Stock balance + movement history
```

The screens are not independent CRUD islands.

---

## 18.3 Stock/Product terminology

The planning diagram uses a stock-oriented view where users can see product-level quantities such as on-hand stock.

Implementation should distinguish:

```text
Product master
      +
Location-level stock
      ↓
Product On-Hand
```

`Product On-Hand` is a derived/current inventory view, not a second independent stock source.

The authoritative current quantity remains the location-level stock balance.

Do not introduce a separate manually maintained global stock field merely because the UI displays "On-hand".

---

## 18.4 Warehouse and Location UI

The diagram shows lightweight configuration forms for:

### Warehouse

Conceptually:

```text
Name
Code
Address
```

### Location

Conceptually:

```text
Name
Short Code
Warehouse
```

These screens should remain lightweight for the 8-hour implementation.

Do not turn them into a full warehouse-management subsystem.

The backend may support additional fields required by the existing schema, but the UI should prioritize the fields shown/needed by the intended flow.

---

## 18.5 Receipt UI flow

The intended receipt experience is list-first:

```text
Receipts
   ↓
Receipt List
   ↓
Select Receipt
   ↓
Receipt Detail
   ↓
Confirm / Receive
   ↓
Stock Movement
   ↓
Location Stock increases
   ↓
Move History updated
```

The receipt detail should make the operational data understandable:

- Reference
- Supplier/source
- Date
- Destination warehouse/location
- Product lines
- Quantities
- Status
- Action to confirm/receive

Creating a receipt and receiving it are separate concepts.

Do not increase stock merely because a draft receipt was created.

---

## 18.6 Delivery UI flow

The intended delivery experience is also list-first:

```text
Deliveries
   ↓
Delivery List
   ↓
Select Delivery
   ↓
Delivery Detail
   ↓
Validate / Dispatch
   ↓
Stock Movement
   ↓
Location Stock decreases
   ↓
Move History updated
```

The delivery detail should expose:

- Reference
- Customer/destination
- Source warehouse/location
- Date
- Product lines
- Quantities
- Status
- Dispatch/validation action

Do not decrease stock when a delivery is merely created as a draft.

---

## 18.7 Move History UI

The diagram treats Move History as an operational list.

Primary view:

```text
Move History List
```

The list should make stock changes auditable at a glance.

Recommended information:

- Reference
- Product
- Movement type
- Source
- Destination
- Quantity
- Date/time
- Related operation
- User where available

Move History must be backed by actual stock-changing operations.

Do not populate it with independent mock activity records once backend integration begins.

---

# 19. Agreed 3-Member Ownership Model

The team is intentionally reduced to three members.

## Member 1 — Core Backend + Database

Owns:

- Backend foundation
- Database schema/migrations
- PostgreSQL + Drizzle setup
- Users
- Password reset OTPs
- Authentication
- Product CRUD
- Categories
- Units of Measure
- Warehouses
- Locations
- Reordering Rules
- Stock Balances
- Inventory/stock foundation services
- Stock ledger foundation
- Core API contracts

Member 1 owns the authoritative stock engine.

Core services should conceptually include:

```text
InventoryService
StockBalanceService
StockLedgerService
```

Member 1 does NOT own:

- Receipt workflow
- Delivery workflow
- Internal transfer workflow
- Adjustment workflow
- Frontend

---

## Member 2 — Operations Backend

Owns:

- Suppliers
- Receipts
- Receipt Items
- Deliveries
- Delivery Items
- Internal Transfers
- Internal Transfer Items
- Inventory Adjustments
- Inventory Adjustment Items
- Operation statuses/transitions
- Operation validation
- Stock-operation integration
- Low-stock/reorder evaluation where required by the backend
- Operation backend tests

Member 2 consumes Member 1's stock services.

```text
ReceiptService
DeliveryService
TransferService
AdjustmentService
        │
        ▼
InventoryService
        │
        ├── Stock Balance
        └── Stock Ledger
```

Member 2 must not create an independent stock calculation system.

Member 2 does NOT own:

- Authentication
- Product CRUD
- Warehouse CRUD
- Main frontend
- UI business logic

---

## Member 3 — Full Frontend + Integration

Owns the complete frontend.

### Application shell

- Sidebar
- Header
- Routing
- Responsive layout
- Shared components
- Forms
- Tables
- Dialogs
- Toasts
- Loading/empty/error states

### Core UI

- Login
- Signup
- OTP password reset
- Profile
- Logout
- Dashboard
- Products / Stock
- Categories
- Warehouses
- Locations
- Reordering Rules

### Operations UI

- Receipts
- Receipt detail/create
- Deliveries
- Delivery detail/create
- Internal Transfers
- Inventory Adjustments
- Move History

### Integration

Member 3 integrates with both backend members.

```text
Member 1 APIs
       +
Member 2 APIs
       ↓
Complete Frontend
```

The frontend must not:

- calculate authoritative stock
- create ledger records directly
- enforce backend business rules as the source of truth
- use fake API responses to conceal missing backend functionality

Frontend validation is for user feedback; backend validation remains authoritative.

---

# 20. Three-Member Development Sequence

The implementation should be dependency-driven rather than purely screen-driven.

## Phase A — Foundation

### Member 1

- Backend structure
- Database connection
- Drizzle schema
- Migrations
- Auth foundation
- Core domain schema
- Stock balance foundation

### Member 2

- Operations schema
- Suppliers
- Receipt/delivery/transfer/adjustment schema
- API contract alignment with Member 1

### Member 3

- Frontend project setup
- Routing
- Design system
- Application shell
- Authentication screens

---

## Phase B — Core Inventory

### Member 1

- Products
- Categories
- UOM
- Warehouses
- Locations
- Reordering Rules
- Stock balances
- Inventory services

### Member 2

- Prepare operation services against Member 1's inventory contracts.

### Member 3

- Products/Stock UI
- Warehouse UI
- Location UI
- Category UI
- Reordering Rules UI

---

## Phase C — Stock Operations

### Member 1

Finalize:

```text
InventoryService
StockBalanceService
StockLedgerService
Transactional stock updates
```

### Member 2

Implement:

```text
Suppliers
Receipts
Deliveries
Internal Transfers
Inventory Adjustments
```

### Member 3

Implement:

```text
Receipt list/detail
Delivery list/detail
Transfer UI
Adjustment UI
```

---

## Phase D — Visibility

### Member 1

Provide:

- Dashboard inventory APIs
- Product stock summaries
- Low-stock/out-of-stock calculations

### Member 2

Provide:

- Operation list APIs
- Move History API
- Movement filtering

### Member 3

Implement:

- Dashboard
- Move History
- Search/filter UX
- Real API integration

---

## Phase E — End-to-End Hardening

All members verify:

```text
Create Product
      ↓
Receive Stock
      ↓
Location Stock Updated
      ↓
Product On-Hand Updated
      ↓
Move History Updated
      ↓
Transfer Stock
      ↓
Delivery Stock
      ↓
Adjustment
```

No fake data should remain in production paths.

---

# 21. 8-Hour Priority Adjustment

The diagram and architecture together imply that the team should prioritize the operational stock loop over secondary screens.

## P0 — Must work

```text
Product
  ↓
Warehouse / Location
  ↓
Receipt
  ↓
Stock Increase
  ↓
Move History
  ↓
Delivery
  ↓
Stock Decrease
```

## P1 — Required operational coverage

```text
Internal Transfer
Inventory Adjustment
Dashboard
```

## P2 — Polish

```text
Search
Filters
Pagination
Loading states
Empty states
Error states
Responsive behavior
Visual consistency
```

If time becomes constrained, do not sacrifice the real stock mutation flow merely to complete decorative dashboard work.

---

# 22. Architecture Rules Confirmed by the Plan

### One stock engine

There must be exactly one authoritative inventory mutation path:

```text
                    InventoryService
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
       Stock Balance   Stock Ledger   Validation
             ▲
             │
      ┌──────┴───────┐
      │              │
   Receipt        Delivery
   Transfer       Adjustment
```

### One source of truth

```text
Location-level Stock Balance
          ↓
      Product On-Hand
```

Product On-Hand is derived from location balances.

### Atomic stock operations

Every stock-changing operation must update:

```text
Operation status
+
Stock balance
+
Movement ledger
```

inside the same transaction where applicable.

### List-first operational navigation

```text
Receipts → Receipt List
Deliveries → Delivery List
Move History → Move History List
```

### Backend authority

Frontend never becomes the authority for:

- stock quantity
- stock availability
- operation validity
- status transitions
- ledger creation
- authorization

---

# 23. Final Scope Guard

The 8-hour diagram does NOT justify adding:

- Accounting
- Purchasing
- Sales CRM
- HR
- Manufacturing
- AI/ML
- Forecasting
- Advanced analytics
- Barcode infrastructure
- Complex notifications
- Full procurement automation
- Full warehouse-management functionality

Keep the implementation centered on:

```text
Products
Warehouses
Locations
Receipts
Deliveries
Transfers
Adjustments
Stock
Move History
Dashboard
Authentication
```

The goal is a small but real inventory operations system, not a miniature ERP.

---

# 24. Final Acceptance Flow

The strongest acceptance test is the end-to-end stock lifecycle:

```text
Initial:
Steel = 0 KG

        ↓

Receipt:
+100 KG

        ↓

Warehouse:
100 KG

        ↓

Internal Transfer:
40 KG → Production

        ↓

Warehouse:
60 KG
Production:
40 KG
Global:
100 KG

        ↓

Delivery:
20 KG from Warehouse

        ↓

Warehouse:
40 KG
Production:
40 KG
Global:
80 KG

        ↓

Adjustment:
-3 KG from Warehouse

        ↓

Warehouse:
37 KG
Production:
40 KG
Global:
77 KG
```

Move History must explain every stock change.

The exact source/destination/location values must come from the operations entered during the demo rather than being hardcoded.
