# StockSense — Grounded AI Assistant Specification & Architecture

This document provides a complete specification of the **Grounded AI Assistant Platform** integrated into StockSense (`backend/src/modules/ai/`).

---

## 1. System Overview & Architecture

The AI Assistant is designed as a **Factual, Tool-Augmented Orchestrator** powered by Groq LLMs (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`). Unlike generic LLM chatbots that hallucinate fake product names or stock numbers, StockSense's AI Orchestrator strictly executes deterministic backend tools that query live PostgreSQL data through application services (`StockBalanceService`, `StockLedgerService`).

```text
                                  ┌───────────────────────────┐
                                  │ User Message / API Prompt │
                                  └─────────────┬─────────────┘
                                                │ POST /api/ai/chat
                                                ▼
                                  ┌───────────────────────────┐
                                  │      AiOrchestrator       │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
┌─────────────────────────────────┐                           ┌──────────────────────────────────┐
│ Intent Match / LLM Tool Choice  │                           │ Action Intent Detection          │
│ (Groq llama-3.3-70b-versatile)  │                           │ (Receipt / Transfer / Delivery)  │
└────────────────┬────────────────┘                           └────────────────┬─────────────────┘
                 │                                                             │
                 ▼                                                             ▼
┌─────────────────────────────────┐                           ┌──────────────────────────────────┐
│ Grounded Service Tool Handlers  │                           │ Action Confirmation Safeguard    │
│ (Products, Balances, Movements) │                           │ (Requires user confirmation)     │
└────────────────┬────────────────┘                           └────────────────┬─────────────────┘
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                ▼
                                  ┌───────────────────────────┐
                                  │  Formatted JSON Response  │
                                  │ (Answer, Sources, Tools)  │
                                  └───────────────────────────┘
```

---

## 2. Zero-Hallucination Policy

The system prompt strictly enforces the following core directives:
1. **Ground Every Answer**: Answers must be strictly backed by actual tool outputs or official project documentation.
2. **Never Invent Data**: The assistant will never guess product names, SKU codes, stock quantities, warehouse locations, database IDs, or user permissions.
3. **Honest Fallbacks**: If data is missing or not found, the AI returns a clear statement: *"I couldn't find [item/data] in StockSense."*
4. **RBAC Enforcement**: Checks authenticated user roles before displaying administrative data or permitting action execution.

---

## 3. Registered System Tool Catalog

The AI Assistant has access to **8 deterministic system tools** defined in `backend/src/modules/ai/tools.ts`:

| # | Tool Name | Description | Key Parameters | Service / Data Provider |
|---|---|---|---|---|
| **1** | `list_products` | Lists master catalog products with optional search query | `{ search?: string, limit?: number }` | `ProductService` |
| **2** | `get_product_details` | Retrieves full stock breakdown across all warehouses & locations for a SKU/ID | `{ skuOrId: string }` | `StockBalanceService` & `ProductService` |
| **3** | `get_low_stock_items` | Identifies products with available quantities below reorder thresholds | `{ limit?: number }` | `ReorderRules` & `StockBalanceService` |
| **4** | `get_stock_movements` | Queries historical stock audit ledger records | `{ limit?: number, productSku?: string }` | `StockLedgerService` |
| **5** | `list_warehouses` | Retrieves warehouse facilities, codes, and sub-location hierarchy | `{}` | `WarehouseService` & `LocationService` |
| **6** | `get_dashboard_summary` | Returns enterprise KPI summary, total stock valuation & counts | `{}` | `DashboardService` |
| **7** | `search_project_documentation` | Searches API integration docs, endpoints, and architecture specs | `{ query: string }` | `DocumentationSearchService` (`docs/API_INTEGRATION.md`) |
| **8** | `process_inventory_action` | Processes inbound receipts, deliveries, transfers, or adjustments | `{ actionType: string, documentId: string }` | **Central Inventory Orchestrator** |

---

## 4. Mutating Action Confirmation Safeguard

For operations that modify physical database state (e.g. processing a receipt or executing a transfer), the AI Assistant enforces a **two-step confirmation flow**:

1. **Step 1 (Intent Detection)**: User asks *"Process receipt REC-001"*. The AI detects the action, checks RBAC permissions (`admin` or `manager`), and returns a pending action envelope with `confirmationRequired: true`.
2. **Step 2 (User Confirmation)**: The user replies *"confirm"* or passes `confirmAction: true`. The AI executes the tool inside a database transaction and returns the processed result.

---

## 5. Multi-LLM Fallback Network

The orchestrator maintains a candidate model list for Groq API connections:
- Primary: `llama-3.3-70b-versatile`
- Secondary: `llama-3.1-8b-instant`
- Fallback: `llama3-70b-8192`, `llama3-8b-8192`, `mixtral-8x7b-32768`, `gemma2-9b-it`

If API keys are missing or model endpoints fail, the orchestrator automatically falls back to **Local Grounded Intent Execution**, ensuring the chat interface never crashes.

---

## 6. API Endpoint Specification

### `POST /api/ai/chat`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Request Payload**:
  ```json
  {
    "message": "Which products are currently low in stock?",
    "conversationId": "conv_123456",
    "confirmAction": false
  }
  ```
- **Response Payload**:
  ```json
  {
    "success": true,
    "data": {
      "answer": "There are currently 2 product(s) low in stock:\n- **Cotton T-Shirt** (SKU: `APP-TSHIRT-001`): Current Stock = **15**, Min Required = **50**",
      "sources": ["StockBalanceService", "ReorderRules"],
      "toolCalls": [
        { "tool": "get_low_stock_items", "params": { "limit": 20 } }
      ],
      "confirmationRequired": false,
      "actionPending": null,
      "conversationId": "conv_123456"
    }
  }
  ```
