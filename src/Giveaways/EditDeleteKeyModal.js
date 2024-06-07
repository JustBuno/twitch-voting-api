import React, { useState } from 'react';
import axios from 'axios';
import { SERVER } from "../constants";
import { SetTimestamp } from '../utils';

const EditDeleteKeyModal = ({ storedTwitchUserID, keyData, onClose }) => {
    const storedAccessToken = sessionStorage.getItem("accessToken");

    const [loading, setLoading] = useState(false);
    const [editedKey, setEditedKey] = useState(keyData.gameKey);

    const handleInputChange = (event) => {
        setEditedKey(event.target.value);
    };

    const handleUpdateKey = async () => {
        const confirmUpdate = window.confirm("Are you sure you want to update this key?");
        if (confirmUpdate) {
            try {
                setLoading(true);
                await axios.put(`${SERVER}/allRedeemedKeys/updateKey/${keyData.id}?twitchUserID=${storedTwitchUserID}`, {}, {
                    headers: {
                        'accessToken': `Bearer ${storedAccessToken}`,
                        'gameKey': editedKey
                    }
                });
                SetTimestamp();
                onClose();
            } catch (error) {
                console.error("Error updating key:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteKey = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete this key?");
        if (confirmDelete) {
            try {
                setLoading(true);
                await axios.delete(`${SERVER}/allRedeemedKeys/deleteKey/${keyData.id}?twitchUserID=${storedTwitchUserID}`, {
                    headers: {
                        'accessToken': `Bearer ${storedAccessToken}`
                    }
                });
                SetTimestamp();
                onClose();
            } catch (error) {
                console.error("Error deleting key:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="modal-content">
            <div>
                <img
                    className="cancel back"
                    src={`${SERVER}/images/back-button.png`}
                    alt="delete"
                    draggable="false"
                    onClick={onClose}
                />
                <div>
                    <h1>Edit/Delete Key</h1>
                    <input
                        className='text-input'
                        type="text"
                        name='id'
                        value={editedKey}
                        onChange={handleInputChange}
                    />
                    <div className='edit-delete-buttons'>
                        <div className='edit'>
                            <button onClick={handleUpdateKey} disabled={loading}>Update</button>
                        </div>
                        <div className='delete'>
                            <button onClick={handleDeleteKey} disabled={loading}>Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditDeleteKeyModal;