import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { SKATER_SPORT } from "../../../skaters/skaterUtils";

export const BeginnerSportModal = ({ onChoose }) => (
  <div style={{ display: "grid", gap: "0.6rem" }}>
    <p>Choose the beginner session sport.</p>
    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      <Button variant={BUTTON_VARIANT.PRIMARY} onClick={() => onChoose(SKATER_SPORT.SKATEBOARDER)}>
        Skateboarder
      </Button>
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={() => onChoose(SKATER_SPORT.ROLLERBLADER)}>
        Rollerblader
      </Button>
    </div>
  </div>
);

export const CompetitionSetupModal = ({ maxSlots, onStart }) => {
  const [slots, setSlots] = React.useState(Math.min(Math.max(4, maxSlots), 8));
  const [sport, setSport] = React.useState(SKATER_SPORT.SKATEBOARDER);
  const [level, setLevel] = React.useState("beginner");
  const safeMax = Math.max(4, Math.min(15, Number(maxSlots) || 4));

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <div style={{ fontSize: "0.86rem", opacity: 0.9 }}>
        Set up the competition. Skater slots: 4 to {safeMax}.
      </div>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Skater Slots
        <select
          value={slots}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value)) return;
            setSlots(Math.min(safeMax, Math.max(4, value)));
          }}
        >
          {Array.from({ length: safeMax - 3 }, (_, index) => 4 + index).map((value) => (
            <option key={`competition-slots-${value}`} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Sport
        <select value={sport} onChange={(event) => setSport(event.target.value)}>
          <option value={SKATER_SPORT.SKATEBOARDER}>Skateboarding</option>
          <option value={SKATER_SPORT.ROLLERBLADER}>Rollerblading</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Competition Level
        <select value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="beginner">Beginner</option>
          <option value="semi-pro">Semi-Pro</option>
          <option value="pro">Pro</option>
        </select>
      </label>
      <Button variant={BUTTON_VARIANT.PRIMARY} onClick={() => onStart({ slots, sport, level })}>
        Start Competition
      </Button>
    </div>
  );
};

export const VideoSetupModal = ({ edits, availableSports = [], onStart }) => {
  const safeSports = Array.isArray(availableSports) ? availableSports : [];
  const fallbackSport = safeSports[0] || SKATER_SPORT.SKATEBOARDER;
  const [mode, setMode] = React.useState("new");
  const [name, setName] = React.useState("");
  const [length, setLength] = React.useState(10);
  const [sport, setSport] = React.useState(fallbackSport);
  const [existingEditId, setExistingEditId] = React.useState(edits[0]?.id || "");
  const canCreateNew = edits.length < 3;

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <div style={{ fontSize: "0.86rem", opacity: 0.9 }}>
        Start a video session with sponsored skaters of the selected sport.
      </div>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        Edit Mode
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="new" disabled={!canCreateNew}>New Edit</option>
          <option value="existing" disabled={edits.length < 1}>Existing Edit</option>
        </select>
      </label>
      {mode === "new" ? (
        <>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            Edit Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter edit name"
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            Length (tricks)
            <input
              type="number"
              min={1}
              max={50}
              value={length}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setLength(Math.max(1, Math.min(50, value)));
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            Sport
            <select value={sport} onChange={(event) => setSport(event.target.value)}>
              <option value={SKATER_SPORT.SKATEBOARDER} disabled={!safeSports.includes(SKATER_SPORT.SKATEBOARDER)}>
                Skateboarding
              </option>
              <option value={SKATER_SPORT.ROLLERBLADER} disabled={!safeSports.includes(SKATER_SPORT.ROLLERBLADER)}>
                Rollerblading
              </option>
            </select>
          </label>
        </>
      ) : (
        <label style={{ display: "grid", gap: "0.35rem" }}>
          Existing Edit
          <select value={existingEditId} onChange={(event) => setExistingEditId(event.target.value)}>
            {edits.map((edit) => (
              <option key={edit.id} value={edit.id}>
                {edit.name} | {edit.sportType} | {edit.footage.length}/{edit.length}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button
        variant={BUTTON_VARIANT.PRIMARY}
        disabled={mode === "new" ? !name.trim() || !canCreateNew || !safeSports.includes(sport) : !existingEditId}
        onClick={() => onStart({
          mode,
          name: name.trim(),
          length: Math.max(1, Number(length) || 1),
          sport,
          existingEditId,
        })}
      >
        Start Video Session
      </Button>
    </div>
  );
};

export const VideoTickReviewModal = ({ landedEntries, onConfirm }) => {
  const [selectedIds, setSelectedIds] = React.useState(() => new Set());

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: "grid", gap: "0.7rem", maxHeight: "60vh", overflowY: "auto" }}>
      <strong>Video Session Tick Review</strong>
      {landedEntries.length < 1 && <div>No landed tricks this tick.</div>}
      {landedEntries.map((entry) => (
        <label
          key={entry.id}
          style={{
            display: "grid",
            gap: "0.2rem",
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: "8px",
            padding: "0.45rem 0.55rem",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "inline-flex", gap: "0.45rem", alignItems: "center" }}>
            <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggle(entry.id)} />
            <strong>{entry.trickName}</strong>
          </span>
          <span>{entry.skaterName} | {entry.type}</span>
          <span>{entry.pieceName}{entry.pieceCoordinate ? ` (${entry.pieceCoordinate})` : ""} | {entry.trickPoints} pts</span>
        </label>
      ))}
      <Button variant={BUTTON_VARIANT.PRIMARY} onClick={() => onConfirm(landedEntries.filter((entry) => selectedIds.has(entry.id)))}>
        Continue
      </Button>
    </div>
  );
};

export const VideoSessionResultsModal = ({ attempts = [], edit = null }) => {
  const landed = attempts.filter((entry) => entry.landed);
  return (
    <div style={{ display: "grid", gap: "0.7rem", maxHeight: "60vh", overflowY: "auto" }}>
      <strong>Video Session Results</strong>
      <div style={{ fontSize: "0.84rem" }}>
        Landed tricks: {landed.length} | Total attempts: {attempts.length}
      </div>
      {edit && (
        <div style={{ fontSize: "0.84rem" }}>
          Edit: <strong>{edit.name}</strong> | Footage: {(edit.footage || []).length}/{edit.length}
        </div>
      )}
      {landed.length < 1 && <div style={{ fontSize: "0.84rem" }}>No landed tricks recorded.</div>}
      {landed.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: "grid",
            gap: "0.2rem",
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: "8px",
            padding: "0.45rem 0.55rem",
            fontSize: "0.8rem",
          }}
        >
          <div><strong>{entry.trickName}</strong> ({entry.type})</div>
          <div>{entry.skaterName} | {entry.pieceName}{entry.pieceCoordinate ? ` (${entry.pieceCoordinate})` : ""}</div>
          <div>Points: {entry.trickPoints || 0}</div>
        </div>
      ))}
    </div>
  );
};

