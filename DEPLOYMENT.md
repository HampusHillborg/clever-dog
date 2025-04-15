# CleverDog Admin Deployment Guide

This guide explains how to securely deploy the CleverDog admin dashboard to Netlify.

## Prerequisites

- A GitHub account
- A Netlify account
- Your CleverDog code repository

## Step 1: Prepare Your Repository

Ensure your repository contains all the necessary files, including:
- The React application code
- Netlify configuration files (`netlify.toml`)
- Netlify serverless functions in the `netlify/functions` directory

## Step 2: Set Up Netlify Deployment

1. Log in to [Netlify](https://app.netlify.com/)
2. Click "Add new site" > "Import an existing project"
3. Connect to your GitHub account and select your repository
4. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist` (or whatever you've configured in your build)
5. Click "Deploy site"

## Step 3: Configure Environment Variables

For security, the admin credentials are stored as environment variables in Netlify:

1. In your Netlify dashboard, go to the site you just deployed
2. Navigate to "Site settings" > "Environment variables"
3. Add the following environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `ADMIN_USERNAME` | `your-admin-username` | The admin username for logging in |
| `ADMIN_PASSWORD` | `your-secure-password` | A strong password for admin access |
| `JWT_SECRET` | `your-random-secret-key` | A long, random string used to sign JWT tokens |

### Generating a Secure JWT Secret

For the JWT_SECRET, generate a secure random string. You can use this command:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 4: Test Your Deployment

1. Visit your deployed site's admin page
2. Log in using the credentials you set in the environment variables
3. Verify that the login works and you can access the admin functions

## Security Notes

This deployment includes the following security measures:

1. **No hardcoded credentials**: All sensitive information is stored in environment variables.
2. **JWT token authentication**: Secure JWT tokens are used for authentication with a 12-hour expiration.
3. **Serverless functions**: Authentication happens in protected serverless functions, not in client-side code.

## Troubleshooting

If you encounter issues:

1. **Function not found**: Make sure your `netlify.toml` file has the correct `functions` directory path.
2. **Authentication fails**: Verify your environment variables are set correctly.
3. **Build errors**: Check your build logs in the Netlify dashboard for specific error messages.

## Updating Your Site

When you make changes to your repository and push them to GitHub, Netlify will automatically rebuild and deploy your site. To update environment variables, you'll need to do that manually in the Netlify dashboard. 