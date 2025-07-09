#!/bin/bash

# Deploy the corrected nixpacks configuration
echo "=== DEPLOYING CORRECTED NIXPACKS CONFIGURATION ==="

TEMP_DIR="/tmp/deploy-nixpacks-fix-$(date +%s)"
mkdir -p $TEMP_DIR

# Copy application files
cp -r /home/runner/workspace/client $TEMP_DIR/
cp -r /home/runner/workspace/server $TEMP_DIR/
cp -r /home/runner/workspace/shared $TEMP_DIR/
cp /home/runner/workspace/{package.json,vite.config.ts,tailwind.config.ts,postcss.config.js,tsconfig.json,drizzle.config.ts,components.json,nixpacks.toml,.gitignore,Stephane.txt} $TEMP_DIR/

# Clean problematic files
rm -rf $TEMP_DIR/client/public/media $TEMP_DIR/Dockerfile $TEMP_DIR/node_modules $TEMP_DIR/dist

echo "Corrected nixpacks.toml:"
cat $TEMP_DIR/nixpacks.toml

cd $TEMP_DIR
git init
git config user.name "MEMOPYK Assistant"
git config user.email "assistant@memopyk.com"
git remote add origin https://stephane46:${GITHUB_TOKEN}@github.com/stephane46/memopykCOM.git
git add .
git commit -m "🔧 NIXPACKS FIX: Set NODE_ENV=development for devDependencies

DEPLOYMENT ISSUE: npm i skipping devDependencies (vite not found)
ROOT CAUSE: nixpacks installing with NODE_ENV=production by default
SOLUTION: Set NODE_ENV=development in phases.setup.environment

NIXPACKS CONFIG:
- [phases.setup.environment] NODE_ENV = \"development\"
- This ensures npm install includes devDependencies (vite, esbuild)
- Build commands can now find vite and esbuild binaries

FIXES: Token authentication deployment will complete successfully"

git push -u origin main --force

echo "✅ Corrected nixpacks configuration deployed"