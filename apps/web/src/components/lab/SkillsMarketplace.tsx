import { useState } from 'react';

// A quiet Tier-2 lab island: a showcase of my public AI-agent skills marketplace
// (github.com/yermilov/learn-yy-skills). It lives in the reading column, so it
// stays editorial — hairline rules and the paper/elevated surfaces, green as the
// structural voice, orange only for the copy tick and focus. Two interactive
// bits: a host switcher over the install commands (with copy-to-clipboard) and the
// plugins laid out with their skills. Bilingual via the `locale` prop the .mdx
// passes down.

type Locale = 'en' | 'ua';

const REPO = 'yermilov/learn-yy-skills';
const REPO_URL = 'https://github.com/yermilov/learn-yy-skills';

type Target =
  | { id: string; label: string; kind: 'command'; command: string }
  | { id: string; label: string; kind: 'steps'; steps: string; handle?: string };

const TARGETS = (s: (typeof STR)[Locale]): Target[] => [
  {
    id: 'claude-code',
    label: 'Claude Code',
    kind: 'command',
    command: `/plugin marketplace add ${REPO}\n/plugin install meta@learn-yy-skills`,
  },
  {
    id: 'cowork',
    label: s.hostCowork,
    kind: 'steps',
    steps: s.stepsCowork,
    handle: REPO,
  },
  {
    id: 'codex',
    label: 'Codex',
    kind: 'steps',
    steps: s.stepsCodex,
    handle: REPO,
  },
  {
    id: 'npx',
    label: s.hostNpx,
    kind: 'command',
    command: `npx skills add ${REPO} --list\nnpx skills add ${REPO} --skill plugin-dev`,
  },
];

type Skill = { name: string; en: string; ua: string };
type Plugin = { name: string; en: string; ua: string; skills: Skill[] };

const PLUGINS: Plugin[] = [
  {
    name: 'meta',
    en: "The marketplace's own tooling — how to build and maintain a great skills marketplace.",
    ua: 'Інструментарій самого маркетплейсу — як будувати й підтримувати якісний маркетплейс скілів.',
    skills: [
      {
        name: 'plugin-dev',
        en: 'Build a great marketplace: repo layout, the Claude + Codex dual-manifest packaging, and the version discipline auto-update keys off.',
        ua: 'Побудувати якісний маркетплейс: структура репозиторію, подвійні маніфести Claude + Codex і дисципліна версій, від якої залежить авто-оновлення.',
      },
      {
        name: 'skill-authoring',
        en: 'Write, structure and review Agent Skills (SKILL.md) that trigger reliably and stay lean — portable across Claude Code and Codex.',
        ua: 'Писати, структурувати й рецензувати Agent Skills (SKILL.md), що надійно спрацьовують і лишаються стислими — сумісні з Claude Code і Codex.',
      },
      {
        name: 'marketplace-health',
        en: 'Check that an installed marketplace is on the latest version and auto-updating, on either host.',
        ua: 'Перевірити, що встановлений маркетплейс має найновішу версію й авто-оновлюється — на будь-якому хості.',
      },
      {
        name: 'enable-autoupdate',
        en: 'Turn on marketplace auto-update so your plugins stay current — Claude Code and Codex.',
        ua: 'Увімкнути авто-оновлення маркетплейсу, щоб плагіни лишались актуальними — Claude Code і Codex.',
      },
      {
        name: 'clone-marketplace',
        en: "Bootstrap a new marketplace — or update an existing one's meta plugin — from this structure, fetched from GitHub at the latest version.",
        ua: 'Створити новий маркетплейс — або оновити meta-плагін наявного — за цією структурою, взятою з GitHub найновішої версії.',
      },
      {
        name: 'install-bun',
        en: "Install the Bun runtime the marketplace's TypeScript scripts and session-start hook run on.",
        ua: 'Встановити середовище Bun, на якому працюють TypeScript-скрипти маркетплейсу та хук на старті сесії.',
      },
    ],
  },
  {
    name: 'home-it',
    en: 'Practical playbooks for the tech in your home.',
    ua: 'Практичні гайди для домашньої техніки.',
    skills: [
      {
        name: 'check-network',
        en: 'Diagnose a slow home network end-to-end and recommend the highest-leverage fix — wired backhaul first, a second wireless extender never.',
        ua: 'Діагностувати повільну домашню мережу від початку до кінця й порадити найдієвіше виправлення — спершу дротовий backhaul, другий бездротовий екстендер — ніколи.',
      },
    ],
  },
];

