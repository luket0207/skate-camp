import React, { useMemo, useState } from "react";
import { useGame } from "../../engine/gameContext/gameContext";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { generateBeginnerSkater, SKATER_SPORT } from "./skaterUtils";
import { useModal, MODAL_BUTTONS } from "../../engine/ui/modal/modalContext";
import TrickTreeModalContent from "./components/trickTreeModalContent";
import { getLibraryLevelTotal, getTypeRatingsForSkater } from "./trickLibraryUtils";
import "./skaters.scss";

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
              poolSkater.id === skater.id ? { ...poolSkater, trickLibrary: nextLibrary } : poolSkater
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
        <Button variant={BUTTON_VARIANT.SECONDARY} to="/grid">
          Back To Grid
        </Button>
      </div>

      <div className="skatersPage__debug">
        <h3>Debug: Add Beginner Skater Directly</h3>
        <select value={debugSport} onChange={(event) => setDebugSport(event.target.value)}>
          <option value={SKATER_SPORT.SKATEBOARDER}>Skateboarder</option>
          <option value={SKATER_SPORT.ROLLERBLADER}>Rollerblader</option>
        </select>
        <Button variant={BUTTON_VARIANT.PRIMARY} onClick={addDebugSkater}>
          Generate Beginner Skater
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

            <pre>{JSON.stringify(skater, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skaters;
