import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Run an axe-core accessibility scan on the current page and fail the test on
 * any serious/critical WCAG 2.1 A/AA violation. Minor/moderate issues are
 * attached to the report as data (not gated) so a large legacy UI can adopt a11y
 * testing incrementally without a wall of red on day one.
 *
 * Deepen per-screen audits (contrast, focus order, keyboard nav, tap targets)
 * with the `chrome-devtools-mcp:a11y-debugging` skill.
 */
export async function checkA11y(
  page: Page,
  testInfo: TestInfo,
  opts: { disableRules?: string[]; include?: string } = {},
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
  ]);
  if (opts.include) builder = builder.include(opts.include);
  if (opts.disableRules?.length) builder = builder.disableRules(opts.disableRules);

  const results = await builder.analyze();

  await testInfo.attach('axe-violations', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  const summary = blocking
    .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join('\n');

  expect(blocking, `Serious/critical accessibility violations:\n${summary}`).toEqual([]);
}
