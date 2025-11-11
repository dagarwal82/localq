import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import passport from 'passport';
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertProductSchema, insertBuyerInterestSchema } from "@shared/schema";
import { authMiddleware } from "./middleware/auth";
import { isAdmin } from "./middleware/adminAuth";
import authRoutes from "./routes/auth";
import { generateToken } from './auth';

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  // Setup authentication routes
  app.use('/api/auth', authRoutes);
  
  // Google Auth Routes
  app.get('/api/auth/google',
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      session: false 
    })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { 
      session: false,
      failureRedirect: '/?error=google_auth_failed' 
    }),
    (req, res) => {
      if (!req.user) {
        return res.redirect('/?error=auth_failed');
      }

      const token = generateToken(req.user);
      res.redirect(`/?token=${token}`);
    }
  );

  // Facebook Auth Routes
  app.get('/api/auth/facebook',
    passport.authenticate('facebook', {
      scope: ['email'],
      session: false,
    })
  );

  app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', {
      session: false,
      failureRedirect: '/?error=facebook_auth_failed'
    }),
    (req, res) => {
      if (!req.user) {
        return res.redirect('/?error=auth_failed');
      }

      const token = generateToken(req.user);
      res.redirect(`/?token=${token}`);
    }
  );

  // Facebook Data Deletion Callback (required for Facebook app verification)
  app.post('/api/auth/facebook/data-deletion', express.json(), async (req, res) => {
    try {
      const { signed_request } = req.body;
      
      if (!signed_request) {
        return res.status(400).json({ 
          error: 'Missing signed_request parameter' 
        });
      }

      // Parse the signed request to get the user ID
      // Format: encoded_signature.payload
      const [encodedSig, payload] = signed_request.split('.');
      const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      const facebookUserId = data.user_id;

      if (!facebookUserId) {
        return res.status(400).json({ 
          error: 'Invalid signed_request format' 
        });
      }

      // Log the deletion request (you can process this asynchronously)
      console.log(`Data deletion request received for Facebook user: ${facebookUserId}`);
      
      // Generate a unique confirmation code for tracking
      const confirmationCode = `DEL_${facebookUserId}_${Date.now()}`;

      // TODO: In a production app, you would:
      // 1. Find the user by facebookId
      // 2. Queue a background job to delete their data
      // 3. Store the confirmation code for tracking
      // 4. Send confirmation email to the user
      
      // For now, we'll just log and return the confirmation
      // The actual deletion should happen through the user's Settings page
      
      // Return the required response format for Facebook
      res.json({
        url: `${req.protocol}://${req.get('host')}/data-deletion?confirmation=${confirmationCode}`,
        confirmation_code: confirmationCode
      });

    } catch (error) {
      console.error('Error processing Facebook data deletion request:', error);
      res.status(500).json({ 
        error: 'Failed to process deletion request' 
      });
    }
  });

  const joinQueueLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: "Too many join requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  setInterval(async () => {
    await storage.updateMissedStatuses();
  }, 30000);

  // Auth routes
  app.get('/api/auth/user', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.userId || req.user?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      const contentType = (req.body && req.body.contentType) ? String(req.body.contentType) : undefined;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(contentType);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      return res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Local-dev upload handlers (only used when LOCAL_UPLOADS_DIR is set)
  // Accept raw PUT to /local-objects/uploads/:id
  app.put(
    "/local-objects/uploads/:id",
    express.raw({ type: "*/*", limit: "50mb" }),
    async (req, res) => {
      try {
        const localDir = process.env.LOCAL_UPLOADS_DIR;
        if (!localDir) return res.status(404).json({ error: "Local uploads not enabled" });
        const id = req.params.id;
        const path = require("path");
        const fs = require("fs/promises");
        const filePath = path.join(localDir, id);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const data: Buffer = req.body as Buffer;
        await fs.writeFile(filePath, data);
        // Return the URL where the uploaded file can be accessed
        const base = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`;
        const publicUrl = `${base}/local-objects/uploads/${id}`;
        res.status(200).json({ url: publicUrl });
      } catch (err) {
        console.error('Local upload failed:', err);
        res.status(500).json({ error: 'Local upload failed' });
      }
    }
  );

  // Serve local uploaded files
  app.get('/local-objects/uploads/:id', async (req, res) => {
    try {
      const localDir = process.env.LOCAL_UPLOADS_DIR;
      if (!localDir) return res.status(404).send('Not found');
      const path = require('path');
      const fs = require('fs');
      const filePath = path.join(localDir, req.params.id);
      if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
      res.sendFile(filePath);
    } catch (err) {
      console.error('Error serving local object:', err);
      res.status(500).send('Error');
    }
  });

  app.put("/api/product-images", async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting product image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Protected: Get user's own products
  app.get("/api/products", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.userId || req.user?.sub;
      const products = await storage.getProductsByUser(userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", authMiddleware, async (req: any, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Public: Anyone can view product details (for QR code join flow)
  app.get("/api/products/:id/public", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.status !== "active") {
        return res.status(410).json({ error: "This listing is no longer available" });
      }
      const activeBuyers = await storage.getBuyerInterestsByProduct(req.params.id);
      const activeBuyerCount = activeBuyers.filter(b => b.status === "active").length;
      
      res.json({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        imageUrl: product.images?.[0]?.imageUrl,
        images: product.images,
        queueLength: activeBuyerCount,
      });
    } catch (error) {
      console.error("Error fetching public product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Protected: Create product (user creates their own listing)
  app.post("/api/products", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.userId || req.user?.sub;
      const validated = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(userId, validated);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  // Protected: Update product (user updates their own listing, or admin updates any)
  app.patch("/api/products/:id", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const product = await storage.getProduct(req.params.id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check if user owns the product or is admin
      const user = await storage.getUser(userId);
      if (product.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: You can only update your own products" });
      }

      const updated = await storage.updateProduct(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.get("/api/buyer-interests", async (req, res) => {
    try {
      await storage.updateMissedStatuses();
      const interests = await storage.getAllBuyerInterests();
      res.json(interests);
    } catch (error) {
      console.error("Error fetching buyer interests:", error);
      res.status(500).json({ error: "Failed to fetch buyer interests" });
    }
  });

  app.get("/api/products/:productId/buyer-interests", async (req, res) => {
    try {
      await storage.updateMissedStatuses();
      const interests = await storage.getBuyerInterestsByProduct(req.params.productId);
      res.json(interests);
    } catch (error) {
      console.error("Error fetching buyer interests:", error);
      res.status(500).json({ error: "Failed to fetch buyer interests" });
    }
  });

  app.post("/api/buyer-interests", joinQueueLimiter, async (req, res) => {
    try {
      const validated = insertBuyerInterestSchema.parse(req.body);
      const interest = await storage.createBuyerInterest(validated);
      res.status(201).json(interest);
    } catch (error) {
      console.error("Error creating buyer interest:", error);
      if (error instanceof Error && error.message.includes("already in the queue")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({ error: "Invalid buyer interest data" });
    }
  });

  // Admin routes
  // Admin: Get all products (from all users)
  app.get("/api/admin/products", isAdmin, async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching all products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Admin: Delete any product
  app.delete("/api/admin/products/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Admin: Update user role
  app.patch("/api/admin/users/:id/role", isAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!role || (role !== "user" && role !== "admin")) {
        return res.status(400).json({ error: "Invalid role. Must be 'user' or 'admin'" });
      }
      const user = await storage.updateUserRole(req.params.id, role);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
