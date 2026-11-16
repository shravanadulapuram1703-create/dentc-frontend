import { describe, expect, it } from 'vitest';
import { formatToothList, parseToothList, sortTeeth, toothRange } from '../multiTooth';

describe('multiTooth', () => {
  it('expands a numeric range across arches (7-23 = 17 teeth)', () => {
    const { teeth, invalid } = parseToothList('7-23');
    expect(invalid).toEqual([]);
    expect(teeth).toHaveLength(17);
    expect(teeth[0]).toBe('7');
    expect(teeth[16]).toBe('23');
  });

  it('accepts lists, spaced/en-dash ranges, letters and reversed ranges', () => {
    expect(parseToothList('2, 4 – 6 30').teeth).toEqual(['2', '4', '5', '6', '30']);
    expect(parseToothList('e-a').teeth).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(parseToothList('07 to 9').teeth).toEqual(['7', '8', '9']);
  });

  it('flags tokens that are not teeth', () => {
    expect(parseToothList('3, 40, X, 5-Z').invalid).toEqual(['40', 'X', '5-Z']);
  });

  it('never ranges across dentitions', () => {
    expect(toothRange('3', 'C')).toEqual(['3', 'C']);
  });

  it('formats compactly and sorts in Universal order', () => {
    expect(formatToothList(parseToothList('7-23').teeth)).toBe('7-23');
    expect(formatToothList(['6', '2', '4', '5', '9', '10'])).toBe('2, 4-6, 9, 10');
    expect(sortTeeth(['A', '32', '1', '51'])).toEqual(['1', '32', 'A', '51']);
  });
});
