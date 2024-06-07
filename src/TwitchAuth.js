import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { HOME, SERVER, STREAMELEMENTS_CHANNEL_ID } from "./constants";

const TwitchAuth = () => {
    const location = useLocation();
    const path = sessionStorage.getItem('path');
    sessionStorage.clear();

    useEffect(() => {
        const handleRedirect = () => {

            if (path === 'giveaways') {
                window.location = `${HOME}/giveaways`;
            } else {
                window.location = HOME;
            }
        }

        const handleTwitchAuth = async () => {
            try {
                const code = new URLSearchParams(location.search).get("code");

                if (code) {
                    // Make a request to the server to handle Twitch callback using Axios
                    const authResponse = await axios.get(`${SERVER}/twitch/auth/callback`, {
                        params: { code } // Pass code as a query parameter
                    });

                    // Extract user data from the response
                    const { twitchUserID, twitchAccessToken, profileImage, twitchUsername, isAdmin } = authResponse.data;

                    // Store all values in sessionStorage
                    sessionStorage.setItem('twitchUserID', twitchUserID);
                    sessionStorage.setItem('accessToken', twitchAccessToken);
                    sessionStorage.setItem('profileImage', profileImage);
                    sessionStorage.setItem('twitchUsername', twitchUsername);
                    if (isAdmin) {
                        sessionStorage.setItem('isAdmin', true);
                    }

                    const currencyResponse = await axios.get(`https://api.streamelements.com/kappa/v2/loyalty/${STREAMELEMENTS_CHANNEL_ID}`,
                        {
                            headers: {
                                'Accept': "application/json; charset=utf-8"
                            },
                        }
                    );
                    sessionStorage.setItem('currency', currencyResponse.data.loyalty.name);
                }
            } catch (error) {
                console.error('Error:', error);
                // Handle error
            } finally {
                // Redirect the user to the desired page
                handleRedirect();
            }
        };

        handleTwitchAuth();
    }, [location.search, path]);

    return (
        <h2>REDIRECTING FOR AUTHENTICATION...</h2>
    );
};

export default TwitchAuth;