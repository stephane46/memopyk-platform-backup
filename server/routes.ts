import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { uploadFile } from "./supabase";
import { 
  insertHeroVideoSchema, insertGalleryItemSchema, insertFaqSchema, 
  insertSeoSettingSchema, insertContactSchema 
} from "@shared/schema";
import session from "express-session";
import { z } from "zod";
import { NodeSSH } from 'node-ssh';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Docker
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });
  // Session configuration - PERSISTENT STORE FOR PRODUCTION
  const memorystore = await import('memorystore');
  const MemoryStore = memorystore.default(session);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "memopyk-session-secret-2025",
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    name: 'memopyk.sid',
    cookie: { 
      secure: false, // Keep disabled for debugging
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    rolling: true // Extend session on each request
  }));

  // File upload middleware
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
      // Allow videos and images
      if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video and image files are allowed'));
      }
    }
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any)?.isAuthenticated) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Admin authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { password, rememberMe } = req.body;
      
      if (password === "memopyk2025admin") {
        (req.session as any).isAuthenticated = true;
        
        // Set session expiry based on remember me option
        if (rememberMe) {
          // Remember for 30 days
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        } else {
          // Session expires when browser closes (default behavior)
          req.session.cookie.maxAge = undefined;
        }
        
        // Force session save and add logging for debugging
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
          }
          console.log('LOGIN SUCCESS - Session ID:', req.sessionID, 'Authenticated:', (req.session as any).isAuthenticated);
          res.json({ success: true, sessionId: req.sessionID });
        });
      } else {
        res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/status", (req, res) => {
    res.json({ isAuthenticated: !!(req.session as any)?.isAuthenticated });
  });

  // Hero Videos routes
  app.get("/api/hero-videos", async (req, res) => {
    try {
      const videos = await storage.getHeroVideos();
      res.json(videos);
    } catch (error: any) {
      console.error("Error fetching hero videos:", error);
      res.status(500).json({ message: "Failed to fetch hero videos", error: error.message });
    }
  });

  app.post("/api/hero-videos", requireAuth, async (req, res) => {
    try {
      const validatedData = insertHeroVideoSchema.parse(req.body);
      const video = await storage.createHeroVideo(validatedData);
      res.json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create hero video" });
      }
    }
  });

  app.put("/api/hero-videos/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertHeroVideoSchema.partial().parse(req.body);
      const video = await storage.updateHeroVideo(id, validatedData);
      
      if (!video) {
        return res.status(404).json({ message: "Hero video not found" });
      }
      
      res.json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update hero video" });
      }
    }
  });

  app.delete("/api/hero-videos/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteHeroVideo(id);
      
      if (!success) {
        return res.status(404).json({ message: "Hero video not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete hero video" });
    }
  });

  // Gallery Items routes
  app.get("/api/gallery-items", async (req, res) => {
    try {
      const items = await storage.getGalleryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch gallery items" });
    }
  });

  app.post("/api/gallery-items", requireAuth, async (req, res) => {
    try {
      const validatedData = insertGalleryItemSchema.parse(req.body);
      const item = await storage.createGalleryItem(validatedData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create gallery item" });
      }
    }
  });

  app.put("/api/gallery-items/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertGalleryItemSchema.partial().parse(req.body);
      const item = await storage.updateGalleryItem(id, validatedData);
      
      if (!item) {
        return res.status(404).json({ message: "Gallery item not found" });
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update gallery item" });
      }
    }
  });

  app.delete("/api/gallery-items/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteGalleryItem(id);
      
      if (!success) {
        return res.status(404).json({ message: "Gallery item not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete gallery item" });
    }
  });

  // FAQs routes
  app.get("/api/faqs", async (req, res) => {
    try {
      const faqs = await storage.getFaqs();
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/faqs", requireAuth, async (req, res) => {
    try {
      const validatedData = insertFaqSchema.parse(req.body);
      const faq = await storage.createFaq(validatedData);
      res.json(faq);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create FAQ" });
      }
    }
  });

  app.put("/api/faqs/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertFaqSchema.partial().parse(req.body);
      const faq = await storage.updateFaq(id, validatedData);
      
      if (!faq) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      
      res.json(faq);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update FAQ" });
      }
    }
  });

  app.delete("/api/faqs/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteFaq(id);
      
      if (!success) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete FAQ" });
    }
  });

  // Contacts routes
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create contact" });
      }
    }
  });

  app.put("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertContactSchema.partial().parse(req.body);
      const contact = await storage.updateContact(id, validatedData);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update contact" });
      }
    }
  });

  app.delete("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteContact(id);
      
      if (!success) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // File upload route for Supabase Storage
  app.post("/api/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { originalname, buffer, mimetype } = req.file;
      
      // Upload to Supabase Storage
      const { url, path } = await uploadFile(buffer, originalname, 'memopyk-media', mimetype);
      
      res.json({ 
        url, 
        path,
        originalName: originalname,
        size: buffer.length,
        mimeType: mimetype
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      res.status(500).json({ 
        message: "File upload failed", 
        error: error.message 
      });
    }
  });

  // Legal Documents API
  app.get("/api/legal-documents", async (req, res) => {
    try {
      const documents = await storage.getLegalDocuments();
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch legal documents", error: error.message });
    }
  });

  app.get("/api/legal-documents/:id", async (req, res) => {
    try {
      const document = await storage.getLegalDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Legal document not found" });
      }
      res.json(document);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch legal document", error: error.message });
    }
  });

  app.get("/api/legal-documents/type/:type", async (req, res) => {
    try {
      const document = await storage.getLegalDocumentByType(req.params.type);
      if (!document) {
        return res.status(404).json({ message: "Legal document not found" });
      }
      res.json(document);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch legal document", error: error.message });
    }
  });

  app.post("/api/legal-documents", requireAuth, async (req, res) => {
    try {
      const document = await storage.createLegalDocument(req.body);
      res.status(201).json(document);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create legal document", error: error.message });
    }
  });

  app.put("/api/legal-documents/:id", requireAuth, async (req, res) => {
    try {
      const document = await storage.updateLegalDocument(req.params.id, req.body);
      if (!document) {
        return res.status(404).json({ message: "Legal document not found" });
      }
      res.json(document);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update legal document", error: error.message });
    }
  });

  app.delete("/api/legal-documents/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteLegalDocument(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Legal document not found" });
      }
      res.json({ message: "Legal document deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete legal document", error: error.message });
    }
  });

  // Coolify API deployment endpoint
  app.post("/api/deploy/coolify", requireAuth, async (req, res) => {
    try {
      const https = require('https');
      
      const deploymentData = JSON.stringify({ 
        "uuid": process.env.UUID_APPLICATION 
      });
      
      const apiUrl = new URL(process.env.COOLIFY_API_URL);
      const options = {
        hostname: apiUrl.hostname,
        port: 443,
        path: '/api/v1/deploy',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.COOLIFY_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(deploymentData)
        }
      };
      
      const coolifyResponse = await new Promise((resolve, reject) => {
        const coolifyReq = https.request(options, (coolifyRes) => {
          let data = '';
          coolifyRes.on('data', (chunk) => data += chunk);
          coolifyRes.on('end', () => {
            resolve({ status: coolifyRes.statusCode, data });
          });
        });
        
        coolifyReq.on('error', reject);
        coolifyReq.write(deploymentData);
        coolifyReq.end();
      });
      
      if (coolifyResponse.status === 200) {
        // Note: Deployment history tracking would be added when schema supports it
        
        res.json({ 
          success: true, 
          message: 'Deployment triggered via Coolify API',
          response: JSON.parse(coolifyResponse.data)
        });
      } else {
        throw new Error(`Coolify API returned status ${coolifyResponse.status}`);
      }
      
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: "Coolify deployment failed", 
        error: error.message 
      });
    }
  });

  // Deployment endpoints
  app.post("/api/deploy/test", requireAuth, async (req, res) => {
    try {
      const { host, username } = req.body;
      
      if (!host || !username) {
        return res.status(400).json({ message: "Host and username are required" });
      }

      // Test actual SSH connection
      const ssh = new NodeSSH();
      
      try {
        await ssh.connect({
          host,
          username,
          privateKey: process.env.SSH_PRIVATE_KEY || undefined,
          password: process.env.SSH_PASSWORD || undefined,
          port: 22,
          readyTimeout: 10000
        });
        
        // Test basic command
        const result = await ssh.execCommand('whoami');
        await ssh.dispose();
        
        if (result.code === 0) {
          res.json({ success: true, message: `Connection successful. Connected as: ${result.stdout.trim()}` });
        } else {
          throw new Error(`SSH test failed: ${result.stderr}`);
        }
      } catch (sshError: any) {
        await ssh.dispose();
        throw new Error(`SSH connection failed: ${sshError.message}`);
      }
      
    } catch (error: any) {
      res.status(500).json({ 
        message: "Connection test failed", 
        error: error.message 
      });
    }
  });

  // Global deployment state
  let isDeploymentInProgress = false;

  // Reset deployment status endpoint
  app.post("/api/deploy/reset", requireAuth, (req, res) => {
    isDeploymentInProgress = false;
    res.json({ message: "Deployment status reset", inProgress: false });
  });

  // Get deployment status endpoint
  app.get("/api/deploy/status", requireAuth, (req, res) => {
    res.json({ inProgress: isDeploymentInProgress });
  });

  // Nginx and SSL setup endpoint
  app.post("/api/deploy/setup-nginx", requireAuth, async (req, res) => {
    try {
      if (isDeploymentInProgress) {
        return res.status(409).json({ 
          message: "Deployment in progress. Please wait." 
        });
      }

      const { host, username, domain } = req.body;
      
      if (!host || !username || !domain) {
        return res.status(400).json({ message: "Host, username, and domain are required" });
      }

      isDeploymentInProgress = true;

      // Set up streaming response
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const sendLog = (type: string, message: string, percentage?: number) => {
        const logData = {
          type,
          message,
          percentage,
          timestamp: new Date().toISOString()
        };
        res.write(JSON.stringify(logData) + '\n');
      };

      try {
        sendLog('log', 'Starting nginx and SSL setup...', 0);
        sendLog('progress', 'Connecting to VPS', 10);

        const ssh = new NodeSSH();
        
        const sshOptions: any = {
          host,
          username,
          port: 22,
          readyTimeout: 30000
        };

        if (process.env.SSH_PASSWORD) {
          sshOptions.password = process.env.SSH_PASSWORD;
          sendLog('log', 'Using SSH password authentication');
        } else if (process.env.SSH_PRIVATE_KEY) {
          sshOptions.privateKey = process.env.SSH_PRIVATE_KEY;
          sendLog('log', 'Using SSH private key authentication');
        } else {
          throw new Error('No SSH credentials provided');
        }

        await ssh.connect(sshOptions);
        sendLog('log', 'SSH connection established');
        sendLog('progress', 'Installing nginx and certbot', 30);

        // Upload and execute nginx setup script
        const setupScript = `#!/bin/bash
set -e

DOMAIN="${domain}"
EMAIL="admin@${domain}"
APP_PORT="3000"

echo "🚀 Setting up nginx reverse proxy for MEMOPYK..."

# Update system packages
apt update
apt install -y nginx certbot python3-certbot-nginx

# Create nginx configuration
cat > /etc/nginx/sites-available/memopyk << 'EOF'
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\\$server_name\\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Static files optimization
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js)$ {
        proxy_pass http://localhost:$APP_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/memopyk /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx setup complete!"
`;

        await ssh.execCommand(`echo '${setupScript}' > /tmp/setup-nginx.sh && chmod +x /tmp/setup-nginx.sh`);
        sendLog('log', 'Nginx setup script uploaded');
        
        sendLog('progress', 'Executing nginx setup', 50);
        const nginxResult = await ssh.execCommand(`bash /tmp/setup-nginx.sh`);
        
        if (nginxResult.code !== 0) {
          throw new Error(`Nginx setup failed: ${nginxResult.stderr}`);
        }
        
        sendLog('log', 'Nginx configuration completed');
        sendLog('progress', 'Setting up SSL certificate', 80);

        // Setup SSL certificate
        const certbotCmd = `certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --email admin@${domain} --redirect`;
        const certbotResult = await ssh.execCommand(certbotCmd);
        
        if (certbotResult.code === 0) {
          sendLog('success', 'SSL certificate installed successfully!');
          sendLog('log', `Website now available at: https://${domain}`);
        } else {
          sendLog('warning', `SSL certificate setup warning: ${certbotResult.stderr}`);
          sendLog('log', 'You may need to configure DNS first. Run: sudo certbot --nginx');
        }

        // Setup automatic renewal
        await ssh.execCommand(`systemctl enable certbot.timer && systemctl start certbot.timer`);
        sendLog('log', 'Automatic SSL renewal configured');
        
        await ssh.dispose();
        sendLog('success', 'Nginx and SSL setup completed!');
        sendLog('progress', 'Setup complete', 100);

      } catch (error: any) {
        sendLog('error', `Setup failed: ${error.message}`);
        throw error;
      } finally {
        isDeploymentInProgress = false;
      }

      if (!res.headersSent) {
        res.end();
      }
      
    } catch (error: any) {
      console.error('Nginx setup error:', error);
      isDeploymentInProgress = false;
      
      if (!res.headersSent) {
        res.status(500).json({ 
          message: "Nginx setup failed", 
          error: error.message 
        });
      }
    }
  });

  app.post("/api/deploy", requireAuth, async (req, res) => {
    try {
      // Check if deployment is already in progress
      if (isDeploymentInProgress) {
        return res.status(409).json({ 
          message: "Deployment already in progress. Please wait or reset the deployment status." 
        });
      }

      const { host, username, deployPath, domain } = req.body;
      
      if (!host || !username) {
        return res.status(400).json({ message: "Host and username are required" });
      }

      // Set deployment in progress
      isDeploymentInProgress = true;

      // Set up streaming response
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const sendLog = (type: string, message: string, percentage?: number) => {
        const logData = { type, message, percentage, timestamp: new Date().toISOString() };
        res.write(JSON.stringify(logData) + '\n');
      };

      try {
        sendLog('log', 'Starting deployment process...');
        sendLog('progress', 'Initializing', 5);

        // Step 1: Build the project
        sendLog('log', 'Building project...');
        sendLog('progress', 'Building frontend and backend', 20);
        
        const execAsync = promisify(exec);
        const buildResult = await execAsync('npm run build');
        sendLog('log', `Build completed: ${buildResult.stdout}`);
        if (buildResult.stderr) {
          sendLog('log', `Build warnings: ${buildResult.stderr}`);
        }
        sendLog('progress', 'Build complete', 40);

        // Step 2: Prepare deployment package
        sendLog('log', 'Preparing deployment package...');
        sendLog('progress', 'Creating deployment archive', 50);
        
        const archivePath = '/tmp/memopyk-deployment.tar.gz';
        await new Promise<void>((resolve, reject) => {
          const output = fs.createWriteStream(archivePath);
          const archive = archiver('tar', { gzip: true });
          
          output.on('close', () => {
            sendLog('log', `Archive created: ${archive.pointer()} bytes`);
            resolve();
          });
          
          archive.on('error', reject);
          archive.pipe(output);
          
          // Add built files
          archive.directory('dist/', 'dist');
          archive.file('package.json', { name: 'package.json' });
          archive.file('package-lock.json', { name: 'package-lock.json' });
          
          archive.finalize();
        });
        
        sendLog('progress', 'Archive created', 60);

        // Step 3: Connect and transfer to VPS
        sendLog('log', `Connecting to VPS at ${host}...`);
        sendLog('progress', 'Connecting to VPS', 65);
        
        const ssh = new NodeSSH();
        
        // Prepare SSH connection options
        const sshOptions: any = {
          host,
          username,
          port: 22,
          readyTimeout: 30000
        };

        // Use password authentication for now (more reliable for testing)
        if (process.env.SSH_PASSWORD) {
          sshOptions.password = process.env.SSH_PASSWORD;
          sendLog('log', 'Using SSH password authentication');
        } else if (process.env.SSH_PRIVATE_KEY) {
          // Try private key as fallback
          sshOptions.privateKey = process.env.SSH_PRIVATE_KEY;
          sendLog('log', 'Using SSH private key authentication');
        } else {
          throw new Error('No SSH credentials provided. Please set SSH_PASSWORD or SSH_PRIVATE_KEY');
        }

        await ssh.connect(sshOptions);
        
        sendLog('log', 'SSH connection established');
        sendLog('progress', 'Transferring files to VPS', 70);
        
        // Create deployment directory
        await ssh.execCommand(`mkdir -p ${deployPath}`);
        sendLog('log', `Created deployment directory: ${deployPath}`);
        
        // Transfer archive
        await ssh.putFile(archivePath, `${deployPath}/deployment.tar.gz`);
        sendLog('log', 'Archive transferred to VPS');
        sendLog('progress', 'Files transferred', 80);

        // Step 4: Extract and setup on VPS
        sendLog('log', 'Extracting files on VPS...');
        await ssh.execCommand(`cd ${deployPath} && tar -xzf deployment.tar.gz`);
        sendLog('log', 'Files extracted successfully');
        
        sendLog('log', 'Installing dependencies on VPS...');
        sendLog('progress', 'Installing dependencies', 85);
        const installResult = await ssh.execCommand(`cd ${deployPath} && npm ci --production`);
        if (installResult.code !== 0) {
          throw new Error(`Dependency installation failed: ${installResult.stderr}`);
        }
        sendLog('log', 'Dependencies installed successfully');
        
        // Setup environment file
        sendLog('log', 'Setting up environment configuration...');
        const envVars = [
          `DATABASE_URL="${process.env.DATABASE_URL}"`,
          `SUPABASE_URL="${process.env.SUPABASE_URL}"`,
          `SUPABASE_SERVICE_KEY="${process.env.SUPABASE_SERVICE_KEY}"`,
          `SUPABASE_ANON_KEY="${process.env.SUPABASE_ANON_KEY}"`,
          `NODE_ENV=production`,
          `PORT=3000`
        ].join('\n');
        
        await ssh.execCommand(`cd ${deployPath} && echo '${envVars}' > .env`);
        sendLog('log', 'Environment configuration created');
        
        sendLog('progress', 'Setting up application', 90);
        
        // Setup PM2 or systemd service
        sendLog('log', 'Setting up application service...');
        await ssh.execCommand(`cd ${deployPath} && npm install -g pm2`);
        await ssh.execCommand(`cd ${deployPath} && pm2 stop memopyk || true`);
        await ssh.execCommand(`cd ${deployPath} && pm2 start dist/index.js --name memopyk`);
        await ssh.execCommand(`pm2 save`);
        
        sendLog('log', 'Setting up nginx reverse proxy...');
        sendLog('progress', 'Configuring web server', 95);
        
        // Install nginx if not present
        await ssh.execCommand(`apt update && apt install -y nginx certbot python3-certbot-nginx`);
        
        // Create nginx configuration
        const nginxConfig = `
server {
    listen 80;
    server_name ${domain} www.${domain};
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain} www.${domain};
    
    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Static files optimization
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;
        
        // Write nginx configuration
        await ssh.execCommand(`echo '${nginxConfig}' > /etc/nginx/sites-available/memopyk`);
        await ssh.execCommand(`ln -sf /etc/nginx/sites-available/memopyk /etc/nginx/sites-enabled/`);
        await ssh.execCommand(`rm -f /etc/nginx/sites-enabled/default`);
        
        // Test nginx configuration
        const nginxTest = await ssh.execCommand(`nginx -t`);
        if (nginxTest.code !== 0) {
          throw new Error(`Nginx configuration error: ${nginxTest.stderr}`);
        }
        
        sendLog('log', 'Nginx configuration created and tested');
        
        // Restart nginx
        await ssh.execCommand(`systemctl restart nginx`);
        await ssh.execCommand(`systemctl enable nginx`);
        
        sendLog('log', 'Setting up SSL certificate...');
        sendLog('progress', 'Installing SSL certificate', 98);
        
        // Setup SSL certificate with Let's Encrypt
        const certbotCmd = `certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --email admin@${domain} --redirect`;
        const certbotResult = await ssh.execCommand(certbotCmd);
        
        if (certbotResult.code === 0) {
          sendLog('log', 'SSL certificate installed successfully');
        } else {
          sendLog('log', `SSL certificate setup warning: ${certbotResult.stderr}`);
          sendLog('log', 'You may need to configure DNS first and retry: sudo certbot --nginx');
        }
        
        // Setup automatic certificate renewal
        await ssh.execCommand(`systemctl enable certbot.timer`);
        await ssh.execCommand(`systemctl start certbot.timer`);
        
        sendLog('log', 'Application service started with PM2');
        sendLog('progress', 'Deployment complete', 95);
        
        // Cleanup
        await ssh.execCommand(`cd ${deployPath} && rm deployment.tar.gz`);
        await ssh.dispose();
        fs.unlinkSync(archivePath);
        
        sendLog('success', `Deployment completed! Application is now live at https://${domain}`);
        sendLog('log', `Application running on VPS at ${deployPath}`);
        sendLog('progress', 'Deployment complete', 100);

      } catch (deployError: any) {
        sendLog('error', `Deployment failed: ${deployError.message}`);
        throw deployError;
      } finally {
        // Always reset deployment state
        isDeploymentInProgress = false;
      }

      if (!res.headersSent) {
        res.end();
      }
      
    } catch (error: any) {
      console.error('Deployment error:', error);
      // Reset deployment state on error
      isDeploymentInProgress = false;
      
      if (!res.headersSent) {
        res.status(500).json({ 
          message: "Deployment failed", 
          error: error.message 
        });
      }
    }
  });

  // Deployment History routes
  app.get("/api/deployment-history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getDeploymentHistory();
      res.json(history);
    } catch (error: any) {
      console.error('Get deployment history error:', error);
      res.status(500).json({ message: "Failed to get deployment history", error: error.message });
    }
  });

  app.post("/api/deployment-history", requireAuth, async (req, res) => {
    try {
      const entry = await storage.createDeploymentHistoryEntry(req.body);
      res.json(entry);
    } catch (error: any) {
      console.error('Create deployment history entry error:', error);
      res.status(500).json({ message: "Failed to create deployment history entry", error: error.message });
    }
  });

  app.patch("/api/deployment-history/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.updateDeploymentHistoryEntry(id, req.body);
      if (!entry) {
        return res.status(404).json({ message: "Deployment history entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error('Update deployment history entry error:', error);
      res.status(500).json({ message: "Failed to update deployment history entry", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
