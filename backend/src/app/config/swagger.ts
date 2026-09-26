// ---------------------------------------------------------------------------
// OpenAPI 3.0.0 Specification for StockSense API
// ---------------------------------------------------------------------------

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "StockSense Inventory Management API",
    version: "1.0.0",
    description:
      "Production-grade OpenAPI and Swagger documentation for StockSense Inventory Management Backend built with Bun, Hono, Drizzle ORM, and PostgreSQL.",
    contact: {
      name: "StockSense Engineering Team",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Pass your JWT token in the Authorization header: `Bearer <token>`",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "stocksense_token",
        description: "HTTP-Only session cookie automatically set upon login",
      },
    },
    schemas: {
      SafeUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" },
          name: { type: "string", example: "Jane Doe" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          role: { type: "string", enum: ["admin", "manager", "staff"], example: "staff" },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ReceiptItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          receiptId: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          quantity: { type: "string", example: "10.5" },
          unitPrice: { type: "string", nullable: true, example: "45.00" },
          subtotal: { type: "string", nullable: true, example: "472.50" },
          notes: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Receipt: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          receiptNumber: { type: "string", example: "REC-2026-0001" },
          supplierId: { type: "string", format: "uuid" },
          warehouseId: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"], example: "DRAFT" },
          receiptDate: { type: "string", format: "date-time" },
          notes: { type: "string", nullable: true },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ReceiptItem" },
          },
        },
      },
      DeliveryItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          deliveryId: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          sourceLocationId: { type: "string", format: "uuid" },
          quantity: { type: "string", example: "5.0" },
          unitPrice: { type: "string", nullable: true, example: "120.00" },
          notes: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Delivery: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          deliveryNumber: { type: "string", example: "DEL/20260926/4897" },
          customerName: { type: "string", nullable: true, example: "Acme Corp" },
          customerReference: { type: "string", nullable: true, example: "PO-9912" },
          warehouseId: { type: "string", format: "uuid" },
          defaultSourceLocationId: { type: "string", format: "uuid", nullable: true },
          status: { type: "string", enum: ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"], example: "DRAFT" },
          notes: { type: "string", nullable: true },
          createdBy: { type: "string", format: "uuid", nullable: true },
          validatedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/DeliveryItem" },
          },
        },
      },
      InternalTransferItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          transferId: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          quantity: { type: "string", example: "25.0000" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      InternalTransfer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          transferNumber: { type: "string", example: "INT/20260926/4819" },
          notes: { type: "string", nullable: true },
          sourceLocationId: { type: "string", format: "uuid" },
          destinationLocationId: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"], example: "DRAFT" },
          createdBy: { type: "string", format: "uuid", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/InternalTransferItem" },
          },
        },
      },
      InventoryAdjustmentItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          adjustmentId: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          systemQuantity: { type: "string", example: "40.0000" },
          countedQuantity: { type: "string", example: "37.0000" },
          difference: { type: "string", example: "-3.0000" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      InventoryAdjustment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          adjustmentNumber: { type: "string", example: "ADJ/20260926/9182" },
          reason: { type: "string", nullable: true },
          locationId: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"], example: "DRAFT" },
          createdBy: { type: "string", format: "uuid", nullable: true },
          validatedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/InventoryAdjustmentItem" },
          },
        },
      },


      StockMovement: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          quantity: { type: "string", example: "10.0000" },
          movementType: { type: "string", enum: ["IN", "OUT", "INTERNAL", "ADJUSTMENT"], example: "IN" },
          referenceType: { type: "string", enum: ["RECEIPT", "DELIVERY", "TRANSFER", "ADJUSTMENT"], example: "RECEIPT" },
          referenceId: { type: "string", format: "uuid" },
          sourceLocationId: { type: "string", format: "uuid", nullable: true },
          destinationLocationId: { type: "string", format: "uuid", nullable: true },
          createdBy: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          product: { type: "object", nullable: true },
          sourceLocation: { type: "object", nullable: true },
          destinationLocation: { type: "object", nullable: true },
          creator: { type: "object", nullable: true },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Steel Bar" },
          sku: { type: "string", example: "STL-001" },
          description: { type: "string", nullable: true, example: "High tensile steel bar" },
          categoryId: { type: "string", format: "uuid", nullable: true },
          uomId: { type: "string", format: "uuid" },
          barcode: { type: "string", nullable: true, example: "890123456789" },
          imageUrl: { type: "string", nullable: true },
          isActive: { type: "boolean", example: true },
          createdBy: { type: "string", format: "uuid", nullable: true },
          updatedBy: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          category: { type: "object", nullable: true },
          uom: { type: "object", nullable: true },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Raw Materials" },
          description: { type: "string", nullable: true, example: "Primary manufacturing inputs" },
          color: { type: "string", nullable: true, example: "#3B82F6" },
          isActive: { type: "boolean", example: true },
          createdBy: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UnitOfMeasure: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Kilogram" },
          abbreviation: { type: "string", example: "kg" },
          description: { type: "string", nullable: true, example: "Unit of mass" },
          measureType: { type: "string", nullable: true, example: "weight" },
          isActive: { type: "boolean", example: true },
          createdBy: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Warehouse: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Main Central Warehouse" },
          shortCode: { type: "string", example: "WH01" },
          description: { type: "string", nullable: true, example: "Main logistics center" },
          address: { type: "string", nullable: true, example: "123 Industrial Park, Sector 4" },
          isActive: { type: "boolean", example: true },
          createdBy: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Location: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          warehouseId: { type: "string", format: "uuid" },
          parentId: { type: "string", format: "uuid", nullable: true },
          name: { type: "string", example: "Shelf A-1" },
          fullPath: { type: "string", example: "WH01 / Zone A / Shelf A-1" },
          locationType: { type: "string", enum: ["internal", "input", "output", "quality_control", "virtual"], example: "internal" },
          isActive: { type: "boolean", example: true },
          createdBy: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          warehouseName: { type: "string", nullable: true },
          warehouseShortCode: { type: "string", nullable: true },
          parentName: { type: "string", nullable: true },
          parentFullPath: { type: "string", nullable: true },
          childrenCount: { type: "integer", nullable: true },
        },
      },
      ReorderRule: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          locationId: { type: "string", format: "uuid" },
          minQuantity: { type: "string", example: "50.0000" },
          maxQuantity: { type: "string", nullable: true, example: "200.0000" },
          reorderQty: { type: "string", example: "50.0000" },
          isActive: { type: "boolean", example: true },
          createdBy: { type: "string", format: "uuid", nullable: true },
          updatedBy: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          productName: { type: "string", nullable: true },
          productSku: { type: "string", nullable: true },
          locationName: { type: "string", nullable: true },
          locationFullPath: { type: "string", nullable: true },
          warehouseId: { type: "string", format: "uuid", nullable: true },
          warehouseName: { type: "string", nullable: true },
          warehouseShortCode: { type: "string", nullable: true },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Invalid email or password" },
          details: { type: "object", nullable: true },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "API Health Check",
        description: "Returns server status and current timestamp",
        tags: ["System"],
        responses: {
          200: {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "StockSense API" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register a new user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Jane Doe" },
                  email: { type: "string", format: "email", example: "jane@example.com" },
                  password: { type: "string", format: "password", example: "Password123!" },
                  role: { type: "string", enum: ["admin", "manager", "staff"], default: "staff" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/SafeUser" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "Email already registered", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "User Login",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "jane@example.com" },
                  password: { type: "string", format: "password", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authentication successful (Sets HTTP-Only Cookie)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/SafeUser" },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1Ni..." },
                  },
                },
              },
            },
          },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Account deactivated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "User Logout",
        tags: ["Authentication"],
        responses: {
          200: {
            description: "Successfully logged out and session cookie cleared",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Logged out successfully" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Get current authenticated user profile",
        tags: ["Authentication"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: {
            description: "Authenticated user profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/SafeUser" },
                  },
                },
              },
            },
          },
          401: { description: "Authentication required / invalid token", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        summary: "Request Password Reset OTP Email",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "jane@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OTP email request acknowledged",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "If an account exists with that email, a password reset OTP has been sent." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/verify-otp": {
      post: {
        summary: "Verify 6-digit Password Reset OTP",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp"],
                properties: {
                  email: { type: "string", format: "email", example: "jane@example.com" },
                  otp: { type: "string", example: "948123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OTP verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "OTP verified successfully" },
                    valid: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          400: { description: "Invalid or expired OTP", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          429: { description: "Too many failed attempts", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        summary: "Reset Password using verified OTP",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp", "newPassword"],
                properties: {
                  email: { type: "string", format: "email", example: "jane@example.com" },
                  otp: { type: "string", example: "948123" },
                  newPassword: { type: "string", format: "password", example: "NewPassword456!" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password reset successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Password reset successfully" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid OTP or weak password", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/receipts": {
      get: {
        summary: "List Receipts",
        tags: ["Receipt Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"] } },
          { name: "supplierId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "warehouseId", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Paginated receipts list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Receipt" } },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Receipt Document",
        tags: ["Receipt Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["supplierId", "warehouseId"],
                properties: {
                  supplierId: { type: "string", format: "uuid" },
                  warehouseId: { type: "string", format: "uuid" },
                  receiptNumber: { type: "string" },
                  receiptDate: { type: "string", format: "date-time" },
                  notes: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: { type: "string", format: "uuid" },
                        quantity: { type: "number", minimum: 0.0001 },
                        unitPrice: { type: "number", minimum: 0 },
                        notes: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Receipt created", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Receipt" } } } } } },
        },
      },
    },
    "/api/receipts/{id}": {
      get: {
        summary: "Get Receipt by ID",
        tags: ["Receipt Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Receipt details with items", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Receipt" } } } } } },
          404: { description: "Receipt not found" },
        },
      },
      patch: {
        summary: "Update Receipt Header",
        tags: ["Receipt Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Receipt header updated" },
          400: { description: "Attempt to edit locked receipt (DONE or CANCELED)" },
        },
      },
    },
    "/api/receipts/{id}/cancel": {
      post: {
        summary: "Cancel Receipt Document",
        tags: ["Receipt Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Receipt cancelled" },
          400: { description: "Cannot cancel completed receipt" },
        },
      },
    },
    "/api/receipts/{id}/process": {
      post: {
        summary: "Process Receipt Document (Mutates Stock & Ledger)",
        tags: ["Receipt Processing"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Receipt processed successfully, stock balances updated, ledger movement recorded, status set to DONE" },
          400: { description: "Validation error or invalid receipt status" },
          409: { description: "Receipt already processed and marked DONE" },
        },
      },
    },
    "/api/deliveries": {
      get: {
        summary: "List Deliveries",
        tags: ["Delivery Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"] } },
          { name: "warehouseId", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Paginated deliveries list", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Delivery" } } } } } } },
        },
      },
      post: {
        summary: "Create Delivery Document",
        tags: ["Delivery Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["warehouseId"],
                properties: {
                  warehouseId: { type: "string", format: "uuid" },
                  customerName: { type: "string" },
                  customerReference: { type: "string" },
                  deliveryNumber: { type: "string" },
                  notes: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: { type: "string", format: "uuid" },
                        quantity: { type: "number", minimum: 0.0001 },
                        sourceLocationId: { type: "string", format: "uuid" },
                        unitPrice: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Delivery created", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Delivery" } } } } } },
        },
      },
    },
    "/api/deliveries/{id}": {
      get: {
        summary: "Get Delivery by ID",
        tags: ["Delivery Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Delivery details with items", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Delivery" } } } } } },
          404: { description: "Delivery not found" },
        },
      },
    },
    "/api/deliveries/{id}/pick": {
      post: {
        summary: "Pick Delivery Items (Workflow transition to WAITING, NO stock mutation)",
        tags: ["Delivery Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Delivery picked successfully" },
        },
      },
    },
    "/api/deliveries/{id}/pack": {
      post: {
        summary: "Pack Delivery Items (Workflow transition to READY, NO stock mutation)",
        tags: ["Delivery Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Delivery packed successfully" },
        },
      },
    },
    "/api/deliveries/{id}/validate": {
      post: {
        summary: "Validate Delivery Document (Pure validation, NO stock mutation)",
        tags: ["Delivery Core"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Delivery validated and ready for processing" },
        },
      },
    },
    "/api/deliveries/{id}/process": {
      post: {
        summary: "Process Delivery (Stock Operation Layer - Decreases Inventory)",
        tags: ["Delivery Processing"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Delivery processed successfully, stock decreased, and status marked DONE" },
          400: { description: "Insufficient stock, invalid items, or locked status" },
          409: { description: "Delivery has already been processed and is marked DONE" },
        },
      },
    },
    "/api/transfers": {
      post: {
        summary: "Create Internal Transfer",
        tags: ["Internal Transfers"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InternalTransfer" } } },
        },
        responses: {
          201: { description: "Internal transfer created successfully" },
          400: { description: "Validation error or same source/destination location" },
        },
      },
      get: {
        summary: "List Internal Transfers",
        tags: ["Internal Transfers"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: "List of internal transfers" },
        },
      },
    },
    "/api/transfers/{id}": {
      get: {
        summary: "Get Internal Transfer by ID",
        tags: ["Internal Transfers"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Internal transfer details" },
          404: { description: "Internal transfer not found" },
        },
      },
      patch: {
        summary: "Update Internal Transfer Header",
        tags: ["Internal Transfers"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Internal transfer updated successfully" },
        },
      },
    },
    "/api/transfers/{id}/validate": {
      post: {
        summary: "Validate Internal Transfer Document",
        tags: ["Internal Transfers"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Internal transfer validated" },
        },
      },
    },
    "/api/transfers/{id}/process": {
      post: {
        summary: "Process Internal Transfer (Mutates Stock)",
        tags: ["Internal Transfers"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Internal transfer processed and stock moved" },
          400: { description: "Insufficient stock or invalid transfer" },
          409: { description: "Transfer already completed" },
        },
      },
    },
    "/api/transfers/{id}/cancel": {
      post: {
        summary: "Cancel Internal Transfer",
        tags: ["Internal Transfers"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Internal transfer cancelled" },
        },
      },
    },
    "/api/adjustments": {
      post: {
        summary: "Create Inventory Adjustment",
        tags: ["Inventory Adjustments"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryAdjustment" } } },
        },
        responses: {
          201: { description: "Inventory adjustment created successfully" },
          400: { description: "Validation error or invalid location" },
        },
      },
      get: {
        summary: "List Inventory Adjustments",
        tags: ["Inventory Adjustments"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: "List of inventory adjustments" },
        },
      },
    },
    "/api/adjustments/{id}": {
      get: {
        summary: "Get Inventory Adjustment by ID",
        tags: ["Inventory Adjustments"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Inventory adjustment details" },
          404: { description: "Inventory adjustment not found" },
        },
      },
      patch: {
        summary: "Update Inventory Adjustment Header",
        tags: ["Inventory Adjustments"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Inventory adjustment updated successfully" },
        },
      },
    },
    "/api/adjustments/{id}/preview": {
      get: {
        summary: "Preview Inventory Adjustment Differences (Read-Only)",
        tags: ["Inventory Adjustments"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Read-only stock comparison preview (system stock, physical count, difference)" },
        },
      },
    },
    "/api/adjustments/{id}/validate": {
      post: {
        summary: "Validate Inventory Adjustment Document",
        tags: ["Inventory Adjustments"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Inventory adjustment validated" },
        },
      },
    },
    "/api/adjustments/{id}/process": {
      post: {
        summary: "Process Inventory Adjustment (Mutates Stock)",
        tags: ["Inventory Adjustments"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Inventory adjustment processed and stock balances updated" },
          400: { description: "Invalid counted quantity or adjustment status" },
          409: { description: "Adjustment already completed" },
        },
      },
    },
    "/api/adjustments/{id}/cancel": {
      post: {
        summary: "Cancel Inventory Adjustment",
        tags: ["Inventory Adjustments"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Inventory adjustment cancelled" },
        },
      },
    },
    "/api/stock-movements": {
      get: {
        summary: "List Stock Movements / Read-Only Stock Ledger History",
        tags: ["Move History / Stock Ledger"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "productId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "locationId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "sourceLocationId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "destinationLocationId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "movementType", in: "query", schema: { type: "string", enum: ["IN", "OUT", "INTERNAL", "ADJUSTMENT"] } },
          { name: "referenceType", in: "query", schema: { type: "string", enum: ["RECEIPT", "DELIVERY", "TRANSFER", "ADJUSTMENT"] } },
          { name: "referenceId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "createdBy", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "fromDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "toDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Paginated list of historical stock ledger movements",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/StockMovement" } },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/stock-movements/{id}": {
      get: {
        summary: "Get Stock Movement by ID",
        tags: ["Move History / Stock Ledger"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Stock movement ledger detail with relational product, location, and user info",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/StockMovement" } } } } },
          },
          404: { description: "Stock movement not found" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/products": {
      get: {
        summary: "List Products",
        tags: ["Product CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "sku", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "uomId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          200: {
            description: "Paginated list of products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create Product Master Record",
        tags: ["Product CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "sku", "uomId"],
                properties: {
                  name: { type: "string", example: "Steel Bar" },
                  sku: { type: "string", example: "STL-001" },
                  description: { type: "string", example: "High tensile steel bar" },
                  categoryId: { type: "string", format: "uuid" },
                  uomId: { type: "string", format: "uuid" },
                  barcode: { type: "string", example: "890123456789" },
                  imageUrl: { type: "string" },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Product created successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Product" } } } } } },
          400: { description: "Validation error or invalid Category/UOM ID" },
          409: { description: "Duplicate SKU error" },
        },
      },
    },
    "/api/products/{id}": {
      get: {
        summary: "Get Product by ID",
        tags: ["Product CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Product details with Category and UOM relations", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Product" } } } } } },
          404: { description: "Product not found" },
        },
      },
      patch: {
        summary: "Update Product Master Data",
        tags: ["Product CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  sku: { type: "string" },
                  description: { type: "string", nullable: true },
                  categoryId: { type: "string", format: "uuid", nullable: true },
                  uomId: { type: "string", format: "uuid" },
                  barcode: { type: "string", nullable: true },
                  imageUrl: { type: "string", nullable: true },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Product updated successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Product" } } } } } },
          400: { description: "Validation error" },
          404: { description: "Product, Category, or UOM not found" },
          409: { description: "Duplicate SKU error" },
        },
      },
      delete: {
        summary: "Delete or Deactivate Product",
        tags: ["Product CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Product deleted if unreferenced, or deactivated if referenced in historical inventory records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    mode: { type: "string", enum: ["deleted", "deactivated"] },
                  },
                },
              },
            },
          },
          404: { description: "Product not found" },
        },
      },
    },
    "/api/categories": {
      get: {
        summary: "List Categories",
        tags: ["Category CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          200: {
            description: "Paginated list of categories",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Category" } },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create Category Master Record",
        tags: ["Category CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Raw Materials" },
                  description: { type: "string", example: "Primary manufacturing inputs" },
                  color: { type: "string", example: "#3B82F6" },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Category created successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Category" } } } } } },
          400: { description: "Validation error" },
          409: { description: "Duplicate Category Name error" },
        },
      },
    },
    "/api/categories/{id}": {
      get: {
        summary: "Get Category by ID",
        tags: ["Category CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Category details", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Category" } } } } } },
          404: { description: "Category not found" },
        },
      },
      patch: {
        summary: "Update Category Master Record",
        tags: ["Category CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string", nullable: true },
                  color: { type: "string", nullable: true },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Category updated successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Category" } } } } } },
          400: { description: "Validation error" },
          404: { description: "Category not found" },
          409: { description: "Duplicate Category Name error" },
        },
      },
      delete: {
        summary: "Delete or Deactivate Category",
        tags: ["Category CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Category deleted if unreferenced, or deactivated if referenced by products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    mode: { type: "string", enum: ["deleted", "deactivated"] },
                  },
                },
              },
            },
          },
          404: { description: "Category not found" },
        },
      },
    },
    "/api/uoms": {
      get: {
        summary: "List Units of Measure",
        tags: ["UOM CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "measureType", in: "query", schema: { type: "string" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          200: {
            description: "Paginated list of units of measure",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/UnitOfMeasure" } },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create Unit of Measure Record",
        tags: ["UOM CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "abbreviation"],
                properties: {
                  name: { type: "string", example: "Kilogram" },
                  abbreviation: { type: "string", example: "kg" },
                  description: { type: "string", example: "Unit of mass" },
                  measureType: { type: "string", example: "weight" },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Unit of Measure created successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/UnitOfMeasure" } } } } } },
          400: { description: "Validation error" },
          409: { description: "Duplicate UOM name or abbreviation error" },
        },
      },
    },
    "/api/uoms/{id}": {
      get: {
        summary: "Get Unit of Measure by ID",
        tags: ["UOM CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Unit of Measure details", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/UnitOfMeasure" } } } } } },
          404: { description: "Unit of Measure not found" },
        },
      },
      patch: {
        summary: "Update Unit of Measure Record",
        tags: ["UOM CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  abbreviation: { type: "string" },
                  description: { type: "string", nullable: true },
                  measureType: { type: "string", nullable: true },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Unit of Measure updated successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/UnitOfMeasure" } } } } } },
          400: { description: "Validation error" },
          404: { description: "Unit of Measure not found" },
          409: { description: "Duplicate UOM name or abbreviation error" },
        },
      },
      delete: {
        summary: "Delete or Deactivate Unit of Measure",
        tags: ["UOM CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "UOM deleted if unreferenced, or deactivated if referenced by products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    mode: { type: "string", enum: ["deleted", "deactivated"] },
                  },
                },
              },
            },
          },
          404: { description: "Unit of Measure not found" },
        },
      },
    },
    "/api/warehouses": {
      get: {
        summary: "List Warehouses with Pagination, Filtering & Search",
        tags: ["Warehouse CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Filter by name or shortCode" },
          { name: "isActive", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Filter by active status" },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["name", "shortCode", "createdAt"], default: "name" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
        ],
        responses: {
          200: {
            description: "Paginated list of warehouses",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Warehouse" } },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid query parameters" },
        },
      },
      post: {
        summary: "Create New Warehouse",
        tags: ["Warehouse CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "shortCode"],
                properties: {
                  name: { type: "string", example: "Main Central Warehouse" },
                  shortCode: { type: "string", example: "WH01" },
                  description: { type: "string", example: "Central logistics hub" },
                  address: { type: "string", example: "123 Industrial Way" },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Warehouse created successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Warehouse" } } } } } },
          400: { description: "Validation error" },
          409: { description: "Duplicate warehouse name or shortCode error" },
        },
      },
    },
    "/api/warehouses/{id}": {
      get: {
        summary: "Get Warehouse Details by ID",
        tags: ["Warehouse CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Warehouse details", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Warehouse" } } } } } },
          404: { description: "Warehouse not found" },
        },
      },
      patch: {
        summary: "Update Warehouse Record",
        tags: ["Warehouse CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  shortCode: { type: "string" },
                  description: { type: "string", nullable: true },
                  address: { type: "string", nullable: true },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Warehouse updated successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Warehouse" } } } } } },
          400: { description: "Validation error" },
          404: { description: "Warehouse not found" },
          409: { description: "Duplicate warehouse name or shortCode error" },
        },
      },
      delete: {
        summary: "Delete or Deactivate Warehouse",
        tags: ["Warehouse CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Warehouse deleted if unreferenced, or deactivated if referenced by locations, receipts, or deliveries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    mode: { type: "string", enum: ["deleted", "deactivated"] },
                  },
                },
              },
            },
          },
          404: { description: "Warehouse not found" },
        },
      },
    },
    "/api/locations": {
      get: {
        summary: "List Locations with Pagination, Tree Hierarchy & Filtering",
        tags: ["Location CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "warehouseId", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by warehouse ID" },
          { name: "parentId", in: "query", schema: { type: "string" }, description: "Filter by parent location ID (or 'null' for root locations)" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by name or full path" },
          { name: "locationType", in: "query", schema: { type: "string", enum: ["internal", "input", "output", "quality_control", "virtual"] } },
          { name: "isActive", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["name", "fullPath", "locationType", "createdAt"], default: "name" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
        ],
        responses: {
          200: {
            description: "Paginated list of location records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Location" } },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid query parameters" },
        },
      },
      post: {
        summary: "Create New Location",
        tags: ["Location CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["warehouseId", "name"],
                properties: {
                  warehouseId: { type: "string", format: "uuid", example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" },
                  parentId: { type: "string", format: "uuid", nullable: true, example: "3b7d4bad-9bdd-2b0d-7b3d-cb6d9b1deb4d" },
                  name: { type: "string", example: "Shelf A-1" },
                  fullPath: { type: "string", example: "WH01 / Zone A / Shelf A-1" },
                  locationType: { type: "string", enum: ["internal", "input", "output", "quality_control", "virtual"], default: "internal" },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Location created successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Location" } } } } } },
          400: { description: "Validation error, missing warehouse/parent, or cross-warehouse parent" },
          404: { description: "Warehouse or Parent location not found" },
        },
      },
    },
    "/api/locations/{id}": {
      get: {
        summary: "Get Location Details by ID",
        tags: ["Location CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Location details", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Location" } } } } } },
          404: { description: "Location not found" },
        },
      },
      patch: {
        summary: "Update Location Record",
        tags: ["Location CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  warehouseId: { type: "string", format: "uuid" },
                  parentId: { type: "string", format: "uuid", nullable: true },
                  name: { type: "string" },
                  fullPath: { type: "string" },
                  locationType: { type: "string", enum: ["internal", "input", "output", "quality_control", "virtual"] },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Location updated successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Location" } } } } } },
          400: { description: "Validation error, circular hierarchy, or cross-warehouse move error" },
          404: { description: "Location not found" },
        },
      },
      delete: {
        summary: "Delete or Deactivate Location",
        tags: ["Location CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Location deleted if unreferenced, or deactivated if referenced by inventory/operational records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    mode: { type: "string", enum: ["deleted", "deactivated"] },
                  },
                },
              },
            },
          },
          400: { description: "Cannot delete location with active child locations" },
          404: { description: "Location not found" },
        },
      },
    },
    "/api/reordering-rules": {
      get: {
        summary: "List Reordering Rules with Pagination & Filtering",
        tags: ["Reordering Rules CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "productId", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by product ID" },
          { name: "locationId", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by location ID" },
          { name: "warehouseId", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by warehouse ID" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by product name/SKU or location name/path" },
          { name: "isActive", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["minQuantity", "maxQuantity", "reorderQty", "createdAt"], default: "createdAt" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: {
          200: {
            description: "Paginated list of reordering rules",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/ReorderRule" } },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid query parameters" },
        },
      },
      post: {
        summary: "Create New Reordering Rule",
        tags: ["Reordering Rules CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId", "locationId"],
                properties: {
                  productId: { type: "string", format: "uuid", example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" },
                  locationId: { type: "string", format: "uuid", example: "3b7d4bad-9bdd-2b0d-7b3d-cb6d9b1deb4d" },
                  minQuantity: { type: "number", example: 50, default: 0 },
                  maxQuantity: { type: "number", nullable: true, example: 200 },
                  reorderQty: { type: "number", example: 50, default: 1 },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Reordering rule created successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/ReorderRule" } } } } } },
          400: { description: "Validation error or invalid quantity threshold (min > max)" },
          404: { description: "Product or Location not found" },
          409: { description: "Duplicate reordering rule for this product and location" },
        },
      },
    },
    "/api/reordering-rules/{id}": {
      get: {
        summary: "Get Reordering Rule Details by ID",
        tags: ["Reordering Rules CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Reordering rule details", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/ReorderRule" } } } } } },
          404: { description: "Reordering rule not found" },
        },
      },
      patch: {
        summary: "Update Reordering Rule Record",
        tags: ["Reordering Rules CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productId: { type: "string", format: "uuid" },
                  locationId: { type: "string", format: "uuid" },
                  minQuantity: { type: "number" },
                  maxQuantity: { type: "number", nullable: true },
                  reorderQty: { type: "number" },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Reordering rule updated successfully", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/ReorderRule" } } } } } },
          400: { description: "Validation error or invalid quantity threshold (min > max)" },
          404: { description: "Reordering rule, Product, or Location not found" },
          409: { description: "Duplicate reordering rule for target product and location" },
        },
      },
      delete: {
        summary: "Delete Reordering Rule",
        tags: ["Reordering Rules CRUD"],
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Reordering rule deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    mode: { type: "string", enum: ["deleted"] },
                  },
                },
              },
            },
          },
          404: { description: "Reordering rule not found" },
        },
      },
    },
  },
};



