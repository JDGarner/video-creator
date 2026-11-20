import { describe, expect, it } from "vitest";
import { numberToWords, spokenWords } from "./numbers";

describe("numbers", () => {
  it("names numbers", () => {
    expect(numberToWords(44)).toEqual(["forty", "four"]);
    expect(numberToWords(200)).toEqual(["two", "hundred"]);
    expect(numberToWords(50000)).toEqual(["fifty", "thousand"]);
    expect(numberToWords(1803)).toEqual(["one", "thousand", "eight", "hundred", "three"]);
  });

  it("expands what whisper writes", () => {
    expect(spokenWords("85-90%")).toEqual(["eighty", "five", "to", "ninety", "percent"]);
    expect(spokenWords("44kg,")).toEqual(["forty", "four", "kilograms,"]);
    expect(spokenWords("50,000")).toEqual(["fifty", "thousand"]);
    expect(spokenWords("three-ton")).toEqual(["three", "ton"]);
    expect(spokenWords("Diprotodon,")).toEqual(["diprotodon,"]);
  });
});
