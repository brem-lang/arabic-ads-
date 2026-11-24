export type Question = { key: string; label: string; options: string[] };

// Each answer is sent to the CRM as { key, value } where value is the chosen option's text.
export const QUESTIONS: Question[] = [
  {
    key: 'is_saudi_citizen',
    label: 'Are you a Saudi Citizen?',
    options: ['Yes, I am a Saudi citizen.', 'No'],
  },
  {
    key: 'investment_amount',
    label: 'What amount do you plan to allocate for investment?',
    options: [
      'SAR 1,000–4,999',
      'SAR 5,000–9,999',
      'SAR 10,000–49,999',
      'SAR 50,000 or more',
      "I haven't decided yet.",
    ],
  },
  {
    key: 'investment_start_time',
    label: 'When do you plan to start investing?',
    options: [
      'Within the next 7 days',
      'Within the next 30 days',
      'Within 1–3 months',
      'I am just looking for now',
    ],
  },
  {
    key: 'experience_level',
    label: 'What is your level of experience in trading and investing?',
    options: [
      'Beginner — I am ready to learn',
      'I have some experience',
      'Experienced investor',
      'I am actively involved in trading in the financial markets',
    ],
  },
  {
    key: 'wants_contact',
    label:
      'Would you like to be contacted to discuss investment options, trading risks, and the requirements for opening an account?',
    options: [
      'Yes, I am ready to discuss the next steps.',
      'Yes, but I need more information first.',
    ],
  },
];

export type Answers = Record<string, string>;
