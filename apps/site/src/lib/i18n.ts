export const LOCALES = ['en', 'ua'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export function pickLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * URL/content uses `ua` (since "UK" reads as United Kingdom to Ukrainian
 * readers), but BCP 47 / hreflang / Intl APIs require ISO 639-1 `uk`.
 * These helpers map between the two.
 */
const LANG_TAGS: Record<Locale, { bcp47: string; og: string; html: string }> = {
  en: { bcp47: 'en-US', og: 'en_US', html: 'en' },
  ua: { bcp47: 'uk-UA', og: 'uk_UA', html: 'uk' },
};

export function bcp47Locale(locale: Locale): string {
  return LANG_TAGS[locale].bcp47;
}
export function ogLocale(locale: Locale): string {
  return LANG_TAGS[locale].og;
}
export function htmlLang(locale: Locale): string {
  return LANG_TAGS[locale].html;
}

/** Noun forms for counters. English uses one/many; Ukrainian one/few/many. */
export interface PluralForms {
  one: string;
  few: string;
  many: string;
}

export function pluralize(locale: Locale, n: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(bcp47Locale(locale)).select(n);
  const form = rule === 'one' ? forms.one : rule === 'few' ? forms.few : forms.many;
  return `${n} ${form}`;
}

export interface Strings {
  nav: {
    home: string;
    writingTalking: string;
    inspiration: string;
    personal: string;
    workshop: string;
    lab: string;
    games: string;
    about: string;
  };
  subnav: { all: string; writing: string; talking: string; kit: string };
  site: { title: string; tagline: string; languageName: string; otherLanguageName: string };
  empty: {
    timeline: string;
    writing: string;
    talking: string;
    inspiration: string;
    personal: string;
    lab: string;
    games: string;
  };
  sections: {
    writingTalking: { title: string; lede: string };
    inspiration: { title: string; lede: string };
    personal: { title: string; lede: string };
  };
  stats: {
    posts: PluralForms;
    talks: PluralForms;
    books: PluralForms;
    photos: PluralForms;
    since: string;
  };
  timeline: {
    post: string;
    talk: string;
    book: string;
    photos: string;
    upcoming: string;
  };
  books: {
    by: string;
    rating: string;
    buy: string;
    backToBooks: string;
  };
  home: {
    catchMeAt: string;
    recent: string;
    everything: string;
    fromTheShelf: string;
    moreInspiration: string;
    role: string;
    location: string;
    followLinkedIn: string;
    elsewhere: string;
  };
  talks: {
    nextUp: string;
    past: string;
    recording: string;
    recordingOnRequest: string;
    slides: string;
    photos: string;
    repo: string;
    backToTalks: string;
  };
  kit: {
    eyebrow: string;
    title: string;
    downloadPhoto: string;
  };
  workshop: {
    eyebrow: string;
    headline: string;
    lede: string;
    formatLabel: string;
    formatOneTitle: string;
    formatOneDesc: string;
    formatTwoTitle: string;
    formatTwoDesc: string;
    formatThreeTitle: string;
    formatThreeDesc: string;
    formatsLabel: string;
    offerOneKicker: string;
    offerOneTitle: string;
    offerOneDesc: string;
    offerTwoKicker: string;
    offerTwoTitle: string;
    offerTwoDesc: string;
    viewDeck: string;
    note: string;
    ctaEyebrow: string;
    ctaHeadline: string;
    ctaHandle: string;
  };
  labels: {
    published: string;
    updated: string;
    readMore: string;
    switchLanguage: string;
    backToHome: string;
    search: string;
    controls: string;
    translationPendingFromEn: string;
    translationPendingFromUa: string;
    video: string;
    slides: string;
    repo: string;
    eventPage: string;
    close: string;
    previousPhoto: string;
    nextPhoto: string;
  };
}

const STRINGS: Record<Locale, Strings> = {
  en: {
    nav: {
      home: 'Home',
      writingTalking: 'writing & talking',
      inspiration: 'inspiration',
      personal: 'personal',
      workshop: 'workshop',
      lab: 'Lab',
      games: 'Games',
      about: 'About',
    },
    subnav: { all: 'all', writing: 'writing', talking: 'talking', kit: 'about me kit' },
    site: {
      title: 'Yaroslav Yermilov',
      tagline: 'Notes, experiments, talks.',
      languageName: 'English',
      otherLanguageName: 'Ukrainian',
    },
    empty: {
      timeline: 'Nothing here yet.',
      writing: 'No posts yet.',
      talking: 'No talks yet.',
      inspiration: 'Nothing on the shelf yet.',
      personal: 'No photos yet.',
      lab: 'No lab entries yet.',
      games: 'No games yet.',
    },
    sections: {
      writingTalking: {
        title: 'writing & talking',
        lede: 'Everything I have written and said out loud, on one timeline.',
      },
      inspiration: {
        title: 'inspiration',
        lede: 'Books that shaped how I think. Podcasts, links and people — coming later.',
      },
      personal: {
        title: 'personal',
        lede: 'Moments worth keeping, in order.',
      },
    },
    stats: {
      posts: { one: 'post', few: 'posts', many: 'posts' },
      talks: { one: 'talk', few: 'talks', many: 'talks' },
      books: { one: 'book', few: 'books', many: 'books' },
      photos: { one: 'photo', few: 'photos', many: 'photos' },
      since: 'since',
    },
    timeline: {
      post: 'post',
      talk: 'talk',
      book: 'book',
      photos: 'photos',
      upcoming: 'upcoming',
    },
    books: {
      by: 'by',
      rating: 'Rating',
      buy: 'Buy',
      backToBooks: '← Back to inspiration',
    },
    home: {
      catchMeAt: 'Catch me at',
      recent: 'Recently',
      everything: 'everything →',
      fromTheShelf: 'From the shelf',
      moreInspiration: 'more inspiration →',
      role: 'Principal Software Engineer @ Superhuman',
      location: 'Kyiv, Ukraine',
      followLinkedIn: 'Follow me on LinkedIn',
      elsewhere: 'Elsewhere',
    },
    talks: {
      nextUp: 'Next up',
      past: 'Past',
      recording: 'Recording',
      recordingOnRequest: 'Private — message on LinkedIn for access',
      slides: 'Slides',
      photos: 'Photos',
      repo: 'Repo',
      backToTalks: '← Back to talks',
    },
    kit: {
      eyebrow: 'about me kit',
      title: 'Yaroslav Yermilov',
      downloadPhoto: 'Download photo →',
    },
    workshop: {
      eyebrow: 'Workshops',
      headline: 'I help engineering teams go AI-first.',
      lede: 'Hands-on workshops built from a year of running AI-first engineering in production — not slideware. We start with a conversation about where your team is today, and I tailor the session to your level of adoption.',
      formatLabel: 'How an engagement runs',
      formatOneTitle: 'One hour, live',
      formatOneDesc: 'A focused, hands-on session — no slideware.',
      formatTwoTitle: 'Q&A, for as long as it takes',
      formatTwoDesc: 'I stay after to answer every question in the room.',
      formatThreeTitle: 'Async follow-up',
      formatThreeDesc: 'I keep answering as your team puts it into practice.',
      formatsLabel: 'Two proven formats',
      offerOneKicker: 'Intro · AI agentic engineering',
      offerOneTitle: 'Pragmatic Vibe Clauding',
      offerOneDesc:
        'From autocomplete to agents. Treat Claude Code as a talented teammate, build the right context for it, and move real work — not just coding — into agentic feedback loops.',
      offerTwoKicker: 'Advanced · Skills as team infrastructure',
      offerTwoTitle: 'Revenge of the Skill',
      offerTwoDesc:
        'Turn repeated work into skills, then organize them into a foundation — skills, hooks, plugins, marketplaces — the infrastructure that makes a whole team AI-first.',
      viewDeck: 'View the deck',
      note: 'Two proven starting points — and if your team needs something else, we will shape a new format together.',
      ctaEyebrow: 'Want this for your team?',
      ctaHeadline: 'DM me on LinkedIn',
      ctaHandle: 'in/yarik-yermilov',
    },
    labels: {
      published: 'Published',
      updated: 'Updated',
      readMore: 'Read more',
      switchLanguage: 'Switch language',
      backToHome: 'Back to home',
      search: 'Search',
      controls: 'Controls',
      translationPendingFromEn: 'This post is not yet translated to Ukrainian. Showing the English original.',
      translationPendingFromUa: 'This post is not yet translated to English. Showing the Ukrainian original.',
      video: 'video',
      slides: 'slides',
      repo: 'repo',
      eventPage: 'event',
      close: 'Close',
      previousPhoto: 'Previous photo',
      nextPhoto: 'Next photo',
    },
  },
  ua: {
    nav: {
      home: 'Головна',
      writingTalking: 'пишу й виступаю',
      inspiration: 'натхнення',
      personal: 'особисте',
      workshop: 'воркшоп',
      lab: 'Лаб',
      games: 'Ігри',
      about: 'Про',
    },
    subnav: { all: 'усе', writing: 'тексти', talking: 'виступи', kit: 'про мене · kit' },
    site: {
      title: 'Ярослав Єрмілов',
      tagline: 'Нотатки, експерименти, доповіді.',
      languageName: 'Українська',
      otherLanguageName: 'Англійська',
    },
    empty: {
      timeline: 'Поки нічого нема.',
      writing: 'Поки нема дописів.',
      talking: 'Поки нема доповідей.',
      inspiration: 'На полиці поки порожньо.',
      personal: 'Поки нема фото.',
      lab: 'Поки нема записів у лабі.',
      games: 'Поки нема ігор.',
    },
    sections: {
      writingTalking: {
        title: 'пишу й виступаю',
        lede: 'Усе, що я написав і сказав уголос, — на одній стрічці часу.',
      },
      inspiration: {
        title: 'натхнення',
        lede: 'Книги, які вплинули на те, як я думаю. Подкасти, посилання й люди — згодом.',
      },
      personal: {
        title: 'особисте',
        lede: 'Моменти, які варто зберегти, — за порядком.',
      },
    },
    stats: {
      posts: { one: 'допис', few: 'дописи', many: 'дописів' },
      talks: { one: 'доповідь', few: 'доповіді', many: 'доповідей' },
      books: { one: 'книга', few: 'книги', many: 'книг' },
      photos: { one: 'фото', few: 'фото', many: 'фото' },
      since: 'із',
    },
    timeline: {
      post: 'допис',
      talk: 'доповідь',
      book: 'книга',
      photos: 'фото',
      upcoming: 'скоро',
    },
    books: {
      by: 'автор —',
      rating: 'Оцінка',
      buy: 'Купити',
      backToBooks: '← До натхнення',
    },
    home: {
      catchMeAt: 'Побачимося',
      recent: 'Нещодавно',
      everything: 'усе →',
      fromTheShelf: 'З полиці',
      moreInspiration: 'більше натхнення →',
      role: 'Principal Software Engineer @ Superhuman',
      location: 'Київ, Україна',
      followLinkedIn: 'Підписатися в LinkedIn',
      elsewhere: 'У мережі',
    },
    talks: {
      nextUp: 'Далі',
      past: 'Минулі',
      recording: 'Запис',
      recordingOnRequest: 'Приватний — напишіть у LinkedIn для доступу',
      slides: 'Слайди',
      photos: 'Фото',
      repo: 'Репо',
      backToTalks: '← До доповідей',
    },
    kit: {
      eyebrow: 'про мене · kit',
      title: 'Ярослав Єрмілов',
      downloadPhoto: 'Завантажити фото →',
    },
    workshop: {
      eyebrow: 'Воркшопи',
      headline: 'Я допомагаю інженерним командам стати AI-first.',
      lede: 'Практичні воркшопи, побудовані на році AI-first інженерії в продакшені — не слайди заради слайдів. Ми починаємо з розмови про те, де ваша команда зараз, і я адаптую сесію під ваш рівень впровадження.',
      formatLabel: 'Як проходить співпраця',
      formatOneTitle: 'Одна година, наживо',
      formatOneDesc: 'Сфокусована практична сесія — без слайдів заради слайдів.',
      formatTwoTitle: 'Q&A, скільки знадобиться',
      formatTwoDesc: 'Я лишаюся після, щоб відповісти на кожне питання із зали.',
      formatThreeTitle: 'Async-підтримка',
      formatThreeDesc: 'Я продовжую відповідати, поки команда впроваджує це на практиці.',
      formatsLabel: 'Два перевірені формати',
      offerOneKicker: 'Вступ · AI agentic engineering',
      offerOneTitle: 'Pragmatic Vibe Clauding',
      offerOneDesc:
        'Від автодоповнення до агентів. Ставтеся до Claude Code як до талановитого колеги, давайте йому правильний контекст і переносьте в агентні цикли реальну роботу — не лише код.',
      offerTwoKicker: 'Просунутий · Скіли як інфраструктура команди',
      offerTwoTitle: 'Revenge of the Skill',
      offerTwoDesc:
        'Перетворюйте повторювану роботу на скіли, а потім збирайте їх у фундамент — скіли, хуки, плагіни, маркетплейси — інфраструктуру, що робить усю команду AI-first.',
      viewDeck: 'Переглянути презентацію',
      note: 'Дві перевірені відправні точки — а якщо вашій команді потрібно щось інше, ми разом сформуємо новий формат.',
      ctaEyebrow: 'Хочете це для своєї команди?',
      ctaHeadline: 'Напишіть мені в LinkedIn',
      ctaHandle: 'in/yarik-yermilov',
    },
    labels: {
      published: 'Опубліковано',
      updated: 'Оновлено',
      readMore: 'Читати далі',
      switchLanguage: 'Змінити мову',
      backToHome: 'На головну',
      search: 'Пошук',
      controls: 'Керування',
      translationPendingFromEn: 'Цей текст ще не перекладено українською. Показано англійський оригінал.',
      translationPendingFromUa: 'Цей текст ще не перекладено англійською. Показано український оригінал.',
      video: 'відео',
      slides: 'слайди',
      repo: 'репо',
      eventPage: 'подія',
      close: 'Закрити',
      previousPhoto: 'Попереднє фото',
      nextPhoto: 'Наступне фото',
    },
  },
};

export function t(locale: Locale): Strings {
  return STRINGS[locale];
}

export function localePath(locale: Locale, path = ''): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${locale}/${trimmed}/` : `/${locale}/`;
}

/** Display badge for a content language. */
export function languageBadge(language: Locale): string {
  return language.toUpperCase();
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'ua' : 'en';
}
