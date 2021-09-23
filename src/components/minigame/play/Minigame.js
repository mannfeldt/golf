import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import { MuiThemeProvider } from "@material-ui/core/styles";
import PhaseConnection from "./PhaseConnection";
import PhaseStarting from "./PhaseStarting";
import PhaseFinalResult from "./PhaseFinalResult";
import GolfController from "../golf/GolfController";

class Minigame extends PureComponent {
  render() {
    const { game, playerKey, createPlayer } = this.props;
    const lastPhase = game.phase === "final_result" || game.phase === "end";
    return (
      <div className="play-container">
        {game.phase === "connection" && (
          <PhaseConnection
            game={game}
            addPlayer={createPlayer}
            playerKey={playerKey}
          />
        )}
        {game.phase === "starting" && <PhaseStarting game={game} />}
        {(game.phase === "gameplay" || game.phase === "level_completed") && (
          <GolfController game={game} playerKey={playerKey} />
        )}
        {lastPhase && <PhaseFinalResult game={game} playerKey={playerKey} />}
      </div>
    );
  }
}
Minigame.propTypes = {
  game: PropTypes.object.isRequired,
  createPlayer: PropTypes.func.isRequired,
  playerKey: PropTypes.string.isRequired,
};
export default Minigame;
