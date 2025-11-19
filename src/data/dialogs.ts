import { DialogData } from '../types/DialogData';

export const DIALOGS: DialogData[] = [
  {
    id: 'welcome',
    x: 200,
    width: 150,
    text: {
      cs: 'Vítejte v mém portfoliu!',
      en: 'Welcome to my portfolio!',
    },
  },
  {
    id: 'about',
    x: 500,
    width: 150,
    text: {
      cs: 'Jsem full-stack developer s vášní pro moderní technologie.',
      en: 'I\'m a full-stack developer with passion for modern technologies.',
    },
  },
  {
    id: 'skills',
    x: 800,
    width: 150,
    text: {
      cs: 'TypeScript, React, Node.js, Phaser...',
      en: 'TypeScript, React, Node.js, Phaser...',
    },
  },
  {
    id: 'projects',
    x: 1100,
    width: 150,
    text: {
      cs: 'Podívejte se na moje projekty!',
      en: 'Check out my projects!',
    },
  },
  {
    id: 'experience',
    x: 1400,
    width: 150,
    text: {
      cs: '5+ let zkušeností ve vývoji webu.',
      en: '5+ years of web development experience.',
    },
  },
  {
    id: 'hobbies',
    x: 1700,
    width: 150,
    text: {
      cs: 'Ve volném čase dělám indie hry.',
      en: 'I make indie games in my free time.',
    },
  },
  {
    id: 'contact',
    x: 1900,
    width: 150,
    text: {
      cs: 'Kontaktujte mě na email@example.com',
      en: 'Contact me at email@example.com',
    },
  },
];
