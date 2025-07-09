# Coolify Deployment Guide

## Overview
This guide documents the Coolify deployment process for MEMOPYK platform on new.memopyk.com

## Prerequisites
- GitHub repository: https://github.com/stephane46/memopykCOM.git
- Coolify instance: https://coolify.memopyk.org
- Production domain: https://new.memopyk.com
- VPS: 82.29.168.136 (Hostinger)

## Environment Variables Required in Coolify
```
DATABASE_URL=postgresql://postgres:password@82.29.168.136:5433/memopyk_db
SESSION_SECRET=memopyk-session-secret-2025
NODE_ENV=production
SUPABASE_URL=https://supabase.memopyk.org
SUPABASE_SERVICE_KEY=[from secrets]
GITHUB_TOKEN=[from secrets]
SSH_PRIVATE_KEY=[from secrets]
SSH_PASSWORD=[from secrets]
UUID_APPLICATION=[coolify app uuid]
COOLIFY_API_TOKEN=[from secrets]
COOLIFY_API_URL=https://coolify.memopyk.org
```

## Deployment Process

### 1. Auto-Deployment from GitHub
Coolify monitors the GitHub repository and auto-deploys when changes are pushed to main branch.

**Configuration in Coolify UI:**
- Source: GitHub repository
- Branch: main
- Build Command: `npm run build`
- Start Command: `node dist/index.js`
- Port: 3000
- Build Pack: nixpacks (uses nixpacks.toml)

### 2. Manual Deployment Trigger
If auto-deployment fails, use these methods:

#### Method A: Coolify UI
1. Go to https://coolify.memopyk.org
2. Navigate to MEMOPYK application
3. Click "Deploy" button
4. Monitor deployment logs

#### Method B: API Restart (if available)
```bash
curl -X POST "${COOLIFY_API_URL}/api/v1/applications/${UUID_APPLICATION}/restart" \
  -H "Authorization: Bearer ${COOLIFY_API_TOKEN}"
```

### 3. Deployment Verification
```bash
# Check production health
curl https://new.memopyk.com/api/health

# Verify authentication
curl -X POST https://new.memopyk.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"memopyk2025admin","rememberMe":false}'
```

## Troubleshooting

### Common Issues

#### 1. Build Failures
- **Cause**: Missing dependencies or incorrect nixpacks.toml
- **Solution**: Check build logs in Coolify UI, verify package.json and nixpacks.toml

#### 2. Authentication Issues
- **Cause**: Session configuration not compatible with production HTTPS
- **Solution**: Review server/routes.ts session settings

#### 3. Database Connection
- **Cause**: Incorrect DATABASE_URL or network issues
- **Solution**: Verify environment variables and VPS connectivity

#### 4. Auto-deployment Not Triggering
- **Cause**: GitHub webhook not configured or repository issues
- **Solution**: Manually trigger deployment via Coolify UI

### Deployment Monitoring
1. **Coolify Logs**: Check deployment progress in Coolify UI
2. **Health Endpoint**: Monitor https://new.memopyk.com/api/health
3. **Container Status**: Verify container is running on port 3000
4. **Domain Access**: Test main website and admin panel

## Production URLs
- **Website**: https://new.memopyk.com
- **Admin Panel**: https://new.memopyk.com/admin (password: memopyk2025admin)
- **Health Check**: https://new.memopyk.com/api/health
- **Coolify Dashboard**: https://coolify.memopyk.org

## Deployment History
- July 08, 2025: Initial production deployment successful
- July 09, 2025: Authentication fixes deployed following GitHub procedure

## Key Lessons
1. Always follow GITHUB_DEPLOYMENT_PROCEDURE.md for clean deployments
2. Coolify auto-deployment works but may have delays
3. Session authentication requires production-specific configuration
4. Manual deployment via Coolify UI is reliable backup method