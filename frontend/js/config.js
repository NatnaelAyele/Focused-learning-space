// Base URL for all backend API requests from the frontend.
const API_BASE_URL = "/api";

// Home search state for external YouTube/GitHub search results.
let allVideos = [];
let allRepos = [];
let currentPage = 1;
const itemsPerPage = 10;
let activeTab = "videos";

// Library and playlist state for saved user playlists.
let myPlaylists = [];
let currentItemToAdd = { type: null, data: null };
let currentDetailedPlaylist = null;
