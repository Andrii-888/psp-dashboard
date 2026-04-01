import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { CopyButton } from "./CopyButton";

const writeTextMock = jest.fn();

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: writeTextMock,
    },
    configurable: true,
  });

  writeTextMock.mockClear();
});

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("CopyButton", () => {
  it("copies value to clipboard on click", async () => {
    render(<CopyButton value="hello world" />);

    const button = screen.getByRole("button");
    button.click(); // 🔴 вместо userEvent

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1);
      expect(writeTextMock).toHaveBeenCalledWith("hello world");
    });
  });
});
