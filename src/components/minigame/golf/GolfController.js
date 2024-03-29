import React, { Component, Fragment } from "react";
import { Typography } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";
import ReactSpeedometer from "react-d3-speedometer";
import * as util from "./GolfUtil";
import { fire } from "../../../base";
import "./golf.css";
import {
  MAX_POWER,
  MIN_POWER,
  CLUBS,
  BALL_RADIUS,
  AIR_COLOR,
  GRASS_COLOR,
  BALL_RADIUS_CONTROLLER,
} from "./GolfConstants";
import driverIcon from "./img/driverIcon.svg";
import ironIcon from "./img/ironIcon.svg";
import putterIcon from "./img/putterIcon.svg";
import golfbagIcon from "./img/golfbag.svg";
import fingerprintIcon from "./img/fingerprint.svg";
import skyImage from "./img/sky.png";
import Slider from "@material-ui/core/Slider";

const styles = (theme) => ({
  container: {
    height: "100vh",
    width: "100vw",
  },
  canvas: {},
  header: {
    height: 80,
  },
  footer: {
    height: 180,
    marginTop: "-4px",
  },
  clubwrapper: {
    height: "49vh",
    width: "10vw",
    bottom: "210px",
    position: "absolute",
    paddingRight: "50px",
  },
  clubiconWrapper: {
    position: "absolute",
    bottom: "188px",
    left: "50%",
    marginLeft: "20px",
  },
});

let canvas;
let ctx;

function drawBall(x, y, fill, stroke, playerState) {
  ctx.lineWidth = 1;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS_CONTROLLER, 0, 2 * Math.PI);
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS_CONTROLLER - ctx.lineWidth / 2, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.closePath();
}

function drawSwing(swingData) {
  const len = swingData.length;
  // test om den här. det ska vara hela swingen efter att den är klar som ritas.
  // kolla på drawGround etc. där behöver jag inte loopa beginpath och stroke etc. utan jag har istöället en start pos

  // behöver hålla ritningen inom canvasen. så hitta de största och minsta värdena på varje axel och räkna om alla punkter baserat på det
  // så en liten eller stor swing blir lika

  // skapa en förutbestämd bana och använd bara x från swingen?
  const prevSwing = {
    y: canvas.height / 2 - BALL_RADIUS_CONTROLLER * 2,
    x: canvas.width / 2,
  };
  for (let i = 0; i < len; i++) {
    const newY = prevSwing.y + Math.round(swingData[i].z);
    const newX = prevSwing.x + Math.round(swingData[i].x);
    ctx.beginPath();
    ctx.moveTo(prevSwing.x, prevSwing.y);
    ctx.lineTo(newX, newY);
    ctx.stroke();
    prevSwing.y = newY;
    prevSwing.x = newX;
  }
}
function drawEnvironment(x, y, groundColor, stroke) {
  ctx.fillStyle = GRASS_COLOR;
  ctx.fillRect(0, y - BALL_RADIUS_CONTROLLER, x, BALL_RADIUS_CONTROLLER);
  // groundcolor längst ner
  // GRASS_COLOR är stroke
  // WITH på
  // AIR_COLOR är överdelen
}
function drawStrokes(x, y, strokes) {
  ctx.font = "28px roboto";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText(`Slag: ${strokes}`, x, y);
}

function drawDistance(x, y, distance) {
  ctx.font = "24px roboto";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText(`Distance: ${distance} yards`, x, y);
}
function drawScoreText(x, y, player, strokes) {
  ctx.font = "20px roboto";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText(`${strokes} strokes in ${player.scoreTime} seconds`, x, y);
}
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

