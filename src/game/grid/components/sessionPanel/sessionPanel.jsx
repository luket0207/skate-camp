import React from "react";
import "./sessionPanel.scss";

const SessionPanel = ({ sessionState, timeline, runDisplay }) => {
  return (
    <section className="sessionPanel">
      <div className="sessionPanel__section">
        <h3>Session Timeline</h3>
        <div className="sessionPanel__timeline">
          {timeline.length === 0 && <div className="sessionPanel__empty">Start a session to populate timeline.</div>}

          {timeline.map((entry) => (
            <div key={entry.id} className="sessionPanel__timelineItem">
              <span className="sessionPanel__badge">{entry.initials}</span>
              <span>
                {entry.name} | arrives {entry.arrivalTick} | leaves {entry.leaveTick} | energy {entry.energy}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="sessionPanel__section">
        <h3>Current Run</h3>
        <div className="sessionPanel__runInfo">
          <div>
            Tick {sessionState.currentTick}/{sessionState.maxTicks}
          </div>
          <div>Status: {sessionState.isTickRunning ? "Tick Running" : sessionState.isActive ? "Ready" : "Inactive"}</div>
        </div>

        {runDisplay.length === 0 && (
          <div className="sessionPanel__empty">No skaters currently active in the skatepark.</div>
        )}

        {runDisplay.map((entry) => (
          <div key={entry.id} className="sessionPanel__runItem">
            <span className="sessionPanel__badge" style={{ backgroundColor: entry.color }}>
              {entry.initials}
            </span>
            <span>{entry.name}</span>
            <span>{entry.startingOn}</span>
            <span>Energy Left: {entry.energyLeft}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SessionPanel;
