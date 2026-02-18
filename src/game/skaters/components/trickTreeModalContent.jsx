import React, { useMemo, useState } from "react";
import Button, { BUTTON_VARIANT } from "../../../engine/ui/button/button";
import { getTrickTreeForSport, getNodeAvailability, purchaseNode } from "../trickLibraryUtils";

const isUnlocked = (library, id) => library.some((entry) => entry.id === id);

const TrickTreeModalContent = ({ skater, onCommit }) => {
  const initialLibrary = useMemo(() => skater.trickLibrary || [], [skater.trickLibrary]);
  const [draftLibrary, setDraftLibrary] = useState(initialLibrary);

  const tree = useMemo(() => getTrickTreeForSport(skater.sport), [skater.sport]);

  const onUnlock = (type, coreNode, variantNode = null, upgradeNode = null, upgradeIndex = -1) => {
    const result = purchaseNode({
      trickLibrary: draftLibrary,
      type,
      coreNode,
      variantNode,
      upgradeNode,
      upgradeIndex,
    });

    if (result.success) setDraftLibrary(result.trickLibrary);
  };

  return (
    <div style={{ display: "grid", gap: "0.8rem", maxHeight: "70vh", overflow: "auto" }}>
      {Object.entries(tree).map(([type, cores]) => (
        <section key={type} style={{ display: "grid", gap: "0.4rem" }}>
          <h4 style={{ margin: 0 }}>{type.toUpperCase()}</h4>

          {cores.map((coreNode) => {
            const coreState = getNodeAvailability(draftLibrary, type, coreNode);
            return (
              <div key={`${type}-${coreNode.core}`} style={{ border: "1px solid rgba(0,0,0,0.2)", borderRadius: "8px", padding: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                  <strong>
                    Core: {coreNode.core} (L{coreNode.level})
                  </strong>
                  <Button
                    variant={BUTTON_VARIANT.PRIMARY}
                    onClick={() => onUnlock(type, coreNode)}
                    disabled={!coreState.available || isUnlocked(draftLibrary, `core|${type}|${coreNode.core}`)}
                  >
                    Unlock Core
                  </Button>
                </div>

                <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.5rem" }}>
                  {coreNode.variants.map((variantNode) => {
                    const variantState = getNodeAvailability(draftLibrary, type, coreNode, variantNode);
                    return (
                      <div key={`${type}-${coreNode.core}-${variantNode.name}`} style={{ paddingLeft: "0.5rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                          <span>
                            Variant: {variantNode.name} (L{variantNode.level})
                          </span>
                          <Button
                            variant={BUTTON_VARIANT.SECONDARY}
                            onClick={() => onUnlock(type, coreNode, variantNode)}
                            disabled={!variantState.available}
                          >
                            Unlock Variant
                          </Button>
                          <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>{variantState.reason}</span>
                        </div>

                        {variantNode.upgrades.map((upgradeNode, upgradeIndex) => {
                          const upgradeState = getNodeAvailability(
                            draftLibrary,
                            type,
                            coreNode,
                            variantNode,
                            upgradeNode,
                            upgradeIndex
                          );
                          return (
                            <div
                              key={`${type}-${coreNode.core}-${variantNode.name}-${upgradeNode.name}-${upgradeIndex}`}
                              style={{ display: "flex", gap: "0.5rem", alignItems: "center", paddingLeft: "0.9rem", marginTop: "0.25rem", flexWrap: "wrap" }}
                            >
                              <span>
                                Upgrade: {upgradeNode.name} (L{upgradeNode.level})
                              </span>
                              <Button
                                variant={BUTTON_VARIANT.TERTIARY}
                                onClick={() => onUnlock(type, coreNode, variantNode, upgradeNode, upgradeIndex)}
                                disabled={!upgradeState.available}
                              >
                                Unlock Upgrade
                              </Button>
                              <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>{upgradeState.reason}</span>
                            </div>
                          );
                        })}
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
