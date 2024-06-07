import React, { useState, useRef } from 'react';
import axios from 'axios';
import { SERVER } from "../constants";
import { handleAppIDSubmit, handleFileChange, handleChange, isValidURL } from "../formUtils";
import { SetTimestamp } from '../utils';

const AddGame = ({ onClose, initialIsActive, storedTwitchUserID }) => {
    const storedAccessToken = sessionStorage.getItem("accessToken");

    const defaultFormData = {
        appID: null,
        title: '',
        cover: null,
        header: null,
        description: '',
        trailer: '',
        store: '',
        isActive: initialIsActive,
    };

    const [formData, setFormData] = useState(defaultFormData);
    const [coverPreview, setCoverPreview] = useState(null); // Preview for cover image
    const [headerPreview, setHeaderPreview] = useState(null); // Preview for header image
    const [showForm, setShowForm] = useState(false); // State to track whether to show the form
    const fileInputRefCover = useRef(null);
    const fileInputRefHeader = useRef(null);

    const handleEnterKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (!showForm) {
                e.preventDefault(); // Prevent default form submission behavior
                handleAppIDSubmit(formData, setFormData, setShowForm, setCoverPreview, setHeaderPreview);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if coverPreview and headerPreview exist
        if (!coverPreview || !headerPreview) {
            alert('Please upload both cover and header images.');
            return;
        }

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
            formDataToSend.append(key, formData[key]);
        }

        try {
            const response = await axios.post(`${SERVER}/voting/addGame/${storedTwitchUserID}`, formDataToSend, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    'accessToken': `Bearer ${storedAccessToken}`
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

    const handleBack = () => {
        setFormData(defaultFormData);
        setCoverPreview(null); // Reset coverPreview to null
        setHeaderPreview(null);
        setShowForm(false); // Set showForm back to false to return to appID submission
    };

    return (
        <div className="modal-content" onKeyDown={handleEnterKeyPress}>
            <h1>ADD GAME</h1>
            {!showForm && (
                <div className='select-platform'>
                    <input
                        className="text-input"
                        placeholder="Steam App ID"
                        required
                        type="text"
                        name="appID"
                        value={formData.appID === null ? '' : formData.appID} // Set value based on formData.appID
                        onChange={(e) => handleChange(e, formData, setFormData)}
                        autoComplete='off'
                        maxLength="9"
                    />
                    <p>OR</p>
                    <button onClick={() => setShowForm(true)}>Non-Steam</button>
                </div>
            )}
            {showForm && (
                <form onSubmit={handleSubmit} autoComplete='off'>
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
                                src={coverPreview ? coverPreview : `${SERVER}/images/game-cover.png`}
                                alt="Preview"
                                draggable="false"
                                onClick={() => fileInputRefCover.current.click()}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `${SERVER}/images/missing-cover.gif`;
                                    e.target.alt = "Image missing";
                                }}
                            />
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
                                src={headerPreview ? headerPreview : `${SERVER}/images/game-header.png`}
                                alt="Header Preview"
                                draggable="false"
                                onClick={() => fileInputRefHeader.current.click()}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `${SERVER}/images/missing-header.gif`;
                                    e.target.alt = "Image missing";
                                }}
                            />
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
                    <div className="switch-container">
                        <span className={`switch-unchecked ${formData.isActive ? "false" : ""}`}>HIDDEN</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={(e) => handleChange(e, formData, setFormData)}
                                style={{ display: "none" }} />
                            <div className="slider"></div>
                        </label>
                        <span className={`switch-checked ${formData.isActive ? "" : "false"}`}>VISIBLE</span>
                    </div>
                    <button className='submit-button' type="submit">CONFIRM</button>
                </form>
            )}
            {showForm && (
                <img
                    className="cancel back"
                    src={`${SERVER}/images/back-button.png`}
                    alt="delete"
                    draggable="false"
                    onClick={handleBack}
                />
            )}
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

export default AddGame;