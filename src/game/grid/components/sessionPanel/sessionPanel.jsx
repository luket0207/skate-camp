import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import "./sessionPanel.scss";

const SessionPanel = ({
  sessionState,
  timeline,
  runDisplay,
  attemptLog,
  canRecruitSkaters,
  poolSpaceRemaining,
  onRecruitSkater,
}) => {
  const attemptsBySkater = attemptLog.reduce((acc, entry) => {
    if (!acc[entry.skaterId]) {
      acc[entry.skaterId] = {
        skaterId: entry.skaterId,
        skaterName: entry.skaterName,
        skaterInitials: entry.skaterInitials,
        skaterColor: entry.skaterColor,
        attempts: [],
      };
    }
    acc[entry.skaterId].attempts.push(entry);
    return acc;
  }, {});

  const groupedAttempts = (sessionState.sessionType === "beginner" ? sessionState.skaters : [])
    .map((skater) => ({
      skaterId: skater.id,
      skaterName: skater.name,
      skaterInitials: skater.initials,
      skaterColor: skater.color,
      attempts: attemptsBySkater[skater.id]?.attempts || [],
    }))
    .concat(
      Object.values(attemptsBySkater).filter(
        (group) => !sessionState.skaters.some((skater) => skater.id === group.skaterId)
      )
    );

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

      <div className="sessionPanel__section">
        <h3>Session Trick Attempts</h3>
        {attemptLog.length === 0 && (
          <div className="sessionPanel__empty">No tricks attempted yet in this session.</div>
        )}

        {groupedAttempts.map((group) => (
          <div key={group.skaterId} className="sessionPanel__attemptGroup">
            <div className="sessionPanel__attemptGroupHeader">
              <span className="sessionPanel__badge" style={{ backgroundColor: group.skaterColor }}>
                {group.skaterInitials}
              </span>
              <span>{group.skaterName}</span>
              {sessionState.sessionType === "beginner" && (
                <Button
                  variant={BUTTON_VARIANT.SECONDARY}
                  className="sessionPanel__recruitButton"
                  onClick={() => onRecruitSkater(group.skaterId)}
                  disabled={
                    !canRecruitSkaters ||
                    poolSpaceRemaining < 1 ||
                    sessionState.recruitedSkaterIds.includes(group.skaterId)
                  }
                >
                  {sessionState.recruitedSkaterIds.includes(group.skaterId) ? "Recruited" : "Recruit"}
                </Button>
              )}
            </div>

            {group.attempts.length < 1 && (
              <div className="sessionPanel__empty">No trick attempts logged for this skater yet.</div>
            )}
            {group.attempts.map((entry) => (
              <div key={entry.id} className="sessionPanel__attemptItem">
                <span className="sessionPanel__attemptTick">T{entry.tick}</span>
                <span>
                  {entry.coreName}
                  {entry.variantName ? ` | ${entry.variantName}` : ""}
                </span>
                <span className="sessionPanel__attemptMeta">
                  {entry.type} | {entry.pieceName}
                  {entry.pieceCoordinate ? ` (${entry.pieceCoordinate})` : ""}
                </span>
                {entry.isRepeatInSession && <span className="sessionPanel__repeatFlag">Repeat</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default SessionPanel;
