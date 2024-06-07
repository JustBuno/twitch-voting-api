import React, { useState, useEffect, useRef, useCallback } from "react";
import Voting from "./Voting/FetchGames";
import Giveaways from "./Giveaways/FetchGames";
import RedeemedKeys from "./Giveaways/RedeemedKeys";
import axios from "axios";
import { SetTimestamp, fetchPoints, handleLogin, handleResetVotes } from "./utils";
import { GIVEAWAYS_ENABLED, HOME, SERVER } from "./constants";
import { DEFAULT_ERROR_MESSAGE } from "./systemMessages";
import ErrorMessageModal from "./ErrorMessageModal";
import AllRedeemedKeys from "./Giveaways/AllRedeemedKeys";
import AllVotes from "./Voting/AllVotes";

const Navbar = ({ path }) => {
  sessionStorage.setItem('path', path);
  const storedAccessToken = sessionStorage.getItem("accessToken");
  const storedTwitchUserID = sessionStorage.getItem("twitchUserID");
  const storedUsername = sessionStorage.getItem("twitchUsername");
  const storedProfileImage = sessionStorage.getItem("profileImage");
  const isAdmin = sessionStorage.getItem("isAdmin");
  const [showAdminView, setShowAdminView] = useState(sessionStorage.getItem("showAdminView"));

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [points, setPoints] = useState(null); // State to hold loyalty points
  const currency = sessionStorage.getItem("currency");
  const [showModal, setShowModal] = useState(false);
  const [showVoteHistory, setShowVoteHistory] = useState(false);
  const [showRedeemed, setShowRedeemed] = useState(false);
  const [showAllRedeemed, setShowAllRedeemed] = useState(false);
  const modalRef = useRef(null);

  const [errorMessage, setErrorMessage] = useState({ status: null, message: '' }); // State to hold error message
  const [hasReset, setHasReset] = useState(false);
  const [votingEnabled, setVotingEnabled] = useState(null);

  // Function to validate Twitch access token
  const validateAccessToken = useCallback(async () => {
    try {
      // Make a request to your Express server endpoint to validate the Twitch access token
      await axios.get(`${SERVER}/twitch/validateUser/${storedTwitchUserID}?isAdmin=${isAdmin}`, {
        headers: {
          'accessToken': `Bearer ${storedAccessToken}`
        }
      });

    } catch (error) {
      if (error.response && (error.response.status === 401)) {
        setErrorMessage({ status: error.response.status, message: error.response.data.error });
      } else {
        setErrorMessage({ status: 500, message: DEFAULT_ERROR_MESSAGE });
      }
    }
  }, [storedTwitchUserID, storedAccessToken, isAdmin]);

  useEffect(() => {
    // Check if the user is logged in
    if (storedTwitchUserID) {
      // Check if the timestamp of the last validation exists in sessionStorage
      const lastValidationTimestamp = sessionStorage.getItem("lastValidationTimestamp");

      if (!lastValidationTimestamp) {
        // If no timestamp exists, validate immediately
        validateAccessToken();
      } else {
        // If a timestamp exists, check if one hour has passed since the last validation
        const oneHourInMillis = 60 * 60 * 1000;
        const currentTime = new Date().getTime();
        const elapsedTimeSinceLastValidation = currentTime - parseInt(lastValidationTimestamp);

        if (elapsedTimeSinceLastValidation >= oneHourInMillis || isAdmin) {
          // If one hour has passed, validate again
          validateAccessToken();
        }
      }

      SetTimestamp();
    }
  }, [storedTwitchUserID, validateAccessToken, isAdmin]);

  useEffect(() => {
    const fetchData = async () => {
      const points = await fetchPoints(storedUsername);
      if (points !== null) {
        setPoints(points);
      }
    };
    fetchData();
  }, [storedUsername, showDropdown]);

  const renderPoints = () => {
    if (points) {
      return `${points} ${currency}`;
    } else {
      return `0 ${currency}`;
    }
  }

  const handleInputChange = (event) => {
    setSearch(event.target.value);
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleRedirect = () => {
    if (path === 'stream') {
      window.location = `${HOME}/giveaways`;
    } else {
      window.location = HOME;
    }
  }

  const handleRedeemedClick = () => {
    setShowDropdown(false);
    setShowRedeemed(true);
    setShowModal(true);
  };

  const handleAllRedeemedClick = async () => {
    await setShowModal(false);
    setShowDropdown(false);
    setShowAllRedeemed(true);
    setShowModal(true);
  };

  const handleVoteHistoryClick = async () => {
    await setShowModal(false);
    setShowDropdown(false);
    setShowVoteHistory(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  }

  const toggleAdminView = () => {
    setShowModal(false);
    setShowAdminView(!showAdminView);
    if (!showAdminView) {
      sessionStorage.setItem("showAdminView", true);
    } else {
      sessionStorage.removeItem("showAdminView");
    }
  }

  useEffect(() => {
    if (!showModal) {
      if (sessionStorage.getItem("reload")) {
        sessionStorage.removeItem("reload");
        window.location.reload();
      } else {
        setShowRedeemed(false);
        setShowAllRedeemed(false);
        setShowVoteHistory(false);
      }
    }
  }, [showModal, hasReset]);

  useEffect(() => {
    if (errorMessage.status) {
      setShowModal(false);
      sessionStorage.removeItem("error");
    }
  }, [errorMessage.status]);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  }

  const handleClickOutside = useCallback((event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      setShowModal(false);
    }
  }, [setShowModal]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div>
      {errorMessage.status && (
        <ErrorMessageModal
          error={errorMessage}
        />
      )}
      <nav className="navbar">
        <div className="flex">
          {storedUsername ? (
            <div className="dropdown-container left"></div>
          ) : (
            <div className="login-container left"></div>
          )}
          <div className="search-input-container">
            <input
              className="search-input"
              type="text"
              name="game-search"
              placeholder="Search game..."
              value={search}
              onChange={handleInputChange}
              autoComplete="off"
            />
          </div>
          {storedUsername ? (
            <div className="dropdown-container" ref={dropdownRef}>
              <img
                className="profile-image"
                src={storedProfileImage}
                alt="User Avatar"
                onClick={toggleDropdown}
                draggable="false"
              />
              {showDropdown && (
                <div className="dropdown-content right">
                  <div className="user">
                    <img src={storedProfileImage} alt="User Avatar" draggable="false"></img>
                    <div className="user-info">
                      <span className="username">{storedUsername}</span>
                      <span className="points">{renderPoints()}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div>
                      <button
                        onClick={toggleAdminView}>
                        {showAdminView ? "View as user" : "View as admin"}
                      </button>
                      {showAdminView && path === 'stream' && (
                        <div>
                          <button onClick={() => handleResetVotes(storedTwitchUserID, votingEnabled)}>
                            {votingEnabled ? 'Close Voting' : 'Reset Voting'}
                          </button>
                          <button onClick={handleVoteHistoryClick}>
                            Vote History
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {path === 'giveaways' && (
                    <button
                      onClick={showAdminView ? handleAllRedeemedClick : handleRedeemedClick}>
                      {showAdminView ? 'All Redeemed Keys' : 'Redeemed Keys'}
                    </button>
                  )}
                  {GIVEAWAYS_ENABLED && (
                    <button onClick={handleRedirect}>
                      {path === 'stream' ? 'Giveaways' : 'Voting'}
                    </button>
                  )}
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <div className="login-container right">
              <button className="login" onClick={handleLogin}>LOGIN WITH TWITCH</button>
            </div>
          )}
        </div>
      </nav>
      {showModal && showVoteHistory && (
        <div className="overlay">
          <div className="modal-fixed">
            <AllVotes
              storedTwitchUserID={storedTwitchUserID}
              onClose={handleCloseModal}
              hasReset={hasReset}
              setHasReset={setHasReset}
            />
          </div>
        </div>
      )}
      {showModal && showRedeemed && (
        <div className="overlay">
          <div className="modal-fixed" ref={modalRef}>
            <RedeemedKeys
              storedTwitchUserID={storedTwitchUserID}
              onClose={handleCloseModal}
            />
          </div>
        </div>
      )}
      {showModal && showAllRedeemed && (
        <div className="overlay">
          <div className="modal-fixed">
            <AllRedeemedKeys
              storedTwitchUserID={storedTwitchUserID}
              onClose={handleCloseModal}
            />
          </div>
        </div>
      )}
      {path === 'stream' && (
        <Voting
          className="content"
          search={search.toLowerCase()}
          storedTwitchUserID={storedTwitchUserID}
          showAdminView={showAdminView}
          isAdmin={isAdmin}
          showModal={showModal}
          setShowModal={setShowModal}
          setErrorMessage={setErrorMessage}
          votingEnabled={votingEnabled}
          setVotingEnabled={setVotingEnabled}
        />
      )}
      {path === 'giveaways' && (
        <Giveaways
          className="content"
          search={search.toLowerCase()}
          storedTwitchUserID={storedTwitchUserID}
          showAdminView={showAdminView}
          isAdmin={isAdmin}
          showModal={showModal}
          setShowModal={setShowModal}
          showRedeemed={showRedeemed}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
        />
      )}
    </div>
  );
};

export default Navbar;