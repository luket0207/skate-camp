import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { useGame } from "../../engine/gameContext/gameContext";
import { useNavigate } from "react-router-dom";
import "./home.scss";

const Home = () => {
  const { setGameValue } = useGame();
  const navigate = useNavigate();

  const onStartGame = () => {
    setGameValue("meta.hasActiveGame", true);
    navigate("/skatepark");
  };

  return (
    <div className="home">
      <div className="home_content">
        <h1>Mini React Game Engine</h1>
        <div className="home_actions">
          <Button variant={BUTTON_VARIANT.PRIMARY} onClick={onStartGame}>
            Start Game
          </Button>
          <Button variant={BUTTON_VARIANT.SECONDARY} to="/info">
            Go to Info
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
