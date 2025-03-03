import { Request, Response } from "express";
import { validateWebhookUrl } from "../validators/webhook.validators";
import crypto from "crypto";
import { Merchant, MerchantWebhook } from "../interfaces/webhook.interfaces";
import { MerchantAuthService } from "../services/merchant.service";
import { WebhookService } from "../services/webhook.service";

const merchantAuthService = new MerchantAuthService();
const webhookService = new WebhookService();

export class MerchantController {
  async registerMerchant(req: Request, res: Response): Promise<any> {
    try {
      const { name, email } = req.body;

      // Generate API key for the merchant
      const apiKey = crypto.randomBytes(32).toString("hex");
      const secret = crypto.randomBytes(32).toString("hex");

      // Create merchant in database, something like this, edit this to be a function that posts this object
      const merchant = {
        id: crypto.randomUUID(),
        name,
        email,
        apiKey,
        secret,
        // password: crypto.createHmac('sha256', password),
        isActive: true,
      };

      // Return their credentials
      return res.status(201).json({
        message: "Registration successful",
        merchantId: merchant.id,
        apiKey: apiKey, // They'll use this for future requests
      });
    } catch (error) {
      console.error("Registration failed:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  }

  async registerWebhook(req: Request, res: Response): Promise<any> {
    try {
      const { url } = req.body;
      const merchantId = req.merchant.id;
      const merchant = await merchantAuthService.getMerchantById(merchantId);

      if (merchant) {
        throw new Error(`Merchant already exists`);
      }
      // the middleware helped join it to our request headers

      if (!validateWebhookUrl(url)) {
        return res.status(400).json({
          error: "Invalid webhook url. Must be a valid HTTPS url",
        });
      }

      const webhook: MerchantWebhook = {
        id: crypto.randomUUID(),
        merchantId,
        url,
        // secret,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // implement logic to save to database here

      const registeredWebhook = await webhookService.register(webhook);

      return res.status(201).json({
        message: "Webhook registered successfully",
        webhook: {
          id: registeredWebhook.id,
          url: registeredWebhook.url,
          // secret: webhook.secret
        },
      });
    } catch (err) {
      console.error("Failed to register webhook", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async updateWebhook(req: Request, res: Response): Promise<any> {
    try {
      const { newUrl, merchantWebhookId } = req.body;
      const merchantId = req.merchant.id;
      // const merchant = await this.getMerchant(merchantId)
      const existingWebhook =
        await webhookService.getMerchantWebhook(merchantId);
      if (!existingWebhook) {
        return res.status(404).json({ error: "No such webhook exists" });
      }

      if (!validateWebhookUrl(newUrl)) {
        return res.status(400).json({
          error: "Invalid webhook url. Must be a valid HTTPS url",
        });
      }

      const updatedWebhookObject: MerchantWebhook = {
        id: existingWebhook?.id,
        merchantId: existingWebhook?.merchantId,
        url: newUrl,
        // secret,
        isActive: existingWebhook?.isActive,
        createdAt: existingWebhook.createdAt,
        updatedAt: new Date(),
      };

      // implement logic to save to database here
      const updatedWebhook = await webhookService.update(updatedWebhookObject);

      return res.status(200).json({
        message: "Webhook registered successfully",
        webhook: {
          id: updatedWebhook.id,
          url: updatedWebhook.url,
          // secret: webhook.secret
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
