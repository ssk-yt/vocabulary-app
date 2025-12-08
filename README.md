# English Vocabulary App

A modern, AI-powered vocabulary learning application designed to help you master English words efficiently.
Features a Notion-like interface for adding words and an AI agent that automatically enriches your vocabulary entries with definitions, examples, and synonyms.

## Features

- **Smart Vocabulary Addition**: Add a word, and our AI (powered by OpenRouter/Google Gemini) automatically fills in the definition, part of speech, example sentences, synonyms, and etymology.
- **Notion-like Interface**: Clean and intuitive UI for managing your word list.
- **Dashboard**: View your vocabulary collection at a glance.
- **Secure API Key Management**: Your OpenAI/OpenRouter API key is encrypted client-side and stored securely.
- **(Planned) Quiz Mode**: Test your knowledge with an Abceed-style quiz interface.
- **(Planned) Chat Integration**: Add words simply by chatting with an AI assistant.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **AI/Edge**: Supabase Edge Functions, Deno, OpenRouter API
- **State Management**: Zustand
- **Monorepo**: Turborepo, pnpm

## Getting Started

### Prerequisites

- Node.js (v20+)
- pnpm
- Docker (for Supabase local development)
- Supabase CLI

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd vocabulary-app
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Start Supabase locally**
    ```bash
    supabase start
    ```

4.  **Set up Environment Variables**
    
    - Copy `.env.local.example` to `apps/web/.env.local` and fill in the Supabase credentials (from `supabase status`).
    - Create `supabase/.env` and add your `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_BASE_URL` (if using OpenRouter).

5.  **Start Edge Functions**
    ```bash
    npx supabase functions serve --env-file supabase/.env
    ```

6.  **Run the Frontend**
    ```bash
    pnpm dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser.

## usage

1.  Go to **Settings** and enter your OpenRouter (or OpenAI) API Key.
2.  Go back to the **Dashboard** and click "Add Vocabulary".
3.  Enter a word (e.g., "Serendipity") and click "Add".
4.  Watch as the AI automatically populates the details!
