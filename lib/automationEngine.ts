import dbConnect from "@/lib/connectdb";
import {
  AutomationWorkflow,
  WorkflowExecution,
  IAction,
  IAutomationWorkflow,
  ICondition,
  IWorkflowExecution,
  TriggerType,
} from "@/models/automationWorkflow";
import { Lead } from "@/models/leads";

// Types
export interface WorkflowTriggerEvent {
  type: TriggerType | "manual";
  leadId?: string;
  buyerId?: string;
  metadata?: Record<string, unknown>;
}

// Condition Evaluator
class ConditionEvaluator {
  static evaluate(
    conditions: ICondition[],
    context: Record<string, unknown>,
  ): boolean {
    if (conditions.length === 0) return true;

    return conditions.every((condition) => {
      const contextValue = context[condition.field];
      switch (condition.operator) {
        case "equals":
          return contextValue === condition.value;
        case "contains":
          return (
            typeof contextValue === "string" &&
            contextValue.includes(String(condition.value))
          );
        case "greater_than":
          return Number(contextValue) > Number(condition.value);
        case "less_than":
          return Number(contextValue) < Number(condition.value);
        case "in_array":
          return Array.isArray(condition.value) &&
            condition.value.includes(String(contextValue))
            ? true
            : false;
        case "exists":
          return contextValue !== undefined && contextValue !== null;
        default:
          return false;
      }
    });
  }
}

// Action Executor
class ActionExecutor {
  static async execute(
    action: IAction,
    context: Record<string, unknown>,
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      switch (action.type) {
        case "send_email":
          return this.executeEmailAction(action, context);
        case "send_sms":
          return this.executeSmsAction(action, context);
        case "create_notification":
          return this.executeNotificationAction(action, context);
        case "assign_buyer":
          return this.executeAssignBuyerAction(action, context);
        case "update_lead":
          return this.executeUpdateLeadAction(action, context);
        default:
          return { success: false, error: "Unknown action type" };
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error };
    }
  }

  private static executeEmailAction(
    action: IAction,
    context: Record<string, unknown>,
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    // TODO: Integrate with email service (nodemailer, SendGrid, etc.)
    const subject = action.config.subject || "Automated Email";
    const body = action.config.body || "This is an automated email";

    console.log("📧 Email Action:", { subject, body, context });
    return Promise.resolve({
      success: true,
      result: `Email queued: ${subject}`,
    });
  }

  private static executeSmsAction(
    action: IAction,
    context: Record<string, unknown>,
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    const message = action.config.message || "Automated SMS";

    console.log("📱 SMS Action:", { message, context });
    return Promise.resolve({ success: true, result: `SMS queued: ${message}` });
  }

  private static executeNotificationAction(
    action: IAction,
    context: Record<string, unknown>,
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    const title = action.config.notificationTitle || "Notification";
    const body = action.config.notificationBody || "New notification";

    console.log("🔔 Notification Action:", { title, body, context });
    return Promise.resolve({
      success: true,
      result: `Notification sent: ${title}`,
    });
  }

  private static executeAssignBuyerAction(
    action: IAction,
    context: Record<string, unknown>,
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    // TODO: Integrate with lead assignment logic
    const buyerId = action.config.buyerId;

    console.log("👤 Assign Buyer Action:", { buyerId, context });
    return Promise.resolve({
      success: true,
      result: `Lead assigned to buyer: ${buyerId}`,
    });
  }

  private static executeUpdateLeadAction(
    action: IAction,
    context: Record<string, unknown>,
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    // TODO: Update lead with provided fields
    const fields = action.config.updateFields;

    console.log("✏️ Update Lead Action:", { fields, context });
    return Promise.resolve({
      success: true,
      result: `Lead updated with fields`,
    });
  }
}

export class AutomationEngine {
  /**
   * Trigger a workflow based on an event
   */
  static async triggerWorkflow(
    event: WorkflowTriggerEvent,
    userId: string,
  ): Promise<void> {
    await dbConnect();

    try {
      // Find matching workflows for this user and trigger type
      const workflows = await AutomationWorkflow.find({
        userId,
        isActive: true,
        "triggers.type": event.type,
      });

      for (const workflow of workflows) {
        await this.executeWorkflow(workflow, event);
      }
    } catch (err) {
      console.error("Error triggering workflow:", err);
    }
  }

