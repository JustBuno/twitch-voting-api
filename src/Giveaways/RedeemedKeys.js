import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER } from "../constants";
import { REDEEMED_EMPTY_MESSAGE } from '../systemMessages';
import { SetTimestamp } from '../utils';

const RedeemedKeys = ({ storedTwitchUserID, onClose }) => {
    const storedAccessToken = sessionStorage.getItem("accessToken");

    const [loading, setLoading] = useState(true); // State to track loading state of redeemed keys
    const [redeemedKeys, setRedeemedKeys] = useState([]);
    const [copiedIndex, setCopiedIndex] = useState(null);

    const copyToClipboard = (gameKey, index) => {
        navigator.clipboard.writeText(gameKey);
        setCopiedIndex(index); // Set the index of the copied key
        // Reset copied state after a short delay
        setTimeout(() => {
            setCopiedIndex(null);
        }, 2000);
    };

    useEffect(() => {
        const fetchRedeemedKeys = async () => {
            try {
                const response = await axios.get(`${SERVER}/redeemedKeys/${storedTwitchUserID}`, {
                    headers: {
                        'accessToken': `Bearer ${storedAccessToken}`
                    }
                });
                setRedeemedKeys(response.data.reverse());
                SetTimestamp();
            } catch (error) {
                console.error("Error fetching redeemed keys:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRedeemedKeys();
    }, [storedTwitchUserID, storedAccessToken]);

    return (
        <div className="modal-content">
            {!loading && (
                <div>
                    <img
                        className="cancel"
                        src={`${SERVER}/images/delete-button.png`}
                        alt="delete"
                        draggable="false"
                        onClick={onClose}
                    />
                    <div>
                        <h1>Redeemed Keys</h1>
                        {redeemedKeys.length > 0 ? (
                            redeemedKeys.map((key, index) => (
                                <div className='redeemed-keys' key={index}>
                                    <h2>{key.title}</h2>
                                    <button onClick={() => copyToClipboard(key.gameKey, index)}>
                                        {copiedIndex === index ? 'Key Copied to Clipboard!' : key.gameKey}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p>{REDEEMED_EMPTY_MESSAGE}</p>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default RedeemedKeys;