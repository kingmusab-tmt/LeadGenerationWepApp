/**
 * Zapier Event Trigger Helper
 * Centralized service for triggering Zapier events throughout BRIXCOT
 *
 * Usage: Import and call from anywhere in the application to send events to Zapier
 *
 * Date: January 21, 2026
 */

import { ILead } from "@/models/leads";
import { IUser } from "@/models/types/user";
import { WebhookConfig } from "@/models/webhookConfig";
import { ZapierIntegrationService } from "@/lib/integrations/services/zapierService";

/**
 * Trigger Zapier webhooks for a user
 * Finds all active Zapier configs for user and sends the event
 */
export class ZapierTriggerHelper {
  /**
   * Send lead created event to Zapier
   */
  static async triggerLeadCreated(
    lead: Partial<ILead>,
    userId: string,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.leadCreated": true,
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerLeadCreated(lead);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier lead created event:", error);
    }
  }

  /**
   * Send lead updated event to Zapier
   */
  static async triggerLeadUpdated(
    lead: Partial<ILead>,
    userId: string,
    changes?: string[],
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.leadUpdated": true,
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerLeadUpdated(lead, changes);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier lead updated event:", error);
    }
  }

  /**
   * Send lead qualified event to Zapier
   */
  static async triggerLeadQualified(
    lead: Partial<ILead>,
    userId: string,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.leadQualified": true,
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerLeadQualified(lead);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier lead qualified event:", error);
    }
  }

  /**
   * Send lead assigned event to Zapier
   */
  static async triggerLeadAssigned(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    userId: string,
    assignmentId: string,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.buyerAssigned": true,
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerLeadAssigned(lead, buyer, assignmentId);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier lead assigned event:", error);
    }
  }

  /**
   * Send lead accepted event to Zapier
   */
  static async triggerLeadAccepted(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    userId: string,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.leadAccepted": true,
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerLeadAccepted(lead, buyer);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier lead accepted event:", error);
    }
  }

  /**
   * Send lead rejected event to Zapier
   */
  static async triggerLeadRejected(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    userId: string,
    reason?: string,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.leadRejected": true,
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerLeadRejected(lead, buyer, reason);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier lead rejected event:", error);
    }
  }

  /**
   * Send lead sold event to Zapier
   */
  static async triggerLeadSold(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    userId: string,
    amount?: number,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.dealCreated": true, // Using dealCreated event for sold leads
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerLeadSold(lead, buyer, amount);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier lead sold event:", error);
    }
  }

  /**
   * Send buyer registered event to Zapier
   */
  static async triggerBuyerRegistered(
    buyer: Partial<IUser>,
    userId: string,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.buyerAssigned": true, // Reusing buyer assigned event
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerBuyerRegistered(buyer);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier buyer registered event:", error);
    }
  }

  /**
   * Send deal created event to Zapier
   */
  static async triggerDealCreated(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    userId: string,
    dealId: string,
    amount: number,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.dealCreated": true,
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerDealCreated(lead, buyer, dealId, amount);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier deal created event:", error);
    }
  }

  /**
   * Send deal won event to Zapier
   */
  static async triggerDealWon(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    userId: string,
    dealId: string,
    amount: number,
  ): Promise<void> {
    try {
      const configs = await WebhookConfig.find({
        userId: userId,
        source: "zapier",
        isActive: true,
        "events.dealCreated": true, // Using dealCreated for won deals
      });

      for (const config of configs) {
        const service = new ZapierIntegrationService(
          config.url,
          config.secret,
          userId,
        );
        await service.triggerDealWon(lead, buyer, dealId, amount);

        // Record dispatch
        await config.recordDispatch(true);
      }
    } catch (error) {
      console.error("Failed to trigger Zapier deal won event:", error);
    }
  }
}

/**
 * Convenience function to trigger Zapier events
 * Use this in your application code instead of directly using ZapierIntegrationService
 */
export const zapierTrigger = ZapierTriggerHelper;
