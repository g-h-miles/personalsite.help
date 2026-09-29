import { describe, expect, it } from "vitest";
import { CONTEXT_MAX } from "../convex/lib/config";
import {
  askQuestion,
  asksLine,
  DEFAULT_QUESTIONS,
  firstName,
  QUESTION_MAX,
  quoted,
  truncate,
} from "../src/lib/ask";

describe("askQuestion", () => {
  it("uses the owner's own words when present", () => {
    expect(askQuestion("Would you hire me?", ["overall"])).toBe("Would you hire me?");
  });

  it("strips quotes the owner typed so we can add curly ones", () => {
    expect(quoted(askQuestion(`"Would you hire me?"`, ["overall"]))).toBe("“Would you hire me?”");
  });

  it("falls back to a default question for the first help-wanted focus", () => {
    expect(askQuestion(undefined, ["content", "design"])).toBe(DEFAULT_QUESTIONS.content);
    expect(askQuestion("   ", ["background"])).toBe(DEFAULT_QUESTIONS.background);
    expect(askQuestion(undefined, [])).toBe(DEFAULT_QUESTIONS.overall);
  });
});

describe("byline helpers", () => {
  it("formats roles for the mono byline", () => {
    expect(asksLine(["designer", "engineer"])).toBe("designer, engineer · asks");
    expect(asksLine([])).toBe("asks");
  });

  it("takes the first name", () => {
    expect(firstName("Nora Okafor")).toBe("Nora");
    expect(firstName("")).toBe("them");
  });
});

describe("truncate", () => {
  it("leaves short questions alone", () => {
    expect(truncate("Would you hire me?")).toBe("Would you hire me?");
    expect(truncate("x".repeat(QUESTION_MAX))).toHaveLength(QUESTION_MAX);
  });

  it("cuts long legacy questions on a word, with an ellipsis", () => {
    const long = "Does my site make it obvious that I design brands for small studios ".repeat(4);
    const cut = truncate(long);
    expect(cut.length).toBeLessThanOrEqual(QUESTION_MAX);
    expect(cut.endsWith("…")).toBe(true);
    expect(long.startsWith(cut.slice(0, -1))).toBe(true);
    expect(cut.at(-2)).not.toBe(" ");
  });

  it("cuts mid-word when there is no reasonable word break", () => {
    expect(truncate("a".repeat(300), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("matches the server's context limit", () => {
    expect(QUESTION_MAX).toBe(CONTEXT_MAX);
    expect(CONTEXT_MAX).toBe(140);
  });
});
