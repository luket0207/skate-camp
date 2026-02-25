import React from "react";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import "./instructors.scss";

const Instructors = () => {
  return (
    <div className="instructorsPage">
      <h1>Instructors</h1>
      <Button variant={BUTTON_VARIANT.PRIMARY} to="/skatepark">
        Back
      </Button>
    </div>
  );
};

export default Instructors;

