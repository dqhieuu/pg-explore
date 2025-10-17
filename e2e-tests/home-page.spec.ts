import { expect, test } from "@playwright/test";

test("has a title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("pgExplore");
});

test("can navigate from home page to memory database page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("pgExplore");
  await page.getByTestId("create-memory-db-btn").click();
  await expect(page).toHaveURL(/\/database\/memory/);
});

test("can navigate from home page to persistent database page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("create-persistent-db-btn").click();

  const getDbInputNameInputBtn = () =>
    page.getByTestId("create-persistent-db-name-input");
  const getSubmitCreateDbBtn = () =>
    page.getByTestId("create-persistent-db-submit-btn");

  // Input is pre-filled with a random name
  await expect(getDbInputNameInputBtn()).toHaveValue(/\w+/);

  // Expect the submit button to be disabled if the input is empty
  await getDbInputNameInputBtn().fill("   \t");
  await expect(getSubmitCreateDbBtn()).toBeDisabled();

  await getDbInputNameInputBtn().fill("test-db");
  await expect(getSubmitCreateDbBtn()).not.toBeDisabled();
  await getSubmitCreateDbBtn().click();
  await expect(page).toHaveURL(/\/database\/(?!memory)/);
  await page.waitForTimeout(1000);

  await page.goto("/");
  await page.locator("[data-testclass='database-list-item']").first().click();
  await expect(page).toHaveURL(/\/database\/(?!memory)/);
});

test("random database name changes on reopen popup", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("create-persistent-db-btn").click();
  const dbNameInput = page.getByTestId("create-persistent-db-name-input");
  const dbName = await dbNameInput.inputValue();
  expect(dbName).not.toBe("");

  const closeBtn = page.getByRole("button", { name: "Close" });
  await closeBtn.click();
  await expect(dbNameInput).not.toBeAttached();

  await page.getByTestId("create-persistent-db-btn").click();
  const newDbName = await dbNameInput.inputValue();
  expect(newDbName).not.toBe(dbName);
});
