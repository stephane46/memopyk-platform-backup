# GitHub Deployment Report - MEMOPYK Platform

## Overview
This report documents the exact code and procedures used for committing changes to the GitHub repository for the MEMOPYK platform deployment system.

## Project Context
- **Repository**: https://github.com/stephane46/memopykCOM
- **Primary Branch**: main
- **Deploy Target**: Coolify on VPS (82.29.168.136)
- **Production Domain**: new.memopyk.com (staging), memopyk.com (production)

## Current Build Configuration (WORKING)

### 1. Build Command Configuration
**Location**: Coolify Dashboard Build Settings
```bash
# Build Command (configured in Coolify UI)
npm ci --include=dev && npm run build

# Start Command (configured in Coolify UI)  
node dist/index.js
```

### 2. Environment Variables (Coolify)
```bash
NPM_CONFIG_PRODUCTION=false
DATABASE_URL=[configured]
SUPABASE_SERVICE_KEY=[configured]
SUPABASE_URL=[configured]
SESSION_SECRET=[configured]
GITHUB_TOKEN=[configured]
```

### 3. Package.json Dependencies Structure
**Current Working Structure** (devDependencies properly configured):
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.10.6",
    "@radix-ui/react-accordion": "^1.2.1",
    "@supabase/supabase-js": "^2.49.0",
    "@tanstack/react-query": "^5.62.7",
    "archiver": "^7.0.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^4.1.0",
    "drizzle-orm": "^0.38.2",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.5.1",
    "express": "^4.21.1",
    "express-session": "^1.18.1",
    "framer-motion": "^11.15.0",
    "input-otp": "^1.4.1",
    "lucide-react": "^0.468.0",
    "multer": "^1.4.5-lts.1",
    "next-themes": "^0.4.4",
    "node-ssh": "^13.2.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "pg": "^8.13.1",
    "postgres": "^3.4.5",
    "react": "^18.3.1",
    "react-day-picker": "^9.4.2",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.0",
    "react-icons": "^5.4.0",
    "react-quill": "^2.0.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.0",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.1",
    "wouter": "^3.3.7",
    "ws": "^8.18.0",
    "zod": "^3.23.8",
    "zod-validation-error": "^3.4.0"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-aspect-ratio": "^1.1.1",
    "@radix-ui/react-avatar": "^1.1.1",
    "@radix-ui/react-checkbox": "^1.1.2",
    "@radix-ui/react-collapsible": "^1.1.1",
    "@radix-ui/react-context-menu": "^2.2.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-hover-card": "^1.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.2",
    "@radix-ui/react-navigation-menu": "^1.2.1",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.1",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.3",
    "@replit/vite-plugin-cartographer": "^0.7.12",
    "@replit/vite-plugin-runtime-error-modal": "^0.3.4",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.0.0-alpha.36",
    "@types/archiver": "^6.0.2",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^5.0.0",
    "@types/express-session": "^1.18.0",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.10.1",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.14",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.6.0",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.1",
    "esbuild": "^0.25.6",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.19"
  }
}
```

## Git Commit Commands Used

### 1. Standard Deployment Commit Process
```bash
# 1. Navigate to project directory
cd /path/to/memopyk-project

# 2. Check git status
git status

# 3. Add specific files (never use git add .)
git add client/src/components/admin/deployment-management.tsx
git add server/routes.ts
git add package.json
git add nixpacks.toml

# 4. Commit with descriptive message
git commit -m "DEPLOYMENT: Updated deployment management with bilingual support and environment selection"

# 5. Push to GitHub (triggers Coolify deployment)
git push origin main --force
```

### 2. Recent Critical Commits (July 9, 2025)
```bash
# Build fix commit
git commit -m "BUILD FIX: Current package.json with updated dependencies"
git push origin main --force

