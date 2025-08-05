# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/6c1fe617-e800-45c7-84f0-6ca73e3e21c2

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/6c1fe617-e800-45c7-84f0-6ca73e3e21c2) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/6c1fe617-e800-45c7-84f0-6ca73e3e21c2) and click on Share -> Publish.

## Environment Variables

This project requires environment variables to be configured for different environments:

**NEXT_PUBLIC_APP_URL**: Must match the Site URL configured in Supabase Authentication → URL Configuration for each environment:
- Development: `http://localhost:3000` (set in `.env.local`)
- Preview: `https://6c1fe617-e800-45c7-84f0-6ca73e3e21c2.lovableproject.com` (set in Lovable deployment settings)
- Production: `https://seshprep.com` (set in Lovable deployment settings)

This ensures password reset links work correctly across all environments.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
