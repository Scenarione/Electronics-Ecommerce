import { test, expect } from "@playwright/test";

test("customer registers, filters, adds to cart, checks out, and views history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Browser Test Customer");
  await page
    .getByLabel("Email address")
    .fill(`browser-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("BrowserTest123!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Small upgrade." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Processors", exact: true }).click();
  await page.getByLabel("Socket", { exact: true }).selectOption("AM5");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page.locator(".product-card .product-name").first().click();
  await expect(
    page.getByRole("heading", { name: "Every detail matters." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.getByRole("link", { name: "Cart with 1 items" }).click();
  await page.reload();
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page.getByLabel("Street address").fill("123 Suthep Road");
  await page.getByLabel("City", { exact: true }).fill("Chiang Mai");
  await page.getByLabel("Postal code").fill("50200");
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next upgrade is on the list." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View all orders" }).click();
  await expect(page.locator(".order-row")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("responsive catalog has no horizontal overflow and filters work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-catalog.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Monitors", exact: true }).click();
  await page
    .getByLabel("Refresh rate (Hz)", { exact: true })
    .selectOption("165");
  await expect(page.locator(".product-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("admin creates, edits, deactivates and restores a product", async ({
  page,
}) => {
  const suffix = Date.now();
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD || "LocalAdmin123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Store admin" }).click();
  await page.getByRole("button", { name: "New product" }).click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill(`Audit CPU ${suffix}`);
  await page.getByLabel("Brand", { exact: true }).fill("Audit");
  await page.getByLabel("Category", { exact: true }).selectOption("cpu");
  await page.getByLabel("SKU", { exact: true }).fill(`AUDIT-${suffix}`);
  await page.getByLabel("URL slug").fill(`audit-${suffix}`);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Browser integration test product.");
  await page.getByLabel("Socket", { exact: true }).selectOption("AM5");
  await page.getByLabel("Cores", { exact: true }).fill("8");
  await page.getByLabel("Threads", { exact: true }).fill("16");
  await page.getByLabel("Base clock (GHz)", { exact: true }).fill("3.8");
  await page.getByLabel("Power (W)", { exact: true }).fill("65");
  await page.getByLabel("Price (THB)", { exact: true }).fill("9999");
  await page.getByLabel("Opening stock", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Locate through the API because stable UUID pagination need not put the new row first.
  let product: any;
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `/api/v1/products?q=AUDIT-${suffix}`,
        );
        const data = await response.json();
        product = data.items?.find(
          (p: { name: string }) => p.name === `Audit CPU ${suffix}`,
        );
        return product;
      },
      { timeout: 10000 },
    )
    .toBeTruthy();
  await page.goto(`/products/${product.id}`);
  await expect(
    page.getByRole("heading", { name: `Audit CPU ${suffix}` }),
  ).toBeVisible();
  await page.goto("/admin");
  await page
    .getByLabel("Find a product", { exact: true })
    .fill(`Audit CPU ${suffix}`);
  await page
    .getByRole("button", { name: `Edit Audit CPU ${suffix}`, exact: true })
    .click();
  await page.getByLabel("Price (THB)", { exact: true }).fill("8888");
  await page.getByLabel("Available for purchase").uncheck();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
  expect(
    (await page.request.get(`/api/v1/products/${product.id}`)).status(),
  ).toBe(404);
  await page
    .getByRole("button", { name: `Edit Audit CPU ${suffix}`, exact: true })
    .click();
  await page.getByLabel("Available for purchase").check();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await (await page.request.get(`/api/v1/products/${product.id}`)).json())
      .price,
  ).toBe("8888.00");
});

test("desktop catalog screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-catalog.png",
    fullPage: true,
  });
});

test("3d pc builder: interactive assembly stage, light/dark mode, camera presets, hardware mounting, and cart sync", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/builder");

  // 1. Verify 3D Studio Header & Telemetry
  await expect(page.getByText("3D PC ASSEMBLY STUDIO")).toBeVisible();
  await expect(page.getByText("ESTIMATED TDP:")).toBeVisible();
  await expect(page.getByText("CONFIGURED RIG COST:")).toBeVisible();

  // 2. Test Camera Presets toolbar
  const fullPreset = page.getByRole("button", { name: "Full Rig" });
  const mbPreset = page.getByRole("button", { name: "Motherboard" });
  const gpuPreset = page.getByRole("button", { name: "GPU Bay" });
  const coolerPreset = page.getByRole("button", { name: "Cooler Bay" });

  await expect(fullPreset).toBeVisible();
  await expect(mbPreset).toBeVisible();
  await expect(gpuPreset).toBeVisible();
  await expect(coolerPreset).toBeVisible();

  // Click Motherboard camera preset
  await mbPreset.click();
  await page.waitForTimeout(300);

  // Click GPU Bay camera preset
  await gpuPreset.click();
  await page.waitForTimeout(300);

  // Click Cooler camera preset
  await coolerPreset.click();
  await page.waitForTimeout(300);

  // Return to Full Rig preset
  await fullPreset.click();
  await page.waitForTimeout(300);

  // 3. Test Hardware Drawer Category Tabs
  await expect(
    page.getByRole("button", { name: "CPU", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Board", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "GPU", exact: true }),
  ).toBeVisible();

  // Switch to GPU tab and inspect options
  await page.getByRole("button", { name: "GPU", exact: true }).click();
  await expect(
    page.getByText("ASUS ROG Strix GeForce RTX 4090 OC"),
  ).toBeVisible();
  await expect(
    page.getByText("Sapphire Nitro+ Radeon RX 7900 XTX"),
  ).toBeVisible();

  // Select alternative GPU to trigger 3D mesh remount
  await page.getByText("Sapphire Nitro+ Radeon RX 7900 XTX").click();
  await expect(page.getByText("● Mounted on Chassis")).toBeVisible();

  // 4. Test Compatibility HUD
  await expect(
    page.getByText(/Socket Validated|Socket Mismatch/i),
  ).toBeVisible();
  await expect(page.getByText(/TDP Headroom|Over TDP Budget/i)).toBeVisible();

  // 5. Test Light Mode and Dark Mode Toggle
  const themeToggle = page.getByRole("button", {
    name: /LIGHT MODE|DARK MODE/i,
  });
  await expect(themeToggle).toBeVisible();

  // Switch to Light Mode
  await themeToggle.click();
  await expect(page.getByRole("button", { name: /DARK MODE/i })).toBeVisible();
  await page.waitForTimeout(400);

  // Capture screenshot of Light Mode
  await page.screenshot({
    path: "test-results/3d-pc-builder-light.png",
    fullPage: false,
  });

  // Switch back to Dark Mode
  await page.getByRole("button", { name: /DARK MODE/i }).click();
  await expect(page.getByRole("button", { name: /LIGHT MODE/i })).toBeVisible();
  await page.waitForTimeout(400);

  // Capture screenshot of Dark Mode
  await page.screenshot({
    path: "test-results/3d-pc-builder-dark.png",
    fullPage: false,
  });

  // 6. Test "Add Complete Build to Cart" action and cart context sync
  const addBuildBtn = page.getByRole("button", {
    name: /Add Complete Build to Cart/i,
  });
  await expect(addBuildBtn).toBeVisible();
  await addBuildBtn.click();

  // Wait for notification & cart update
  await expect(
    page
      .getByText(/Complete Rig Added to Cart|components added to your cart/i)
      .first(),
  ).toBeVisible();

  // Verify Cart Link counter updated
  const cartCounter = page.locator(".cart-link b");
  await expect(cartCounter).toBeVisible();
  const cartItemsCount = await cartCounter.textContent();
  expect(Number(cartItemsCount)).toBeGreaterThanOrEqual(1);
});

test("global dark and light mode toggle affects the entire site and persists", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // 1. Visit Catalog Page
  await page.goto("/");
  await expect(page.locator(".product-card").first()).toBeVisible();

  // Initial theme check: default data-theme attribute
  const initialTheme = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme"),
  );
  expect(initialTheme === "dark" || initialTheme === null).toBe(true);

  // 2. Click the global theme toggle button in the header
  const headerThemeToggle = page.locator(".theme-toggle-btn");
  await expect(headerThemeToggle).toBeVisible();
  await headerThemeToggle.click();

  // Verify theme changed to light mode globally on documentElement
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const storedThemeLight = await page.evaluate(() =>
    localStorage.getItem("circuit-theme"),
  );
  expect(storedThemeLight).toBe("light");

  // Capture screenshot of light mode catalog
  await page.screenshot({
    path: "test-results/site-light-mode.png",
    fullPage: false,
  });

  // 3. Navigate to a product detail page and verify theme persists
  await page.locator(".product-card .product-name").first().click();
  await expect(
    page.getByRole("heading", { name: "Every detail matters." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // 4. Navigate to the 3D PC Builder page and verify it renders in light mode
  await page.getByRole("link", { name: "3D PC Builder" }).click();
  await expect(page.getByText("3D PC ASSEMBLY STUDIO")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: /DARK MODE/i })).toBeVisible();

  // 5. Toggle theme from inside 3D PC Builder back to dark mode
  await page.getByRole("button", { name: /DARK MODE/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const storedThemeDark = await page.evaluate(() =>
    localStorage.getItem("circuit-theme"),
  );
  expect(storedThemeDark).toBe("dark");

  // 6. Navigate back to Home and verify dark mode is active everywhere
  await page.getByRole("link", { name: "← Store Catalog" }).click();
  await expect(page.locator(".product-card").first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.waitForTimeout(500);

  // Capture screenshot of dark mode catalog
  await page.screenshot({
    path: "test-results/site-dark-mode.png",
    fullPage: false,
  });

  expect(errors).toEqual([]);
});

test("customer enters min and max price filters, uses presets, and clears price filter", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.locator(".product-card").first()).toBeVisible();

  // 1. Open customer price popover via the Price toolbar button
  const priceBtn = page.getByRole("button", { name: "Filter by price" });
  await expect(priceBtn).toBeVisible();
  await priceBtn.click();

  // Verify price popover menu opened
  const pricePopover = page.getByRole("dialog", { name: "Filter by price" });
  await expect(pricePopover).toBeVisible();

  // 2. Enter custom min and max price: 10000 to 25000
  const minInput = page.getByLabel("Minimum price in THB");
  const maxInput = page.getByLabel("Maximum price in THB");
  await minInput.fill("10000");
  await maxInput.fill("25000");

  // Click Apply Price
  await page.getByRole("button", { name: "Apply Price" }).click();
  await page.waitForTimeout(400);

  // Verify URL has min_price and max_price
  await expect(page).toHaveURL(/min_price=10000/);
  await expect(page).toHaveURL(/max_price=25000/);

  // Verify all visible product cards on page satisfy 10,000 <= price <= 25,000
  await expect(page.locator(".product-card").first()).toBeVisible();
  const prices = await page
    .locator(".product-card .product-price")
    .allTextContents();
  expect(prices.length).toBeGreaterThan(0);
  for (const p of prices) {
    const numeric = Number(p.replace(/[^0-9.]/g, ""));
    expect(numeric).toBeGreaterThanOrEqual(10000);
    expect(numeric).toBeLessThanOrEqual(25000);
  }

  // 3. Test quick price preset: Under 5,000
  await priceBtn.click();
  await page.getByRole("button", { name: "Under ฿5K" }).click();
  await page.waitForTimeout(400);

  // Verify products under 5,000
  const cheapPrices = await page
    .locator(".product-card .product-price")
    .allTextContents();
  expect(cheapPrices.length).toBeGreaterThan(0);
  for (const p of cheapPrices) {
    const numeric = Number(p.replace(/[^0-9.]/g, ""));
    expect(numeric).toBeLessThanOrEqual(5000);
  }

  // 4. Test "Clear all" filter reset
  const clearAllBtn = page.getByRole("button", { name: "Clear all" });
  await expect(clearAllBtn).toBeVisible();
  await clearAllBtn.click();
  await page.waitForTimeout(400);

  // Verify price parameters removed from URL
  expect(page.url()).not.toContain("min_price");
  expect(page.url()).not.toContain("max_price");

  // Screenshot of price filter in action
  await page.screenshot({
    path: "test-results/price-filter-catalog.png",
    fullPage: false,
  });

  expect(errors).toEqual([]);
});

test("customer adds complete 3d builder rig to cart, places order, and verifies order confirmation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // 1. Register a customer account
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Rig Builder Customer");
  await page
    .getByLabel("Email address")
    .fill(`rig-customer-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("RigBuilder123!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Small upgrade." }),
  ).toBeVisible();

  // 2. Navigate to 3D PC Builder
  await page.goto("/builder");
  await expect(page.getByText("3D PC ASSEMBLY STUDIO")).toBeVisible();

  // 3. Click Add Complete Build to Cart (7 items)
  const addBuildBtn = page.getByRole("button", {
    name: /Add Complete Build to Cart/i,
  });
  await expect(addBuildBtn).toBeVisible();
  await addBuildBtn.click();

  // Notification appears
  await expect(
    page
      .getByText(/Complete Rig Added to Cart|components added to your cart/i)
      .first(),
  ).toBeVisible();

  // 4. Navigate to Cart
  await page.goto("/cart");
  await expect(page.locator(".cart-item")).toHaveCount(7);
  await expect(page.getByText("THB 168,080.00").first()).toBeVisible();

  // 5. Fill checkout details and submit order
  await page.getByLabel("Recipient").fill("Rig Customer");
  await page.getByLabel("Street address").fill("88 Nimman Road");
  await page.getByLabel("City", { exact: true }).fill("Chiang Mai");
  await page.getByLabel("Postal code").fill("50200");
  await page.getByRole("button", { name: "Place demo order" }).click();

  // 6. Verify navigation to Order page and success state
  await expect(
    page.getByRole("heading", { name: "Your next upgrade is on the list." }),
  ).toBeVisible();
  await expect(page.getByText("AMD Ryzen 9 9950X3D")).toBeVisible();
  await expect(page.getByText("ASUS ROG Crosshair X670E Hero")).toBeVisible();
  await expect(
    page.getByText("ASUS ROG Strix GeForce RTX 4090 OC"),
  ).toBeVisible();
  await expect(page.getByText("ASUS ROG Ryujin III 360 ARGB")).toBeVisible();

  // 7. Verify order shows in order history
  await page.getByRole("link", { name: "View all orders" }).click();
  await expect(page.locator(".order-row")).toHaveCount(1);
  await expect(page.getByText("THB 168,080.00").first()).toBeVisible();

  expect(errors).toEqual([]);
});
