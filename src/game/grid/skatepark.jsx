import React from "react";
import Controls from "./components/controls/controls";
import PiecePalette from "./components/piecePalette/piecePalette";
import SessionPanel from "./components/sessionPanel/sessionPanel";
import LessonPanel from "./components/lessonPanel/lessonPanel";
import CalendarDataPanel from "./components/calendarDataPanel/calendarDataPanel";
import Board from "./components/board/board";
import Calendar, { CalendarControls } from "./calendar";
import { useGridModel } from "./components/hooks/useGridModel";
import "./skatepark.scss";

const Skatepark = () => {
  const model = useGridModel();
  const [activeTab, setActiveTab] = React.useState("calendar");
  const [dayAdvanceToken, setDayAdvanceToken] = React.useState(0);
  const sessionTabLocked = model.gridMode === "session";
  const lastDayRef = React.useRef(model.timeState.dayNumber);
  const pendingDayStartCalendarRef = React.useRef(false);

  React.useEffect(() => {
    if (sessionTabLocked) {
      setActiveTab("skatepark");
    }
  }, [sessionTabLocked]);

  React.useEffect(() => {
    if (model.timeState.dayNumber !== lastDayRef.current) {
      lastDayRef.current = model.timeState.dayNumber;
      setDayAdvanceToken((prev) => prev + 1);
      if (!sessionTabLocked) {
        setActiveTab("calendar");
        pendingDayStartCalendarRef.current = false;
      } else {
        pendingDayStartCalendarRef.current = true;
      }
    }
  }, [model.timeState.dayNumber, sessionTabLocked]);

  React.useEffect(() => {
    if (!sessionTabLocked && pendingDayStartCalendarRef.current) {
      setActiveTab("calendar");
      pendingDayStartCalendarRef.current = false;
    }
  }, [sessionTabLocked]);

  return (
    <div className="skatepark">
      <div className="skatepark__shell">
        <h1>Skate Camp</h1>
        <div className="skatepark__tabs">
          <button
            type="button"
            className={`skatepark__tab${activeTab === "calendar" ? " skatepark__tab--active" : ""}`}
            onClick={() => {
              if (!sessionTabLocked) setActiveTab("calendar");
            }}
            disabled={sessionTabLocked}
          >
            Calendar
          </button>
          <button
            type="button"
            className={`skatepark__tab${activeTab === "skatepark" ? " skatepark__tab--active" : ""}`}
            onClick={() => {
              if (!sessionTabLocked) setActiveTab("skatepark");
            }}
            disabled={sessionTabLocked}
          >
            Skatepark
          </button>
        </div>

        <div className="skatepark__layout">
          <div className="skatepark__leftCol">
            {activeTab === "skatepark" && model.gridMode === "edit" && (
              <div className="skatepark__paletteWrap">
                <PiecePalette
                  standalonePieces={model.standalonePieces}
                  routePieces={model.routePieces}
                  editingRoute={model.editingRoute}
                  canPlaceMiddleBySpeed={model.canPlaceMiddleBySpeed}
                  getPieceDragInvalidReason={model.getPieceDragInvalidReason}
                  routeModeActive={Boolean(model.editingRoute)}
                />
              </div>
            )}

            {activeTab === "skatepark" && model.gridMode === "session" && (
              <div className="skatepark__paletteWrap">
                {model.sessionState.sessionType === "lesson" ? (
                  <LessonPanel
                    lessonState={model.lessonState}
                    selectedInstructors={model.lessonSelectedInstructors}
                    selectedSkaters={model.lessonSelectedSkaters}
                    onSelectInstructorForPlacement={model.onSelectLessonInstructorForPlacement}
                    onEndLessonSession={model.onEndLessonSession}
                  />
                ) : (
                  <SessionPanel
                    sessionState={model.sessionState}
                    timeline={model.sessionTimeline}
                    runDisplay={model.sessionRunDisplay}
                    attemptLog={model.sessionAttemptLog}
                    canRecruitSkaters={model.canRecruitInSession}
                    poolSpaceRemaining={model.poolSpaceRemaining}
                    onRecruitSkater={model.onRecruitBeginnerSkater}
                  />
                )}
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="skatepark__paletteWrap">
                <CalendarDataPanel instructors={model.playerInstructors} />
              </div>
            )}
          </div>

          <div className="skatepark__centerCol">
            {activeTab === "skatepark" ? (
              <div className="skatepark__boardWrap">
                <Board
                  gridSize={model.gridSize}
                  occupancy={model.occupancy}
                  skaterMarkers={model.skaterMarkers}
                  instructorMarkers={model.instructorMarkers}
                  editingRoute={model.editingRoute}
                  onCancelRoute={model.onCancelRoute}
                  onCommitRoute={model.onCommitRoute}
                  onRemoveLastRoutePiece={model.onRemoveLastRoutePiece}
                  onTileDrop={model.onTileDrop}
                  onTileClick={model.onTileClick}
                  getDropPreviewTiles={model.getDropPreviewTiles}
                  highlightedTileKeys={model.lessonHighlightTileKeys}
                />
              </div>
            ) : (
              <Calendar timeState={model.timeState} dayAdvanceToken={dayAdvanceToken} />
            )}
          </div>

          <div className="skatepark__rightCol">
            {activeTab === "skatepark" ? (
              <Controls
                gridSize={model.gridSize}
                gridMode={model.gridMode}
                editMode={model.editMode}
                sessionState={model.sessionState}
                canStartBeginnerSession={model.canStartBeginnerSession}
                canStartNormalSession={model.canStartNormalSession}
                canStartLessonSession={model.canStartLessonSession}
                canEndSession={model.canEndSession}
                playerSkaterPoolCount={model.playerSkaterPool.length}
                startingSpotsCapacity={model.startingSpotsCapacity}
                dayNumber={model.timeState.dayNumber}
                dayName={model.currentDayName}
                weekNumber={model.currentWeek}
                hasSessionAvailableToday={model.hasSessionAvailableToday}
                onGridSizeChange={model.onGridSizeChange}
                onToggleDeleteMode={model.onToggleDeleteMode}
                onStartBeginnerSession={model.onStartBeginnerSession}
                onStartNormalSession={model.onStartNormalSession}
                onStartLessonSession={model.onStartLessonSession}
                onEndSession={model.onEndSession}
              />
            ) : (
              <CalendarControls onGoToSkatepark={() => setActiveTab("skatepark")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skatepark;
