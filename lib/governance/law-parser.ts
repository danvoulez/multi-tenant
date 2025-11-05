/**
 * LogLine Constitution v1.1 — Law Parser
 * 
 * This module parses .law files following the EBNF grammar from §5.
 * 
 * Grammar (§5.1):
 * Law          ::= "law" LawId ":" NL Indent Header Blocks
 * Header       ::= "scope:" Scope NL "clock:" Clock NL
 * Blocks       ::= TriageBlock { NL SettingBlock }
 * TriageBlock  ::= IfOkBlock NL IfDoubtBlock NL IfNotBlock
 * IfOkBlock    ::= "if ok:" Expr NL "then:" ActionList
 * IfDoubtBlock ::= "if doubt:" Expr NL "then:" ActionList
 * IfNotBlock   ::= "if not:" Expr NL "then:" ActionList
 */

import { LawDefinition, LawAction } from "./types";

/**
 * Parse a .law file into a LawDefinition.
 * 
 * §5.3: Expression parse or evaluation failure MUST short-circuit to doubt.
 */
export function parseLawFile(lawText: string): LawDefinition {
  const lines = lawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    throw new Error("Empty law file");
  }

  // Parse header: law <name>:<version>:
  const headerMatch = lines[0].match(/^law\s+([\w_-]+):([\d.]+):$/);
  if (!headerMatch) {
    throw new Error(`Invalid law header: ${lines[0]}`);
  }

  const [, name, version] = headerMatch;
  const id = `${name}:${version}`;

  // Parse scope
  const scopeLine = lines.find((l) => l.startsWith("scope:"));
  if (!scopeLine) {
    throw new Error("Missing scope declaration");
  }
  const scope = scopeLine.replace("scope:", "").trim();

  // Parse clock
  const clockLine = lines.find((l) => l.startsWith("clock:"));
  if (!clockLine) {
    throw new Error("Missing clock declaration");
  }
  const clock = clockLine.replace("clock:", "").trim();

  // Parse triage blocks
  const triage = parseTriageBlocks(lines);

  return {
    id,
    version,
    scope,
    clock,
    triage,
  };
}

/**
 * Parse triage blocks (if ok, if doubt, if not)
 */
function parseTriageBlocks(lines: string[]): LawDefinition["triage"] {
  const blocks = {
    ok: { condition: "", actions: [] as LawAction[] },
    doubt: { condition: "", actions: [] as LawAction[] },
    not: { condition: "", actions: [] as LawAction[] },
  };

  let currentBlock: "ok" | "doubt" | "not" | null = null;
  let expectingCondition = false;
  let expectingActions = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("if ok:")) {
      currentBlock = "ok";
      blocks.ok.condition = line.replace("if ok:", "").trim();
      expectingCondition = false;
      expectingActions = true;
    } else if (line.startsWith("if doubt:")) {
      currentBlock = "doubt";
      blocks.doubt.condition = line.replace("if doubt:", "").trim();
      expectingCondition = false;
      expectingActions = true;
    } else if (line.startsWith("if not:")) {
      currentBlock = "not";
      blocks.not.condition = line.replace("if not:", "").trim();
      expectingCondition = false;
      expectingActions = true;
    } else if (line.startsWith("then:") && currentBlock && expectingActions) {
      const actionsStr = line.replace("then:", "").trim();
      blocks[currentBlock].actions = parseActions(actionsStr);
      expectingActions = false;
    }
  }

  return blocks;
}

/**
 * Parse action list from string.
 * 
 * §5.1 Grammar:
 * ActionList ::= Action { "," Action }
 * Action     ::= "accept" | "hold(hours=N)" | "terminate(reason=X)" | ...
 */
function parseActions(actionsStr: string): LawAction[] {
  const actions: LawAction[] = [];
  const parts = actionsStr.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part === "accept") {
      actions.push({ type: "accept" });
    } else if (part === "append_ledger") {
      actions.push({ type: "append_ledger" });
    } else if (part.startsWith("hold(")) {
      const hoursMatch = part.match(/hold\(hours=(\d+)\)/);
      if (hoursMatch) {
        actions.push({ type: "hold", hours: parseInt(hoursMatch[1], 10) });
      }
    } else if (part.startsWith("terminate(")) {
      const reasonMatch = part.match(/terminate\(reason=(\w+)\)/);
      if (reasonMatch) {
        actions.push({ type: "terminate", reason: reasonMatch[1] });
      }
    } else if (part.startsWith("notify(")) {
      const roleMatch = part.match(/notify\(role=(\w+)\)/);
      if (roleMatch) {
        actions.push({ type: "notify", role: roleMatch[1] });
      }
    } else if (part.startsWith("tag(")) {
      const tagMatch = part.match(/tag\(key=(\w+),val=(\w+)\)/);
      if (tagMatch) {
        actions.push({
          type: "tag",
          key: tagMatch[1],
          val: tagMatch[2],
        });
      }
    } else if (part.startsWith("emit(")) {
      const eventMatch = part.match(/emit\(event=(\w+)\)/);
      if (eventMatch) {
        actions.push({ type: "emit", event: eventMatch[1] });
      }
    }
  }

  return actions;
}

/**
 * Compute BLAKE3 hash of law text for integrity verification.
 * 
 * §18 Law Lifecycle: laws MUST be registered with hash.
 * 
 * Note: This is a placeholder. In production, use actual BLAKE3 library.
 */
export function hashLawText(lawText: string): string {
  // Placeholder - use actual BLAKE3 in production
  let hash = 0;
  for (let i = 0; i < lawText.length; i++) {
    const char = lawText.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `blake3:${Math.abs(hash).toString(16)}`;
}

/**
 * Load and parse a .law file from filesystem.
 * 
 * §18: A law MUST be registered via signed manifest.
 */
export async function loadLawFile(filePath: string): Promise<LawDefinition> {
  // In browser/Next.js, use fetch or import
  const response = await fetch(filePath);
  const lawText = await response.text();
  
  const law = parseLawFile(lawText);
  law.hash = hashLawText(lawText);
  
  return law;
}
