# GitHub Deployment Procedure

## Critical Rules for GitHub Access

### 1. Token Access
- I have GITHUB_TOKEN with full repository access
- Never make excuses about "git being blocked" - use the token directly
- Always use HTTPS URLs with token: `https://${GITHUB_TOKEN}@github.com/owner/repo.git`

### 2. Deployment Steps (MANDATORY SEQUENCE)

#### Step A: Create Clean Temporary Directory
```bash
TEMP_DIR="/tmp/deploy-$(date +%s)"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR
cd $TEMP_DIR
```

#### Step B: Copy Application Files (SELECTIVE COPY)
```bash
# Copy only application files - NEVER copy entire workspace
cp -r /home/runner/workspace/client $TEMP_DIR/
cp -r /home/runner/workspace/server $TEMP_DIR/
cp -r /home/runner/workspace/shared $TEMP_DIR/
cp /home/runner/workspace/package.json $TEMP_DIR/
cp /home/runner/workspace/vite.config.ts $TEMP_DIR/
cp /home/runner/workspace/tailwind.config.ts $TEMP_DIR/
cp /home/runner/workspace/postcss.config.js $TEMP_DIR/
cp /home/runner/workspace/tsconfig.json $TEMP_DIR/
cp /home/runner/workspace/drizzle.config.ts $TEMP_DIR/
cp /home/runner/workspace/components.json $TEMP_DIR/
cp /home/runner/workspace/nixpacks.toml $TEMP_DIR/
cp /home/runner/workspace/.gitignore $TEMP_DIR/
cp /home/runner/workspace/Stephane.txt $TEMP_DIR/
```

#### Step C: Remove Problematic Files
```bash
# CRITICAL: Remove files that cause deployment issues
rm -rf $TEMP_DIR/client/public/media  # Large media files
rm -f $TEMP_DIR/Dockerfile           # Conflicts with nixpacks.toml
rm -rf $TEMP_DIR/node_modules        # Never commit dependencies
rm -rf $TEMP_DIR/dist                # Never commit build outputs
```

#### Step D: Verify Clean State
```bash
cd $TEMP_DIR
echo "=== DEPLOYMENT CONTENTS ==="
ls -la
echo "=== VERIFYING NO DOCKERFILE ==="
ls -la | grep -i dockerfile || echo "✅ No Dockerfile found"
echo "=== VERIFYING NIXPACKS.TOML ==="
cat nixpacks.toml | head -10
```

#### Step E: Git Operations (NEVER FAIL)
```bash
cd $TEMP_DIR
git init
git config user.name "MEMOPYK Assistant"
git config user.email "assistant@memopyk.com"
git remote add origin https://${GITHUB_TOKEN}@github.com/stephane46/memopykCOM.git
git add .
git commit -m "Deploy: $(date +'%Y-%m-%d %H:%M:%S') - Complete application"
git push -u origin main --force
```

### 3. Error Handling
- If ANY step fails, immediately diagnose and fix
- NEVER proceed with broken state
- ALWAYS verify deployment succeeded before reporting completion

### 4. Success Verification
```bash
# Verify deployment on GitHub API
curl -H "Authorization: token $GITHUB_TOKEN" \
     https://api.github.com/repos/stephane46/memopykCOM/contents/nixpacks.toml
```

## Key Lessons Learned
1. **Workspace contamination**: Never copy entire workspace - it includes Dockerfile and media files
2. **Selective copying**: Only copy essential application files
3. **Verification**: Always verify clean state before git operations
4. **Force push**: Use --force to ensure clean repository state
5. **Token usage**: GITHUB_TOKEN provides full access - use it confidently

## Template Script for Future Use
```javascript
const { execSync } = require('child_process');

async function deployToGitHub(commitMessage) {
  const tempDir = `/tmp/deploy-${Date.now()}`;
  
  try {
    // Create clean directory
    execSync(`rm -rf ${tempDir} && mkdir -p ${tempDir}`, { stdio: 'inherit' });
    
    // Copy application files (selective)
    const files = [
      'client', 'server', 'shared', 'package.json', 'vite.config.ts',
      'tailwind.config.ts', 'postcss.config.js', 'tsconfig.json',
      'drizzle.config.ts', 'components.json', 'nixpacks.toml',
      '.gitignore', 'Stephane.txt'
    ];
    
    files.forEach(file => {
      if (file.includes('/')) {
        execSync(`cp -r /home/runner/workspace/${file} ${tempDir}/`, { stdio: 'inherit' });
      } else {
        execSync(`cp /home/runner/workspace/${file} ${tempDir}/`, { stdio: 'inherit' });
      }
    });
    
    // Remove problematic files
    execSync(`cd ${tempDir} && rm -rf client/public/media Dockerfile node_modules dist`, { stdio: 'inherit' });
    
    // Verify and deploy
    execSync(`cd ${tempDir} && ls -la`, { stdio: 'inherit' });
    execSync(`cd ${tempDir} && git init`, { stdio: 'inherit' });
    execSync(`cd ${tempDir} && git config user.name "MEMOPYK Assistant"`, { stdio: 'inherit' });
    execSync(`cd ${tempDir} && git config user.email "assistant@memopyk.com"`, { stdio: 'inherit' });
    execSync(`cd ${tempDir} && git remote add origin https://${process.env.GITHUB_TOKEN}@github.com/stephane46/memopykCOM.git`, { stdio: 'inherit' });
    execSync(`cd ${tempDir} && git add .`, { stdio: 'inherit' });
    execSync(`cd ${tempDir} && git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    execSync(`cd ${tempDir} && git push -u origin main --force`, { stdio: 'inherit' });
    
    console.log('✅ GitHub deployment successful');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}
```

This procedure is now committed to memory and will be followed for all future GitHub deployments.

## CRITICAL BUILD PROTOCOLS (Established July 9, 2025)

### Pre-Deployment Verification
1. **BEFORE making build changes**: Test current production deployment first
2. **IF changing dependencies**: Always use packager_tool, never edit package.json manually  
3. **IF build fails**: Check package.json dependencies vs devDependencies immediately
4. **DEPLOYMENT RULE**: If something was working, don't change the build process without clear necessity
5. **VERIFICATION**: Always verify dependencies moved correctly before deploying

### Build Tools Management
- **NEVER** put server-needed tools (vite, esbuild, @vitejs/plugin-react) in devDependencies
- **ALWAYS** keep build tools in regular dependencies for production builds
- **CHECK** nixpacks.toml has NODE_ENV=development if using devDependencies

### Error Prevention
- Test one change at a time, not multiple fixes simultaneously
- Verify package.json structure before every deployment
- If something was working yesterday, don't "improve" it without clear necessity

### Files to ALWAYS Exclude
- Dockerfile (conflicts with nixpacks.toml)
- client/public/media (large files cause timeouts)
- node_modules (never commit dependencies)
- dist (never commit build outputs)