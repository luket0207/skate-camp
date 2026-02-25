import React from "react";
import { useGame } from "../../engine/gameContext/gameContext";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import INSTRUCTORS_FOR_HIRE from "../../assets/gameContent/instructors/forHire";
import "./instructors.scss";

const Instructors = () => {
  const { gameState, setGameValue } = useGame();
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
    </div>
  );
};

export default Instructors;
