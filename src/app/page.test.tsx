import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("menampilkan status provider tanpa metrik palsu", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /fondasi lokal sedang disiapkan/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("not_configured")).toBeInTheDocument();
    expect(screen.getByText("Belum terhubung")).toBeInTheDocument();
  });
});
