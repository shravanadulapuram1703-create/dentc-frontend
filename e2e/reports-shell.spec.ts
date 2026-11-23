import { test, expect, type Page } from '@playwright/test';

/**
 * Reports module shell (UX-01, 07 §2.3): the engine state decided by GET /reports/catalog.
 * Only the catalog call is mocked; login and the app shell use the real backend. The mocks
 * shrink as the engine endpoints are deployed on the test backend (11 §3.3).
 */

const CATALOG = '**/api/v1/reports/catalog';

async function mockCatalog(page: Page, status: number, body: unknown) {
  await page.route(CATALOG, (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

const engineOn = (page: Page) =>
  mockCatalog(page, 200, {
    reports: [{ report_key: 'daily.production_report', title: 'Production Report', category: 'daily', phase: 'P1' }],
  });

test.describe('Reports module shell', () => {
  test('engine off (404 reports_engine_disabled): today pages and redirects keep working', async ({ page }) => {
    await mockCatalog(page, 404, { error: { code: 'reports_engine_disabled', message: 'off', details: null } });
    await page.goto('/reports');
    await expect(page.getByText('Reports & Analytics')).toBeVisible();

    await page.goto('/reports/ledger');
    await expect(page).toHaveURL(/\/reports\/run\/production$/);

    await page.goto('/reports/no-such-page');
    await expect(page).toHaveURL(/\/reports$/);
  });

  test('engine on: hub lists the catalog, old ids redirect, unknown paths show not-found', async ({ page }) => {
    await engineOn(page);
    await page.goto('/reports');
    await expect(page.getByRole('link', { name: 'Production Report' })).toBeVisible();

    await page.goto('/reports/run/production');
    await expect(page).toHaveURL(/\/reports\/r\/daily\.production_report$/);

    await page.goto('/reports/ledger');
    await expect(page).toHaveURL(/\/reports\/c\/ledger$/);

    await page.goto('/reports/x/y');
    await expect(page.getByRole('heading', { name: 'Report page not found' })).toBeVisible();
  });

  test('misconfigured engine (503) shows "Reports are not available" on every path', async ({ page }) => {
    await mockCatalog(page, 503, {
      error: { code: 'reports_engine_misconfigured', message: 'x', details: { missing: ['GCS_BUCKET_REPORTS'] } },
    });
    for (const path of ['/reports', '/reports/r/daily.production_report']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Reports are not available' })).toBeVisible();
    }
  });

  test('unknown engine state (500) offers Retry and does not fall back to the old pages', async ({ page }) => {
    await mockCatalog(page, 500, { error: { code: 'internal_error', message: 'x', details: null } });
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports could not be loaded' })).toBeVisible();
    await expect(page.getByText('Reports & Analytics')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('a failed lazy chunk shows "A new version is available"', async ({ page }) => {
    await engineOn(page);
    // Simulate a stale deploy: the module's route chunk is gone.
    await page.route(/\/src\/features\/reports\/routes\.tsx|\/assets\/routes-[\w-]+\.js/, (route) =>
      route.fulfill({ status: 404, body: 'Not found' }),
    );
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'A new version is available' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
  });
});

/**
 * UX-15 (07 §9.5, §9.9): module styles. Probe elements are injected into the live module root, so the
 * real global stylesheet and the real reports.css decide the cascade.
 */
test.describe('Reports module styles', () => {
  test('module controls are compact despite the global !important control rules', async ({ page }) => {
    await engineOn(page);
    await page.goto('/reports');
    await expect(page.locator('.rpt-root')).toBeVisible();
    const sizes = await page.evaluate(() => {
      const root = document.querySelector('.rpt-root')!;
      root.insertAdjacentHTML(
        'beforeend',
        '<input id="m" class="rpt-input" /><select id="s" class="rpt-select"><option>A</option></select><input id="g" />',
      );
      const css = (id: string) => getComputedStyle(document.getElementById(id)!);
      const box = (id: string) => (document.getElementById(id) as HTMLElement).offsetHeight;
      return {
        moduleInput: { h: box('m'), border: css('m').borderTopWidth },
        moduleSelect: { h: box('s'), border: css('s').borderTopWidth },
        globalInput: { h: box('g'), padding: css('g').paddingLeft },
        moduleInputPadding: css('m').paddingLeft,
      };
    });
    expect(sizes.moduleInput.h).toBe(28);
    expect(sizes.moduleSelect.h).toBe(28);
    // Border widths snap to device pixels under the zoom (1px and 2px both read 1.333px), so compare
    // size and padding: module controls are compact, other inputs keep the global look.
    expect(sizes.moduleInputPadding).toBe('8px');
    expect(sizes.globalInput.padding).not.toBe('8px');
  });

  test('print: a report page prints without nav and patient-level rows; other screens print as before', async ({
    page,
  }) => {
    await engineOn(page);
    await page.goto('/reports');
    await expect(page.locator('.rpt-root')).toBeVisible();
    await page.evaluate(() => {
      document.querySelector('.rpt-root')!.insertAdjacentHTML(
        'beforeend',
        `<div class="rpt-block" data-patient-level="true"><table class="rpt-table"><tbody><tr><td>patient row</td></tr></tbody></table>
         <p class="rpt-print-notice">Patient-level rows are not printed from the screen.</p></div>
         <div class="rpt-block"><table class="rpt-table" id="agg"><tbody><tr><td>aggregate row</td></tr></tbody></table></div>`,
      );
    });
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.app-global-nav')).toBeHidden();
    await expect(page.getByText('patient row')).toBeHidden();
    await expect(page.locator('.rpt-print-notice')).toBeVisible();
    await expect(page.getByText('aggregate row')).toBeVisible();

    // Another screen in the same session (reports.css stays loaded): prints as before.
    await page.emulateMedia({ media: 'screen' });
    // Client-side navigation keeps the lazily loaded reports.css in the document.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/my-page');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/my-page/);
    await expect(page.locator('.rpt-root')).toHaveCount(0);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.app-global-nav')).toBeVisible();
  });

  test('module popovers are anchored correctly under the 0.75 zoom', async ({ page }) => {
    await engineOn(page);
    await page.goto('/reports');
    await expect(page.locator('.rpt-root')).toBeVisible();
    // A Radix-shaped popper with module content, positioned the way Floating UI does (transform in viewport px).
    const gap = await page.evaluate(async () => {
      const anchor = document.querySelector('.rpt-root h1')!.getBoundingClientRect();
      const wrap = document.createElement('div');
      wrap.setAttribute('data-radix-popper-content-wrapper', '');
      wrap.style.cssText = `position:fixed;left:0;top:0;transform:translate(${anchor.left}px,${anchor.bottom + 4}px)`;
      wrap.innerHTML = '<div class="rpt-layer" style="width:100px;height:20px">pop</div>';
      document.body.appendChild(wrap);
      await new Promise((r) => requestAnimationFrame(r));
      const pop = wrap.firstElementChild!.getBoundingClientRect();
      wrap.remove();
      return { top: pop.top - anchor.bottom, left: pop.left - anchor.left };
    });
    expect(Math.abs(gap.top - 4)).toBeLessThanOrEqual(2);
    expect(Math.abs(gap.left)).toBeLessThanOrEqual(2);
  });
});
