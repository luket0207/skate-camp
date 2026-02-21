import React, { useMemo, useState } from "react";
import { useGame } from "../../engine/gameContext/gameContext";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { generateBeginnerSkater, generateMediumSkater, generateProSkater, SKATER_SPORT } from "./skaterUtils";
import { useModal, MODAL_BUTTONS } from "../../engine/ui/modal/modalContext";
import TrickTreeModalContent from "./components/trickTreeModalContent";
import { getLibraryLevelTotal, getMaxTypeCostBySport, getTypeRatingsForSkater, recalculateSkaterTypeRatings } from "./trickLibraryUtils";
import { buildTrickName } from "./trickNameUtils";
import "./skaters.scss";

const toTitle = (value) =>
  String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (first) => first.toUpperCase())
    .trim();

const getTrickTypeKeys = (sport) =>
  sport === SKATER_SPORT.ROLLERBLADER
    ? ["stall", "grind", "tech", "spin", "bigAir"]
    : ["stall", "grind", "tech", "spin", "bigAir"];

const Skaters = () => {
  const { gameState, setGameValue } = useGame();
  const { openModal, closeModal } = useModal();
  const [debugSport, setDebugSport] = useState(SKATER_SPORT.SKATEBOARDER);

  const pool = useMemo(
    () => (Array.isArray(gameState?.player?.skaterPool) ? gameState.player.skaterPool : []),
    [gameState?.player?.skaterPool]
  );

  const addDebugSkater = () => {
    const next = generateBeginnerSkater(debugSport);
    setGameValue("player.skaterPool", [...pool, next]);
  };

  const addDebugMediumSkater = () => {
    const next = generateMediumSkater(debugSport);
    setGameValue("player.skaterPool", [...pool, next]);
  };

  const addDebugProSkater = () => {
    const next = generateProSkater(debugSport);
    setGameValue("player.skaterPool", [...pool, next]);
  };

  const removeSkater = (skaterId) => {
    setGameValue(
      "player.skaterPool",
      pool.filter((skater) => skater.id !== skaterId)
    );
  };

  const openTreeModal = (skater) => {
    openModal({
      modalTitle: `${skater.name} Trick Tree`,
      buttons: MODAL_BUTTONS.NONE,
      modalContent: (
        <TrickTreeModalContent
          skater={skater}
          onCommit={(nextLibrary) => {
            const nextPool = pool.map((poolSkater) =>
              poolSkater.id === skater.id
                ? {
                    ...poolSkater,
                    trickLibrary: nextLibrary,
                    ...recalculateSkaterTypeRatings({ ...poolSkater, trickLibrary: nextLibrary }),
                  }
                : poolSkater
            );
            setGameValue("player.skaterPool", nextPool);
            closeModal();
          }}
        />
      ),
    });
  };

  return (
    <div className="skatersPage">
      <div className="skatersPage__header">
        <h1>Player Skaters</h1>
        <Button variant={BUTTON_VARIANT.SECONDARY} to="/skatepark">
          Back To Skatepark
        </Button>
      </div>

      <div className="skatersPage__debug">
        <h3>Debug: Add Skater Directly</h3>
        <select value={debugSport} onChange={(event) => setDebugSport(event.target.value)}>
          <option value={SKATER_SPORT.SKATEBOARDER}>Skateboarder</option>
          <option value={SKATER_SPORT.ROLLERBLADER}>Rollerblader</option>
        </select>
        <Button variant={BUTTON_VARIANT.PRIMARY} onClick={addDebugSkater}>
          Generate Beginner Skater
        </Button>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={addDebugMediumSkater}>
          Generate Medium Skater
        </Button>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={addDebugProSkater}>
          Generate Pro Skater
        </Button>
      </div>

      <div className="skatersPage__list">
        {pool.length === 0 && <div className="skatersPage__empty">No skaters in your pool yet.</div>}

        {pool.map((skater) => (
          <div key={skater.id} className="skatersPage__card">
            <div className="skatersPage__cardHead">
              <h4>{skater.name}</h4>
              <div className="skatersPage__cardActions">
                <Button variant={BUTTON_VARIANT.PRIMARY} onClick={() => openTreeModal(skater)}>
                  Trick Tree
                </Button>
                <Button variant={BUTTON_VARIANT.SECONDARY} onClick={() => removeSkater(skater.id)}>
                  Remove
                </Button>
              </div>
            </div>

            <div className="skatersPage__meta">
              <span>Type Rating Total: {Object.values(getTypeRatingsForSkater(skater)).reduce((sum, value) => sum + value, 0)}</span>
              <span>Trick Library Total: {getLibraryLevelTotal(skater.trickLibrary || [])}</span>
            </div>

            <div className="skatersPage__details">
              <section className="skatersPage__section">
                <h5>Profile</h5>
                <ul className="skatersPage__kvList">
                  <li><strong>ID:</strong> {skater.id}</li>
                  <li><strong>Type:</strong> {skater.type}</li>
                  <li><strong>Sport:</strong> {skater.sport}</li>
                  <li><strong>Initials:</strong> {skater.initials}</li>
                  <li><strong>Base Energy:</strong> {skater.baseEnergy}</li>
                  <li><strong>Skill Level:</strong> {skater.skillLevel}</li>
                  <li><strong>Determination:</strong> {skater.determination}</li>
                  <li><strong>Steeze Rating:</strong> {skater.steezeRating}</li>
                  <li><strong>Base Steeze:</strong> {skater.baseSteeze}</li>
                  <li><strong>Switch Rating:</strong> {skater.switchRating}</li>
                  <li><strong>Switch Potential:</strong> {skater.switchPotential}</li>
                </ul>
              </section>

              <section className="skatersPage__section">
                <h5>Trick Type Ratings</h5>
                <ul className="skatersPage__kvList">
                  {getTrickTypeKeys(skater.sport).map((typeKey) => {
                    const rating = getTypeRatingsForSkater(skater)[typeKey] || 0;
                    const typeMax = getMaxTypeCostBySport(skater.sport)[typeKey] || 1;
                    const fill = Math.round((rating / typeMax) * 100);
                    return (
                      <li key={`${skater.id}-rating-${typeKey}`}>
                        <strong>{toTitle(typeKey)}:</strong> {rating} / {typeMax} ({fill}%)
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="skatersPage__section">
                <h5>Trick Type Potentials</h5>
                <ul className="skatersPage__kvList">
                  {getTrickTypeKeys(skater.sport).map((typeKey) => {
                    const potentialKey = `${typeKey}Potential`;
                    return (
                      <li key={`${skater.id}-potential-${typeKey}`}>
                        <strong>{toTitle(typeKey)} Potential:</strong> {skater[potentialKey] ?? 0}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="skatersPage__section skatersPage__section--library">
                <h5>Trick Library</h5>
                {(skater.trickLibrary || []).length < 1 ? (
                  <div className="skatersPage__emptyLibrary">No unlocked tricks.</div>
                ) : (
                  <div className="skatersPage__libraryTypeList">
                    {getTrickTypeKeys(skater.sport).map((typeKey) => {
                      const typeCores = (skater.trickLibrary || []).filter((entry) => entry.type === typeKey);
                      if (typeCores.length < 1) return null;
                      return (
                        <article key={`${skater.id}-library-${typeKey}`} className="skatersPage__libraryType">
                          <header>{toTitle(typeKey)}</header>
                          <div className="skatersPage__coreList">
                            {typeCores.map((core) => (
                              <div key={`${skater.id}-${typeKey}-${core.core}`} className="skatersPage__coreCard">
                                <div className="skatersPage__coreTop">
                                  <span className="skatersPage__coreName">{core.core}</span>
                                  <span className="skatersPage__coreLevel">Core L{core.coreLevel} / C{core.coreCost}</span>
                                </div>
                                <div className="skatersPage__variantList">
                                  {(core.modifiers || []).length < 1 ? (
                                    <span className="skatersPage__variantEmpty">No variants unlocked</span>
                                  ) : (
                                    (core.modifiers || []).map((variant) => (
                                      <span
                                        key={`${skater.id}-${typeKey}-${core.core}-${variant.parentVariant || ""}-${variant.name}`}
                                        className={`skatersPage__variantChip ${variant.kind === "upgrade" ? "is-upgrade" : "is-variant"}`}
                                      >
                                        {variant.name} ({variant.placement}) C{variant.cost}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skaters;
