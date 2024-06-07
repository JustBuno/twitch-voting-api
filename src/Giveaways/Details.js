import React, { useState, useEffect } from "react";
import { handleLogin, renderTrailer, updatePlayerDimensions, getStoreName, openOfficialStore } from "../utils";
import { SERVER } from "../constants";

const Details = ({ game, onClose, storedTwitchUserID, handleRedeemConfirmClick }) => {
    const [playerHeight, setPlayerHeight] = useState(0);
    const [storeName, setStoreName] = useState('');
    const currency = sessionStorage.getItem("currency");

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
                        <button onClick={storedTwitchUserID ? () => handleRedeemConfirmClick(game) : handleLogin}>
                            {storedTwitchUserID ? `Redeem Key: ${game.cost} ${currency}` : 'Login to Redeem Key'}
                        </button>
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