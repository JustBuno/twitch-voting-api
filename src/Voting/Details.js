import React, { useState, useEffect } from "react";
import { handleLogin, renderTrailer, updatePlayerDimensions, getStoreName, openOfficialStore, handleVote, removeVote } from "../utils";
import { SERVER } from "../constants";

const Details = ({ game, storedGameID, setStoredGameID, setHasVoted, onClose, storedTwitchUserID, setErrorMessage, votingEnabled, handleSuperVoteConfirmClick, superVoteCost }) => {
    const [playerHeight, setPlayerHeight] = useState(0);
    const [storeName, setStoreName] = useState('');

    const handleVoteClick = async () => {
        try {
            await handleVote(game.gameID, storedTwitchUserID, setErrorMessage);
            if (!sessionStorage.getItem("error")) {
                setStoredGameID(game.gameID);
                setHasVoted(true);
            }

        } catch (error) {
            console.error('Error handling vote:', error);
        }
    }

    const handleRemoveVoteClick = async () => {
        try {
            await removeVote(storedTwitchUserID, setErrorMessage);
            if (!sessionStorage.getItem("error")) {
                setStoredGameID(null);
                setHasVoted(true);
            }
        } catch (error) {
            console.error('Error handling vote:', error);
        }
    }

    useEffect(() => {
        updatePlayerDimensions(setPlayerHeight);
    }, []);

    useEffect(() => {
        setStoreName(getStoreName(game.store));
    }, [game.store]);

    return (
        <div className="modal-content">
            <img
                className="cancel"
                src={`${SERVER}/images/delete-button.png`}
                alt="delete"
                draggable="false"
                onClick={onClose}
            />
            <div className="details-title">
                <h1>{game.title}</h1>
            </div>
            <div className="details-container">
                <div className="details-left">
                    <img className="details-game-header"
                        src={game.header ? `${SERVER}/images/${game.header}` : (game.appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appID}/header.jpg` : `${SERVER}/images/missing-header.gif`)}
                        alt="header"
                        draggable="false"
                    />
                    <div className="details-buttons">
                        {game.store && (
                            <button onClick={() => openOfficialStore(game.store)}>
                                Show on {storeName}
                            </button>
                        )}
                        {votingEnabled && (
                            <>
                                <button
                                    className={storedTwitchUserID && (storedGameID === game.gameID) ? "remove-vote" : ""}
                                    onClick={storedTwitchUserID ? (storedGameID === game.gameID ? handleRemoveVoteClick : handleVoteClick) : handleLogin}
                                >
                                    {storedTwitchUserID ? (storedGameID === game.gameID ? "Remove Vote" : "Vote on Game") : "Login to Vote"}
                                </button>
                                {storedTwitchUserID && superVoteCost > 0 && (
                                    <button onClick={() => handleSuperVoteConfirmClick(game)}>Use Super Vote</button>
                                )}
                            </>
                        )}
                    </div>
                    <p>{game.description}</p>
                </div>
                <div className="details-separator"></div>
                <div className="details-right">
                    {renderTrailer(game, playerHeight)}
                </div>
            </div>
        </div>
    );
};

export default Details;