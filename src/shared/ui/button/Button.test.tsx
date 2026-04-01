import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Button", () => {
  it("should handle click", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    function Button() {
      return <button onClick={onClick}>Click me</button>;
    }

    render(<Button />);

    const button = screen.getByText("Click me");
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
