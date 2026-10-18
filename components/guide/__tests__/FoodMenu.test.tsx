import { render, screen, within } from "@testing-library/react";
import { FoodSection, FoodSummary } from "@/components/guide/FoodMenu";

describe("FoodSection", () => {
  it("shows every meal card with its time, dish and labels", () => {
    const { container } = render(<FoodSection />);
    const cards = container.querySelectorAll("[data-meal]");
    expect([...cards].map((c) => c.getAttribute("data-meal"))).toEqual([
      "fri-dinner",
      "sat-breakfast",
      "sat-lunch",
      "sat-dinner",
      "sun-breakfast",
      "sun-lunch",
    ]);

    const friday = container.querySelector<HTMLElement>("#meal-fri-dinner")!;
    expect(within(friday).getByText("Chicken pasta bake")).toBeInTheDocument();
    expect(within(friday).getByText("18:30 to 21:30")).toHaveClass("sr-only");
    expect(within(friday).getByText("Lactose-free")).toBeInTheDocument();
    expect(within(friday).queryByText("Gluten-free")).not.toBeInTheDocument();

    const sunday = container.querySelector<HTMLElement>("#meal-sun-lunch")!;
    expect(within(sunday).getByText("Chicken tikka masala with rice")).toBeInTheDocument();
    expect(within(sunday).getByText("Mango quark dessert")).toBeInTheDocument();
    expect(within(sunday).getAllByText("Gluten-free")).toHaveLength(2);
  });

  it("marks both breakfasts as approximate with the menu coming soon", () => {
    const { container } = render(<FoodSection />);
    for (const id of ["sat-breakfast", "sun-breakfast"]) {
      const card = container.querySelector<HTMLElement>(`#meal-${id}`)!;
      expect(within(card).getByText("Menu coming soon")).toBeInTheDocument();
      expect(within(card).getByText("Around 07:00")).toBeInTheDocument();
      expect(within(card).getByText("Menu to be announced")).toBeInTheDocument();
      expect(within(card).queryByText(/Restaurant Mauno/)).not.toBeInTheDocument();
    }
  });

  it("puts the special diet and allergy instructions up front", () => {
    render(<FoodSection />);
    const notice = screen.getByRole("complementary", { name: "Special diets and allergies" });
    expect(within(notice).getByText(/collect it directly from Restaurant Mauno's open kitchen/)).toBeInTheDocument();
    expect(within(notice).getByText(/always ask the restaurant staff before eating/)).toBeInTheDocument();
    expect(within(notice).getByText("Friday 30 October 2026")).toHaveAttribute("dateTime", "2026-10-30");
    expect(within(notice).getByRole("link", { name: /sinceai.app dashboard/ })).toHaveAttribute(
      "href",
      "https://sinceai.app/dashboard",
    );
  });

  it("names the restaurant, address and what every main meal includes", () => {
    render(<FoodSection />);
    expect(screen.getByRole("heading", { name: "Restaurant Mauno — BioCity" })).toBeInTheDocument();
    expect(screen.getByText("Tykistökatu 6, 20520 Turku, Finland")).toBeInTheDocument();
    for (const item of ["Warm main course", "Bread and spread", "Water"]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(
      screen.getByText(/sandwiches, pastries, coffee, soft drinks, energy drinks and snacks — paid separately/),
    ).toBeInTheDocument();
  });
});

describe("FoodSummary", () => {
  it("lists the weekend and links to the full food section", () => {
    const { container } = render(<FoodSummary />);
    expect(container.querySelectorAll("[data-meal]")).toHaveLength(6);
    expect(screen.getAllByText(/menu coming soon/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Full menu/ })).toHaveAttribute("href", "/hackathon-2026/guide/venue#food");
    expect(screen.getByRole("complementary", { name: "Special diets and allergies" })).toBeInTheDocument();
  });
});
