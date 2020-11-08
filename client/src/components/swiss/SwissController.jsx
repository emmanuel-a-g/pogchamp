import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Container, Grid, Button, TextField } from '@material-ui/core';
import SwissPlayers from './SwissPlayers.jsx';
import './SwissController.css';

const SwissController = (props) => {
  
  const [winners, setWinners] = useState({});
  const [money, setAmount] = useState({});
  
  const [postedToDatabase, setPosted] = useState(false);
  const [gameDetails, setGameDetails] = useState({
    tournamentName: '',
    gameName: '',
    rounds: '',
    currentRound: 0,
    prizeAmount: 0,
    winner: ''
  });

  /** Initial POST
   * {
   *   Tournament Type: 'Swiss'
   *   Game Name: '',
   *   Players: {
   *     Leslie: 0,
   *     Rose: 0,
   *     Alec: 0,
   *     Brandon: 0
   *   },
   *   Location: 'Dragon's Lair',
   *   City: 'Austin, TX',
   *   Number of rounds: 6,
   *   winner: '',
   *   total prize money: 100
   * }
   * Final PUT req:
   * winner: 'Brandon'
   * playerInfo = {
   *   Leslie: 5,
   *   Rose: 7,
   *   Alec: 8,
   *   Brandon: 9
   * }
   */

  const [playerInfo, setPlayerInfo] = useState({});
  const [roundsWon, setRoundsWon] = useState({});
  const [roundWinners, setRoundWinners] = useState({});
  const [pairs, setPairs] = useState([]);
  const [currentRoundScores, setCurrentRoundScores] = useState({});
  const [firstPairing, setFirstPairing] = useState(true);

  const tournamentRef = useRef(null);
  const game = useRef(null);
  const rounds = useRef(null);
  const players = useRef(null);
  const prize = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    setGameDetails({...gameDetails,
      tournamentName: tournamentRef.current.value,
      gameName: game.current.value,
      rounds: rounds.current.value,
      prizeAmount: prize.current.value
    })
  }

  const handleAddPlayer = (e) => {
    e.preventDefault();

    let playerName = players.current.value;
    let roundArray = [];

    if(playerInfo[playerName] === undefined) {
      for(let i = 1; i <= Number(gameDetails.rounds); i++) {
        roundArray.push(false)
      }
      setRoundWinners({...roundWinners, [playerName]: roundArray})
      setPlayerInfo({...playerInfo, [playerName]: 0})
      setCurrentRoundScores({...currentRoundScores, [playerName]: 0})
      setRoundsWon({...roundsWon, [playerName]: 0})
    }
    players.current.value = '';
  }

  const checkWinners = () => {
    let newRoundWinners = {};
    let roundsWonObj = {};

    let createArray = (roundWinner) => {
      let roundArray = [...roundWinners[roundWinner]];
      roundArray.splice((Number(gameDetails.currentRound) - 1), 1, true);
      newRoundWinners[roundWinner] = roundArray;
    }

    for(let i = 0; i < pairs.length; i++) {
      let firstPlayer = pairs[i][0];
      let secondPlayer = pairs[i][1];

      let winner =
        currentRoundScores[firstPlayer] > currentRoundScores[secondPlayer]
        ? firstPlayer
        : secondPlayer;

      let newTotalRoundsWon = roundsWon[winner] + 1;
      setRoundsWon({...roundsWon, [winner]: newTotalRoundsWon});

      createArray(winner);
    }
    setRoundWinners({...roundWinners, ...newRoundWinners});
  }

  const handlePairings = (e) => {
    e.preventDefault();
    checkWinners();

    let newPairs = [];
    let transformedArray;

    let randomized =
      Object.entries(playerInfo)
      .sort(() => Math.random() - 0.5);
    let sorted =
      Object.entries(playerInfo)
      .sort((a, b) => b[1] - a[1]);

    if(firstPairing === true) {

      // POST request with initial tournament document

      setFirstPairing(false)
      transformedArray = randomized;
    } else {
      transformedArray = sorted;
    }

    for(let i = 0; i < transformedArray.length; i+=2) {
      let firstOpponent = transformedArray[i][0];
      let secondOpponent = transformedArray[i+1][0];

      newPairs.push([firstOpponent, secondOpponent]);
      setCurrentRoundScores({
        ...currentRoundScores,
        [firstOpponent]: 0,
        [secondOpponent]: 0
      })
    }

    setPairs(newPairs);

    if(gameDetails.currentRound <= Number(gameDetails.rounds)) {
      gameDetails.currentRound ++;
    }
  }

  const revealWinner = () => {
    let highestScore = playerInfo[pairs[0][0]];
    let tiedArray = [];
    let winnersArr = [];

    pairs.forEach(pair => {
      if(playerInfo[pair[0]] === highestScore) {
        tiedArray.push(pair[0]);
      }
      if(playerInfo[pair[1]] === highestScore) {
        tiedArray.push(pair[1]);
      }
    })
    
    if(tiedArray.length) {
      let highestRoundsWon = roundsWon[tiedArray[0]];

      tiedArray.forEach(player => {
        if(roundsWon[player] >= highestRoundsWon) {
          highestRoundsWon = roundsWon[player];
        }
      })

      tiedArray.forEach(player => {
        if(roundsWon[player] >= highestRoundsWon) {
          winnersArr.push(player);
        }
      })
    }

    if(winnersArr.length > 1) {
      setGameDetails({ ...gameDetails, winner: winnersArr })
    } else if (winnersArr.length === 1) {
      setGameDetails({ ...gameDetails, winner: winnersArr[0] })
    } else {
      setGameDetails({ ...gameDetails, winner: pairs[0][0] })
    }
    //Get Winners First, Second, Third
    let scores = Object.values(playerInfo);
    let sorted = scores.sort((a, b) => b - a);
    let places = {};
    for (let x = 0; x < sorted.length; x++) {
      for (let key in playerInfo) {
        if (playerInfo[key] === sorted[x]) {
          if (x === 0) {
            places["first"] = key;
          } else if (x === 1) {
            places["second"] = key;
          } else if (x === 2) {
            places["third"] = key;
          }
        }
      }
    }
    setWinners(places)
    putWinners(places)
  }

  const putWinners = (places) => {
    axios.post('swiss/winners', places)
    .then((res) => {
      console.log('result', res);
    })
    .catch((err) => {
      console.log('error winners', err);
    })
  }

  const postTournament = () => {
    if (postedToDatabase === false)  {
      setPosted(true)
      let data = {gameDetails, playerInfo}
      let moneyAmount = gameDetails.prizeAmount;
      let prize = {
        first: Math.floor( moneyAmount * .50),
        second: Math.floor( moneyAmount * .30),
        third: Math.floor( moneyAmount * .20),
      }
      setAmount(prize);
      axios.post('/swiss/tournament', data)
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log("posting error", err);
      })
    }
  }
  let allDetailsIn = gameDetails.tournamentName.length >= 1 && 
  gameDetails.rounds.length >= 1 && gameDetails.prizeAmount.length >= 1 &&
  gameDetails.gameName.length >= 1;

  return (
    <Container maxWidth="lg" className="swissPairing">
      <h2>Swiss Tournament</h2>
        <div className="game-details">
          {gameDetails.tournamentName ? <h2>{gameDetails.tournamentName}</h2> : ''}
          <h4>{gameDetails.gameName}</h4>
          <p>{gameDetails.rounds ? `Total Rounds: ${gameDetails.rounds}` : ''}</p>
          <h4>{gameDetails.prizeAmount ? `$${gameDetails.prizeAmount}` : ''} </h4>
        </div>
      { allDetailsIn ? null : 
      <form noValidate autoComplete="off" onSubmit={handleSubmit} className="setup-form">
        <h3>Add your tournament details:</h3>
        <TextField label="tournament name" size="small" inputRef={tournamentRef} variant="filled" />
        <TextField label="game name" size="small" inputRef={game} variant="filled" />
        <TextField label="number of rounds" size="small" inputRef={rounds} variant="filled" />
        <TextField label="prize amount" size="small" inputRef={prize} variant="filled" />
        <Button variant="contained" type="submit">Submit</Button>
      </form>}

      {
        gameDetails.rounds !== ''
          ? <form onSubmit={handleAddPlayer} className="setup-form">
              {pairs.length === 0 && <h2>Add the players:</h2> }
              <p>If odd number of players, add player named "Bye". If player gets a bye, give them 1 point for that round.</p>
              {pairs.length === 0 && <TextField label="enter player name" variant="outlined" size="small" inputRef={players} /> }
              {pairs.length === 0 && <Button variant="contained" type="submit">Submit</Button>}
            </form>
          : ''
      }
      {
        gameDetails.currentRound === (parseInt(gameDetails.rounds) + 1)
          ? <div>
              <Button
                variant="contained"
                color="primary"
                className="create-pairings"
                onClick={revealWinner}>Reveal Winner!</Button>
                {
                  gameDetails.winner !== '' && !Array.isArray(gameDetails.winner)
                    ? <Container maxWidth="sm" className="pairings-container">
                        <h2>{gameDetails.winner} wins ${money.first}!</h2>
                        {winners.second && <h2>{winners.second} ${money.second}!</h2> }
                        {winners.third && <h2>{winners.third} ${money.third}!</h2>}
                      </Container>
                    : ''
                }
                {
                  gameDetails.winner !== '' && Array.isArray(gameDetails.winner)
                    ? <Container maxWidth="sm" className="pairings-container">
                      <h2>It's a tie!</h2>
                        { gameDetails.winner.map(player => {
                          return <p>{player}</p>
                        }) }
                      </Container>
                    : ''
                }
            </div>
          : <div>
              { gameDetails.currentRound === 0
                ? <Button
                    variant="contained"
                    color="primary"
                    onClick={(e) => { handlePairings(e); postTournament(); }}
                    className="create-pairings">Create Pairings</Button>
                : ''
              }
                <Container maxWidth="sm" className="pairings-container">
                  {
                    gameDetails.currentRound > 0
                      ? <h2>Round {gameDetails.currentRound}</h2>
                      : <p>Add players and click "Create pairings" to begin</p>
                  }
                  {
                    pairs.length
                      ? pairs.map((pair, index) => {
                          return <p key={index}>{ pair[0] } vs { pair[1] }</p>
                        })
                      : ''
                  }
                </Container>
            </div>
      }
      <SwissPlayers
        gameDetails={gameDetails}
        playerInfo={playerInfo}
        currentRoundScores={currentRoundScores}
        setCurrentRoundScores={setCurrentRoundScores}
        setPlayerInfo={setPlayerInfo}
        roundWinners={roundWinners}
        handlePairings={handlePairings}/>
    </Container>
  )
}

export default SwissController;