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
  },
};



