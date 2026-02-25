import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./game/home/home";
import Info from "./game/info/info";
import Skatepark from "./game/grid/skatepark";
import Skaters from "./game/skaters/skaters";
import Instructors from "./game/instructors/instructors";
import { useGame } from "./engine/gameContext/gameContext";

const NotFound = () => <div>404</div>;

const hasSufficientGameState = (gameState) => {
  if (gameState == null || typeof gameState !== "object") return false;

  const hasActiveGame = gameState?.meta?.hasActiveGame === true;
  const hasPlayer = gameState?.player != null && typeof gameState.player === "object";
  const hasUi = gameState?.ui != null && typeof gameState.ui === "object";
  const hasSkatepark = Array.isArray(gameState?.skatepark);
  const hasSkaterPool = Array.isArray(gameState?.player?.skaterPool);
  const hasInstructors = Array.isArray(gameState?.player?.instructors);
  const hasTime = gameState?.time != null && typeof gameState.time === "object" && Number(gameState.time.dayNumber) >= 1;

  return hasActiveGame && hasPlayer && hasUi && hasSkatepark && hasSkaterPool && hasInstructors && hasTime;
};

const RequireGameContext = ({ element }) => {
  const { gameState } = useGame();
  if (!hasSufficientGameState(gameState)) {
    return <Navigate to="/" replace />;
  }
  return element;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/info" element={<Info />} />
      <Route path="/skatepark" element={<RequireGameContext element={<Skatepark />} />} />
      <Route path="/grid" element={<Navigate to="/skatepark" replace />} />
      <Route path="/skaters" element={<RequireGameContext element={<Skaters />} />} />
      <Route path="/instructors" element={<RequireGameContext element={<Instructors />} />} />

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
