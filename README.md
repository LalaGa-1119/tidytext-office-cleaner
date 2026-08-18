# TidyText Office Cleaner

A lightweight, privacy-first browser tool for cleaning text copied from websites,
documents, emails, and chats.

## What it does

- normalizes broken spacing while preserving paragraphs;
- removes common tracking parameters from URLs;
- converts basic HTML into readable Markdown;
- fixes inconsistent bullet lists and smart punctuation;
- optionally removes emoji;
- applies sentence, title, upper, or lower case;
- shows live word, character, and link counts;
- copies or downloads the cleaned result; and
- processes everything locally in the browser.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`.

## Test

```bash
npm test
```

## Privacy

TidyText has no backend, analytics, cookies, account system, or API request. Text
never leaves the browser.

## Attribution

This project is an expanded adaptation of [Smart Clipboard by Rishi](https://gist.github.com/byrishi/c53c3fcbd6f2e071d01ec6fba372a7b0), released under the MIT License. See [NOTICE.md](./NOTICE.md) for details.

## License

MIT
