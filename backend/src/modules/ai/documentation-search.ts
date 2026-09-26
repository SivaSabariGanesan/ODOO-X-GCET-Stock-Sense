import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface DocSection {
  title: string;
  sectionNumber?: string;
  content: string;
}

class DocumentationSearchService {
  private sections: DocSection[] = [];
  private isLoaded = false;

  private loadDocumentation() {
    if (this.isLoaded) return;

    // Search for API_INTEGRATION.md in workspace root or relative paths
    const possiblePaths = [
      join(process.cwd(), "..", "docs", "API_INTEGRATION.md"),
      join(process.cwd(), "docs", "API_INTEGRATION.md"),
      join(process.cwd(), "..", "..", "docs", "API_INTEGRATION.md"),
    ];

    let fileContent = "";
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        try {
          fileContent = readFileSync(p, "utf-8");
          break;
        } catch {
          // continue
        }
      }
    }

    if (!fileContent) {
      this.sections = [
        {
          title: "General API Documentation",
          content: "StockSense API base URL: http://localhost:3000. Uses Bearer Token / HTTP-Only Cookie auth.",
        },
      ];
      this.isLoaded = true;
      return;
    }

    // Split markdown file into sections by headings
    const rawSections = fileContent.split(/\n(?=##?\s+)/);
    this.sections = rawSections.map((sec) => {
      const lines = sec.trim().split("\n");
      const titleLine = lines[0] ?? "";
      const title = titleLine.replace(/^##?\s+/, "").trim();
      return {
        title,
        content: sec.trim(),
      };
    });

    this.isLoaded = true;
  }

  public search(query: string, maxResults = 3): DocSection[] {
    this.loadDocumentation();
    const queryLower = query.toLowerCase();
    const queryKeywords = queryLower.split(/\s+/).filter((k) => k.length > 2);

    const scored = this.sections.map((section) => {
      const titleLower = section.title.toLowerCase();
      const contentLower = section.content.toLowerCase();
      let score = 0;

      if (titleLower.includes(queryLower)) score += 10;
      if (contentLower.includes(queryLower)) score += 5;

      for (const kw of queryKeywords) {
        if (titleLower.includes(kw)) score += 3;
        if (contentLower.includes(kw)) score += 1;
      }

      return { section, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored
      .filter((item) => item.score > 0)
      .slice(0, maxResults)
      .map((item) => item.section);
  }

  public getSectionByTopic(topic: string): string | null {
    this.loadDocumentation();
    const topicLower = topic.toLowerCase();
    const match = this.sections.find(
      (s) => s.title.toLowerCase().includes(topicLower) || s.content.toLowerCase().includes(topicLower)
    );
    return match ? match.content : null;
  }
}

export const documentationSearchService = new DocumentationSearchService();
