import { expect, test } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:5173";
// const MEMORY_DB_URL = `${BASE_URL}/database/memory`;

test("has a title", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle("pgExplore");
});

test("can navigate from home page to memory database page", async ({
  page,
}) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle("pgExplore");
  await page.getByTestId("create-memory-db-btn").click();
  await expect(page).toHaveURL(/\/database\/memory/);
});

test("can navigate from home page to persistent database page", async ({
  page,
}) => {
  await page.goto(BASE_URL);
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

  await page.goto(BASE_URL);
  await page.locator("[data-testclass='database-list-item']").first().click();
  await expect(page).toHaveURL(/\/database\/(?!memory)/);
});
