import React, { Component, useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom'

import Square from '../functional/Square';
import Wait from '../functional/Wait'
import Status from '../functional/Status'
import ScoreBoard from '../functional/ScoreBoard'
import PlayAgain from '../functional/PlayAgain'

import qs from 'qs'
import socketIOClient from 'socket.io-client';
import Visitors from '../functional/Visitor';

const ENDPOINT = 'http://127.0.0.1:5000'
const socket = socketIOClient(ENDPOINT, {reconnection: true})


export default function Board(props) {
  const [game, setGame] = useState(new Array(9).fill(null))
  const [turn, setTurn] = useState(true)
  const [end, setEnd] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [players, setPlayers] = useState(['', ''])
  const [scores] = useState([0, 0])
  const [redirect, setRedirect] = useState(false)
  const [visitors, setVisitors] = useState([])
  const [piece, setPiece] = useState('X')
  const {permission, name} = qs.parse(window.location.search, {
    ignoreQueryPrefix: true
  })

  useEffect(() => {
        socket.emit('newRoomJoin')
    socket.on('waiting', () => {
      setWaiting(true)
    })

    socket.on('starting', (players, visitors) => {
      setPlayers(players)
      setVisitors(visitors)
      setTurn(permission === 'new' ? true : false)
      console.log(permission)
      setPiece(permission === 'new' ? 'O' : 'X')
      console.log('piece', piece)
      setWaiting(false)
    })

    //Game play logic events
    socket.on('update', (board, pieceParam) => {
      handleUpdate(board, pieceParam)
    })
    socket.on('win', (winner) => {
      setStatusMessage(`${winner} wins`)
      setEnd(true)
    })
    socket.on('over', () => {
      setStatusMessage('Game over')
      setEnd(true)
    })
    socket.on('again', () => {
      setRedirect(true)
    })
    socket.on('visitors', (visitors) => {
      setVisitors(visitors)
    })
  }, [piece])

  //When some one make a move, emit the event to the back end for handling
  const handleClick = (index) => {
    if (!game[index] && !end && turn && permission !== 'visit') {
      socket.emit('move', piece, index)
    }
  }

  //Setting the states each move when the game haven't ended (no wins or draw)
  function handleUpdate(board, pieceParam) {
    funcSetBoard(board)
    funcSetTurn(pieceParam)
    if (handleWin(board)) {
      var winner = piece === 'O' ? players[0] : players[1]
      socket.emit('win', winner)
    } else if (handleOver(board)) {
      socket.emit('over')
    } else {
      funcSetMessage()
    }
  }

  function handleOver(board) {
    for (var i = 0; i < board.length; i++) {
      if (board[i] !== 'X' && board[i] !== 'O') {
        return false
      }
    }
    return true
  }

  //Setting the states when some one wins
  function handleWin(board) {
    var winStates = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ]
    for (var i = 0; i < winStates.length; i++) {
      var winstate = winStates[i];
      if (board[winstate[0]] === piece
        && board[winstate[1]] === piece
        && board[winstate[2]] === piece) {
        setEnd(true)
        return true
      }
    }
    return false
  }

  const playAgainRequest = () => {
    socket.emit('playAgainRequest')
  }

  //Handle the restart event from the back end
  function handleRestart(gameState, turn) {
    funcSetBoard(gameState)
    funcSetTurn(turn)
    funcSetMessage()
    setEnd(false)
  }

  //Some utilities methods to set the states of the board

  function funcSetMessage() {
    const message = turn ? 'Your Turn' : 'Opponent`s Turn'
    setStatusMessage(message)
  }

  function funcSetTurn(pieceParam) {
    console.log('piece', piece)
    console.log('pieceParam', pieceParam)
    if (permission !== 'visit') {
      if (piece === pieceParam) {
        setTurn(true)
      } else {
        setTurn(false)
      }
    }
  }

  function funcSetBoard(gameState) {
    setGame(gameState)
  }

  function renderSquare(i) {
    return (
      <Square key={i} value={game[i]}
              player={piece}
              end={end}
              id={i}
              onClick={handleClick}
              turn={turn}/>
    )
  }


  if (redirect) {
    return (
      <Redirect to={`/`}/>
    )
  } else {
    const squareArray = []
    for (let i = 0; i < 9; i++) {
      const newSquare = renderSquare(i)
      squareArray.push(newSquare)
    }
    return (
      <>
        <Wait display={waiting}/>
        <Status message={statusMessage}/>
        <div className="board">
          {squareArray}
        </div>
        <ScoreBoard data={{player1: [players[0], scores[0]], player2: [players[1], scores[1]]}}/>
        <Visitors visitors={visitors}/>
        <PlayAgain end={end} onClick={playAgainRequest}/>
      </>
    )
  }
}




