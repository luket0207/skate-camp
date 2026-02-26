import React from "react";
import { useGame } from "../../engine/gameContext/gameContext";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import INSTRUCTORS_FOR_HIRE from "../../assets/gameContent/instructors/forHire";
import "./instructors.scss";

const DETAIL_FIELDS = [
  { key: "wage", label: "Wage" },
  { key: "sport", label: "Sport" },
  { key: "lessonSlotsBase", label: "Lesson Slots" },
  { key: "lessonSlotsRemaining", label: "Remaining This Week" },
  { key: "scoutRating", label: "Scout Rating" },
  { key: "coreRating", label: "Core Rating" },
  { key: "variantRating", label: "Variant Rating" },
  { key: "determination", label: "Determination" },
  { key: "switchRating", label: "Switch Rating" },
];

const RATING_FIELDS = [
  { key: "stall", label: "Stall" },
  { key: "grind", label: "Grind" },
  { key: "tech", label: "Tech" },
  { key: "spin", label: "Spin" },
  { key: "bigAir", label: "Big Air" },
];

const Instructors = () => {
  const { gameState, setGameValue } = useGame();
  const [activeTab, setActiveTab] = React.useState("hire");
  const hiredInstructors = Array.isArray(gameState?.player?.instructors) ? gameState.player.instructors : [];
  const hiredIds = new Set(hiredInstructors.map((item) => item.id));

  const onHire = React.useCallback((instructor) => {
    if (hiredIds.has(instructor.id)) return;
    const normalizedInstructor = {
      ...instructor,
      lessonSlotsBase: Number(instructor.lessonSlots || 0),
      lessonSlotsRemaining: Number(instructor.lessonSlots || 0),
    };
    setGameValue("player.instructors", [...hiredInstructors, normalizedInstructor]);
  }, [hiredIds, hiredInstructors, setGameValue]);

  return (
    <div className="instructorsPage">
      <div className="instructorsPage__topBar">
        <h1>Instructors</h1>
        <Button variant={BUTTON_VARIANT.PRIMARY} to="/skatepark">
          Back
        </Button>
      </div>

      <div className="instructorsPage__summary">Hired: {hiredInstructors.length}</div>

      <div className="instructorsPage__tabs">
        <button
          type="button"
          className={`instructorsPage__tab${activeTab === "hire" ? " instructorsPage__tab--active" : ""}`}
          onClick={() => setActiveTab("hire")}
        >
          Hire Instructor
        </button>
        <button
          type="button"
          className={`instructorsPage__tab${activeTab === "yours" ? " instructorsPage__tab--active" : ""}`}
          onClick={() => setActiveTab("yours")}
        >
          Your Instructors
        </button>
      </div>

      {activeTab === "hire" && (
        <section className="instructorsPage__list">
          {INSTRUCTORS_FOR_HIRE.map((instructor) => {
            const isHired = hiredIds.has(instructor.id);
            return (
              <article key={instructor.id} className="instructorsPage__card">
                <div className="instructorsPage__header">
                  <h2>{instructor.name}</h2>
                  <span className="instructorsPage__sport">{instructor.sport}</span>
                </div>
                <p>{instructor.description}</p>
                <div className="instructorsPage__stats">
                  <span>Wage: {instructor.wage}</span>
                  <span>Lesson Slots: {instructor.lessonSlots}</span>
                  <span>Scout: {instructor.scoutRating}</span>
                  <span>Core: {instructor.coreRating}</span>
                  <span>Variant: {instructor.variantRating}</span>
                  <span>Determination: {instructor.determination}</span>
                  <span>Switch: {instructor.switchRating}</span>
                </div>
                <div className="instructorsPage__ratings">
                  <span>Stall: {instructor.ratings.stall}</span>
                  <span>Grind: {instructor.ratings.grind}</span>
                  <span>Tech: {instructor.ratings.tech}</span>
                  <span>Spin: {instructor.ratings.spin}</span>
                  <span>Big Air: {instructor.ratings.bigAir}</span>
                </div>
                <Button
                  variant={isHired ? BUTTON_VARIANT.SECONDARY : BUTTON_VARIANT.PRIMARY}
                  onClick={() => onHire(instructor)}
                  disabled={isHired}
                >
                  {isHired ? "Hired" : "Hire"}
                </Button>
              </article>
            );
          })}
        </section>
      )}

      {activeTab === "yours" && (
        <section className="instructorsPage__list">
          {hiredInstructors.length < 1 && (
            <div className="instructorsPage__empty">No instructors hired yet.</div>
          )}
          {hiredInstructors.map((instructor) => (
            <article key={instructor.id} className="instructorsPage__card instructorsPage__card--detailed">
              <div className="instructorsPage__header">
                <h2>{instructor.name}</h2>
                <span className="instructorsPage__sport">{instructor.sport}</span>
              </div>
              <p>{instructor.description}</p>
              <div className="instructorsPage__metaGrid">
                {DETAIL_FIELDS.map((field) => (
                  <div key={`${instructor.id}-${field.key}`} className="instructorsPage__metaRow">
                    <span className="instructorsPage__label">{field.label}</span>
                    <span className="instructorsPage__value">{instructor[field.key] ?? 0}</span>
                  </div>
                ))}
              </div>
              <div className="instructorsPage__ratingsTitle">Teaching Ratings</div>
              <div className="instructorsPage__metaGrid">
                {RATING_FIELDS.map((field) => (
                  <div key={`${instructor.id}-rating-${field.key}`} className="instructorsPage__metaRow">
                    <span className="instructorsPage__label">{field.label}</span>
                    <span className="instructorsPage__value">{instructor?.ratings?.[field.key] ?? 0}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default Instructors;