  /**
   * Execute a specific workflow
   */
  static async executeWorkflow(
    workflow: InstanceType<typeof AutomationWorkflow>,
    event: WorkflowTriggerEvent,
  ): Promise<void> {
    try {
      // Check execution limits
      if (
        workflow.maxExecutions &&
        (workflow.executionsCount || 0) >= workflow.maxExecutions
      ) {
        // Reset counter if new day
        const now = new Date();
        const resetTime = workflow.executionResetTime;
        if (resetTime && now.getDate() !== resetTime.getDate()) {
          workflow.executionsCount = 0;
          workflow.executionResetTime = now;
        } else {
          console.log("Workflow reached max executions for today");
          return;
        }
      }

      // Get lead context for condition evaluation
      let leadContext: Record<string, unknown> = event.metadata || {};
      if (event.leadId) {
        const lead = await Lead.findById(event.leadId);
        if (lead) {
          leadContext = { ...leadContext, ...lead.toObject() };
        }
      }

      // Create execution record
      const execution = new WorkflowExecution({
        workflowId: workflow._id,
        userId: workflow.userId,
        triggerData: {
          type: event.type,
          leadId: event.leadId,
          buyerId: event.buyerId,
          eventData: event.metadata,
        },
        status: "executing",
        startedAt: new Date(),
      });

      // Evaluate all triggers and their conditions
      let conditionsMetForAnyTrigger = false;

      for (const trigger of workflow.triggers) {
        if (trigger.type === event.type) {
          const conditionsMet = ConditionEvaluator.evaluate(
            trigger.conditions || [],
            leadContext,
          );
          if (conditionsMet) {
            conditionsMetForAnyTrigger = true;
            break;
          }
        }
      }

      execution.conditionsResult = conditionsMetForAnyTrigger;

      // If conditions not met, mark execution as failed
      if (!conditionsMetForAnyTrigger) {
        execution.status = "completed";
        await execution.save();
        return;
      }

      // Execute all actions
      const executedActions: IWorkflowExecution["executedActions"] = [];
      let allSuccess = true;

      for (const action of workflow.actions) {
        const actionResult = await ActionExecutor.execute(action, leadContext);
        const status: "success" | "failed" = actionResult.success
          ? "success"
          : "failed";
        executedActions.push({
          actionType: action.type as unknown as IAction["type"],
          status,
          result: actionResult.result,
          error: actionResult.error,
          executedAt: new Date(),
        });

        if (!actionResult.success) {
          allSuccess = false;
        }
      }

      execution.executedActions = executedActions;
      const execStatus: "completed" | "partially_failed" = allSuccess
        ? "completed"
        : "partially_failed";
      execution.status = execStatus;
      execution.completedAt = new Date();

      // Update workflow stats
      workflow.totalExecutions = (workflow.totalExecutions || 0) + 1;
      workflow.executionsCount =
        ((workflow.executionsCount as unknown as number) || 0) + 1;
      workflow.lastExecutedAt = new Date();

      if (allSuccess) {
        workflow.successCount += 1;
      } else {
        workflow.failureCount += 1;
      }

      await Promise.all([execution.save(), workflow.save()]);

      console.log(
        `✅ Workflow executed: ${workflow.name} - Status: ${execution.status}`,
      );
    } catch (err) {
      console.error("Error executing workflow:", err);
    }
  }

  /**
   * Get workflow execution history
   */
  static async getExecutionHistory(
    workflowId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ executions: IWorkflowExecution[]; total: number }> {
    await dbConnect();

    const executions = await WorkflowExecution.find({ workflowId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await WorkflowExecution.countDocuments({ workflowId });

    return { executions, total };
  }

  /**
   * Manually trigger a workflow
   */
  static async manualTrigger(
    workflowId: string,
    userId: string,
    context?: Record<string, unknown>,
  ): Promise<{ success: boolean; executionId?: string; error?: string }> {
    await dbConnect();

    try {
      const workflow = await AutomationWorkflow.findOne({
        _id: workflowId,
        userId,
      });
      if (!workflow) {
        return { success: false, error: "Workflow not found" };
      }

      const event: WorkflowTriggerEvent = {
        type: "manual",
        metadata: context,
      };

      await this.executeWorkflow(workflow, event);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error };
    }
  }

  /**
   * Disable execution limiter for workflow (for testing)
   */
  static async resetExecutionCounter(
    workflowId: string,
    userId: string,
  ): Promise<boolean> {
    await dbConnect();

    const result = await AutomationWorkflow.updateOne(
      { _id: workflowId, userId },
      {
        $set: {
          executionsCount: 0,
          executionResetTime: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }
}

export default AutomationEngine;
