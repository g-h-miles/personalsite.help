import { describe, expect, it } from "vitest";
import { askQuestion, asksLine, DEFAULT_QUESTIONS, firstName, quoted } from "../src/lib/ask";

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
