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
  },
};
