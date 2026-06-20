export default function validateFilterStructure(
  node,
  parentConjunction = null,
  isRoot = true,
  ignoreEventfilterType,
  ignoreCustomEventfilterType,
  eventFilterMandatory = true,
) {
  if (!node) throw new Error("Empty filter node");

  if (node.type === "group") {
    const { conjunction, children } = node;
    if (!Array.isArray(children) || children.length === 0) {
      throw new Error("Group must have children");
    }

    if (!ignoreEventfilterType && !ignoreCustomEventfilterType) {
      // Check: If group has multiple event filters as direct children, it must be OR
      const directEventChildren = children.filter(c =>
          c.type === "filter" && ["event", "customEvent"].includes(c.filterType)
      );
      if (directEventChildren.length > 1 && conjunction !== "or") {
        throw new Error(
          "Groups containing multiple event filters must use 'or' conjunction",
        );
      }

      // If root AND: cannot directly contain more than one event filter
      if (isRoot && conjunction === "and" && directEventChildren.length > 1) {
        throw new Error(
          "Root AND group cannot contain multiple event filters directly",
        );
      }

      // Root must contain one event filter atleast
      if (eventFilterMandatory && isRoot && directEventChildren.length == 0) {
        throw new Error("Root group must have an event filter");
      }
    }

    // Recurse into children
    children.forEach((child) =>
      validateFilterStructure(
        child,
        conjunction,
        false,
        ignoreEventfilterType,
        ignoreCustomEventfilterType,
        eventFilterMandatory,
      ),
    );
    return true;
  }

  if (node.type === "filter") {
    // No special checks here — but could enforce supported filterTypes
    if (
      node.filterType &&
      !["event", "customEvent", "attribute", "additionalInfo", "slice", "cohort", "eventData"].includes(
        node.filterType,
      )
    ) {
      throw new Error(`Unsupported filterType: ${node.filterType}`);
    }
    return true;
  }

  throw new Error(`Unsupported node type: ${node.type}`);
}