export const EditsLibraryModal = ({ edits = [] }) => (
  <div style={{ display: "grid", gap: "0.7rem", maxHeight: "65vh", overflowY: "auto" }}>
    <strong>Edits Library</strong>
    {edits.length < 1 && <div style={{ fontSize: "0.84rem" }}>No edits available.</div>}
    {edits.map((edit) => (
      <div
        key={edit.id}
        style={{
          display: "grid",
          gap: "0.35rem",
          border: "1px solid rgba(0,0,0,0.18)",
          borderRadius: "8px",
          padding: "0.5rem 0.6rem",
          fontSize: "0.82rem",
        }}
      >
        <div><strong>{edit.name}</strong></div>
        <div>Sport: {edit.sportType}</div>
        <div>Length: {edit.length}</div>
        <div>Footage: {Array.isArray(edit.footage) ? edit.footage.length : 0}/{edit.length}</div>
        <div style={{ marginTop: "0.2rem" }}>
          <strong>Footage Tricks</strong>
        </div>
        {(Array.isArray(edit.footage) ? edit.footage : []).length < 1 && (
          <div style={{ opacity: 0.78 }}>No footage recorded yet.</div>
        )}
        {(Array.isArray(edit.footage) ? edit.footage : []).map((clip) => (
          <div key={clip.id} style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "0.25rem" }}>
            {clip.trickName} | {clip.skaterName} | {clip.pieceName}
            {clip.pieceCoordinate ? ` (${clip.pieceCoordinate})` : ""} | {clip.points} pts
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const LessonSetupModal = ({ instructors, skaters, maxInstructorCount, onStart }) => {
  const [selectedInstructorIds, setSelectedInstructorIds] = React.useState([]);
  const [selectedSkaterIds, setSelectedSkaterIds] = React.useState([]);

  React.useEffect(() => {
    setSelectedSkaterIds((prev) => {
      if (prev.length <= selectedInstructorIds.length) return prev;
      return prev.slice(0, selectedInstructorIds.length);
    });
  }, [selectedInstructorIds.length]);

  const addInstructor = (instructorId) => {
    setSelectedInstructorIds((prev) => {
      if (prev.includes(instructorId)) return prev;
      if (prev.length >= maxInstructorCount) return prev;
      return [...prev, instructorId];
    });
  };
  const removeInstructor = (instructorId) => setSelectedInstructorIds((prev) => prev.filter((id) => id !== instructorId));
  const addSkater = (skaterId) => {
    setSelectedSkaterIds((prev) => {
      if (prev.includes(skaterId)) return prev;
      if (prev.length >= selectedInstructorIds.length) return prev;
      return [...prev, skaterId];
    });
  };
  const removeSkater = (skaterId) => setSelectedSkaterIds((prev) => prev.filter((id) => id !== skaterId));

  const canStart = selectedInstructorIds.length >= 1 && selectedSkaterIds.length === selectedInstructorIds.length;
  const getSlotsRemaining = (instructor) =>
    Math.max(0, Number(instructor?.lessonSlotsRemaining ?? instructor?.lessonSlotsBase ?? instructor?.lessonSlots ?? 0));
  const availableInstructors = instructors.filter((item) => !selectedInstructorIds.includes(item.id));
  const inSessionInstructors = selectedInstructorIds.map((id) => instructors.find((item) => item.id === id)).filter(Boolean);
  const availableSkaters = skaters.filter((item) => !selectedSkaterIds.includes(item.id));
  const inSessionSkaters = selectedSkaterIds.map((id) => skaters.find((item) => item.id === id)).filter(Boolean);

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <div style={{ fontSize: "0.86rem", opacity: 0.9 }}>
        Move instructors and skaters into the In Session columns. Counts must match.
      </div>
      <div style={{ display: "grid", gap: "0.45rem" }}>
        <strong>Instructors</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, opacity: 0.88 }}>Available</div>
            <div style={{ display: "grid", gap: "0.3rem", maxHeight: "180px", overflowY: "auto" }}>
              {availableInstructors.map((instructor) => (
                <Button
                  key={instructor.id}
                  variant={BUTTON_VARIANT.SECONDARY}
                  onClick={() => addInstructor(instructor.id)}
                  disabled={selectedInstructorIds.length >= maxInstructorCount || getSlotsRemaining(instructor) < 1}
                >
                  + {instructor.name} ({getSlotsRemaining(instructor)} slots)
                </Button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, opacity: 0.88 }}>
              In Session ({selectedInstructorIds.length}/{maxInstructorCount})
            </div>
            <div style={{ display: "grid", gap: "0.3rem", maxHeight: "180px", overflowY: "auto" }}>
              {inSessionInstructors.map((instructor) => (
                <Button key={instructor.id} variant={BUTTON_VARIANT.PRIMARY} onClick={() => removeInstructor(instructor.id)}>
                  - {instructor.name} ({getSlotsRemaining(instructor)} slots)
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: "0.45rem" }}>
        <strong>Skaters</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, opacity: 0.88 }}>Available</div>
            <div style={{ display: "grid", gap: "0.3rem", maxHeight: "180px", overflowY: "auto" }}>
              {availableSkaters.map((skater) => (
                <Button
                  key={skater.id}
                  variant={BUTTON_VARIANT.SECONDARY}
                  onClick={() => addSkater(skater.id)}
                  disabled={selectedSkaterIds.length >= selectedInstructorIds.length}
                >
                  + {skater.name}
                </Button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, opacity: 0.88 }}>
              In Session ({selectedSkaterIds.length}/{selectedInstructorIds.length})
            </div>
            <div style={{ display: "grid", gap: "0.3rem", maxHeight: "180px", overflowY: "auto" }}>
              {inSessionSkaters.map((skater) => (
                <Button key={skater.id} variant={BUTTON_VARIANT.PRIMARY} onClick={() => removeSkater(skater.id)}>
                  - {skater.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Button variant={BUTTON_VARIANT.PRIMARY} disabled={!canStart} onClick={() => onStart(selectedInstructorIds, selectedSkaterIds)}>
        Start Lesson Session
      </Button>
    </div>
  );
};

export const LessonFeedbackModal = ({ results }) => {
  const entries = Array.isArray(results?.entries) ? results.entries : [];
  const lowPotential = Array.isArray(results?.lowPotentialWarnings) ? results.lowPotentialWarnings : [];

  return (
    <div style={{ display: "grid", gap: "0.7rem", maxHeight: "60vh", overflowY: "auto" }}>
      {lowPotential.length > 0 && (
        <section style={{ display: "grid", gap: "0.35rem" }}>
          <strong>Low Potential Alerts</strong>
          {lowPotential.map((item) => (
            <div key={item} style={{ fontSize: "0.82rem" }}>{item}</div>
          ))}
        </section>
      )}
      <section style={{ display: "grid", gap: "0.35rem" }}>
        <strong>Lesson Results</strong>
        {entries.length < 1 && <div style={{ fontSize: "0.82rem" }}>No lesson attempts recorded.</div>}
        {entries.map((entry) => (
          <div key={entry.id} style={{ fontSize: "0.8rem", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "8px", padding: "0.45rem" }}>
            T{entry.tick} | {entry.skaterName} with {entry.instructorName} on {entry.pieceLabel}
            <br />
            {entry.trickName} ({entry.trickType}) | {entry.status}
            {entry.learned ? " | Learned" : ""}
            {entry.retryLocked ? " | Retry Locked" : ""}
            {entry.isSwitch ? " | Switch" : ""}
          </div>
        ))}
      </section>
    </div>
  );
};

export const CompetitionResultsModal = ({ entries = [], bestTrick = null }) => {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ display: "grid", gap: "0.55rem", maxHeight: "60vh", overflowY: "auto" }}>
      <strong>Competition Results</strong>
      {bestTrick && (
        <div
          style={{
            display: "grid",
            gap: "0.2rem",
            border: "1px solid rgba(0,0,0,0.2)",
            borderRadius: "8px",
            padding: "0.5rem 0.6rem",
            background: "rgba(0,0,0,0.04)",
            fontSize: "0.82rem",
          }}
        >
          <strong>Best Trick</strong>
          <div>{bestTrick.trickName || "Unknown Trick"} by {bestTrick.skaterName} | {bestTrick.points} pts</div>
          <div>
            {bestTrick.pieceName}
            {bestTrick.pieceCoordinate ? ` (${bestTrick.pieceCoordinate})` : ""}
          </div>
        </div>
      )}
      {entries.length < 1 && <div style={{ fontSize: "0.85rem" }}>No scores recorded.</div>}
      {entries.map((entry, index) => (
        <div
          key={entry.skaterId || `${entry.skaterName}-${index}`}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: "0.5rem",
            alignItems: "center",
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: "8px",
            padding: "0.45rem 0.55rem",
          }}
        >
          <span style={{ minWidth: "2.2rem", fontWeight: 700 }}>{medals[index] || `${index + 1}.`}</span>
          <span>{entry.skaterName}</span>
          <span style={{ fontWeight: 700 }}>{entry.points} pts</span>
        </div>
      ))}
    </div>
  );
};
