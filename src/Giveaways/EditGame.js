import React, { useState, useRef } from 'react';
import axios from 'axios';
import { SERVER } from "../constants";
import { handleFileChange, handleChange, isValidURL } from "../formUtils";
import { SetTimestamp } from '../utils';

const EditGame = ({ onClose, game, storedTwitchUserID }) => {
    const storedAccessToken = sessionStorage.getItem("accessToken");

    const [formData, setFormData] = useState({
        ...game,
        gameKey: ''
    });
    const [showKey, setShowKey] = useState(false);
    const [coverPreview, setCoverPreview] = useState(game.cover ? `${SERVER}/images/${game.cover}` : null); // Preview for cover image
    const [headerPreview, setHeaderPreview] = useState(game.header ? `${SERVER}/images/${game.header}` : null); // Preview for header image
    const fileInputRefCover = useRef(null);
    const fileInputRefHeader = useRef(null);

    const handleRemoveCover = () => {
        setCoverPreview(null);
        setFormData(prevState => ({
            ...prevState,
            cover: 'remove'
        }));
    };

    const handleRemoveHeader = () => {
        setHeaderPreview(null);
        setFormData(prevState => ({
            ...prevState,
            header: 'remove'
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate URL before submitting
        if (formData.trailer && !isValidURL(formData.trailer)) {
            alert('Invalid trailer URL. Please enter a valid URL.');
            return;
        }
        if (formData.store && !isValidURL(formData.store)) {
            alert('Invalid store URL. Please enter a valid URL.');
            return;
        }

        const formDataToSend = new FormData();
        for (const key in formData) {
            if (key !== "gameKey") { // Exclude gameKey from formDataToSend
                formDataToSend.append(key, formData[key]);
            }
        }

        try {
            const response = await axios.put(`${SERVER}/giveaways/editGame/${game.gameID}?twitchUserID=${storedTwitchUserID}`, formDataToSend, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    'accessToken': `Bearer ${storedAccessToken}`,
                    'gameKey': formData.gameKey
                }
            });
            if (response.status === 200) {
                SetTimestamp();
                window.location.reload();
            }
        } catch (error) {
            console.error('Error adding game:', error);

            // Check if the error response status is 400 (Bad Request)
            if (error.response.status === 400) {
                // Display the error message received from the server
                alert(error.response.data.error);
            } else {
                // For other errors, display a generic error message
                alert('An error occurred while adding the game. Please try again later.');
            }
        }
    };

    const handleFetchGameKey = async () => {
        try {
            const response = await axios.get(`${SERVER}/giveaways/editGame/fetchGameKey/${game.gameID}?twitchUserID=${storedTwitchUserID}`, {
                headers: {
                    'accessToken': `Bearer ${storedAccessToken}`
                }
            });
            if (response.status === 200) {
                SetTimestamp();
                const { gameKey } = response.data;
                setFormData(prevState => ({
                    ...prevState,
                    gameKey
                }));
                setShowKey(true);
            }
        } catch (error) {
            console.error('Error fetching game key:', error);
            alert('An error occurred while fetching game key. Please try again later.');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="modal-content">
            <h1>EDIT GAME</h1>
            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} autoComplete='off'>
                <input
                    className="text-input"
                    placeholder="Title"
                    required
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={(e) => handleChange(e, formData, setFormData)}
                    maxLength="255"
                />
                <div className='upload-images'>
                    <div className='image-left'>
                        {/* Cover Image */}
                        <input
                            className='ref'
                            ref={fileInputRefCover}
                            type="file"
                            name="cover"
                            accept="image/jpeg, image/png"
                            size={512000}
                            onChange={(e) => handleFileChange(e, 'cover', formData, setFormData, setCoverPreview)}
                        />
                        <img
                            className="game-cover"
                            src={coverPreview ? coverPreview : (game.appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appID}/library_600x900.jpg` : `${SERVER}/images/missing-cover.gif`)}
                            alt="Preview"
                            draggable="false"
                            onClick={() => fileInputRefCover.current.click()}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `${SERVER}/images/missing-cover.gif`;
                                e.target.alt = "Image missing";
                            }}
                        />
                        {coverPreview && (
                            <div className='buttons'>
                                <button
                                    onClick={handleRemoveCover}
                                >
                                    Remove Cover
                                </button>
                            </div>
                        )}
                    </div>
                    <div className='image-separator'></div>
                    <div className='image-right'>
                        {/* Header Image */}
                        <input
                            className='ref'
                            ref={fileInputRefHeader}
                            type="file"
                            name="header"
                            accept="image/jpeg, image/png"
                            size={512000}
                            onChange={(e) => handleFileChange(e, 'header', formData, setFormData, setHeaderPreview)}
                        />
                        <img
                            className="game-header"
                            src={headerPreview ? headerPreview : (game.appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appID}/header.jpg` : `${SERVER}/images/missing-header.gif`)}
                            alt="Header Preview"
                            draggable="false"
                            onClick={() => fileInputRefHeader.current.click()}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `${SERVER}/images/missing-header.gif`;
                                e.target.alt = "Image missing";
                            }}
                        />
                        {headerPreview && (
                            <div className='buttons'>
                                <button
                                    onClick={handleRemoveHeader}
                                >
                                    Remove Header
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <textarea
                    className="text-input description"
                    placeholder="Description"
                    required
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={(e) => handleChange(e, formData, setFormData)}
                    maxLength="65535"
                />
                <input
                    className="text-input"
                    placeholder="Trailer"
                    required
                    type="text"
                    name="trailer"
                    value={formData.trailer}
                    onChange={(e) => handleChange(e, formData, setFormData)}
                    maxLength="255"
                />
                <input
                    className="text-input"
                    placeholder="Official Store"
                    type="text"
                    name="store"
                    value={formData.store}
                    onChange={(e) => handleChange(e, formData, setFormData)}
                    maxLength="255"
                />
                <input
                    className="text-input"
                    placeholder="Cost"
                    required
                    type="text"
                    name="cost"
                    value={formData.cost}
                    onChange={(e) => handleChange(e, formData, setFormData)}
                    min="0"
                    maxLength="7"
                />
                {showKey ? (
                    <input
                        className="text-input"
                        placeholder="Game Key"
                        required
                        type="text"
                        name="gameKey"
                        value={formData.gameKey}
                        onChange={(e) => handleChange(e, formData, setFormData)}
                        maxLength="255"
                    />
                ) : (
                    <div className='text-input show-key' onClick={handleFetchGameKey}>Show Game Key</div>
                )}

                <button className='submit-button' type="submit">CONFIRM</button>
            </form>
            <img
                className="cancel"
                src={`${SERVER}/images/delete-button.png`}
                alt="delete"
                draggable="false"
                onClick={onClose}
            />
        </div>
    );
};

export default EditGame;