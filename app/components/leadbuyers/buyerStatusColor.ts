/**
 * Shared status → color mapping for the four real IBuyer.status values
 * (models/leadbuyers.ts). Previously buyertable.tsx and the buyer detail
 * page each had their own mapping, neither of which actually matched the
 * schema's enum ("pending"/"banned" don't exist on this model), and they
 * disagreed with each other on how to treat "inactive". "suspended" — the
 * status most worth a seller noticing — fell through to a neutral color in
 * both.
 */
export type BuyerStatus = "new" | "active" | "inactive" | "suspended";

export function getBuyerStatusColor(
  status: string,
): "success" | "warning" | "error" | "default" | "info" {
  switch (status?.toLowerCase()) {
    case "active":
      return "success";
    case "new":
      return "info";
    case "suspended":
      return "error";
    case "inactive":
      return "default";
    default:
      return "default";
  }
}
