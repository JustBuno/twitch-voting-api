import React, { useState, useEffect } from "react";
import axios from "axios";
import { SetTimestamp, fetchPoints } from "../utils";
import { SERVER } from "../constants";
import { DEFAULT_ERROR_MESSAGE, INSUFFICIENT_POINTS_ERROR_MESSAGE, GAME_REMOVED_ERROR_MESSAGE, VOTING_DISABLED_ERROR_MESSAGE } from "../systemMessages";

const SuperVoteConfirm = ({ onClose, game, storedTwitchUserID, setErrorMessage, superVoteCost }) => {
    const storedAccessToken = sessionStorage.getItem("accessToken");
    const storedUsername = sessionStorage.getItem("twitchUsername");
    const currency = sessionStorage.getItem("currency");
    const [points, setPoints] = useState(null); // State to hold loyalty points

    useEffect(() => {
        const fetchData = async () => {
            const points = await fetchPoints(storedUsername);
            if (points !== null) {
                setPoints(points);
            }
        };
        fetchData();
    }, [storedUsername]);

    const handleSuperVote = async () => {
        try {
            const response = await axios.put(`${SERVER}/superVote/${storedTwitchUserID}`, {
                'gameID': game.gameID
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'accessToken': `Bearer ${storedAccessToken}`
                }
            });
            if (response.status === 200) {
                SetTimestamp();
                window.location.reload();
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                setErrorMessage({ status: 400, message: INSUFFICIENT_POINTS_ERROR_MESSAGE });
            } else if (error.response && error.response.status === 401) {
                setErrorMessage({ status: 401 });
            } else if (error.response && error.response.status === 403) {
                setErrorMessage({ status: 403, message: VOTING_DISABLED_ERROR_MESSAGE });
            } else if (error.response && error.response.status === 404) {
                setErrorMessage({ status: 404, message: GAME_REMOVED_ERROR_MESSAGE });
            } else {
                setErrorMessage({ status: 500, message: DEFAULT_ERROR_MESSAGE });
            }
        }
    };

    return (
        <div className="modal-content">
            {points !== null && (
                <div className="redeem-confirm">
                    <h1>Super Vote</h1>
                    <h2>{game.title}</h2>
                    <img className="game-header"
                        src={game.header ? `${SERVER}/images/${game.header}` : (game.appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appID}/header.jpg` : `${SERVER}/images/missing-header.gif`)}
                        alt="header"
                        draggable="false"
                    />
                    <div className="cost-info">
                        <p>Current Balance: {points} {currency}</p>
                        <p>Item Cost: {superVoteCost} {currency}</p>
                        {superVoteCost > points ? (
                            <p>You do not have enough {currency} to use super vote</p>
                        ) : (
                            <p>Balance after Purchase: {points - superVoteCost} {currency}</p>
                        )}
                    </div>
                    <button onClick={superVoteCost > points ? onClose : handleSuperVote}>
                    {superVoteCost > points ? 'Cancel' : 'Confirm'}
                </button>
                    <img
                        className="cancel"
                        src={`${SERVER}/images/delete-button.png`}
                        alt="cancel"
                        draggable="false"
                        onClick={onClose}
                    />
                </div>
            )}
        </div>
    );
};

export default SuperVoteConfirm;