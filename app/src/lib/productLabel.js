/**
 * Product variant labels for the Pilot brand by Lite Ops.
 * Each workspace can have a product_type that determines the displayed name.
 */

const PRODUCT_LABELS = {
  hr: { prefix: "HR", full: "HR Pilot" },
  risk: { prefix: "Risk", full: "Risk Pilot" },
  compliance: { prefix: "Compliance", full: "Compliance Pilot" },
  data: { prefix: "Data", full: "Data Pilot" },
  pilot: { prefix: "", full: "Pilot" },
};

/**
 * Returns { prefix, full } for the workspace's product type.
 * prefix is the part before "Pilot" (e.g. "HR"), empty for generic.
 * full is the complete label (e.g. "HR Pilot").
 */
export function getProductLabel(workspace) {
  const type = workspace?.product_type || "pilot";
  return PRODUCT_LABELS[type] || PRODUCT_LABELS.pilot;
}

/**
 * Returns just the full display string.
 */
export function getProductName(workspace) {
  return getProductLabel(workspace).full;
}
