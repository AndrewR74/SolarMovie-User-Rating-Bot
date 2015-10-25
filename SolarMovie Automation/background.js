$(function() {

	var _searchTabId = -1;
	var _currentTabId = -1;
	var _currentMovieLink = "";
	var _watchedLinks = [];
	
	var _activeMovieTabs = {};
	
	chrome.runtime.onMessage.addListener(
	  function(request, sender, sendResponse) {
	  
	  	// Move to the next page in the search
		if (request.method == "openNextPage") {
			chrome.tabs.update(_searchTabId, { url: request.obj.url }, function(tab) {
			});
		}
		// Movie was successfully watched
		else if (request.method == "watchedSuccessfully") {
		
			if(typeof(_activeMovieTabs[sender.tab.id]) !== 'undefined') {
				
				if(typeof(_activeMovieTabs[sender.tab.id]["watchDog"]) !== 'undefined') {
					clearTimeout(_activeMovieTabs[sender.tab.id]["watchDog"]);
				}
				
				chrome.tabs.remove(sender.tab.id, function() {
					//_currentTabId = -1;
					chrome.tabs.sendMessage(_searchTabId, {method: "completedWatch" });
				});
			
				_watchedLinks.push(_activeMovieTabs[sender.tab.id]["url"]);
				
				chrome.storage.local.set({ "watchedMovieLinks": { wl: _watchedLinks } });
			
			
				_currentMovieLink = "";
				
				delete _activeMovieTabs[sender.tab.id];
			}
		}
		// Open a new tab to watch a movie
		else if (request.method == "watchMovie") {
			_currentMovieLink = request.obj.url;

			var _movieLink = request.obj.url;
			
			chrome.tabs.create({ url: request.obj.url, active: false }, function(tab) {
				// Remember the tab id to close the tab later
				//_currentTabId = tab.id;

				_activeMovieTabs[tab.id] = {};
				_activeMovieTabs[tab.id]["url"] = _movieLink;
			});
		}
		// Bind the search content script with the watch content scripts
		else if (request.method == "bind") {
			_searchTabId = sender.tab.id;
		}
		// Switch the tabs url
		else if (request.method == "switchUrl") {
			chrome.tabs.update(sender.tab.id, { url: request.obj.url }, function(tab) {
			});
		}
		// Verify we haven't watched this link
		else if (request.method == "hasWatched") {
			sendResponse( { r: (_watchedLinks.indexOf(request.obj.url) > -1) } );
		}
	});
	

	
	function GetValues(key, func) {
		chrome.storage.local.get(key, func);
	}
	

	GetValues(["watchedMovieLinks"], function(obj) {
		if(typeof(obj) !== 'undefined' && obj != null && typeof(obj.watchedMovieLinks) !== 'undefined') {
			_watchedLinks = obj.watchedMovieLinks.wl;
		}
	});
	
	// Listen for tabs that failed to load after 30 secs
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
		var _tid = tabId;
		if(changeInfo.status == "loading") {
			if(typeof(_activeMovieTabs[_tid]) !== 'undefined') {
				// Clear existing timeouts
				if(typeof(_activeMovieTabs[_tid]["watchDog"]) !== 'undefined') {
					clearTimeout(_activeMovieTabs[_tid]["watchDog"]);
					delete _activeMovieTabs[_tid]["watchDog"];
				}
				// Add a new timeout
				_activeMovieTabs[_tid]["watchDog"] = setTimeout(function() {
					chrome.tabs.get(_tid, function(t) {
						if(typeof(t) !== 'undefined' && t != null) {
						
							//if(t.status == "loading") {
								chrome.tabs.reload(t.id);
							//}
						}
					});
				}, 30 * 1000);
			}
		}
	});
	
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.method == "BOT_INTERNAL_MEMORY") 
			{
				var sendResponseAsync = sendResponse;
				chrome.storage.local.get(function(data) {
					sendResponseAsync({responseCode: 1, Properties: data });
				});

				return true;
			} 
			else if (request.method == "BOT_INTERNAL_MEMORY_SAVE") 
			{
				chrome.storage.local.set(request.data, function() { });
				
				sendResponse();
			} 
		}
	);
	
});