import React, { useState, useEffect } from "react";
import axios from "axios";
import { SetTimestamp, fetchPoints } from "../utils";
import { SERVER } from "../constants";
import { DEFAULT_ERROR_MESSAGE, INSUFFICIENT_POINTS_ERROR_MESSAGE, GAME_NOT_FOUND_ERROR_MESSAGE } from "../systemMessages";

const RedeemConfirm = ({ onClose, game, storedTwitchUserID, hasRedeemed, setHasRedeemed, setErrorMessage }) => {
    const storedAccessToken = sessionStorage.getItem("accessToken");
    const storedUsername = sessionStorage.getItem("twitchUsername");
    const currency = sessionStorage.getItem("currency");
    const [gameKey, setGameKey] = useState('');
    const [copied, setCopied] = useState(false); // State to track if key is copied
    const [points, setPoints] = useState(null); // State to hold loyalty points
    const [loading, setLoading] = useState(false); // State to track loading state of redeem button

    useEffect(() => {
        const fetchData = async () => {
            const points = await fetchPoints(storedUsername);
            if (points !== null) {
                setPoints(points);
            }
        };
        fetchData();
    }, [storedUsername]);

    const redeemKey = async () => {
        setLoading(true); // Set loading state to true
        try {
            const response = await axios.put(`${SERVER}/redeemKey/${storedTwitchUserID}`, {
                'gameID': game.gameID
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'accessToken': `Bearer ${storedAccessToken}`
                }
            });
            if (response.data.gameKey) {
                setGameKey(response.data.gameKey);
                SetTimestamp();
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                setErrorMessage({ status: 400, message: INSUFFICIENT_POINTS_ERROR_MESSAGE });
            } else if (error.response && error.response.status === 401) {
                setErrorMessage({ status: 401 });
            } else if (error.response && error.response.status === 404) {
                setErrorMessage({ status: 404, message: GAME_NOT_FOUND_ERROR_MESSAGE });
            } else {
                setErrorMessage({ status: 500, message: DEFAULT_ERROR_MESSAGE });
            }
        } finally {
            setLoading(false); // Reset loading state regardless of success or failure
            setHasRedeemed(true);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(gameKey);
        setCopied(true); // Set copied state to true
        // Reset copied state after a short delay
        setTimeout(() => {
            setCopied(false);
        }, 3000);
    };

    const renderKeyButton = () => {
        if (gameKey) {
            return (
                <button onClick={copyToClipboard}>
                    {copied ? 'Key Copied to Clipboard!' : `${gameKey}`}
                </button>
            );
        } else {
            return (
                <button onClick={game.cost > points ? onClose : redeemKey} disabled={loading}>
                    {loading ? 'Grabbing your key...' : game.cost > points ? 'Cancel' : 'Redeem Key'}
                </button>
            );
        }
    };

    return (
        <div className="modal-content">
            {points !== null && (
                <div className="redeem-confirm">
                    <h1>Redeem Key</h1>
                    <h2>{game.title}</h2>
                    <img className="game-header"
                        src={game.header ? `${SERVER}/images/${game.header}` : (game.appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appID}/header.jpg` : `${SERVER}/images/missing-header.gif`)}
                        alt="header"
                        draggable="false"
                    />
                    <div className="cost-info">
                        <p>Current Balance: {points} {currency}</p>
                        <p>Item Cost: {game.cost} {currency}</p>
                        {!hasRedeemed && (game.cost > points ? (
                            <p>You do not have enough {currency} to redeem this key</p>
                        ) : (
                            <p>Balance after Purchase: {points - game.cost} {currency}</p>
                        ))}
                    </div>
                    {renderKeyButton()}
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

export default RedeemConfirm;