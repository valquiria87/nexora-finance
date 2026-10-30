import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("configuração local dos servidores MCP", () => {
  it("configura o launcher Plaid local e o endpoint remoto da documentação Pluggy", () => {
    const config: unknown = JSON.parse(
      readFileSync(resolve(process.cwd(), ".vscode", "mcp.json"), "utf8"),
    );
    expect(config).toMatchObject({
      servers: {
        plaid: {
          type: "stdio",
          command: "powershell.exe",
          args: [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "${workspaceFolder}/.vscode/start-plaid-mcp.ps1",
          ],
        },
        pluggy: {
          type: "http",
          url: "https://mcp.pluggy.ai/mcp",
        },
      },
    });
  });
});
