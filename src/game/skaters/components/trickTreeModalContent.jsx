import React, { useMemo, useState } from "react";
import Button, { BUTTON_VARIANT } from "../../../engine/ui/button/button";
import { getTrickTreeForSport, getNodeAvailability, purchaseNode } from "../trickLibraryUtils";

const TrickTreeModalContent = ({ skater, onCommit }) => {
  const initialLibrary = useMemo(
    () => (Array.isArray(skater.trickLibrary) ? skater.trickLibrary : []),
    [skater.trickLibrary]
  );
  const [draftLibrary, setDraftLibrary] = useState(initialLibrary);
  const tree = useMemo(() => getTrickTreeForSport(skater.sport), [skater.sport]);

  const onUnlockCore = (type, coreNode) => {
    const result = purchaseNode({
      trickLibrary: draftLibrary,
      type,
      coreNode,
      sport: skater.sport,
    });
    if (result.success) setDraftLibrary(result.trickLibrary);
  };

  const onUnlockModifier = (type, coreNode, modifierNode) => {
    const result = purchaseNode({
      trickLibrary: draftLibrary,
      type,
      coreNode,
      modifierNode,
      sport: skater.sport,
    });
    if (result.success) setDraftLibrary(result.trickLibrary);
  };

  return (
    <div style={{ display: "grid", gap: "0.8rem", maxHeight: "70vh", overflow: "auto" }}>
      {Object.entries(tree).map(([type, cores]) => (
        <section key={type} style={{ display: "grid", gap: "0.4rem" }}>
          <h4 style={{ margin: 0 }}>{type.toUpperCase()}</h4>

          {cores.map((coreNode) => {
            const coreState = getNodeAvailability(draftLibrary, type, coreNode, null, skater.sport);
            return (
              <div key={`${type}-${coreNode.core}`} style={{ border: "1px solid rgba(0,0,0,0.2)", borderRadius: "8px", padding: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                  <strong>
                    Core: {coreNode.core} (L{coreNode.level} / Cost {coreNode.cost})
                  </strong>
                  <Button
                    variant={BUTTON_VARIANT.PRIMARY}
                    onClick={() => onUnlockCore(type, coreNode)}
                    disabled={!coreState.available}
                  >
                    Unlock Core
                  </Button>
                  <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>{coreState.reason}</span>
                </div>

                <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.5rem" }}>
                  {(coreNode.modifiers || []).map((modifierNode) => {
                    const modifierState = getNodeAvailability(
                      draftLibrary,
                      type,
                      coreNode,
                      modifierNode,
                      skater.sport
                    );
                    return (
                      <div
                        key={`${type}-${coreNode.core}-${modifierNode.parentVariant}-${modifierNode.name}`}
                        style={{ display: "flex", gap: "0.5rem", alignItems: "center", paddingLeft: "0.7rem", flexWrap: "wrap" }}
                      >
                        <span>
                          {modifierNode.kind === "upgrade" ? "Upgrade" : "Variant"}: {modifierNode.name}
                          {" "}({modifierNode.placement} / Cost {modifierNode.cost})
                        </span>
                        {modifierNode.lockedBy && (
                          <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>
                            Locked by: {modifierNode.lockedBy.core}
                          </span>
                        )}
                        <Button
                          variant={BUTTON_VARIANT.SECONDARY}
                          onClick={() => onUnlockModifier(type, coreNode, modifierNode)}
                          disabled={!modifierState.available}
                        >
                          Unlock
                        </Button>
                        <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>{modifierState.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "0.2rem" }}>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={() => setDraftLibrary(initialLibrary)}>
          Reset
        </Button>
        <Button variant={BUTTON_VARIANT.PRIMARY} onClick={() => onCommit(draftLibrary)}>
          Commit To Skater
        </Button>
      </div>
    </div>
  );
};

export default TrickTreeModalContent;