class GolfController extends Component {
  static getDerivedStateFromProps(props, currentState) {
    if (currentState.round !== props.game.minigame.round) {
      return {
        round: props.game.minigame.round,
        strokes: 0,
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    // sätt det här till rätt höjd. det ska vara windowheight - header - footer
    const canvasHeight = Math.floor(window.innerHeight - 180);
    const canvasWidth = Math.floor(window.innerWidth);
    const clubIcons = {
      wood: driverIcon,
      iron: ironIcon,
      putt: putterIcon,
    };
    this.state = {
      highestAcceleration: 0,
      isSwinging: false,
      swingData: [],
      clubIndex: 0,
      round: 1,
      canvasHeight,
      strokes: 0,
      canvasWidth,
      anchorEl: null,
      clubIcons,
    };
    this.renderFrame = this.renderFrame.bind(this);
    this.saveSwing = this.saveSwing.bind(this);
    this.testSwing = this.testSwing.bind(this);
  }

  componentDidMount() {
    canvas = document.getElementById("swingcanvas");
    ctx = canvas.getContext("2d");
    ctx.translate(0.5, 0.5);
    const that = this;

    if (typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            window.addEventListener(
              "devicemotion",
              (e) => {
                const event = e || window.event;
                event.preventDefault();
                event.stopPropagation();
                const {
                  isSwinging,
                  swingData,
                  highestAcceleration,
                  clubIndex,
                } = that.state;
                if (isSwinging) {
                  const { x, y, z } = event.acceleration;
                  swingData.push({
                    x: Math.round(x * 2),
                    y: Math.round(y * 2),
                    z: Math.round(z * 2),
                  });
                  // this.drawSwing([{ x: Math.round(x * 2), y: Math.round(y * 2), z: Math.round(z * 2) }]);

                  // hur är detta legit? både x och z kan ju vara minusvärden? jag borde lägga om dem till positiva?
                  // eller kan jag använda detta för att bara mäta nersvingen?? genom att bara läsa av negative eller positiva värden
                  // vilekt som nu är neråt
                  // måste göra flera tester, ska y inte tas med?
                  // koppla i telefonen och debuga
                  const xpower = Math.abs(x);
                  const zpower = Math.abs(z);

                  const power = Math.floor(xpower + zpower);
                  // const power2 = Math.floor(Math.abs(y) + Math.abs(z));
                  // const power3 = Math.floor(Math.abs(x) + Math.abs(y));

                  // && util.validateSwingMovement(event.acceleration, clubIndex)
                  if (power > highestAcceleration) {
                    that.setState(() => ({
                      highestAcceleration: power,
                      swingData,
                    }));
                  } else {
                    that.setState({ swingData });
                  }
                }
              },
              true
            );
          } else {
            alert("device motion permission not granted");
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener(
        "devicemotion",
        (e) => {
          const event = e || window.event;
          event.preventDefault();
          event.stopPropagation();
          const {
            isSwinging,
            swingData,
            highestAcceleration,
            clubIndex,
          } = that.state;
          if (isSwinging) {
            const { x, y, z } = event.acceleration;
            swingData.push({
              x: Math.round(x * 2),
              y: Math.round(y * 2),
              z: Math.round(z * 2),
            });
            // this.drawSwing([{ x: Math.round(x * 2), y: Math.round(y * 2), z: Math.round(z * 2) }]);

            // hur är detta legit? både x och z kan ju vara minusvärden? jag borde lägga om dem till positiva?
            // eller kan jag använda detta för att bara mäta nersvingen?? genom att bara läsa av negative eller positiva värden
            // vilekt som nu är neråt
            // måste göra flera tester, ska y inte tas med?
            // koppla i telefonen och debuga
            const xpower = Math.abs(x);
            const zpower = Math.abs(z);

            const power = Math.floor(xpower + zpower);
            // const power2 = Math.floor(Math.abs(y) + Math.abs(z));
            // const power3 = Math.floor(Math.abs(x) + Math.abs(y));

            // && util.validateSwingMovement(event.acceleration, clubIndex)
            if (power > highestAcceleration) {
              that.setState(() => ({
                highestAcceleration: power,
                swingData,
              }));
            } else {
              that.setState({ swingData });
            }
          }
        },
        true
      );
    }

    canvas.addEventListener(
      "touchstart",
      (e) => {
        const event = e || window.event;
        event.preventDefault();
        event.stopPropagation();
        that.setState(() => {
          const highestAcceleration = 0;
          const swingData = [];
          const isSwinging = true;
          return { highestAcceleration, swingData, isSwinging };
        });
        // this.renderFrame();

        // e.preventDefault();
      },
      false
    );

    canvas.addEventListener(
      "touchend",
      (e) => {
        const event = e || window.event;
        event.preventDefault();
        event.stopPropagation();
        const { highestAcceleration, clubIndex } = that.state;
        that.setState(() => {
          const isSwinging = false;
          return { isSwinging };
        });
        this.saveSwing(highestAcceleration, clubIndex);
        // this.renderFrame();
        // e.preventDefault();
      },
      false
    );

    this.renderFrame();
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { swingData, isSwinging, strokes, anchorEl, clubIndex } = this.state;
    console.log("shouldComponentUpdate");
    if (nextState.isSwinging !== isSwinging) {
      return true;
    }
    // if (nextState.swingData !== swingData) {
    //   return false;
    // }

    if (nextState.strokes !== strokes) {
      return true;
    }
    if (nextState.anchorEl !== anchorEl) {
      console.log("yes anchorEI");

      return true;
    }
    if (nextState.clubIndex !== clubIndex) {
      console.log("yes clubindex");

      return true;
    }
    const { game, playerKey } = this.props;
    if (nextProps.game.phase !== game.phase) {
      return true;
    }

    const currentPlayer = game.players[playerKey];
    const nextCurrentPlayer = nextProps.game.players[playerKey];
    if (currentPlayer.state !== nextCurrentPlayer.state) {
      return true;
    }
    console.log("false");

    return false;
  }

  handleClick = (event) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  handleChange = (name) => (event) => {
    this.setState({
      [name]: event.target.value,
      // anchorEl: null,
    });
  };

  handleChangeSelect = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  testSwing() {
    const acceleration = Math.floor(Math.random() * 100) + 10;
    this.saveSwing(acceleration, 2, true);
  }

  saveSwing(acceleration, clubIndex, test) {
    const { playerKey, game } = this.props;
    const { swingData } = this.state;
    const currentPlayer = game.players[playerKey];
    if (currentPlayer.state !== "STILL") {
      alert("ball is not still");
      return;
    }
    if (game.phase !== "gameplay") {
      alert("game is not playing");
      return;
    }

    if (util.isInvalidSwing(swingData) && !test) {
      alert("invalid swing");
      return;
    }
    // ska bara kunna används wood på första slaget? ge det lite extra power
    const club = CLUBS[clubIndex];
    const swing = util.getSwingData(club, acceleration);
    this.setState((state) => ({
      strokes: state.strokes + 1,
    }));
    // test
    // test

    fire
      .database()
      .ref(`/games/${game.key}/players/${playerKey}/swing`)
      .set(swing, (error) => {
        if (error) {
          console.log("error updated swing move");
        } else {
          console.log("saved swing success");
        }
      });
  }

  saveFindMyBall() {
    const { playerKey, game } = this.props;
    const currentPlayer = game.players[playerKey];

    if (game.phase !== "gameplay") {
      alert("game is not playing");
      return;
    }

    fire
      .database()
      .ref(`/games/${game.key}/players/${playerKey}/showNameTag`)
      .set(!currentPlayer.showNameTag, (error) => {
        if (error) {
          console.log("error updated showNameTag");
        } else {
          console.log("saved showNameTag success");
        }
      });
  }

  renderFrame() {
    const { game, playerKey, classes } = this.props;
    const { swingData, strokes } = this.state;
    if (!ctx) {
      return;
    }
    const currentPlayer = game.players[playerKey];

    ctx.lineWidth = 4;
    const background = new Image();
    background.src = skyImage;

    //TODO competedive är broken då det går på tid. man kan vänta ut och få bra poäng...
    //TODO ta bort tiden? ja tror det bäst.

    background.onload = function() {
      clearCanvas();
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      const fingerprint = new Image();
      fingerprint.onload = function() {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(
          fingerprint,
          canvas.width / 4,
          canvas.height / 4,
          canvas.width / 2,
          canvas.width / 2
        );
        ctx.globalAlpha = 1;
      };
      fingerprint.src = fingerprintIcon;
      drawSwing(swingData);
      drawEnvironment(
        canvas.width,
        canvas.height,
        game.minigame.levelColor,
        "gray"
      );
      if (currentPlayer.state === "STILL") {
        drawStrokes(canvas.width / 2, 48, strokes);
        drawBall(
          canvas.width / 2,
          canvas.height - BALL_RADIUS_CONTROLLER * 2 + 4,
          currentPlayer.color,
          "gray"
        );
        drawDistance(canvas.width / 2, 24, currentPlayer.distance);
      } else if (currentPlayer.state === "SCORED") {
        drawScoreText(canvas.width / 2, 72 / 2, currentPlayer, strokes);
      }
    };
  }

  // man ska kunna swinga hela tiden men det är bara när player.state är 'STILL' som en boll rendreras och swingen kan sparas.
  // lägg till en selectbox där man väljer klubba som står loftAngle.
  // lägg till en snyggare powermätare. använd någon riktigt visuel mätare
  render() {
    const { game, playerKey, classes } = this.props;
    const {
      highestAcceleration,
      isSwinging,
      canvasHeight,
      canvasWidth,
      clubIndex,
      anchorEl,
      clubIcons,
    } = this.state;
    const open = Boolean(anchorEl);
    const choosenClub = CLUBS[clubIndex];
    this.renderFrame();

    const ClubSlider = withStyles({
      thumb: {
        width: 20,
        height: 20,
        marginLeft: "-10px !important",
        marginBottom: "-8px !important",
        backgroundColor: "#fffffff5",
      },
      active: {},
      track: {
        height: 4,
      },
      rail: {
        height: 4,
        opacity: 0.5,
        backgroundColor: "#3880f",
      },
      mark: {
        backgroundColor: "currentcolor",
        height: 1,
        width: 8,
        marginTop: -3,
        color: "#3880f",
      },
      markActive: {
        opacity: 1,
        backgroundColor: "currentcolor",
      },
      markLabel: {
        color: "rgba(0, 0, 0, 0.87)",
        fontWeight: 500,
      },
      markLabelActive: {
        color: "rgba(0, 0, 0, 0.87)",
      },
    })(Slider);

    function valuetext(value) {
      return `${value}°C`;
    }
    const marks = [
      {
        value: 0,
        label: CLUBS[0].name,
      },
      {
        value: CLUBS.length - 1,
        label: CLUBS[CLUBS.length - 1].name,
      },
    ];
    function GolfThumbComponent(props) {
      return <span {...props}></span>;
    }
    const handleChangeSlider = (event, newValue) => {
      console.log("newvalue slider:" + newValue);
      this.setState({
        ["clubIndex"]: newValue,
      });
    };

    // const [value, setValue] = React.useState(1);

    // const handleChangeSlider2 = (event, newValue) => {
    //   setValue(newValue);
    // };

    return (
      <div className="phase-container">
        <div className={classes.container}>
          <canvas
            id="swingcanvas"
            className={classes.canvas}
            height={canvasHeight}
            width={canvasWidth}
          />
          <div className={classes.clubwrapper}>
            {
              //fixa stylen innan jag fixar logiken. större boll och slider.
              /* använd klubbikonerna? kanske ha den som den var innan. detta
            ersätter bara selecten. //vi visar alltså fortfarande ikon för vad
            man valt? 
            ultimata jag vill ha: 
            En stor boll och lite bredare linje kanske. 
            På bollen ska det stå vilken klubba man valt. ikon + namn(Driver, 7 iron, wedge, putter...)kolla på exemplet med custom airbnb för hur man gör. 
              ^börja med ett enkelt test att det går att skriva current value i bollen och att det updateras medan man drar iden.. 
              ^^om det inte fungerar med ovan tänkt så kolla en custom tooltip är möjlig? fanns några exempel fast med text? 
              ^^ om det inte är möjligt så skriv ut alla klubbor på linjen bara och kör på det. markera tydligt vilken man valt. den har grön färg eller något.bold. 
            Den ska vara stegad på alla möjliga klubbor. 
            enda som ska stå på linjen ska vara ikonerna för driver och putter uppe och nere så man vet vilket håll man ska scrolla åt. 
            */
            }
            <ClubSlider
              value={clubIndex}
              aria-label="golf club selector"
              defaultValue={CLUBS.length - 1}
              orientation="vertical"
              marks={CLUBS.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              min={0}
              max={CLUBS.length - 1}
              step={1}
              onChangeCommitted={handleChangeSlider}
              // ThumbComponent={GolfThumbComponent}
            />

            {/* <Slider
              orientation="vertical"
              getAriaValueText={valuetext}
              defaultValue={30}
              marks={marks}
              step={10}
              aria-labelledby="vertical-slider"
            /> */}
            {/* <Button
              aria-owns={open ? "club-menu" : undefined}
              aria-haspopup="true"
              style={{ marginLeft: "-20px", marginRight: "-20px" }}
              onClick={this.handleClick}
            >
              <img src={golfbagIcon} alt="choose club" height="100" />
            </Button>
            <Menu
              id="club-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={this.handleClose}
            >
              {CLUBS.map((c) => (
                <MenuItem
                  onClick={this.handleChange("clubIndex")}
                  key={c.id}
                  value={c.id}
                >
                  <img
                    src={clubIcons[c.type]}
                    alt={c.name}
                    className={classes.menuitemicon}
                  />
                  {c.name}
                </MenuItem>
              ))}
            </Menu>
            <Typography
              variant="body2"
              style={{ display: "grid", paddingBottom: "8px" }}
            >
              <span>{choosenClub.name}</span>
              <img src={clubIcons[choosenClub.type]} alt="club" height="60" />
            </Typography> */}
          </div>
          <div className={classes.clubiconWrapper}>
            <img
              className={classes.clubicon}
              src={clubIcons[choosenClub.type]}
              alt="club"
              height="60"
            />
          </div>

          <div
            className={classes.footer}
            style={{ backgroundColor: game.minigame.levelColor }}
          >
            <ReactSpeedometer
              minValue={0}
              height={174}
              startColor="green"
              ringWidth={40}
              segments={10}
              needleTransitionDuration={50}
              needleTransition="easeLinear"
              textColor="ghostwhite"
              needleColor="ghostwhite"
              endColor="red"
              currentValueText="${value} m/s"
              maxValue={100}
              value={highestAcceleration / 2}
            />
          </div>
          {/* <button
            style={{ position: "absolute", top: "0", left: "0" }}
            type="button"
            onClick={this.testSwing}
          >
            swing
          </button> */}
          <Button
            onClick={() => this.saveFindMyBall()}
            variant="outlined"
            size="small"
            style={{
              position: "absolute",
              top: "38px",
              left: "0",
            }}
          >
            Find ball
          </Button>
        </div>
      </div>
    );
  }
}
GolfController.propTypes = {
  playerKey: PropTypes.string.isRequired,
  game: PropTypes.object.isRequired,
  classes: PropTypes.any,
};
export default withStyles(styles)(GolfController);
