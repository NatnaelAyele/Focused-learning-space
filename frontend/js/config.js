const API_BASE_URL = "http://localhost:8000";

let allVideos = [];
let allRepos = [];
let currentPage = 1;
const itemsPerPage = 10;
let activeTab = "videos";

let myPlaylists = [];
let currentItemToAdd = { type: null, data: null };
let currentDetailedPlaylist = null;