const STR = {
  en: {
    installTitle: 'Install',
    installNote: 'Pick your agent, copy, paste.',
    copy: 'Copy',
    copied: 'Copied',
    pluginTitle: 'What’s inside',
    pluginLead: 'The plugins so far — each installs with /plugin install ‹name›@learn-yy-skills:',
    repoCta: 'Browse the source on GitHub',
    hostCowork: 'Cowork / Desktop',
    hostNpx: 'One skill (npx)',
    stepsCowork:
      'Settings → Extensions / Plugins → Add marketplace, paste the repo below, then install a plugin from the Directory.',
    stepsCodex:
      'Add the repo below as a plugin marketplace (the exact command depends on your Codex version), then install a plugin.',
  },
  ua: {
    installTitle: 'Встановлення',
    installNote: 'Обери свого агента, скопіюй, встав.',
    copy: 'Копіювати',
    copied: 'Скопійовано',
    pluginTitle: 'Що всередині',
    pluginLead: 'Плагіни наразі — кожен ставиться через /plugin install ‹name›@learn-yy-skills:',
    repoCta: 'Переглянути код на GitHub',
    hostCowork: 'Cowork / Desktop',
    hostNpx: 'Один скіл (npx)',
    stepsCowork:
      'Settings → Extensions / Plugins → Add marketplace, встав репозиторій нижче, потім встанови плагін з Directory.',
    stepsCodex:
      'Додай репозиторій нижче як plugin marketplace (точна команда залежить від версії Codex), потім встанови плагін.',
  },
} as const;

export default function SkillsMarketplace({ locale = 'en' }: { locale?: Locale }) {
  const s = STR[locale];
  const targets = TARGETS(s);
  const [active, setActive] = useState('claude-code');
  const [copied, setCopied] = useState<string | null>(null);
  const current = targets.find((t) => t.id === active) ?? targets[0]!;

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    } catch {
      /* clipboard unavailable — the command is visible to copy by hand */
    }
  };

  return (
    <div className="not-prose my-8 flex flex-col gap-8 font-[inherit] text-ink">
      {/* Install */}
      <section className="rounded-md border border-rule bg-elevated">
        <header className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-3">
          <h2 className="m-0 text-lg font-semibold text-ink">{s.installTitle}</h2>
          <span className="text-sm text-ink-muted">{s.installNote}</span>
        </header>

        <div
          role="tablist"
          aria-label={s.installTitle}
          className="flex flex-wrap gap-1 border-b border-rule px-3 py-2"
        >
          {targets.map((t) => {
            const on = t.id === active;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => setActive(t.id)}
                className={`rounded-[3px] px-2.5 py-1 font-mono text-xs transition-colors ${
                  on ? 'bg-green/10 text-green-deep' : 'text-ink-muted hover:text-ink'
                }`}
                style={on ? { boxShadow: 'inset 0 -2px 0 var(--green-primary)' } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {current.kind === 'command' ? (
            <div className="relative">
              <pre className="m-0 overflow-x-auto rounded-[6px] border border-rule bg-paper p-4 pr-20 font-mono text-[0.82rem] leading-relaxed text-ink">
                {current.command}
              </pre>
              <button
                onClick={() => copy(current.command, current.id)}
                className="absolute right-3 top-3 rounded-[3px] border border-rule bg-elevated px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wide text-ink-muted transition-colors hover:text-ink"
              >
                {copied === current.id ? <span className="text-green">{s.copied}</span> : s.copy}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[0.95rem] leading-relaxed text-ink">{current.steps}</p>
              {current.handle ? (
                <div className="relative">
                  <pre className="m-0 overflow-x-auto rounded-[6px] border border-rule bg-paper p-4 pr-20 font-mono text-[0.82rem] text-ink">
                    {current.handle}
                  </pre>
                  <button
                    onClick={() => copy(current.handle as string, current.id)}
                    className="absolute right-3 top-3 rounded-[3px] border border-rule bg-elevated px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wide text-ink-muted transition-colors hover:text-ink"
                  >
                    {copied === current.id ? <span className="text-green">{s.copied}</span> : s.copy}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* What's inside */}
      <section>
        <h2 className="m-0 mb-2 text-lg font-semibold text-ink">{s.pluginTitle}</h2>
        <p className="m-0 mb-5 max-w-[64ch] text-[0.95rem] leading-relaxed text-ink-muted">
          {s.pluginLead}
        </p>
        <div className="flex flex-col gap-6">
          {PLUGINS.map((p) => (
            <div key={p.name}>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="font-mono text-[0.95rem] font-medium text-green-deep">{p.name}</span>
                <span className="text-sm text-ink-muted">{locale === 'ua' ? p.ua : p.en}</span>
              </div>
              <ul className="m-0 mt-2 list-none divide-y divide-rule border-y border-rule p-0">
                {p.skills.map((sk) => (
                  <li key={sk.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-5">
                    <span className="shrink-0 font-mono text-sm text-green sm:w-44">{sk.name}</span>
                    <span className="text-[0.95rem] leading-snug text-ink-muted">
                      {locale === 'ua' ? sk.ua : sk.en}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="self-start font-mono text-sm text-green"
      >
        {s.repoCta} ↗
      </a>
    </div>
  );
}
