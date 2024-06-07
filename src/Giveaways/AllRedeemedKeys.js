import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER } from "../constants";
import EditDeleteKeyModal from './EditDeleteKeyModal'; // Import the modal component
import { SetTimestamp } from '../utils';

const AllRedeemedKeys = ({ storedTwitchUserID, onClose }) => {
    const storedAccessToken = sessionStorage.getItem("accessToken");

    const [loading, setLoading] = useState(true);
    const [redeemedKeys, setRedeemedKeys] = useState([]);
    const [revealedKeys, setRevealedKeys] = useState({});
    const [selectedKey, setSelectedKey] = useState(null); // State to track the selected key for editing/deleting
    const [modalOpen, setModalOpen] = useState(false); // State to track whether the modal is open or closed

    useEffect(() => {
        const fetchAllRedeemedKeys = async () => {
            try {
                const response = await axios.get(`${SERVER}/allRedeemedKeys/${storedTwitchUserID}`, {
                    headers: {
                        'accessToken': `Bearer ${storedAccessToken}`
                    }
                });
                setRedeemedKeys(response.data.reverse());
                SetTimestamp();
            } catch (error) {
                console.error("Error fetching user keys:", error);
            } finally {
                setLoading(false);
            }
        };
        if (!selectedKey) {
            fetchAllRedeemedKeys();
        }
    }, [storedAccessToken, storedTwitchUserID, selectedKey]);

    const revealKey = (index) => {
        setRevealedKeys(prevState => ({
            ...prevState,
            [index]: true
        }));
    };

    const openModal = (index) => {
        setSelectedKey(index);
        setModalOpen(true);
        setRevealedKeys({});
    };

    const closeModal = () => {
        setSelectedKey(null);
        setModalOpen(false);
    };

    return (
        <div className="modal-content">
            {!loading && !modalOpen && (
                <div>
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
                                        <span>{key.twitchUsername} - {key.title}</span>
                                        {revealedKeys[index] ? (
                                            <div className='text-input show-key' onClick={() => openModal(index)}>
                                                {key.gameKey}
                                            </div>
                                        ) : (
                                            <div className='text-input show-key' onClick={() => revealKey(index)}>
                                                Click to Reveal Key
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p>No keys found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Render the modal if it's open */}
            {modalOpen && (
                <EditDeleteKeyModal
                    storedTwitchUserID={storedTwitchUserID}
                    keyData={redeemedKeys[selectedKey]} // Pass the selected key data to the modal
                    onClose={closeModal}
                />
            )}
        </div>
    );
};

export default AllRedeemedKeys;