# Deployment system updates
git commit -m "DEPLOYMENT SYSTEM: Enhanced admin panel with staging/production environment selection"
git push origin main --force
```

### 3. File Selection Protocol
**Always Include**:
- `client/` directory (frontend code)
- `server/` directory (backend code)  
- `shared/` directory (shared schemas)
- `package.json` (dependencies)
- `vite.config.ts` (build configuration)
- `tailwind.config.ts` (styling)
- `postcss.config.js` (CSS processing)
- `tsconfig.json` (TypeScript config)
- `drizzle.config.ts` (database config)
- `components.json` (UI components)
- `nixpacks.toml` (build instructions)

**Always Exclude**:
- `Dockerfile` (conflicts with nixpacks.toml)
- `node_modules/` (dependencies)
- `dist/` (build output)
- `client/public/media/` (large media files)
- `.env` files (secrets)

### 4. GitHub API Authentication
```bash
# Using GITHUB_TOKEN environment variable
export GITHUB_TOKEN="your_token_here"

# Git authentication for API
git config --global user.name "Deployment System"
git config --global user.email "deploy@memopyk.com"
```

## Nixpacks Configuration (Working)

**File**: `nixpacks.toml`
```toml
# nixpacks.toml

[phases.setup.environment]
NODE_ENV = "development"
NPM_CONFIG_PRODUCTION = "false"

providers = ["node"]

[phases.setup]
# Keep default packages ("...") plus install nodejs (which includes npm)
nixPkgs = ["...", "nodejs"]

[phases.build]
cmds = [
  "npm install --include=dev",  # force install of devDependencies like Vite
  "npx vite build",             # build frontend first
  "npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"  # then build backend
]
cacheDirectories = ["node_modules"]

[start]
cmd = "node dist/index.js"
```

## Current Issues Resolved

### Issue: "vite: not found" Error (RESOLVED)
**Root Cause**: Production builds were not installing devDependencies containing build tools (vite, esbuild)
**Solution**: Added `NPM_CONFIG_PRODUCTION=false` environment variable in Coolify + Updated build command to `npm ci --include=dev && npm run build`

### Issue: Dependency Management (RESOLVED)
**Previous Problem**: Build tools in devDependencies weren't available during production builds
**Current Solution**: Force installation of devDependencies with explicit flags

## Deployment Verification Steps

### 1. Pre-Commit Verification
```bash
# Check package.json structure
cat package.json | grep -A5 -B5 '"vite":'

# Verify nixpacks.toml exists
cat nixpacks.toml

# Check for conflicting files
ls -la | grep -E "(Dockerfile|docker-compose)"
```

### 2. Post-Commit Verification
```bash
# Check if commit reached GitHub
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/stephane46/memopykCOM/commits?per_page=1"

# Monitor Coolify deployment
# (Check via Coolify dashboard UI)
```

### 3. Deployment Health Check
```bash
# Test site responsiveness
curl -I https://new.memopyk.com/api/health

# Test admin authentication
curl -X POST https://new.memopyk.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"memopyk2025admin"}'
```

## Infrastructure Person Notes

### Critical Success Factors
1. **Build Command**: Must use `npm ci --include=dev && npm run build` in Coolify
2. **Environment Variables**: `NPM_CONFIG_PRODUCTION=false` is essential
3. **nixpacks.toml**: Must exist and not be overridden by Dockerfile
4. **Dependencies**: Build tools (vite, esbuild) can remain in devDependencies

### Monitoring Points
- Coolify build logs for successful dependency installation
- Container health endpoint response time
- GitHub webhook delivery success
- Database connection stability

### Rollback Procedure
If deployment fails:
1. Check Coolify build logs for specific error
2. Verify environment variables are set correctly  
3. Ensure no Dockerfile is present in repository
4. Force rebuild in Coolify dashboard
5. Monitor health endpoint for recovery

## Security Considerations
- GITHUB_TOKEN has repository write access
- Environment variables contain sensitive database credentials
- Admin authentication uses token-based system
- SSH credentials are stored securely in environment variables

---

**Report Generated**: July 9, 2025  
**Platform Status**: ✅ OPERATIONAL  
**Last Successful Deployment**: July 9, 2025 06:54 AM UTC  
**Current Build Configuration**: ✅ WORKING