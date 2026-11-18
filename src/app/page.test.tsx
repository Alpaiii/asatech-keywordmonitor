import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("Home", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("mengarahkan root ke halaman login", () => {
    expect(() => Home()).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
