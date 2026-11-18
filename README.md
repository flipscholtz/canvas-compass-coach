# Canvas Stack

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://canvas-compass-coach.lovable.app

## Hosting and AI

Currently hosted on Lovable, including Lovable's GPT integration for the AI component: https://canvas-compass-coach.lovable.app/

## Admin account

The password for the `admin` user is set using the environment variable / secret `CANVASSTACK_ADMIN_PASSWORD`. From that account, additional users can be created.

## Hosting your own copy on Lovable

These steps give you an independent copy with its own database, accounts and AI usage (billed to your Lovable workspace credits).

1. **Get the code.** On GitHub, choose **Code → Download ZIP** (or zip a clone, leaving out `.git` and `node_modules`).
2. **Import into Lovable.** On your Lovable dashboard, open the **+** menu in the prompt box → **Import project to Lovable → Upload code**, and select the ZIP. (This option is rolling out gradually; if you don't see it, create a new project and ask the agent to rebuild from this repository's files.)
3. **Enable Lovable Cloud.** Ask the agent to enable Lovable Cloud and apply the database migrations in `drizzle/migrations/` in order (`0000` → `0002`). These create the account profiles, private scenarios, shared demo scenarios, admin roles and tour preferences, with row-level security.
4. **Set the admin password secret.** Ask the agent to add a secret named `CANVASSTACK_ADMIN_PASSWORD` (12–128 characters). Enter the value in the secure form, never in chat. The first sign-in as `admin` with that password creates the admin account.
5. **GPT integration (Lovable AI).** No API key is needed: the coach calls Lovable AI (`openai/gpt-6.1-sol`) from authenticated server functions via `@lovable.dev/ai-gateway`, which is available automatically once Lovable Cloud is on. Usage is charged to your workspace's AI credits; if credits run out the coach falls back to its offline mode.
6. **Create users.** Sign in as `admin`, open the **Admin** tab and add username/password accounts. Users sign in with just a username; there is no public sign-up.
7. **Publish.** Click **Publish** to get your own `*.lovable.app` URL (custom domains are available on paid plans). Optionally connect GitHub in **Project settings → Git** to sync to a new repository of your own.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/55008479-0be7-4747-b973-d2ff91e8bb21).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
