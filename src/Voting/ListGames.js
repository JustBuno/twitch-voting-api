import React, { useState, useEffect, useRef, useCallback } from "react";
import Details from "./Details";
import SuperVoteConfirm from "./SuperVoteConfirm";
import AddGame from "./AddGame";
import EditGame from "./EditGame";
import DeleteGame from "./DeleteGame";
import { SERVER } from "../constants";
import { VOTING_EMPTY_MESSAGE } from "../systemMessages";
import { handleVote, removeVote, handleLogin } from "../utils";

const ListGames = ({ games, isActive, search, storedTwitchUserID, storedGameID, setStoredGameID, showAdminView, isAdmin, showModal, setShowModal, setErrorMessage, votingEnabled, superVoteCost }) => {
  const [details, setDetails] = useState(null);
  const [superVoteConfirm, setSuperVoteConfirm] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [addGame, setAddGame] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [deleteGame, setDeleteGame] = useState(null);
  const modalRef = useRef(null);

  const handleVoteClick = async (gameID) => {
    try {
      await handleVote(gameID, storedTwitchUserID, setErrorMessage);
      if (!sessionStorage.getItem("error")) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error handling vote:', error);
    }
  }

  const handleRemoveVoteClick = async () => {
    try {
      await removeVote(storedTwitchUserID, setErrorMessage);
      if (!sessionStorage.getItem("error")) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error handling vote:', error);
    }
  }

  const handleDetailsClick = (game) => {
    setDetails(game);
    setShowModal(true);
  };

  const handleSuperVoteConfirmClick = (game) => {
    setSuperVoteConfirm(game);
    setDetails(null);
};

  const handleAddClick = () => {
    setAddGame(true);
    setShowModal(true);
  };

  const handleEditClick = (game) => {
    setEditGame(game);
    setShowModal(true);
  };

  const handleDeleteClick = (game) => {
    setDeleteGame(game);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  useEffect(() => {
    if (!showModal) {
      if (hasVoted) {
        window.location.reload();
      } else {
        setAddGame(false);
        setEditGame(null);
        setDeleteGame(null);
        setDetails(null);
        setSuperVoteConfirm(null);
      }
    }
  }, [showModal, hasVoted]);

  const handleClickOutside = useCallback((event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      setShowModal(false);
    }
  }, [setShowModal]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div className="flex">
      {games.length === 0 && !showAdminView && (
        <p className="list-empty">{VOTING_EMPTY_MESSAGE}</p>
      )}
      {games.length !== 0 && games.filter((game) => {
        return (search === '') ? game : game.title.toLowerCase().includes(search);
      }).map((game) => (
        <div className="list" key={game.gameID}>
          {game && (
            <div>
              <img
                className={storedGameID === game.gameID && !showAdminView ? 'voted-game-cover' : 'game-cover'}
                src={game.cover ? `${SERVER}/images/${game.cover}` : (game.appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appID}/library_600x900.jpg` : `${SERVER}/images/missing-cover.gif`)}
                alt={game.title}
                draggable="false"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `${SERVER}/images/missing-cover.gif`;
                  e.target.alt = "Image missing";
                }}
              />
              {game.voteCount > 0 && (
                <div className={storedGameID === game.gameID && !showAdminView ? "vote-count voted-count" : "vote-count"}>{game.voteCount}</div>
              )}
              <div className="buttons">
                {!showAdminView && (
                  <div className="button-container">
                    <button
                      className={storedGameID === game.gameID ? 'game-button visible' : 'game-button'}
                      onClick={() => handleDetailsClick(game)}
                    >
                      DETAILS
                    </button>
                    {votingEnabled && (
                      <button
                        className={storedGameID === game.gameID ? 'voted-button' : 'game-button'}
                        onClick={storedTwitchUserID ? (storedGameID === game.gameID ? handleRemoveVoteClick : () => handleVoteClick(game.gameID)) : handleLogin}
                      >
                        {storedTwitchUserID ? (storedGameID === game.gameID ? "VOTED" : "VOTE") : "LOGIN"}
                      </button>
                    )}
                  </div>
                )}
                {isAdmin && showAdminView && (
                  <div>
                    <img
                      className="edit-button"
                      src={`${SERVER}/images/edit-button.png`}
                      alt="edit"
                      draggable="false"
                      onClick={() => handleEditClick(game)}
                    />
                    <img
                      className="delete-button"
                      src={`${SERVER}/images/delete-button.png`}
                      alt="delete"
                      draggable="false"
                      onClick={() => handleDeleteClick(game)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      {isAdmin && showAdminView && (
        <img
          className="add-button"
          src={`${SERVER}/images/add-button.png`}
          alt="add game button"
          draggable="false"
          onClick={handleAddClick}
        />
      )}

      {showModal && details && (
        <div className="overlay">
          <div className="modal-responsive" ref={modalRef}>
            {details && (
              <Details
                game={details}
                storedGameID={storedGameID}
                setStoredGameID={setStoredGameID}
                setHasVoted={setHasVoted}
                onClose={handleCloseModal}
                storedTwitchUserID={storedTwitchUserID}
                setErrorMessage={setErrorMessage}
                votingEnabled={votingEnabled}
                handleSuperVoteConfirmClick={handleSuperVoteConfirmClick}
                superVoteCost={superVoteCost}
              />
            )}
          </div>
        </div>
      )}
      {showModal && (superVoteConfirm || editGame || deleteGame || addGame) && (
        <div className="overlay">
          <div className="modal-fixed">
            {superVoteConfirm && (
              <SuperVoteConfirm
                game={superVoteConfirm}
                onClose={handleCloseModal}
                storedTwitchUserID={storedTwitchUserID}
                setErrorMessage={setErrorMessage}
                superVoteCost={superVoteCost}
              />
            )}
            {editGame && (
              <EditGame
                game={editGame}
                onClose={handleCloseModal}
                storedTwitchUserID={storedTwitchUserID}
              />
            )}
            {deleteGame && (
              <DeleteGame
                game={deleteGame}
                onClose={handleCloseModal}
                storedTwitchUserID={storedTwitchUserID}
              />
            )}
            {addGame && (
              <AddGame
                onClose={handleCloseModal}
                initialIsActive={isActive}
                storedTwitchUserID={storedTwitchUserID}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );

};

export default ListGames;