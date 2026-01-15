// Patient Modal Constants - Single Source of Truth

export const TITLES = ['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.'] as const;

export const PRONOUNS = [
  'Please Select',
  'He/Him',
  'She/Her',
  'They/Them',
  'Other',
] as const;

export const SEX_OPTIONS = ['Male', 'Female', 'Other'] as const;

export const MARITAL_STATUS_OPTIONS = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
] as const;

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

export const ETHNICITY_OPTIONS = [
  'Nothing selected',
  'Hispanic or Latino',
  'Not Hispanic or Latino',
  'Declined to Specify',
] as const;

export const REFERRAL_TYPE_OPTIONS = [
  'Patient',
  'Doctor',
  'Friend/Family',
  'Insurance',
  'Website',
  'Social Media',
  'Advertisement',
  'Walk-in',
  'Other',
] as const;

export const LANGUAGES = [
  'English',
  'Spanish',
  'Chinese',
  'French',
  'German',
  'Arabic',
  'Russian',
  'Portuguese',
  'Other',
] as const;

export const CONTACT_METHOD_OPTIONS = [
  'No Preference',
  'Home Phone',
  'Cell Phone',
  'Work Phone',
  'Email',
  'Text Message',
] as const;

export const WEIGHT_UNITS = ['lbs', 'kg'] as const;

export const STUDENT_STATUS_OPTIONS = ['No', 'Full Time', 'Part Time'] as const;

export const WEEKDAYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

export const WEEKDAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
} as const;
