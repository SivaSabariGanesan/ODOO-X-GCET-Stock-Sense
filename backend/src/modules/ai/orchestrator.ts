import { config } from "../../app/config/index.js";
import { aiTools } from "./tools.js";
import { documentationSearchService } from "./documentation-search.js";
import type { UserContext, ChatRequestInput, ChatResponseData, ToolCallRecord, PendingAction } from "./types.js";
import { AppError } from "../../lib/errors.js";

const SYSTEM_PROMPT = `
You are the StockSense AI Project Assistant.
StockSense is an enterprise Inventory Management System built with Bun, Hono, Drizzle ORM, and PostgreSQL.

YOUR DIRECTIVES:
1. Ground every answer strictly in actual tool outputs and project documentation.
2. NEVER invent product names, SKU codes, stock quantities, warehouse locations, database records, API endpoints, or user permissions.
3. If data is not found, state clearly: "I couldn't find [item/data] in StockSense."
4. Respect authenticated user permissions.
5. For inventory-changing actions, explicit confirmation is mandatory.
6. Provide concise, clear, and bulleted human-readable answers.
`;

import { recordAiUsage } from "../../lib/metrics.js";

export class AiOrchestrator {
  public static async handleChat(
    input: ChatRequestInput,
    user: UserContext
  ): Promise<ChatResponseData> {
    const start = Date.now();
    let status: "success" | "error" = "success";
    let errorType = "";
    let modelUsed = "grounded-engine";
    let inputTokens = 0;
    let outputTokens = 0;

    const conversationId = input.conversationId ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const message = input.message.trim();

    if (!message) {
      status = "error";
      errorType = "validation_error";
      recordAiUsage({
        model: modelUsed,
        inputTokens: 0,
        outputTokens: 0,
        durationSeconds: (Date.now() - start) / 1000,
        status,
        errorType,
      });
      throw new AppError("Message content cannot be empty", 400);
    }

    try {
      const apiKey = (process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY ?? "").replace(/"/g, "").trim();
      const isConfirmed = input.confirmAction === true || /^yes$|^confirm$|^proceed$/i.test(message);

      // 1. Check for Action Intent first (Receipt/Delivery/Transfer/Adjustment processing)
      const actionMatch = this.detectActionIntent(message);
      if (actionMatch) {
        const tool = aiTools[actionMatch.tool];
        if (tool && tool.requiresConfirmation) {
          // Check RBAC first
          if (tool.requiredRole && !tool.requiredRole.includes(user.role as any)) {
            status = "error";
            errorType = "authorization_error";
            throw new AppError(`Forbidden: ${user.role} role is not authorized to execute ${actionMatch.tool}`, 403);
          }

          if (!isConfirmed) {
            const resData: ChatResponseData = {
              answer: `I can ${actionMatch.description}. Are you sure you want to proceed? This will permanently mutate stock balances and create immutable ledger entries. Please reply 'confirm' or set confirmAction: true to execute.`,
              sources: ["InventoryService"],
              toolCalls: [],
              confirmationRequired: true,
              actionPending: {
                tool: actionMatch.tool,
                params: actionMatch.params,
                description: actionMatch.description,
              },
              conversationId,
            };
            inputTokens = Math.ceil(message.length / 4);
            outputTokens = Math.ceil(resData.answer.length / 4);
            return resData;
          }

          // Execute action tool when confirmed
          const toolResult = await tool.handler(actionMatch.params, user);
          const resData: ChatResponseData = {
            answer: `Action executed successfully: ${toolResult.message ?? toolResult.success}`,
            sources: ["InventoryService", "StockBalanceService", "StockLedgerService"],
            toolCalls: [{ tool: actionMatch.tool, params: actionMatch.params, result: toolResult }],
            confirmationRequired: false,
            actionPending: null,
            conversationId,
          };
          inputTokens = Math.ceil(message.length / 4);
          outputTokens = Math.ceil(resData.answer.length / 4);
          return resData;
        }
      }

      // 2. Try LLM API Provider (Groq / Gemini / OpenAI) if API Key is configured
      if (apiKey && process.env.NODE_ENV !== "test") {
        try {
          let llmResult = null;
          if (apiKey.startsWith("gsk_")) {
            llmResult = await this.callGroqApi(message, apiKey, user);
          } else {
            llmResult = await this.callGeminiApi(message, apiKey, user);
          }

          if (llmResult) {
            modelUsed = llmResult.model ?? (apiKey.startsWith("gsk_") ? "llama-3.3-70b-versatile" : "gemini-2.5-flash");
            inputTokens = llmResult.inputTokens ?? Math.ceil(message.length / 4);
            outputTokens = llmResult.outputTokens ?? Math.ceil(llmResult.answer.length / 4);
            return {
              answer: llmResult.answer,
              sources: llmResult.sources,
              toolCalls: llmResult.toolCalls,
              confirmationRequired: false,
              actionPending: null,
              conversationId,
            };
          }
        } catch (err) {
          console.warn("[AiOrchestrator] External LLM API call failed or timed out, falling back to Grounded Intent Engine:", err);
        }
      }

      // 3. Deterministic Intent & Function Tool Dispatcher (Grounded Engine)
      const resData = await this.dispatchIntent(message, user, conversationId);
      inputTokens = Math.ceil(message.length / 4);
      outputTokens = Math.ceil(resData.answer.length / 4);
      return resData;
    } catch (err: any) {
      status = "error";
      errorType = err.statusCode === 403 ? "authorization_error" : "execution_error";
      throw err;
    } finally {
      recordAiUsage({
        model: modelUsed,
        inputTokens,
        outputTokens,
        durationSeconds: (Date.now() - start) / 1000,
        status,
        errorType: status === "error" ? errorType : undefined,
      });
    }
  }

  private static detectActionIntent(message: string): { tool: string; params: Record<string, any>; description: string } | null {
    const msg = message.toLowerCase();

    // Match "process receipt <id>"
    const receiptMatch = msg.match(/process\s+receipt\s+([a-f0-9\-]+|[a-z0-9\_]+)/i);
    if (receiptMatch) {
      return {
        tool: "process_receipt",
        params: { receiptId: receiptMatch[1] },
        description: `process Receipt '${receiptMatch[1]}'`,
      };
    }

    // Match "process delivery <id>"
    const deliveryMatch = msg.match(/process\s+delivery\s+([a-f0-9\-]+|[a-z0-9\_]+)/i);
    if (deliveryMatch) {
      return {
        tool: "process_delivery",
        params: { deliveryId: deliveryMatch[1] },
        description: `process Delivery '${deliveryMatch[1]}'`,
      };
    }

    // Match "process transfer <id>"
    const transferMatch = msg.match(/process\s+transfer\s+([a-f0-9\-]+|[a-z0-9\_]+)/i);
    if (transferMatch) {
      return {
        tool: "process_transfer",
        params: { transferId: transferMatch[1] },
        description: `process Internal Transfer '${transferMatch[1]}'`,
      };
    }

    // Match "process adjustment <id>"
    const adjustmentMatch = msg.match(/process\s+adjustment\s+([a-f0-9\-]+|[a-z0-9\_]+)/i);
    if (adjustmentMatch) {
      return {
        tool: "process_adjustment",
        params: { adjustmentId: adjustmentMatch[1] },
        description: `process Inventory Adjustment '${adjustmentMatch[1]}'`,
      };
    }

    return null;
  }

  private static async dispatchIntent(
    message: string,
    user: UserContext,
    conversationId: string
  ): Promise<ChatResponseData> {
    const msg = message.toLowerCase();
    const toolCalls: ToolCallRecord[] = [];
    const sources = new Set<string>();
    let answer = "";

    // A. Documentation / Architecture / Workflows / APIs questions
    if (
      msg.includes("api") ||
      msg.includes("endpoint") ||
      msg.includes("workflow") ||
      msg.includes("how does") ||
      msg.includes("explain") ||
      msg.includes("auth") ||
      msg.includes("websocket")
    ) {
      sources.add("docs/API_INTEGRATION.md");
      const docResult = await aiTools.search_project_documentation.handler({ query: message }, user);
      toolCalls.push({ tool: "search_project_documentation", params: { query: message }, result: docResult });

      if (docResult.sections && docResult.sections.length > 0) {
        answer = `Based on official StockSense project documentation:\n\n` +
          docResult.sections.map((s: any) => `### ${s.title}\n${s.content}`).join("\n\n");
      } else {
        answer = `I couldn't find specific documentation matching your query in StockSense API Integration docs.`;
      }
    }
    // B. Low Stock Queries
    else if (msg.includes("low stock") || msg.includes("low in stock") || msg.includes("reorder") || msg.includes("below threshold")) {
      sources.add("StockBalanceService");
      sources.add("ReorderRules");
      const res = await aiTools.get_low_stock_items.handler({ limit: 20 }, user);
      toolCalls.push({ tool: "get_low_stock_items", params: { limit: 20 }, result: res });

      if (res.total === 0) {
        answer = "Great news! There are currently no products below their reorder thresholds.";
      } else {
        answer = `There are currently **${res.total} product(s)** low in stock:\n\n` +
          res.lowStockItems.map((item: any) =>
            `- **${item.productName}** (SKU: \`${item.productSku}\`): Current Stock = **${item.currentStock}**, Min Required = **${item.minQuantity}** (Location: ${item.locationName})`
          ).join("\n");
      }
    }
    // C. Specific Product Stock Query (e.g. "How much stock do we have for Cotton T-Shirt?")
    else if (
      msg.includes("product") &&
      (msg.includes("how much") || msg.includes("where is") || msg.includes("stock for") || msg.includes("balance for"))
    ) {
      sources.add("Products");
      sources.add("StockBalanceService");
      const cleanSearch = message.replace(/\b(what|how|much|stock|do|we|have|for|product|products|where|is|stored|exist|in|stocksense)\b/gi, "").trim();
      const prodList = await aiTools.list_products.handler({ search: cleanSearch.length > 0 ? cleanSearch : undefined, limit: 10 }, user);
      toolCalls.push({ tool: "list_products", params: { search: cleanSearch }, result: prodList });

      if (prodList.products && prodList.products.length > 0) {
        const firstProd = prodList.products[0];
        const details = await aiTools.get_product_details.handler({ skuOrId: firstProd.id }, user);
        toolCalls.push({ tool: "get_product_details", params: { skuOrId: firstProd.id }, result: details });

        if (details.error) {
          answer = details.error;
        } else {
          answer = `Stock details for **${details.product.name}** (SKU: \`${details.product.sku}\`):\n` +
            `- **Total Available Stock**: **${details.totalStock}**\n` +
            `- **Locations Breakdown**:\n` +
            (details.locationBreakdown.length > 0
              ? details.locationBreakdown.map((b: any) => `  * ${b.warehouseName} / ${b.locationName}: Quantity = **${b.availableQuantity}**`).join("\n")
              : "  * No stock recorded in any warehouse location yet.");
        }
      } else {
        answer = "I couldn't find matching products for your query in StockSense.";
      }
    }
    // D. List Products (e.g. "What products exist in StockSense?", "List products")
    else if (msg.includes("product")) {
      sources.add("Products");
      const res = await aiTools.list_products.handler({ limit: 20 }, user);
      toolCalls.push({ tool: "list_products", params: { limit: 20 }, result: res });

      if (res.total === 0) {
        answer = "No products currently exist in StockSense.";
      } else {
        answer = `StockSense contains **${res.total} product(s)** (${res.products.length} shown):\n\n` +
          res.products.map((p: any) => `- **${p.name}** (SKU: \`${p.sku}\`)`).join("\n");
      }
    }
    // E. Stock Movements / History
    else if (msg.includes("movement") || msg.includes("history") || msg.includes("happened") || msg.includes("ledger")) {
      sources.add("StockLedgerService");
      const res = await aiTools.get_stock_movements.handler({ limit: 10 }, user);
      toolCalls.push({ tool: "get_stock_movements", params: { limit: 10 }, result: res });

      if (res.total === 0) {
        answer = "No stock movements have been recorded in the ledger yet.";
      } else {
        answer = `Recent Stock Movements Audit Log (${res.movements.length} shown):\n\n` +
          res.movements.map((m: any) =>
            `- [${m.movementType}] **${m.productName}** (${m.quantityChange > 0 ? "+" : ""}${m.quantityChange}): ${m.locationName ?? "N/A"} - Ref: \`${m.referenceNumber}\``
          ).join("\n");
      }
    }
    // F. Warehouses & Locations
    else if (msg.includes("warehouse") || msg.includes("location") || msg.includes("stored")) {
      sources.add("Warehouses");
      sources.add("Locations");
      const whRes = await aiTools.list_warehouses.handler({}, user);
      toolCalls.push({ tool: "list_warehouses", params: {}, result: whRes });

      answer = `StockSense Warehouses (${whRes.total}):\n\n` +
        whRes.warehouses.map((w: any) => `- **${w.name}** (\`${w.shortCode}\`): ${w.address ?? "No address"}`).join("\n");
    }
    // G. Dashboard Overview
    else if (msg.includes("dashboard") || msg.includes("summary") || msg.includes("overview")) {
      sources.add("DashboardService");
      const res = await aiTools.get_dashboard_summary.handler({}, user);
      toolCalls.push({ tool: "get_dashboard_summary", params: {}, result: res });

      const s = res.summary;
      answer = `StockSense Dashboard Summary:\n\n` +
        `- **Total Products**: ${s.totalProducts}\n` +
        `- **Total Warehouses**: ${s.totalWarehouses}\n` +
        `- **Total Locations**: ${s.totalLocations}\n` +
        `- **Total Stock Quantity**: ${s.totalStockQuantity}\n` +
        `- **Total Stock Value**: $${Number(s.totalStockValue).toFixed(2)}\n` +
        `- **Low-Stock Alert Items**: ${s.lowStockCount}`;
    }
    // H. Recipes / Formulas Question
    else if (msg.includes("recipe") || msg.includes("ingredient")) {
      sources.add("Recipes");
      answer = "Recipes & BOM (Bill of Materials) module details: Products are linked as components/ingredients in StockSense. No active custom recipe rules were matched for this specific query.";
    }
    // Default Fallback: General Grounded Response
    else {
      sources.add("StockSense Domain");
      answer = `I am your StockSense AI Assistant. I can help you with:\n\n` +
        `- **Inventory Queries**: Product stock balances, warehouse locations, and low-stock items.\n` +
        `- **Operations**: Receipt, delivery, internal transfer, and adjustment status & execution.\n` +
        `- **Ledger Audit**: Movement logs, transaction references, and timestamp history.\n` +
        `- **API & Architecture**: Endpoint specifications, auth contracts, and WebSocket event payloads.\n\n` +
        `How can I assist you with your StockSense data today?`;
    }

    return {
      answer,
      sources: Array.from(sources),
      toolCalls,
      confirmationRequired: false,
      actionPending: null,
      conversationId,
    };
  }

  private static async callGroqApi(
    message: string,
    apiKey: string,
    user: UserContext
  ): Promise<{ answer: string; sources: string[]; toolCalls: ToolCallRecord[]; model?: string; inputTokens?: number; outputTokens?: number } | null> {
    const candidateModels = Array.from(new Set([
      process.env.AI_MODEL,
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama3-70b-8192",
      "llama3-8b-8192",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ].filter(Boolean))) as string[];

    const endpoint = "https://api.groq.com/openai/v1/chat/completions";

    const openAiTools = Object.values(aiTools).map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: "object",
          properties: t.parameters.properties,
          required: t.parameters.required,
        },
      },
    }));

    for (const model of candidateModels) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message },
          ],
          tools: openAiTools,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[AiOrchestrator] Groq model '${model}' error:`, response.status, errText);
        continue;
      }

    const resJson = (await response.json()) as any;
    const choice = resJson.choices?.[0];
    if (!choice) return null;

    const inputTokens = resJson.usage?.prompt_tokens ?? Math.ceil(message.length / 4);
    let outputTokens = resJson.usage?.completion_tokens ?? 0;

    const toolCalls: ToolCallRecord[] = [];
    const sources = new Set<string>();

    if (choice.message?.tool_calls?.length > 0) {
      for (const tc of choice.message.tool_calls) {
        const fnName = tc.function.name;
        let args = {};
        try {
          args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        } catch {
          args = {};
        }
        const tool = aiTools[fnName];
        if (tool) {
          const toolResult = await tool.handler(args, user);
          toolCalls.push({ tool: fnName, params: args, result: toolResult });
          sources.add(fnName);
        }
      }

      // 2nd pass: Send tool output back to Groq for final grounded summary
      const secondResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message },
            choice.message,
            ...toolCalls.map((tc, idx) => ({
              role: "tool",
              tool_call_id: choice.message.tool_calls[idx]?.id ?? `call_${idx}`,
              content: JSON.stringify(tc.result),
            })),
          ],
        }),
      });

      if (secondResponse.ok) {
        const secondJson = (await secondResponse.json()) as any;
        const finalContent = secondJson.choices?.[0]?.message?.content;
        if (secondJson.usage?.completion_tokens) {
          outputTokens += secondJson.usage.completion_tokens;
        } else if (finalContent) {
          outputTokens += Math.ceil(finalContent.length / 4);
        }
        if (finalContent) {
          return { answer: finalContent, sources: Array.from(sources), toolCalls, model, inputTokens, outputTokens };
        }
      }
    }

    if (choice.message?.content) {
      if (!outputTokens) outputTokens = Math.ceil(choice.message.content.length / 4);
      return { answer: choice.message.content, sources: Array.from(sources), toolCalls, model, inputTokens, outputTokens };
    }
    } // end for model loop

    return null;
  }

  private static async callGeminiApi(
    message: string,
    apiKey: string,
    user: UserContext
  ): Promise<{ answer: string; sources: string[]; toolCalls: ToolCallRecord[]; model?: string; inputTokens?: number; outputTokens?: number } | null> {
    const model = process.env.AI_MODEL ?? "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const toolsDeclarations = Object.values(aiTools).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: message }] }],
        tools: [{ functionDeclarations: toolsDeclarations }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      }),
    });

    if (!response.ok) return null;

    const resJson = (await response.json()) as any;
    const candidate = resJson.candidates?.[0]?.content;
    if (!candidate) return null;

    const inputTokens = resJson.usageMetadata?.promptTokenCount ?? Math.ceil(message.length / 4);
    const outputTokens = resJson.usageMetadata?.candidatesTokenCount ?? 0;

    const toolCalls: ToolCallRecord[] = [];
    const sources = new Set<string>();

    for (const part of candidate.parts ?? []) {
      if (part.functionCall) {
        const fc = part.functionCall;
        const tool = aiTools[fc.name];
        if (tool) {
          const toolResult = await tool.handler(fc.args ?? {}, user);
          toolCalls.push({ tool: fc.name, params: fc.args, result: toolResult });
          sources.add(fc.name);
        }
      }
    }

    const textPart = candidate.parts?.find((p: any) => p.text)?.text;
    if (textPart) {
      const finalOutTokens = outputTokens || Math.ceil(textPart.length / 4);
      return { answer: textPart, sources: Array.from(sources), toolCalls, model, inputTokens, outputTokens: finalOutTokens };
    }

    return null;
  }
}
